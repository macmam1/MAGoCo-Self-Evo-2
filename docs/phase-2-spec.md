# Phase 2 — Minimal Visible Interface

**Status:** DRAFT — awaiting approval
**Spec owner:** macmam1
**Prior phase:** `0dfe0ae` + `d771ad7` (Phase 1, closed, 88 tests green from a fresh clone)
**Master plan ref:** §3 Phase 2, §2.10, §2.17 (partial), §1.5

> «از اینجا محصول قابل لمسه.» — MASTER_PLAN.md §3, Phase 2

## 0. What this phase is

Until now MAGoCo has been a library: a user types code, an agent runs, a
`LoopResult` comes back. Phase 2 makes it **a product a human can use without
writing code**.

Concretely: a web UI you open in a browser, a chat box you type into, and the
agent's answer streaming back live, token by token, with tool calls appearing
inline as they execute.

This phase does **not** build: the code sandbox (Phase 3), browser (Phase 4),
workflow designer (Phase 5), auth or multi-user (Phases 10–11). It deliberately
stops at "one human, one session, one agent, in a browser".

## 1. Scope

### 1.1 In scope

| # | Item | §ref |
|---|------|------|
| A | **HTTP server** — serves the UI and a REST/WS API over `magoco.web.*` capabilities | §2.17 |
| B | **Chat session** — create, send, stream reply, list history | §2.10 |
| C | **Streaming UI** — tokens render as they arrive; markdown + code highlighting | §2.10 |
| D | **Tool cards** — inline: name, args, status, result, latency | §2.1 |
| E | **Thinking blocks** — separate collapsible region for reasoning before the answer | §2.10 |
| F | **Conversation list + search** — past sessions, keyword search over history | §2.10 |
| G | **Command palette (Cmd+K)** — model switch, settings, clear, export | §2.17 |
| H | **Themes** — light/dark + 3 accent presets, persisted | §2.17 |
| I | **i18n** — `fa` + `en`, RTL-aware, language switcher | §2.10 |
| J | **Adaptive Canvas level 1** — chat is the canvas; panels collapse | §2.17 |
| K | **Model switch mid-conversation** — change model between turns | §2.9 |
| L | **Export conversation** — JSON + Markdown | §2.10 |
| M | **Error surfaces** — LLM failure shows a readable message + retry | §2.10 |
| N | **Profile `web`** — boots the server + UI plugins | §0.7 |

### 1.2 Explicitly out of scope

- Login, accounts, multi-user, workspaces (Phase 10/11) — **the UI is single-user and local**; it binds to `127.0.0.1` only.
- File upload / image / vision / voice (Phase 4+ §2.10 remainder).
- Branching, regenerate, edit-message — **deferred to Phase 2.5** (see §9). Regenerate *is* available via "ask again", but no edit of a past turn.
- Yjs collaboration, comments, share links (Phase 11).
- Plugin marketplace (Phase 13).

## 2. Architecture — three layers, three seams

```
┌─────────────────────────────────────────────────────────────┐
│  packages/ui          (browser — HTML/CSS/TS, zero build)    │
│   chat view · tool cards · palette · themes · i18n           │
└───────────────▲───────────────────────────────────────────────┘
                │ WebSocket (JSON frames)         HTTP (static)
┌───────────────┴───────────────────────────────────────────────┐
│  packages/web          (server — Node, no framework)          │
│   magoco.web.serve   magoco.web.session.*                     │
│   subscribes to bus, replays events over the socket           │
└───────────────▲───────────────────────────────────────────────┘
                │ CapabilityRegistry + EventBus (Phase 0)
┌───────────────┴───────────────────────────────────────────────┐
│  packages/agents       (unchanged — Phase 1)                  │
│   runLoop · LlmRouter · OpenAiProvider · AnthropicProvider    │
└─────────────────────────────────────────────────────────────────┘
```

**The UI never imports `@magoco/agents` and never talks to an LLM directly.**
It sees only `magoco.web.*` capabilities and events on the bus. This is what
keeps Phase 3+ (code, browser, workflows) from ever requiring a UI rewrite:
each adds *events*, and the UI renders whatever events arrive.

## 3. New capabilities (the `def`s)

All are `def` + `provider` + contract test, per §1.5 mechanism 1.

| Capability | Kind | Purpose |
|---|---|---|
| `magoco.web.serve` | sync | Start the HTTP+WS server on a port, return base URL |
| `magoco.web.session.create` | async | New conversation → `sessionId` |
| `magoco.web.session.list` | async | Past conversations (title, ts, model) |
| `magoco.web.session.send` | async | Send a user message; reply streams as events |
| `magoco.web.session.export` | async | JSON or Markdown of one conversation |
| `magoco.web.session.search` | async | Keyword search over history |
| `magoco.web.model.list` | async | Available models (id, label, tier, ctx) |
| `magoco.web.model.set` | async | Switch model for a session |

