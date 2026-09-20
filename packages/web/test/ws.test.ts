/**
 * T-W1: WebSocket handshake, frame encode/decode, ping/pong, close codes.
 * T-W1b: the protocol scope line (spec §9.1) — disallowed frames are closed
 *        with 1002, never silently mis-parsed.
 *
 * These tests use a real TCP socket against the real server-side parser. The
 * client side is a raw net.Socket speaking bytes by hand — that is the point:
 * if the parser were wrong, a real browser would hide it, and a hand-rolled
 * client exposes it.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import net from 'node:net';
import http from 'node:http';
import crypto from 'node:crypto';

import {
  upgradeWebSocket,
  encodeClientText,
  encodeUnmaskedText,
  encodeClientBinary,
  encodeClientFragment,
  encodeClientPing,
  type WireFrame,
} from '../src/ws.js';

/** A tiny upgrade harness: returns a server whose upgrade handler hands the socket to ws.ts. */
function withServer(
  onFrame: (f: WireFrame) => void,
  onClose?: (code: number, reason: string) => void,
): Promise<{ server: http.Server; url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = http.createServer((_req, res) => res.writeHead(404).end());
    server.on('upgrade', (req, socket) => {
      upgradeWebSocket(req, socket as unknown as net.Socket, onFrame, onClose ?? (() => {}));
    });
    server.listen(0, '127.0.0.1', () => {
      const addr = server.address() as net.AddressInfo;
      resolve({
        server,
        url: `ws://127.0.0.1:${addr.port}`,
        close: () => new Promise((r) => server.close(() => r())),
      });
    });
  });
}

/** Open a raw client socket and complete the RFC 6455 handshake. */
function connect(url: string): Promise<net.Socket> {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const socket = net.connect(Number(u.port), u.hostname, () => {
      const key = crypto.randomBytes(16).toString('base64');
      socket.write(
        `GET ${u.pathname || '/'} HTTP/1.1\r\n` +
        `Host: ${u.host}\r\n` +
        'Upgrade: websocket\r\n' +
        'Connection: Upgrade\r\n' +
        'Sec-WebSocket-Key: ' + key + '\r\n' +
        'Sec-WebSocket-Version: 13\r\n\r\n',
      );
    });
    let buf = Buffer.alloc(0);
    const done = (s: net.Socket) => resolve(s);
    socket.on('data', function onData(chunk: Buffer) {
      buf = Buffer.concat([buf, chunk]);
      const i = buf.indexOf('\r\n\r\n');
      if (i !== -1) {
        const head = buf.subarray(0, i).toString('utf8');
        if (!head.includes('101')) {
          socket.destroy();
          reject(new Error('no 101: ' + head));
          return;
        }
        socket.removeListener('data', onData);
        // Anything after the headers is the first frame; leave it on the socket
        // by pushing it back so frame reads below see it.
        const rest = buf.subarray(i + 4);
        if (rest.length) socket.unshift(rest);
        done(socket);
      }
    });
    socket.on('error', reject);
  });
}

/** Read exactly one server→client frame and return its payload + opcode. */
function readFrame(socket: net.Socket): Promise<{ opcode: number; payload: Buffer }> {
  return new Promise((resolve) => {
    let buf = Buffer.alloc(0);
    const onData = (chunk: Buffer) => {
      buf = Buffer.concat([buf, chunk]);
      if (buf.length < 2) return;
      const opcode = buf[0] & 0x0f;
      let len = buf[1] & 0x7f;
      let off = 2;
      if (len === 126) { if (buf.length < off + 2) return; len = buf.readUInt16BE(off); off += 2; }
      else if (len === 127) {
        if (buf.length < off + 8) return;
        len = Number(buf.readBigUInt64BE(off));
        off += 8;
      }
      if (buf.length < off + len) return;
      socket.removeListener('data', onData);
      resolve({ opcode, payload: buf.subarray(off, off + len) });
    };
    socket.on('data', onData);
  });
}

test('T-W1: handshake completes and a text frame round-trips', async () => {
  const received: string[] = [];
  const { server, url, close } = await withServer((f) => {
    if (f.kind === 'text') received.push(f.text);
  });
  const socket = await connect(url);
  socket.write(encodeClientText('hello MAGoCo'));
  await new Promise((r) => setTimeout(r, 60));
  assert.deepEqual(received, ['hello MAGoCo']);
  socket.destroy();
  await close();
});

test('T-W1: a large text frame (16-bit length) round-trips', async () => {
  const received: string[] = [];
  const { server, url, close } = await withServer((f) => {
    if (f.kind === 'text') received.push(f.text);
  });
  const socket = await connect(url);
  const big = 'x'.repeat(5000);
  socket.write(encodeClientText(big));
  await new Promise((r) => setTimeout(r, 80));
  assert.equal(received.length, 1);
  assert.equal(received[0], big);
  socket.destroy();
  await close();
});

