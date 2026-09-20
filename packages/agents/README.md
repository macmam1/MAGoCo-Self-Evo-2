# @magoco/agents

The agent core of MAGoCo-Self-Evo-2 — the think/act loop, the LLM router, function
calling, and the memory seam. Implements `MASTER_PLAN.md` §2.1, §2.2 and §2.9.

Zero runtime dependencies. It runs on Node's built-ins (`fetch`, `ReadableStream`)
and TypeScript's own toolchain, which is what lets the loop be embedded anywhere —
a CLI, a server, a desktop app, or another agent.

## What's here

```
src/
  llm.ts        the message model, the provider contract, tiers, usage
  schema.ts     the JSON-Schema subset the framework validates against
  tools.ts      the tools seam: validate arguments, call, or fail gracefully
  scripted.ts   a deterministic provider — for tests, never for production
  providers/
    openai.ts   every OpenAI-compatible backend, including local ones
    anthropic.ts  Anthropic's own wire format
    free.ts     the free-tier (keyless) catalogue — documented, not enabled
  router.ts     tier mapping, automatic fallback, cost accounting
  memory.ts     the magoco.memory.* seam over the three-layer store
  loop.ts       the ReAct loop
```

## The two seams

The loop knows nothing about HTTP. It takes two injectable functions:

```ts
import { runLoop, OpenAiProvider, invokeTool } from '@magoco/agents';

const llm = new OpenAiProvider({
  baseUrl: 'https://api.openai.com/v1',
  apiKey: process.env.OPENAI_API_KEY,      // or leave the key out for a local box
  model: 'gpt-4o-mini',
});

const result = await runLoop(
  (req) => llm.complete(req),
  invokeTool(tools),                        // see "Tools" below
  {
    agentId: 'triage',
    sessionId: 's1',
    task: 'Find the oldest open issue and summarise it.',
    tools,
    maxSteps: 12,                           // hard ceiling, no default infinity
    tier: 'balanced',
  },
);

console.log(result.answer);
console.log(result.completed);   // false => the run ended on a limit, not an answer
console.log(result.trace);       // every message, in order
```

A run ends in exactly one of four ways: a real answer, `max_steps`, an `llm_error`
that survived fallback, or `no_answer`. `result.completed` tells you which — there is
no path where a failure is swallowed and the loop keeps spending.

## Providers

`OpenAiProvider` speaks the OpenAI Chat Completions wire format. That one adapter
covers OpenAI itself, Azure (`azureDeployment` + `apiVersion`), xAI, DeepSeek,
Qwen, Mistral, Groq, OpenRouter, Together, Fireworks, Cohere — and every local
server that implements the same format: Ollama, llama.cpp, LM Studio, vLLM, SGLang.
A local box is just a base URL with no key:

```ts
new OpenAiProvider({ baseUrl: 'http://127.0.0.1:8432/v1', model: 'qwen.gguf' });
```

`AnthropicProvider` exists because Anthropic's format genuinely differs: the system
prompt lives outside `messages`, tool calls are content blocks, and `max_tokens` is
mandatory. Trying to shoehorn it into the OpenAI shape is what breaks at 2am, so it
is a second adapter over the same contract.

### Streaming

Both adapters stream. The interesting detail: some gateways stream even when you did
not ask them to. If a body starts with `data:`, it is collected as SSE instead of
being handed to `JSON.parse`, so one code path works against OpenAI and against
gateways that ignore `stream: false`.

## The router

```ts
const router = new LlmRouter({
  providers: [providerA, providerB],
  fallback: true,        // a failed provider is retried on the next in line
});
```

Tier (`fast` / `balanced` / `heavy`) maps a weight class to a provider rather than
hard-coding a model name. If `providerA` fails, the router moves on and records why —
`NoProviderSucceededError` means every candidate failed, and the loop surfaces that
instead of silently retrying forever.

## Tools

```ts
const tools = [
  {
    capability: 'magoco.text.letters',
    description: 'Count the letters in a word.',
    parameters: { type: 'object', properties: { word: { type: 'string' } }, required: ['word'] },
  },
];
```

Arguments are validated against the schema before the tool runs. A tool that does not
exist, or a call with bad arguments, is reported back to the model as an error it can
correct — not thrown, not dropped. That is what keeps a broken tool from ending the run.

## Memory

`MemoryCapability` exposes the three layers behind one contract — working memory for
the current turn, episodic for the session, and the semantic store for durable facts.
`magoco.memory.*` is the only door the agent package opens into `@magoco/core`; the
store implementation stays where phase 0 put it.

## Testing

```bash
pnpm test              # contract tests: offline, deterministic, no network needed
```

59 tests in this package, plus 28 in `@magoco/core`. `tsc --noEmit` is part of the
same gate — types must be clean, not just present.

The **live suite** is separate and opt-in. It sends real requests to real backends
and asserts the protocol — connection, round-trip, streaming parse, loop closure —
rather than the model's intelligence. It is deliberately excluded from CI: a third
party's outage must never break a local `pnpm test`.

```bash
# against a local llama.cpp
MAGOCO_LOCAL_BASE_URL=http://127.0.0.1:8432/v1 \
MAGOCO_LOCAL_MODEL=qwen.gguf \
  node --test --import tsx test/live/live.test.ts

# against an OpenAI-compatible gateway
MAGOCO_TEST_BASE_URL=… MAGOCO_TEST_API_KEY=… MAGOCO_TEST_MODEL=… \
  node --test --import tsx test/live/live.test.ts
```

Local LLMs are a first-class target, not a footnote. The live suite runs against
llama.cpp + Qwen2.5-0.5B on CPU and passes: text, tool calling, and streaming.

## Free-tier providers

`src/providers/free.ts` documents the exact mechanism OpenCode Zen and Kilo Code use
to offer models with no key and no sign-in. It is documented and **not enabled**.

The mechanism is not a secret and not a hack: a literal `Bearer public` token plus
`User-Agent: opencode/<version>` and session headers. It works, and it is genuinely
useful for a user who has no local hardware and no API key — exactly the case it
exists for.

It is off because the free tier refuses datacenter IPs (`403 FreeTierError`), which
is where this project runs. The point of documenting it in the tree is that turning
it on later is a profile entry, not a code change, and the adapter already carries
the `userAgent` field and an anonymous marker so a keyless gateway can never be
mistaken for a keyed one.

## Stability

`@magoco/core`'s three phase-0 surfaces — the capability seam, the event bus, the
store — are consumed here, not modified. Phase 0 code is untouched; see `git log`.