**Consumers see only the `def`.** The UI package imports types, not the
server package. The server package implements all eight.

### 3.1 Event vocabulary (§1.5 mechanism 2)

The server publishes; the UI subscribes. Nothing calls back.

```
magoco.session.created     { sessionId, title, modelId }
magoco.session.message     { sessionId, role, text }
magoco.session.token       { sessionId, seq, delta }        ← streaming
magoco.session.thinking    { sessionId, seq, delta }
magoco.session.tool.call   { sessionId, callId, capability, args }
magoco.session.tool.done   { sessionId, callId, outcome, ms }
magoco.session.done        { sessionId, stopReason, usage, ms }
magoco.session.failed      { sessionId, error }
magoco.session.model       { sessionId, modelId }
```

Every one of these lands in the **session log** (Phase 0), so a conversation
is replayable from disk alone and the UI can be rebuilt from events — which is
also how it re-renders after a refresh (§6.3).

## 4. The streaming contract (the hard part)

This is the one place Phase 1 and Phase 2 meet, and the seam is already
deliberate: `runLoop` was written so that `stream: true` returns an
`LlmResponse` whose `chunks` is an async iterator. The server does:

```
const res = await router.complete({ ...req, stream: true });
for await (const chunk of res.chunks) {
  bus.publish({ capability: 'magoco.session', type: 'token', payload: {...} });
}
```

**Three guarantees the UI relies on** (each is a test):

1. **Ordering** — `token` events for one session are strictly ordered by `seq`, and they arrive over the same socket in that order. No interleaving of tokens from two different sessions on one socket.
2. **Termination** — every stream ends in exactly one terminal event: `done` **or** `failed`. A socket that sees `token` and then silence forever is a bug, not a feature; a watchdog (`NoProgressTimeout`, §5) closes it and emits `failed`.
3. **No duplication** — a reconnect replays from the log, but a message already rendered is never re-stream. Resume is by `seq`, and the log is the source of truth, not client memory.

**Backpressure:** the UI applies no backpressure in this phase. The socket has
its own buffers and a 64-message-in-flight cap; beyond that the server drops
nothing but slows the model read loop with a simple `await drain()` when the
socket's buffered amount exceeds 1 MiB. This is tested, not assumed.

## 5. Termination and watchdog

Phase 1's `runLoop` already has a hard `maxSteps` ceiling and returns
`stopReason`. Phase 2 adds two server-level guards:

- **`sessionTimeoutMs`** (default 300000, 5 min) — a session that produces no
  terminal event within this window is force-failed with `failed` and a
  human-readable reason. Guards against a hung provider.
- **`idleSocketMs`** (default 45000) — a socket with no traffic and no
  in-flight session is closed by the server. Guards against leaked sockets.

Both are configurable in the profile, and both are tests (a hung provider is
simulated with `ScriptedProvider` configured to never return).

## 6. Package layout

### 6.1 `packages/web` — the server

- **No web framework.** Node's built-in `http` + a hand-rolled WebSocket
  (RFC 6455, ~150 lines) in `packages/web/src/ws.ts`. Zero runtime deps, same
  as `@magoco/agents`. **Rationale:** one dependency here means one thing that
  can break on a user's machine; the goal of Phase 2 is to *prove* the
  product, not to pick a stack. If the hand-rolled socket ever becomes a
  liability, swapping it is one file behind the same `def` — §1.5 mechanism 1.
- **Static serving.** `packages/ui/dist` is served at `/`. In dev it is
  re-read from disk on each request (no cache) so iteration needs no build
  step; in `profile=web-prod` it is read once into memory.
- **Binds `127.0.0.1` only.** No `0.0.0.0`. The UI is local and single-user
  until Phase 10. This is a security boundary, not a limitation.

### 6.2 `packages/ui` — the browser client

- **TypeScript + CSS, no bundler.** Loaded as ES modules directly from the
  page. No React/Vue/Svelte in Phase 2. **Rationale:** §5 requires a fresh
  clone to just work — `pnpm install && pnpm test` — and a bundler adds a
  build step to every contributor's loop and a version of a tool that must be
  maintained. The UI for this phase is a handful of views; plain DOM is
  faster to write, faster to load, and trivially testable with the same
  `node --test` harness that already runs.
- **`test/ui-*.test.ts`** run under `node --test` against the real DOM via a
  JSDOM-free approach: the views are pure functions `(state) => string` of
  HTML, tested by asserting on the rendered string. Interaction tests use a
  minimal fake `WebSocket` implementing only what §4 needs.

### 6.3 State from events, not from fetch

The UI keeps **no server-derived state that it could not rebuild from
events**. On load it asks `magoco.web.session.list` once, then everything
else — new messages, tokens, tool calls, model changes — arrives as events
and is folded into a single reducer. A page refresh replays the session log
and lands on the identical view. This is a test (§7, contract T-UI-6).

## 7. Test plan (the §5 gate)

