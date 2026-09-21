/**
 * Real end-to-end check: a browser-like client connects to the running
 * MAGoCo web server, sends a chat command over WebSocket and asserts the
 * server streams frames back. This is the "does it actually work" test —
 * HTTP 200 only proves the static dir is served.
 *
 * Zero external deps: the server implements the WS handshake by hand
 * (packages/web/src/ws.ts), so this client does the same with node:http and
 * node:crypto. Run while the server is up: npx tsx test/e2e-ws.ts <port>
 */
import { createHash } from 'node:crypto';
import * as http from 'node:http';
import { EventEmitter } from 'node:events';
import type { Socket } from 'node:net';

const port = Number(process.argv[2] ?? 3951);

class WSClient extends EventEmitter {
  private buf = Buffer.alloc(0);
  constructor(private sock: Socket) {
    super();
    sock.on('data', (c) => this.onData(c));
  }
  private onData(chunk: Buffer) {
    this.buf = Buffer.concat([this.buf, chunk]);
    // Decode as many complete frames as are buffered.
    for (;;) {
      if (this.buf.length < 2) return;
      const b0 = this.buf[0] as number;
      const fin = (b0 & 0x80) !== 0;
      const opcode = b0 & 0x0f;
      const b1 = this.buf[1] as number;
      let len = b1 & 0x7f;
      let off = 2;
      if (len === 126) {
        if (this.buf.length < 4) return;
        len = this.buf.readUInt16BE(2);
        off = 4;
      } else if (len === 127) {
        if (this.buf.length < 10) return;
        len = Number(this.buf.readBigUInt64BE(2));
        off = 10;
      }
      if (this.buf.length < off + len) return;
      const payload = this.buf.subarray(off, off + len);
      this.buf = this.buf.subarray(off + len);
      if (opcode === 1) this.emit('message', payload.toString('utf8'));
      if (opcode === 8) this.emit('close');
      if (!fin) return; // continuation not used by this server
    }
  }
  send(text: string) {
    const p = Buffer.from(text, 'utf8');
    const mask = Buffer.alloc(4);
    for (let i = 0; i < 4; i++) mask[i] = Math.floor(Math.random() * 256);
    const head =
      p.length < 126
        ? Buffer.from([0x81, 0x80 | p.length])
        : p.length < 65536
          ? Buffer.from([0x81, 0xfe, 0, 0])
          : Buffer.from([0x81, 0xff, 0, 0, 0, 0, 0, 0, 0, 0]);
    if (p.length >= 126 && p.length < 65536) head.writeUInt16BE(p.length, 2);
    if (p.length >= 65536) head.writeBigUInt64BE(BigInt(p.length), 2);
    const masked = Buffer.alloc(p.length);
    for (let i = 0; i < p.length; i++) masked[i] = p[i] ^ mask[i % 4];
    this.sock.write(Buffer.concat([head, mask, masked]));
  }
}

const key = createHash('sha1')
  .update('e2e-client' + Date.now())
  .digest('base64')
  .slice(0, 16);

const req = http.request(
  {
    host: '127.0.0.1',
    port,
    path: '/ws',
    headers: {
      Connection: 'Upgrade',
      Upgrade: 'websocket',
      'Sec-WebSocket-Key': key,
      'Sec-WebSocket-Version': '13',
    },
  },
  (res) => {
    console.log('FAIL server did not upgrade; HTTP', res.statusCode);
    process.exit(1);
  },
);

const frames: string[] = [];
let done = false;
const finish = (ok: boolean, msg: string) => {
  if (done) return;
  done = true;
  console.log(`${ok ? 'PASS' : 'FAIL'} ${msg}`);
  console.log(`frames: ${frames.length}`);
  for (const f of frames.slice(0, 10)) console.log('  ', f.slice(0, 170));
  process.exit(ok ? 0 : 1);
};

req.on('upgrade', (_res, sock, head) => {
  const ws = new WSClient(sock);
  if (head.length) ws.emit('message', head.toString());
  ws.on('message', (t: string) => {
    frames.push(t);
    let f: { t?: string; message?: string; text?: string; delta?: string; role?: string } = {};
    try {
      f = JSON.parse(t);
    } catch {
      /* non-JSON frame */
    }
    // After `create` lands, send the chat message.
    if (f.t === 'session_created') {
      console.log('session created; sending chat');
      ws.send(JSON.stringify({ c: 'send', text: 'Reply with the single word: OK' }));
      return;
    }
    // Success only on an assistant message or a real streamed token; the
    // user-message echo is NOT an answer, so keep waiting.
    const isAssistant = f.t === 'session_message' && f.role === 'assistant';
    const hasContent = (isAssistant || f.t === 'session_token') && (f.text ?? f.delta) !== undefined;
    if (hasContent) {
      finish(true, `server answered: ${JSON.stringify(f.text ?? f.delta).slice(0, 120)}`);
    }
    if (f.t === 'error' || f.t === 'final' || f.t === 'session_failed' || frames.length > 40) {
      finish(false, `${f.message ?? `unexpected frame type ${f.t}`}`);
    }
  });
  ws.on('close', () => finish(frames.length > 0, `socket closed after ${frames.length} frame(s)`));
  console.log('handshake ok; sending create');
  ws.send(JSON.stringify({ c: 'create' }));
});

req.on('error', (e) => finish(false, `connect error: ${String(e)}`));
req.end();
setTimeout(() => finish(frames.length > 0, `timeout after 20s (${frames.length} frames)`), 20_000);
