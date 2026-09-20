# Phase 1 — Agent core. Specification (v1.0-draft)

> Issue #15. **This is the approval gate.** Nothing in `packages/agents` is written
> until this spec is reviewed and approved. Everything below is deliberately precise
> where it commits the framework, and explicitly open where it does not.

## 0. Scope

Phase 1 turns the phase-0 foundation into a working agent.

**In:** LLM router (multi-provider, auto-fallback, streaming) · function calling over
the capability registry · a real ReAct loop · the three-layer memory wired into that
loop · cost/token tracking · a repeatable end-to-end scenario + contract tests + docs.

**Out (later phases):** UI (2), sandbox/code (3), browser (4), workflows (5), teams (6),
RAG (7), self-evolution (8), integrations (9), auth (10).

**Home:** new package `packages/agents`. The phase-0 stable surfaces are untouched —
phase 1 adds capabilities and consumes them. If phase 1 needs to change
`capabilities/types.ts`, `plugin.yaml`, or the session-log protocol, the spec is wrong,
not the surfaces.

---

## 1. Message model

The single currency of the loop. Every field is deliberate.

```ts
type Role = 'system' | 'user' | 'assistant' | 'tool';

interface Message {
  role: Role;
  content: string;
  /** Present only on assistant messages that requested tool calls. */
  toolCalls?: ToolCall[];
  /** Present only on tool-result messages. */
  toolCallId?: string;
  /** Present only on tool-result messages that replaced a failed call. */
  toolCallIdAlias?: string;
}

interface ToolCall {
  /** The capability id — a tool *is* a capability (§2). */
  id: string;
  capability: string;
  /** JSON string as the model produced it, parsed/validated before use. */
  arguments: string;
}
```

Why `arguments` stays a string until the boundary: it is the model's own serialization,
kept verbatim for the log; validation happens once, at the seam (§2.2), and its result
is what enters the log.

**Turn = one round trip to the model**, i.e. `n` tool calls + `1` completion. Iterations
are counted in turns, not in tokens.

## 2. Capabilities added by phase 1

### 2.1 `magoco.llm.complete` — the LLM router

```ts
interface LlmRequest {
  /** A label the agent uses to pick a tier, not a model name. */
  tier?: 'fast' | 'balanced' | 'strong';
  messages: Message[];
  tools?: ToolSchema[];
  /** When set, the reply must validate against this schema or the call fails. */
  outputSchema?: object;
  stream?: boolean;
  /** Router overrides; the agent's own config is the default. */
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** Propagated for cost attribution. */
  agentId: string;
  sessionId: string;
}

type LlmResponse =
  | { stream: false; message: Message; usage: Usage; provider: string; model: string; latencyMs: number }
  | { stream: true; chunks: AsyncIterable<LlmChunk>; usage: Promise<Usage>; provider: string; model: string };

interface Usage { promptTokens: number; completionTokens: number; costUsd: number; countedByProvider: boolean }

interface LlmChunk { delta?: string; toolCalls?: ToolCall[]; done?: boolean }
```

**Router contract:**

1. `tier` (default `balanced`) maps to a model through the agent's config. The agent
   never names a provider; it says how heavy the job is.
2. Providers are tried in configured order. On error, timeout, or a malformed reply the
   router logs and tries the next; **all candidates exhausted** throws
   `NoProviderSucceededError` with every underlying cause attached.
3. Fallback is transparent to the caller — same response shape whichever provider served.
4. `provider`/`model` in the response is always the one that actually served. Cost
   tracking (§5) is only honest if this is true.

**Open (needs your call):** which providers ship built-in. §7 lists what I'd ship and
why; the seam is provider-agnostic either way.

### 2.2 `magoco.tools.invoke` — function calling

A tool **is** a capability. The loop does not call providers directly; it goes through
the registry, so every tool inherits isolation, revocation and swap-for-free.

```ts
interface ToolSchema {
  capability: string;
  description: string;
  parameters: object;   // JSON Schema
}

interface ToolResult {
  toolCallId: string;
  ok: boolean;
  /** Structured on success. */
  output?: unknown;
  /** On failure: an error the model can read and recover from. */
  error?: string;
}
```