Contract tests live next to the code; the suite must pass from a fresh clone.

| ID | Suite | Asserts |
|---|---|---|
| T-W1 | `web/ws.test.ts` | Handshake, frame encode/decode, ping/pong, close code |
| T-W2 | `web/server.test.ts` | Serves static, 404s unknown, binds 127.0.0.1 only, `127.0.0.1` ≠ `0.0.0.0` (bind assert) |
| T-W3 | `web/session.test.ts` | create → send → stream → done, full happy path on a real socket, `ScriptedProvider` |
| T-W4 | `web/termination.test.ts` | hung provider → `failed` within `sessionTimeoutMs`; idle socket closed |
| T-W5 | `web/export.test.ts` | JSON + Markdown round-trip; content is escaped, no template injection |
| T-W6 | `web/replay.test.ts` | Kill mid-stream, reconnect, resume by `seq`, no duplicate renders |
| T-W7 | `web/multiplex.test.ts` | Two sessions on one socket; `token` seq strictly ordered per session |
| T-U1 | `ui/views.test.ts` | `render(state)` output: message roles, markdown escapes, code block language |
| T-U2 | `ui/toolcard.test.ts` | Tool card states: pending / running / ok / error; args + latency shown |
| T-U3 | `ui/thinking.test.ts` | Reasoning in a separate region, collapsed by default, expands |
| T-U4 | `ui/i18n.test.ts` | Every user-visible string has `fa` + `en`; date/number are locale-formatted; RTL flips layout direction |
| T-U5 | `ui/palette.test.ts` | Cmd+K filters commands; Enter runs; Esc closes; no duplicate entries |
| T-U6 | `ui/reducer.test.ts` | Reducer is a pure function: replaying the same event log yields identical state |
| T-E2E | `e2e.test.ts` | **Real browser**: `magoco --profile web` → open page → type "count letters in 'MAGOCO'" → watch `letters` tool card appear → see `6`. Asserted with a headless Chromium via CDP, or, if unavailable in CI, with a scripted DOM driver that executes the same JS. |

**Live suite (opt-in, not CI):** `MAGOCO_LOCAL_BASE_URL` against the same
`llama.cpp` model from Phase 1, asserting only protocol (§1.5 of the Phase 1
spec): connect, round-trip, stream parse, tool card renders, termination.

## 8. Changes to existing surfaces

This is the part that makes or breaks §1.5. Changes here:

| Surface | Change | Why |
|---|---|---|
| `@magoco/core` capabilities, event bus, session log | **None.** | Consumed, not modified. |
| `@magoco/agents` public exports | **None.** | The server imports `runLoop` + `LlmRouter` + providers as-is. |
| `plugin.yaml` structure | **None.** | `packages/web` and `packages/ui` ship as plugins with standard manifests. |
| `pnpm-workspace.yaml` | Two packages already present as placeholders — **promoted to real**. | No new top-level shape. |
| `scripts/test-core.sh` | Adds `packages/web` and `packages/ui` typecheck + test. | Already the pattern. |

**If any of the top four rows changes, this phase has failed its own contract.**

## 9. Risks and open decisions

- **Regenerate/edit/branching** — the biggest §2.10 item not in Phase 2. It
  requires the loop to support "re-run from turn N with model M", which means
  the trace must be forkable. That is real work; deferring it to **Phase 2.5**
  (a point release, not a new phase) keeps Phase 2 shippable. *Decision
  needed:* accept the deferral, or block Phase 2 on it?
- **Voice / image / file upload** — deferred to Phase 4+ (multi-modal). Not a
  Phase 2 risk, but it means §2.10 stays partly open. *Acknowledged, not
  blocking.*
- **Headless vs browser** — `profile: headless` (Phase 0 item 7) exists but
  has no UI. Phase 2 makes `web` the default profile for interactive use;
  `headless` remains for automation. *Decision needed:* is `web` the new
  default, or must it always be explicit?
- **Bundler reconsideration** — if the UI grows past a few hundred modules
  without a bundler, `node --test` on raw ESM will stay fast but the browser
  will make many round-trips. This is a Phase 3+ problem; §1.5 means adding a
  bundler later is one build step, not a rewrite. *Not blocking.*
- **The hand-rolled WebSocket** — the main "is this wise?" question. The
  counter is §1.5 mechanism 1: the WS layer is behind `magoco.web.serve`, so
  replacing it later touches no consumer. *Decision needed: accept, or pull
  in `ws` (one dep) now?*

## 10. Done definition (§5 of the master plan)

All three, from a fresh clone of `main`:

1. **Every test green** — existing 88 + the T-W/T-U/T-E2E suites above.
2. **`tsc --noEmit` clean** — for `core`, `agents`, `web`, `ui`.
3. **A real CLI run** — `pnpm dlx magoco --profile web` from the fresh clone,
   browser opens, a question is typed, the answer streams back, a tool call
   renders as a card. Verified by hand AND by T-E2E.