test('T-W1: ping is answered with a pong of the same payload', async () => {
  const { server, url, close } = await withServer(() => {});
  const socket = await connect(url);
  socket.write(encodeClientPing(Buffer.from('heartbeat')));
  const frame = await readFrame(socket);
  assert.equal(frame.opcode, 0xa, 'pong opcode');
  assert.equal(frame.payload.toString('utf8'), 'heartbeat');
  socket.destroy();
  await close();
});

test('T-W1: server can send a text frame to the client', async () => {
  let handle: ReturnType<typeof upgradeWebSocket> = null;
  const server = http.createServer((_q, res) => res.writeHead(404).end());
  server.on('upgrade', (req, socket) => {
    handle = upgradeWebSocket(req, socket as unknown as net.Socket, () => {}, () => {});
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;
  const socket = await connect(`ws://127.0.0.1:${port}`);
  handle!.send({ kind: 'text', text: 'from server' });
  const frame = await readFrame(socket);
  assert.equal(frame.opcode, 0x1);
  assert.equal(frame.payload.toString('utf8'), 'from server');
  socket.destroy();
  await new Promise<void>((r) => server.close(() => r()));
});

test('T-W1b: an unmasked client frame is refused with 1002', async () => {
  let closed = false;
  let closeCode = 0;
  const { server, url, close } = await withServer(
    () => {},
    (code) => { closeCode = code; closed = true; },
  );
  const socket = await connect(url);
  socket.write(encodeUnmaskedText('sneaky'));
  const frame = await readFrame(socket);
  assert.equal(frame.opcode, 0x8, 'close frame');
  assert.equal(frame.payload.readUInt16BE(0), 1002, 'protocol error code');
  assert.equal(closed, true);
  assert.equal(closeCode, 1002);
  socket.destroy();
  await close();
});

test('T-W1b: a binary frame is refused with 1002', async () => {
  const { server, url, close } = await withServer(() => {});
  const socket = await connect(url);
  socket.write(encodeClientBinary(Buffer.from([1, 2, 3])));
  const frame = await readFrame(socket);
  assert.equal(frame.opcode, 0x8);
  assert.equal(frame.payload.readUInt16BE(0), 1002);
  socket.destroy();
  await close();
});

test('T-W1b: a fragmented frame is refused with 1002', async () => {
  const { server, url, close } = await withServer(() => {});
  const socket = await connect(url);
  socket.write(encodeClientFragment('split message'));
  const frame = await readFrame(socket);
  assert.equal(frame.opcode, 0x8);
  assert.equal(frame.payload.readUInt16BE(0), 1002);
  socket.destroy();
  await close();
});

test('T-W1: a client close is honoured and the server reports its code', async () => {
  let reported = 0;
  const { server, url, close } = await withServer(() => {}, (code) => { reported = code; });
  const socket = await connect(url);
  // Encode a masked close frame with code 1000.
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const body = Buffer.allocUnsafe(2);
  body.writeUInt16BE(1000, 0);
  const masked = Buffer.allocUnsafe(2);
  for (let i = 0; i < 2; i++) masked[i] = body[i] ^ mask[i % 4];
  socket.write(Buffer.concat([Buffer.from([0x88, 0x82]), mask, masked]));
  await new Promise((r) => setTimeout(r, 60));
  assert.equal(reported, 1000);
  socket.destroy();
  await close();
});

test('T-W1: a bad Sec-WebSocket-Version is refused before upgrade', async () => {
  const server = http.createServer((_q, res) => res.writeHead(404).end());
  server.on('upgrade', (req, socket) => {
    upgradeWebSocket(req, socket as unknown as net.Socket, () => {}, () => {});
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as net.AddressInfo).port;
  await new Promise<void>((resolve, reject) => {
    const socket = net.connect(port, '127.0.0.1', () => {
      socket.write(
        'GET / HTTP/1.1\r\nHost: 127.0.0.1\r\nUpgrade: websocket\r\n' +
        'Connection: Upgrade\r\nSec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==\r\n' +
        'Sec-WebSocket-Version: 12\r\n\r\n',
      );
    });
    socket.on('data', (d) => {
      const head = d.toString('utf8');
      if (head.includes('426')) { socket.destroy(); resolve(); }
      else { socket.destroy(); reject(new Error('expected 426, got: ' + head.slice(0, 60))); }
    });
    socket.on('error', reject);
  });
  await new Promise<void>((r) => server.close(() => r()));
});
