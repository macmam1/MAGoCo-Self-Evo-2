/**
 * A hand-rolled WebSocket (RFC 6455) — the minimum subset this protocol needs.
 *
 * SCOPE — spec §9.1. This server implements exactly this and nothing else:
 *
 *   text (op 1), unfragmented    accepted       all client→server commands
 *   binary (op 2)                close 1002     no binary channel until Phase 4
 *   fragmented (op 0/contin.)    close 1002     non-conformant for this protocol
 *   ping (op 9)                  respond pong
 *   pong (op 10)                 accept, ignore
 *   close (op 8)                 honor code, close
 *   anything else                close 1002
 *
 * Why hand-rolled and not `ws`: see spec §9 decision 3. The short version is
 * that the whole socket sits behind `magoco.web.serve`, so its blast radius is
 * the `magoco.session.*` vocabulary, not the framework. The moment binary or
 * fragmented frames are needed (Phase 4, voice/image) this file is swapped for
 * `ws` and no consumer changes — that is §1.5 mechanism 1 doing its job.
 *
 * The one thing this file must never do is SILENTLY mis-parse a frame. Every
 * shape it does not understand is closed with 1002 and a reason. That is what
 * turns a hidden production bug into a visible test failure (T-W1/T-W1b).
 */
import { createHash } from 'node:crypto';
import type { Socket } from 'node:net';
import type { IncomingMessage, Server } from 'node:http';

const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';

const OP_CONTINUATION = 0x0;
const OP_TEXT = 0x1;
const OP_BINARY = 0x2;
const OP_CLOSE = 0x8;
const OP_PING = 0x9;
const OP_PONG = 0xa;

/**
 * Frames a client may send that are outside our protocol scope (spec §9.1).
 *
 * NOTE: 'close' is deliberately NOT here. Close frames are a first-class
 * member of WireFrame (they carry a status code), and duplicating the literal
 * in this union makes TS collapse the two 'close' shapes into one that lacks
 * `code`, which would type-error the close handler.
 */
type Disallowed = 'binary' | 'fragmented';

/** A frame we successfully read off the wire. */
export type WireFrame =
  | { readonly kind: 'text'; readonly text: string }
  | { readonly kind: 'ping'; readonly payload: Buffer }
  | { readonly kind: 'pong' }
  | { readonly kind: 'close'; readonly code: number; readonly reason: string }
  | { readonly kind: Disallowed };

interface SocketHandle {
  readonly socket: Socket;
  send: (frame: { kind: 'text'; text: string } | { kind: 'pong'; payload: Buffer } | { kind: 'close'; code: number; reason: string }) => void;
  close: (code: number, reason: string) => void;
  isClosed: () => boolean;
}

/**
 * Attach a WebSocket to an upgraded http connection.
 *
 * Returns a handle the caller uses to send and close, and receives every
 * frame the client sends. Frames that are outside our protocol scope are
 * reported as `Disallowed` and the socket is closed with 1002 by the caller
 * (the caller decides; this file just reports honestly).
 */
