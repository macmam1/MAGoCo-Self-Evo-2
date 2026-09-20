# @magoco/web

The MAGoCo HTTP + WebSocket server. Serves the browser UI and streams chat
sessions to it. Node built-ins only — no framework, no runtime dependencies
(spec §6.1).

## What it does

- Serves `packages/ui` as static files
- Accepts WebSocket connections on `/ws`
- Runs one chat session per connection and streams every event to the browser
- Force-fails any session that hangs past the watchdog (spec guarantee 1)

## Bind address

**127.0.0.1 only.** This is a security boundary, not a config option — the
server is single-user until Phase 10 (spec §6.1). Binding to 0.0.0.0 exposes
the whole session stream to the network.

## Usage

```ts
import { createWebServer } from '@magoco/web';

const server = createWebServer({
  port: 3837,
  staticRoot: new URL('../../ui/', import.meta.url),
  llm: /* an LlmCall from @magoco/agents */,
  modelId: 'qwen2.5:0.5b',
  timeoutMs: 5 * 60_000,
});
await server.listen();
```

## Protocol

See `src/protocol.ts` — the event vocabulary is the only coupling between this
package and `@magoco/ui`. Both import it; neither imports the other.

## Scope of the WebSocket implementation

`src/ws.ts` is hand-rolled (spec §9 decision 3). It accepts unfragmented text
frames, ping/pong, and close. Binary, fragmented, and unknown frames are
closed with 1002 and a reason — never silently mis-parsed. The moment binary
or fragmentation is needed (Phase 4, voice/image) this file is swapped for the
`ws` library and no consumer changes.

## Tests

`pnpm test` — 18 tests covering handshake, frame encoding, the fragmentation
reject line, session streaming, the watchdog, and export.