**At the boundary, before anything executes:**

1. `capability` must be a registered, provided capability → else a structured error,
   never an exception into the loop.
2. `arguments` is parsed and validated against the capability's `parameters`. On failure
   the model gets back an error naming the schema path, which in practice fixes the call
   on the next turn.
3. Invocation is `runtime.invoke(capability, input)` — a tool cannot reach anything the
   capability seam does not give it.
4. A thrown provider error becomes `ok: false` + a readable `error`. **The loop does not
   crash on a tool failure.** The model decides what to do with it.

Structured output: `outputSchema` present → the reply is validated; a mismatch is a
malformed reply, which triggers router fallback like any other.

### 2.3 `magoco.memory.recall` / `magoco.memory.append` — wiring the three layers

The phase-0 `Memory` becomes a capability the loop uses every turn. No new storage.

```ts
interface MemoryCapability {
  recall(sessionId: string, query: string): Promise<RecalledContext>;
  append(sessionId: string, role: string, content: unknown): number;
  compact(sessionId: string, keepLast?: number): Promise<number>;
  /** Called when a run finishes — feeds phase-8 reflection. */
  recordOutcome(sessionId: string, outcome: RunOutcome): number;
}
```

- **Before the prompt:** `recall()` assembles working turns + matching episodes + facts
  into the context.
- **Each turn:** user/assistant/tool messages are appended to working memory.
- **When `working.count > compactThreshold`** (default 40): `compact()` keeps the last
  `keepLast` (default 12), summarizes the rest into one episodic entry, drops the
  originals. The summarizer goes through the LLM router at tier `fast`.
- **When the run finishes:** `recordOutcome()` writes one episodic entry
  (`what happened` + `what to remember`). This is phase-8 reflection's input stream.

## 3. The ReAct loop

Lives in `packages/agents/src/loop.ts`.

```
recall → build prompt → LLM → has toolCalls?
   ├─ no  → append, emit agent.finished, done
   └─ yes → validate each call → invoke tools (parallel) → append observations
            → if call would exceed cap: emit agent.halted, done
            → else loop
```

**Termination — a loop that cannot run away:**

| Stop | Condition | Event |
| --- | --- | --- |
| finished | model returns no tool calls | `agent.finished` |
| halted | model signals `stop_reason: halt` or the tool is `magoco.halt` | `agent.halted` |
| capped | `turns > maxTurns` (default 12) | `agent.capped` |
| failed | every LLM provider exhausted, or a non-tool fatal error | `agent.failed` |

There is no path where the loop ends without emitting exactly one of those. A silent
hang is a bug in this spec, and `maxTurns` is a floor on cost, not a suggestion.

**Every step** is emitted on the bus → session log → replayable from disk. This is what
makes phase-2 CoT visualization cheap later: the data already exists.

**Streaming:** with `stream: true` the assistant message is yielded chunk by chunk to
the caller while tool calls are buffered until the completion closes. Streaming is
opt-in; the non-streaming path is the default so tests stay deterministic.

## 4. Configuration

Profile config, not code. All keys live under `agents`:

```yaml
agents:
  defaults:
    tier: balanced
    maxTurns: 12
    compactThreshold: 40
    keepLast: 12
  routers:
    main:
      - provider: openai
        model: gpt-4o-mini
        baseUrl: https://api.openai.com/v1
      - provider: anthropic
        model: claude-3-5-haiku-20241022
      - provider: 9router          # custom: same openai adapter, different baseUrl
        model: all
        baseUrl: https://9router.example/v1
  tiers:
    fast: { model: gpt-4o-mini }
    balanced: { model: gpt-4o-mini }
    strong: { model: gpt-4o }
```

A custom provider = a plugin folder providing `magoco.llm.complete` + a line in this
config. Nothing else.

## 5. Cost & usage tracking

- The router reports `Usage` per call; provider-reported counts are preferred and
  `countedByProvider: false` marks an estimate.
- The agent accumulates per run; each run's totals are emitted as `agent.finished`
  payload and stored via the phase-0 store so they survive a restart.