export function upgradeWebSocket(
  req: IncomingMessage,
  socket: Socket,
  onFrame: (frame: WireFrame) => void,
  onClose: (code: number, reason: string) => void,
): SocketHandle | null {
  const key = req.headers['sec-websocket-key'];
  const version = req.headers['sec-websocket-version'];
  if (typeof key !== 'string' || !key) {
    socket.destroy();
    return null;
  }
  if (version !== '13') {
    // The only version we speak. Anything else is refused before upgrade.
    socket.write('HTTP/1.1 426 Upgrade Required\r\n' +
      'Sec-WebSocket-Version: 13\r\nConnection: close\r\n\r\n');
    socket.destroy();
    return null;
  }

  const accept = createHash('sha1')
    .update(key + GUID)
    .digest('base64');
  socket.write(
    'HTTP/1.1 101 Switching Protocols\r\n' +
    'Upgrade: websocket\r\n' +
    'Connection: Upgrade\r\n' +
    `Sec-WebSocket-Accept: ${accept}\r\n\r\n`,
  );

  let closed = false;
  /**
   * The read buffer. Typed `Uint8Array` on purpose: @types/node 22 declares
   * `Buffer` as `Buffer<ArrayBufferLike>`, and narrowing that to the concrete
   * `Buffer<ArrayBuffer>` the socket hands us trips a variance error that is
   * pure type-level noise (SharedArrayBuffer never occurs here). A Uint8Array
   * is exactly what Buffer is at runtime and what every consumer below needs.
   */
  let buffer: Uint8Array = new Uint8Array();
  // The state machine tracks fragmentation. A continuation frame appearing
  // without a preceding text frame is out of scope → close 1002.
  let midFragment = false;

  socket.on('data', (chunk: Uint8Array) => {
    if (closed) return;
    buffer = buffer.length === 0 ? chunk : Buffer.concat([buffer, chunk]);

    for (;;) {
      const parsed = parseFrame(Buffer.from(buffer), midFragment);
      if (parsed === null) break; // need more bytes
      buffer = buffer.subarray(parsed.consumed);
      midFragment = parsed.midFragment;

      // close/ping/pong are handled inline; text and disallowed are reported.
      if (parsed.frame.kind === 'close') {
        const f = parsed.frame;
        doClose(f.code, f.reason);
        return;
      }
      if (parsed.frame.kind === 'ping') {
        sendPong(parsed.frame.payload);
        continue;
      }
      if (parsed.frame.kind === 'pong') continue;
      onFrame(parsed.frame);
      if (parsed.frame.kind !== 'text') {
        // binary or fragmented: close 1002, this client is out of scope.
        doClose(1002, 'protocol error: only unfragmented text frames are supported');
        return;
      }
    }
  });

  socket.on('error', () => {
    if (!closed) doClose(1011, 'socket error');
  });
  socket.on('end', () => {
    if (!closed) doClose(1000, 'client closed');
  });

  function sendRaw(opcode: number, payload: Buffer): void {
    // Server→client frames are unmasked (RFC 6455 §5.1). We never fragment
    // outbound either, so the 16-bit length is all we need; 64-bit is still
    // encoded correctly for large payloads by writeLength.
    const header = writeHeader(opcode, payload.length, false);
    socket.write(Buffer.concat([header, payload]));
  }

  function doClose(code: number, reason: string): void {
    if (closed) return;
    closed = true;
    const body = Buffer.allocUnsafe(2 + Buffer.byteLength(reason));
    body.writeUInt16BE(code, 0);
    body.write(reason, 2, 'utf8');
    sendRaw(OP_CLOSE, body);
    socket.end();
    onClose(code, reason);
  }

  function sendPong(payload: Buffer): void {
    sendRaw(OP_PONG, payload);
  }

  return {
    socket,
    send: (f) => {
      if (closed) return;
      if (f.kind === 'text') sendRaw(OP_TEXT, Buffer.from(f.text, 'utf8'));
      else if (f.kind === 'pong') sendRaw(OP_PONG, f.payload);
      else doClose(f.code, f.reason);
    },
    close: doClose,
    isClosed: () => closed,
  };
}

/** Encode a frame header for an outbound (unmasked) frame. */
function writeHeader(opcode: number, len: number, masked: boolean): Buffer {
  const maskBit = masked ? 0x80 : 0;
  if (len < 126) {
    return Buffer.from([0x80 | opcode, maskBit | len]);
  }
  if (len < 0x10000) {
    const h = Buffer.allocUnsafe(4);
    h[0] = 0x80 | opcode;
    h[1] = maskBit | 126;
    h.writeUInt16BE(len, 2);
    return h;
  }
  const h = Buffer.allocUnsafe(10);
  h[0] = 0x80 | opcode;
  h[1] = maskBit | 127;
  h.writeBigUInt64BE(BigInt(len), 2);
  return h;
}

/**
 * Parse exactly one frame from the front of `buf`, or null if there are not
 * enough bytes yet.
 *
 * Unmasked client frames are refused (RFC requires client masking). Everything
 * we do not understand is returned as a Disallowed frame so the caller closes
 * with 1002 rather than mis-interpreting the stream.
 */
