/**
 * The HTTP server (spec §6.1): serves the static UI and upgrades WebSocket
 * connections. Node's built-in http only — no framework, no runtime deps.
 *
 * It binds 127.0.0.1 only. That is not a limitation, it is the security
 * boundary for this phase: the UI is single-user and local until Phase 10.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import type { AddressInfo } from 'node:net';
import type { Socket } from 'node:net';
import type { ClientCommand, ClientFrame } from './protocol.js';
import { isClientCommand, PROTOCOL_VERSION } from './protocol.js';
import type { FsCommand, FsFrame } from '../../sandbox/src/fs-protocol.js';
import { isFsCommand } from '../../sandbox/src/fs-protocol.js';
import { upgradeWebSocket, type WireFrame } from './ws.js';
import { isTransformable, transformFile } from './transform.js';

interface HumanTask {
  type: 'human/task';
  task: {
    id: string;
    kind: 'captcha' | 'approval' | 'correction';
    prompt: string;
    payload?: any;
    timeout: number;
  };
}

interface HumanResult {
  type: 'human/result';
  task_id: string;
  status: 'approved' | 'denied' | 'correction';
  data?: any;
}

function isHumanCommand(x: unknown): x is HumanTask {
  return (x as any)?.type === 'human/task';
}

export interface ServeOptions {
  /** Directory served at `/`. Defaults to ../ui/dist. */
  readonly staticDir: string;
  /** Health provider — if supplied, GET /api/health returns its status. */
  readonly healthProvider?: { getStatus(): { status: string; uptime: number; version: string; timestamp: number } };
  /** Re-read files from disk on every request when true (dev mode). */
  readonly noCache: boolean;
  /** Bind host. Hard-overridden to 127.0.0.1 — never 0.0.0.0. */
  readonly host?: string;
  readonly port?: number;
  /** Handles a parsed chat command from a client. */
  readonly onCommand: (cmd: ClientCommand, reply: (f: ClientFrame) => void) => void;
  /** Handles a parsed filesystem command from a client (the /fs socket). */
  readonly onFsCommand?: (
    cmd: FsCommand,
    reply: (f: FsFrame) => void,
  ) => void;
  /** Handles a human task request from the client. */
  readonly onHumanTask?: (
    task: HumanTask,
    reply: (f: ClientFrame) => void,
  ) => void;
  /** Handles a run request (POST /api/run). */
  readonly onRunCommand?: (
    body: { source: string; language: 'js' | 'py' },
    reply: (resp: { code: number; stdout: string; stderr: string }) => void,
  ) => void;
  /** Handles an edit request (POST /api/edit). */
  readonly onEditCommand?: (
    body: { files: { path: string; content: string }[] },
    reply: (resp: { results: { path: string; success: boolean; error?: string }[] }) => void,
  ) => void;
  /** Called when a socket closes; the server drops it from its set. */
  readonly onSocketClose?: () => void;
  /** Terminal provider for /terminal WebSocket. */
  readonly termProvider?: { start(request: { command: string; args: string[] }): { onOutput: (cb: (data: string) => void) => void; onData: (data: string) => void; kill: () => void } };
}

export interface ServeHandle {
  readonly port: number;
  readonly host: string;
  readonly baseUrl: string;
  close: () => Promise<void>;
  /** Send a frame to every connected client. */
  broadcast: (f: ClientFrame) => void;
}

const CONTENT_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

/**
 * Start the server. Refuses to bind anything but the loopback interface.
 *
 * `host` is accepted in the options only so a caller cannot be tempted to
 * pass 0.0.0.0 by accident — it is ignored and 127.0.0.1 is used.
 */