- Phase 1 records. Dashboards are phase 12 — nothing here builds UI.

## 6. Test plan

Real assertions, and a clear bar for each.

1. **Contract — router.** Two fake providers; the first fails; the second's reply is
   returned, and the failure is logged. Verify the caller sees the fallback's shape, not
   the error.
2. **Contract — tools.** A tool whose arguments fail schema validation returns
   `ok:false` with a path-bearing error and **the loop continues**. A tool that throws
   returns `ok:false` and **the loop continues**. Neither propagates.
3. **Contract — loop.** A scripted provider walks `user → tool → tool → answer` in 3
   turns and emits exactly the expected event sequence.
4. **Termination.** A provider that never stops tool-calling hits the cap and emits
   `agent.capped` — never hangs. The test has a wall-clock guard so a regression fails
   loudly instead of timing out the suite.
5. **Memory integration.** Over `compactThreshold` turns → exactly one episodic entry is
   created and working memory shrinks to `keepLast`.
6. **End-to-end scenario (§5 of MASTER_PLAN).** A real agent, real store, real tool —
   answers a question using the tool and records an outcome. Run by `scripts/test-core.sh`.
7. **Live-LLM suite (opt-in, separate).** A suite that must never gate the main one:
   - `test/live/smoke.test.ts` — the real adapter against the test endpoint:
     a real completion, a real tool call, real streaming chunks parsed.
   - `test/live/local.test.ts` — llama.cpp with Qwen2.5-0.5B-Instruct, asserting the
     **protocol** (connect, round-trip, stream parse, correct termination, a malformed
     tool call handled softly) and never asserting model intelligence. A weak model
     cannot run ReAct reliably, and this suite must not depend on it.
   - Reads credentials from the environment at runtime only. No key is ever written to
     the repo, and no part of this suite runs without the env present.
   - Skipped silently when the env is absent, so the main suite stays offline and CI-safe.

Existing 28 tests stay green. `tsc --noEmit` stays clean.

## 7. Decisions (resolved 2026-09-20)

1. **Built-in providers: two adapters.**
   - `openai` — the OpenAI-compatible API. One adapter covers OpenAI, Azure, xAI,
     DeepSeek, Qwen, Mistral, Groq, OpenRouter, Together, Fireworks, Cohere, every
     local server (Ollama, llama.cpp, LM Studio, vLLM, SGLang), and 9router.
   - `anthropic` — a separate adapter. The Anthropic wire format is genuinely
     different (system outside `messages`, `tool_use` / `tool_result` content blocks,
     mandatory `max_tokens`), so it cannot ride on the OpenAI path.
   - Everything beyond these two is a plugin providing `magoco.llm.complete`.
   - A custom provider = plugin folder + one line of config. `packages/core` stays
     dependency-free; the adapters live in `packages/agents` and speak `fetch` only.
2. **Streaming: backend in phase 1, UI in phase 2.** The router's `stream` contract is
   part of the capability surface. Deferring it would force phase 2 to reopen
   `magoco.llm.complete`, which is exactly the rewrite §1.5 forbids. Parsing SSE once
   now is cheap; rendering it belongs with the UI.
3. **Memory summarizer: the router at tier `fast` in production, a deterministic
   scripted summarizer in tests** — memory tests stay offline and CI-safe.
4. **Local-LLM test: llama.cpp + Qwen2.5-0.5B-Instruct (GGUF).** The smallest model that
   still emits the OpenAI tool-calling format correctly. It rides the same
   OpenAI-compatible path as Ollama / vLLM, so it is the cheapest real proof of the
   §2.9 "local LLM" capability without building a second adapter. Non-deterministic, so
   it lives in a separate opt-in suite (§6.7) — it never gates the main suite.
5. **Test credentials never enter the repo.** The phase-1 smoke test reads its key from
   the environment at runtime. Nothing is committed, and the key is revoked as soon as
   the adapter is verified.

---

## What this spec deliberately does not do

- No new stable surfaces. Phase 0's three surfaces are frozen.
- No persistence changes — the store from phase 0 is enough.
- No UI, no orchestration, no teams, no RAG. Each is a later phase with its own spec.
