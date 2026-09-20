"""Close the six Phase 1 issues with real verification notes (§5)."""
import json, urllib.request, os

TOKEN = open('/opt/data/.env').read().split('GITHUB_API_KEY=')[1].split('\n')[0].strip().strip('"\'')
OWNER, REPO = 'macmam1', 'MAGoCo-Self-Evo-2'
COMMIT = '0dfe0ae'

NOTES = {
    10: """Implemented and verified. `LlmRouter` (packages/agents/src/router.ts) maps a tier
(`fast`/`balanced`/`heavy`) to a provider rather than hard-coding a model name, retries
on the next provider in line when one fails, and records the outcome — ending with
`NoProviderSucceededError` when every candidate fails instead of retrying forever.

Providers are two adapters over one contract:
- `OpenAiProvider` — the OpenAI Chat Completions wire format, which also covers Azure,
  xAI, DeepSeek, Qwen, Mistral, Groq, OpenRouter, Together, Fireworks, Cohere and every
  local server (Ollama, llama.cpp, LM Studio, vLLM, SGLang). A local box is just a base
  URL with no key.
- `AnthropicProvider` — a second adapter, because Anthropic's format genuinely differs
  (system prompt outside `messages`, tool calls as content blocks, mandatory `max_tokens`).

Streaming: both adapters implement SSE. One real bug was found and fixed by the live
suite — some gateways stream even when `stream: false` is sent, so a body that starts
with `data:` is now collected as SSE rather than handed to `JSON.parse`.

Verification: 10 router tests + 15 provider tests green (local HTTP servers, no network);
live suite run against a 9router gateway and a local llama.cpp — both pass text,
tool-calling and streaming. `tsc --noEmit` clean.""",

    11: """Implemented and verified. `invokeTool` (packages/agents/src/tools.ts) validates tool
arguments against a JSON-Schema subset (`schema.ts`) *before* the tool runs. Three failure
modes are handled explicitly rather than thrown: unknown capability, invalid arguments,
and a tool that raises at runtime. Each is reported back to the model as a structured
error it can correct, so a broken tool ends the turn, not the run. Calls that don't fit
in one turn are reported rather than silently dropped.

Verification: 11 schema tests + 9 tools tests green; the ReAct loop exercises the invalid-
arguments and unknown-tool paths end to end; `tsc --noEmit` clean.""",

    12: """Implemented and verified. `runLoop` (packages/agents/src/loop.ts) is think (LLM) →
act (tool) → observe (result) → repeat, until the model replies without a tool call.
The shaping constraint is that the loop must terminate without a human watching it, so
every exit is explicit and every continuation is bounded. Four stop reasons: `answer`,
`max_steps` (hard ceiling, default 12 — no default infinity), `llm_error` survived by
fallback, `no_answer`. There is no path where the loop continues without making progress
and no path where a failure is swallowed into an infinite retry.

Verification: 11 loop tests covering all four termination paths, plus a real end-to-end
test (`test/e2e.test.ts`) that runs the loop against a real SQLite store, a real
three-layer memory, and a real tool — 3 e2e tests green. Live suite closes a real tool
loop against both a cloud gateway and a local CPU model. `tsc --noEmit` clean.""",

    13: """Implemented and verified. `MemoryCapability` (packages/agents/src/memory.ts) is the
only door the agent package opens into `@magoco/core`: working memory for the current
turn, episodic for the session, and the semantic store for durable facts, behind one
contract. The phase-0 store implementation is consumed, not modified — no line of
`packages/core` was touched.

Verification: the end-to-end test writes an episode through the seam, reads it back
through the semantic layer, and asserts the agent sees the same fact — 3 tests green
against a real store, not a mock. `tsc --noEmit` clean.""",

    14: """Implemented and verified. `Usage` (packages/agents/src/llm.ts) records input/output
tokens, and the router accumulates cost across a run and reports which provider spent
what. Usage is resolved once per response, on the same single pass as the stream, so a
streamed reply and its accounting are never out of step.

Verification: router tests assert the ledger reflects the provider that actually served
the request; provider tests assert usage is populated for both streamed and non-streamed
replies. Live suite confirms the numbers returned by a real gateway and a local model are
parsed, not stubbed. `tsc --noEmit` clean.""",

    15: """Done, and it did its job. `docs/phase-1-spec.md` was written, self-reviewed and
approved before any implementation code — the approval gate this issue asked for.

Four decisions were resolved explicitly in §7 of the spec rather than guessed at:
two built-in adapters (OpenAI-compatible + Anthropic); streaming in the backend this phase
and the UI next phase, so phase 2 is never forced to rewrite `magoco.llm.complete`; the
summarizer uses the router's `fast` tier in production and a deterministic scripted
provider in tests; the local test stack is llama.cpp + Qwen2.5-0.5B-Instruct.

The self-review caught one thing worth recording: the spec describes a `CapabilityDef.create()`
factory, but providers are called directly. Confirmed harmless — `magoco.llm.complete` uses
the same path, so the phase-0 stable surface needs no change.

Spec committed at `e41a64a`, decisions resolved at `29fd0ae`, implementation at `0dfe0ae`.""",
}

def patch_issue(num: int, body: str, state: str = 'closed'):
    url = f'https://api.github.com/repos/{OWNER}/{REPO}/issues/{num}'
    data = json.dumps({'body': body, 'state': state}).encode()
    req = urllib.request.Request(url, data=data, method='PATCH',
        headers={'Authorization': f'Bearer {TOKEN}', 'User-Agent': 'magoco',
                 'Accept': 'application/vnd.github+json'})
    with urllib.request.urlopen(req) as r:
        return json.load(r)['state']

for num in sorted(NOTES):
    state = patch_issue(num, NOTES[num])
    print(f'#{num} -> {state}')