export function serve(opts: ServeOptions): Promise<ServeHandle> {
  return new Promise((resolve, reject) => {
    const host = '127.0.0.1';
    const sockets = new Set<Socket>();
    const senders = new Set<(f: ClientFrame) => void>();

    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url ?? '/', 'http://x').pathname);
      // GET /api/health — liveness + readiness probe
      if (req.method === 'GET' && urlPath === '/api/health') {
        const body = opts.healthProvider
          ? JSON.stringify(opts.healthProvider.getStatus())
          : JSON.stringify({ status: 'healthy', uptime: 0, version: 'unknown', timestamp: Date.now() });
        res.writeHead(200, { 'content-type': 'application/json' });
        res.end(body);
        return;
      }
      // POST /api/run — code execution endpoint
      if (req.method === 'POST' && urlPath === '/api/run') {
        if (!opts.onRunCommand) {
          res.writeHead(501).end('not implemented');
          return;
        }
        const onRunCommand = opts.onRunCommand;
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (typeof data.source !== 'string' || !['js', 'py'].includes(data.language)) {
              res.writeHead(400).end('invalid request');
              return;
            }
            onRunCommand(data, (resp) => {
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(JSON.stringify(resp));
            });
          } catch {
            res.writeHead(400).end('invalid json');
          }
        });
        return;
      }
      // POST /api/edit — atomic multi-file edit endpoint
      if (req.method === 'POST' && urlPath === '/api/edit') {
        if (!opts.onEditCommand) {
          res.writeHead(501).end('not implemented');
          return;
        }
        let body = '';
        req.on('data', (chunk) => { body += chunk; });
        req.on('end', () => {
          try {
            const data = JSON.parse(body);
            if (!Array.isArray(data.files)) {
              res.writeHead(400).end('invalid request');
              return;
            }
            opts.onEditCommand?.(data, (resp) => {
              res.writeHead(200, { 'content-type': 'application/json' });
              res.end(JSON.stringify(resp));
            });
          } catch {
            res.writeHead(400).end('invalid json');
          }
        });
        return;
      }
      // Prevent path traversal: anything that escapes staticDir is refused.
      const resolved = path.resolve(opts.staticDir, '.' + (urlPath === '/' ? '/index.html' : urlPath));
      if (!resolved.startsWith(path.resolve(opts.staticDir))) {
        res.writeHead(403).end('forbidden');
        return;
      }
      // Dev transform (spec §6.2, no bundler): `.ts` under /src is transformed
      // to ESM on the fly. Everything else is served verbatim.
      if (isTransformable(urlPath)) {
        transformFile(opts.staticDir, urlPath)
          .then((code) => {
            res.writeHead(200, {
              'content-type': 'text/javascript',
              ...(opts.noCache ? { 'cache-control': 'no-store' } : {}),
            });
            res.end(code);
          })
          .catch(() => res.writeHead(404).end('not found'));
        return;
      }
      fs.readFile(resolved, (err, data) => {
        if (err) {
          res.writeHead(404).end('not found');
          return;
        }
        res.writeHead(200, {
          'content-type': CONTENT_TYPES[path.extname(resolved)] ?? 'application/octet-stream',
          ...(opts.noCache ? { 'cache-control': 'no-store' } : {}),
        });
        res.end(data);
      });
    });

    server.on('upgrade', (req, socket: Socket) => {
      const url = req.url ?? '/';
      // Only our own endpoints are upgraded; anything else is refused.
      if (url !== '/ws' && url !== '/fs' && url !== '/terminal') {
        socket.destroy();
        return;
      }
      // Terminal upgrade
      if (url === '/terminal' && opts.termProvider) {
        const sess = opts.termProvider.start({ command: 'bash', args: ['-i'] });
        sess.onOutput((data) => {
          socket.write(data);
        });
        socket.on('data', (chunk) => {
          sess.onData(chunk.toString());
        });
        socket.on('close', () => {
          sess.kill();
          opts.onSocketClose?.();
        });
        return;
      }
      let handle: ReturnType<typeof upgradeWebSocket> = null;
      const upgrade = upgradeWebSocket(
        req,
        socket,
        (frame: WireFrame) => {
          // A frame outside our scope already closed the socket in ws.ts.
          if (frame.kind !== 'text') return;
          let parsed: unknown;
          try {
            parsed = JSON.parse(frame.text);
          } catch {
            handle?.send({ kind: 'close', code: 1002, reason: 'invalid json' });
            return;
          }
          // The filesystem channel has its own command vocabulary; route it
          // before the chat one so the two never see each other's frames.
          if (isFsCommand(parsed)) {
            opts.onFsCommand?.(parsed as FsCommand, fsReply);
            return;
          }
          if (isHumanCommand(parsed)) {
            opts.onHumanTask?.(parsed as HumanTask, reply);
            return;
          }
          if (!isClientCommand(parsed)) {
            handle?.send({
              kind: 'text',
              text: JSON.stringify({ t: 'error', message: 'unknown command' }),
            });
            return;
          }
          opts.onCommand(parsed, (f) => handle?.send({ kind: 'text', text: JSON.stringify(f) }));
        },
        () => {
          sockets.delete(socket);
          senders.delete(reply);
          opts.onSocketClose?.();
        },
      );
      handle = upgrade;
      if (!handle) return;
      sockets.add(socket);
      const reply = (f: ClientFrame) => handle.send({ kind: 'text', text: JSON.stringify(f) });
      const fsReply = (f: FsFrame) => handle.send({ kind: 'text', text: JSON.stringify(f) });
      senders.add(reply);
      reply({ t: 'hello', sessionId: null, version: PROTOCOL_VERSION });
    });

    server.on('error', reject);
    server.listen(opts.port ?? 0, host, () => {
      const addr = server.address() as AddressInfo;
      const port = addr.port;
      resolve({
        port,
        host,
        baseUrl: `http://${host}:${port}`,
        broadcast: (f) => { for (const s of senders) s(f); },
        close: () => new Promise((r) => {
          for (const s of sockets) s.destroy();
          server.close(() => r());
        }),
      });
    });
  });
}