function parseFrame(
  buf: Buffer,
  midFragment: boolean,
): { frame: WireFrame; consumed: number; midFragment: boolean } | null {
  if (buf.length < 2) return null;
  const b0 = buf[0] ?? 0;
  const b1 = buf[1] ?? 0;
  const fin = (b0 & 0x80) !== 0;
  const opcode = b0 & 0x0f;
  const masked = (b1 & 0x80) !== 0;
  let len = b1 & 0x7f;
  let offset = 2;

  // Client frames MUST be masked. An unmasked frame is protocol error.
  if (!masked) {
    return {
      frame: { kind: 'close', code: 1002, reason: 'client frames must be masked' },
      consumed: buf.length,
      midFragment,
    };
  }

  if (len === 126) {
    if (buf.length < offset + 2) return null;
    len = buf.readUInt16BE(offset);
    offset += 2;
  } else if (len === 127) {
    if (buf.length < offset + 8) return null;
    const big = buf.readBigUInt64BE(offset);
    // A client claiming a >4GiB frame on a local text channel is broken.
    if (big > BigInt(0xffffffff)) {
      return {
        frame: { kind: 'close', code: 1002, reason: 'oversized frame' },
        consumed: buf.length,
        midFragment,
      };
    }
    len = Number(big);
    offset += 8;
  }

  if (buf.length < offset + 4 + len) return null;
  const mask = buf.subarray(offset, offset + 4);
  const payload = buf.subarray(offset + 4, offset + 4 + len);
  const consumed = offset + 4 + len;

  // Unmask the payload (XOR with the 4-byte key, cycling).
  const unmasked = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) {
    unmasked[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0);
  }

  const nextMid = midFragment || (opcode === OP_TEXT && !fin);

  switch (opcode) {
    case OP_TEXT:
      if (!fin) {
        // A text frame that is not final = fragmentation. Out of scope.
        return { frame: { kind: 'fragmented' }, consumed, midFragment: nextMid };
      }
      return {
        frame: { kind: 'text', text: unmasked.toString('utf8') },
        consumed,
        midFragment: false,
      };
    case OP_CONTINUATION:
      // We never start a fragment, so a continuation is always stray.
      return { frame: { kind: 'fragmented' }, consumed, midFragment: false };
    case OP_BINARY:
      return { frame: { kind: 'binary' }, consumed, midFragment: nextMid };
    case OP_PING:
      return { frame: { kind: 'ping', payload: unmasked }, consumed, midFragment };
    case OP_PONG:
      return { frame: { kind: 'pong' }, consumed, midFragment };
    case OP_CLOSE:
      // 2-byte status code is optional; absent means 1000.
      if (unmasked.length >= 2) {
        const code = unmasked.readUInt16BE(0);
        return {
          frame: { kind: 'close', code, reason: unmasked.subarray(2).toString('utf8') },
          consumed,
          midFragment,
        };
      }
      return { frame: { kind: 'close', code: 1000, reason: '' }, consumed, midFragment };
    default:
      // Unknown opcode → protocol error, never a silent skip.
      return {
        frame: { kind: 'close', code: 1002, reason: `unsupported opcode ${opcode}` },
        consumed: buf.length,
        midFragment,
      };
  }
}

/** Server type shim so callers can pass an http.Server without importing here. */
export type { Server } from 'node:http';

/** Test helper: build a masked client text frame, as a browser would send. */
export function encodeClientText(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0);
  let header: Buffer;
  if (payload.length < 126) header = Buffer.from([0x81, 0x80 | payload.length]);
  else if (payload.length < 0x10000) {
    header = Buffer.allocUnsafe(4);
    header[0] = 0x81;
    header[1] = 0x80 | 126;
    header.writeUInt16BE(payload.length, 2);
  } else {
    header = Buffer.allocUnsafe(10);
    header[0] = 0x81;
    header[1] = 0x80 | 127;
    header.writeBigUInt64BE(BigInt(payload.length), 2);
  }
  return Buffer.concat([header, mask, masked]);
}

/** Test helper: build an unmasked client frame (invalid — must be refused). */
export function encodeUnmaskedText(text: string): Buffer {
  const payload = Buffer.from(text, 'utf8');
  const header = Buffer.from([0x81, payload.length]);
  return Buffer.concat([header, payload]);
}

/** Test helper: build a binary client frame (out of scope → 1002). */
export function encodeClientBinary(bytes: Buffer): Buffer {
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.allocUnsafe(bytes.length);
  for (let i = 0; i < bytes.length; i++) masked[i] = (bytes[i] ?? 0) ^ (mask[i % 4] ?? 0);
  return Buffer.concat([Buffer.from([0x82, 0x80 | bytes.length]), mask, masked]);
}

/** Test helper: build a fragmented text frame (out of scope → 1002). */
export function encodeClientFragment(text: string): Buffer {
  const half = Math.ceil(text.length / 2);
  const a = Buffer.from(text.slice(0, half), 'utf8');
  const b = Buffer.from(text.slice(half), 'utf8');
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const maskPayload = (p: Buffer) => {
    const out = Buffer.allocUnsafe(p.length);
    for (let i = 0; i < p.length; i++) out[i] = (p[i] ?? 0) ^ (mask[i % 4] ?? 0);
    return out;
  };
  // First frame: text, FIN=0 (0x01); continuation: FIN=1 (0x80)
  const f1 = Buffer.concat([Buffer.from([0x01, 0x80 | a.length]), mask, maskPayload(a)]);
  const f2 = Buffer.concat([Buffer.from([0x80, 0x80 | b.length]), mask, maskPayload(b)]);
  return Buffer.concat([f1, f2]);
}

/** Test helper: build a client ping frame. */
export function encodeClientPing(payload: Buffer): Buffer {
  const mask = Buffer.from([0x12, 0x34, 0x56, 0x78]);
  const masked = Buffer.allocUnsafe(payload.length);
  for (let i = 0; i < payload.length; i++) masked[i] = (payload[i] ?? 0) ^ (mask[i % 4] ?? 0);
  return Buffer.concat([Buffer.from([0x89, 0x80 | payload.length]), mask, masked]);
}
