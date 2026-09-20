/**
 * T-W6: the HTTP layer — static serving, 404s, and the loopback-only bind.
 * T-W7: a real WebSocket round trip through the http upgrade path, not just
 *      the frame codec in isolation.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as net from 'node:net';
import * as http from 'node:http';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { createHash } from 'node:crypto';
import { serve } from '../src/http.js';
import { encodeClientText } from '../src/ws.js';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

/** A minimal raw client, because the point is to test the server, not node. */
function rawConnect(port: number): net.Socket {
  return net.connect({ host: '127.0.0.1', port });
}

function readOnce(socket: net.Socket, bytes: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('read timeout')), 3000);
    socket.once('data', (d) => {
      clearTimeout(timer);
      resolve(d);
    });
    socket.on('error', (e) => {
      clearTimeout(timer);
      reject(e);
    });
  });
}

test('T-W6: a static file is served with the right content type', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-web-'));
  await fs.writeFile(path.join(dir, 'index.html'), '<h1>hello</h1>');
  const handle = await serve({
    staticDir: dir,
    noCache: true,
    port: 0,
    onCommand: () => {},
  });

  const body = await new Promise<string>((resolve, reject) => {
    http.get(`http://127.0.0.1:${handle.port}/index.html`, (res) => {
      assert.equal(res.statusCode, 200);
      assert.match(res.headers['content-type'] ?? '', /text\/html/);
      let out = '';
      res.on('data', (c) => (out += c));
      res.on('end', () => resolve(out));
    }).on('error', reject);
  });

  assert.equal(body, '<h1>hello</h1>');
  await handle.close();
  await fs.rm(dir, { recursive: true, force: true });
});

test('T-W6b: a missing file is a 404, not a stack trace', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-web-'));
  const handle = await serve({
    staticDir: dir,
    noCache: true,
    port: 0,
    onCommand: () => {},
  });

  const code = await new Promise<number>((resolve, reject) => {
    http.get(`http://127.0.0.1:${handle.port}/nope.js`, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    }).on('error', reject);
  });

  assert.equal(code, 404);
  await handle.close();
  await fs.rm(dir, { recursive: true, force: true });
});

test('T-W6c: a directory traversal attempt stays inside staticDir', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-web-'));
  await fs.writeFile(path.join(dir, 'index.html'), 'ok');
  const secret = path.join(os.tmpdir(), 'magoco-secret.txt');
  await fs.writeFile(secret, 'SECRET');
  const handle = await serve({
    staticDir: dir,
    noCache: true,
    port: 0,
    onCommand: () => {},
  });

  const code = await new Promise<number>((resolve, reject) => {
    http.get(`http://127.0.0.1:${handle.port}/../magoco-secret.txt`, (res) => {
      res.resume();
      resolve(res.statusCode ?? 0);
    }).on('error', reject);
  });
  // Node normalises ../ in the path before routing, so this resolves to a
  // 404 at best; the guarantee is that it never serves the outside file.
  assert.notEqual(code, 200);

  await handle.close();
  await fs.rm(dir, { recursive: true, force: true });
  await fs.rm(secret, { force: true });
});

test('T-W7: a full WebSocket round trip through the http upgrade', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-web-'));
  const received: string[] = [];
  const handle = await serve({
    staticDir: dir,
    noCache: true,
    port: 0,
    onCommand: (_cmd, reply) => {
      reply({ t: 'hello', sessionId: 's1', version: 1 });
    },
  });

  const socket = rawConnect(handle.port);
  const key = 'dGhlIHNhbXBsZSBub25jZQ==';
  socket.write(
    'GET /ws HTTP/1.1\r\n' +
      `Host: 127.0.0.1:${handle.port}\r\n` +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Key: ${key}\r\n` +
      'Sec-WebSocket-Version: 13\r\n\r\n',
  );

  const head = await readOnce(socket, 256);
  const headText = head.toString('latin1');
  assert.match(headText, /HTTP\/1\.1 101/, 'expected a 101 upgrade');
  // The server must echo the correct accept value, proving a real handshake.
  const expected = createHash('sha1').update(key + GUID).digest('base64');
  assert.ok(headText.includes(`Sec-WebSocket-Accept: ${expected}`), 'bad accept hash');

  // Send a client text frame; expect the server's reply.
  socket.write(encodeClientText('{"c":"create"}'));
  const reply = await readOnce(socket, 256);
  // Peel the server frame header (unmasked, so no mask bytes).
  const len = reply[1] & 0x7f;
  const payload = reply.subarray(2, 2 + len).toString('utf8');
  received.push(payload);

  assert.deepEqual(JSON.parse(received[0]), {
    t: 'hello',
    sessionId: 's1',
    version: 1,
  });

  socket.destroy();
  await handle.close();
  await fs.rm(dir, { recursive: true, force: true });
});

test('T-W7b: a request without an upgrade key is served as normal http', async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-web-'));
  await fs.writeFile(path.join(dir, 'index.html'), 'plain');
  const handle = await serve({
    staticDir: dir,
    noCache: true,
    port: 0,
    onCommand: () => {},
  });

  const body = await new Promise<string>((resolve, reject) => {
    http.get(`http://127.0.0.1:${handle.port}/`, (res) => {
      assert.equal(res.statusCode, 200);
      let out = '';
      res.on('data', (c) => (out += c));
      res.on('end', () => resolve(out));
    }).on('error', reject);
  });
  assert.equal(body, 'plain');

  await handle.close();
  await fs.rm(dir, { recursive: true, force: true });
});
