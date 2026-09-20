"""Open the Phase 1 milestone and issues (agent core)."""
import json
import urllib.request
import urllib.error

TOKEN = [l.split("=", 1)[1].strip() for l in open("/opt/data/.env") if l.startswith("GITHUB_API_KEY=")][0]
API = "https://api.github.com/repos/macmam1/MAGoCo-Self-Evo-2"


def api(method, url, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + url,
        data=data,
        method=method,
        headers={
            "Authorization": "token " + TOKEN,
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "magoco",
            "Content-Type": "application/json",
        },
    )
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            return r.status, (json.loads(raw) if raw else None)
    except urllib.error.HTTPError as e:
        return e.code, json.loads(e.read().decode())


code, ms = api("POST", "/milestones", {
    "title": "Phase 1 — Agent core",
    "state": "open",
    "description": (
        "MASTER_PLAN.md §3, phase 1 — the first thing that cannot exist without "
        "phase 0:\n\n"
        "a real ReAct loop + function-calling + the three-layer memory wired in + an "
        "LLM router with auto-fallback + streaming.\n\n"
        "Definition of done (§5): checklist ticked, real tests passing, docs written, "
        "and a repeatable real scenario (an agent that answers a question using a tool "
        "and remembers the outcome)."
    ),
})
print("milestone:", code, ms.get("number") if isinstance(ms, dict) else ms)
MS = ms["number"]

ISSUES = [
    {
        "title": "LLM router — one interface, providers, auto-fallback, streaming",
        "labels": ["phase-1", "llm"],
        "body": (
            "## What\n"
            "The `magoco.llm.complete` capability: one interface the rest of the "
            "framework programs against, many providers behind it.\n\n"
            "## Why\n"
            "MASTER_PLAN.md §2.9. The router is a **capability**, not a module the agent "
            "imports — so a user adds a provider by dropping a plugin folder, and swaps "
            "a model mid-conversation by changing config, never code (§1.5).\n\n"
            "## Contract\n"
            "- providers declare `id`, `model`, and a `complete()` that supports both "
            "plain and **streaming** responses\n"
            "- the router tries providers in configured order and **auto-falls back** on "
            "error/timeout, logging which one served\n"
            "- custom providers are first-class: the built-in list is not special\n"
            "- local LLMs are selectable per profile\n\n"
            "## Open decision\n"
            "Which providers ship built-in. The user's own 9router is one provider, not "
            "a replacement for the seam — the seam stays provider-agnostic."
        ),
    },
    {
        "title": "Function calling + structured output (JSON schema)",
        "labels": ["phase-1", "agent"],
        "body": (
            "## What\n"
            "Standard tool/function-calling over the capability registry: the model "
            "declares a tool by capability id, the loop resolves and invokes it through "
            "the registry, and the observation goes back to the model.\n\n"
            "## Why\n"
            "MASTER_PLAN.md §2.1. Tools are **capabilities** — so every tool is "
            "isolated, swappable and revocable like any plugin, and a new tool is one "
            "folder + one manifest.\n\n"
            "## Contract\n"
            "- tool schema is derived from the capability `def` where possible\n"
            "- a tool call is validated before invocation; a bad call is reported back "
            "to the model as an observation rather than crashing the loop\n"
            "- structured output requests a JSON Schema and validates the reply against it"
        ),
    },
    {
        "title": "ReAct loop — think → act → observe, real not textual",
        "labels": ["phase-1", "agent"],
        "body": (
            "## What\n"
            "The agent loop in `packages/agents`: a genuine Reason→Act→Observe cycle "
            "that terminates, not a prompt that mimes one.\n\n"
            "## Why\n"
            "MASTER_PLAN.md §2.1 — \"حلقه‌ی ReAct واقعی — نه fallback متنی\". The "
            "distinction that matters: tool calls actually execute and their results "
            "actually enter the next turn.\n\n"
            "## Contract\n"
            "- bounded: max iterations and max tokens per run, both configurable\n"
            "- every step is emitted on the bus and lands in the session log, so any run "
            "is replayable from disk\n"
            "- the loop ends on: a final answer, a halt signal from the model, the "
            "iteration cap, or an unrecoverable error — never silently\n"
            "- the reasoning trace is observable (groundwork for CoT visualization in "
            "phase 2)\n"
            "- cost tracking per run (tokens in/out, model used)"
        ),
    },
    {
        "title": "Wire the three-layer memory into the agent loop",
        "labels": ["phase-1", "memory"],
        "body": (
            "## What\n"
            "The phase-0 `Memory` becomes the `magoco.memory` capability and the loop "
            "uses it every turn: `recall()` before the prompt, `append()` for each turn, "
            "`compact()` when working memory exceeds its bound.\n\n"
            "## Why\n"
            "The memory layer exists and is tested but is not yet connected to "
            "anything. This issue is the connection — no new storage code, just the "
            "capability seam and the loop integration.\n\n"
            "## Contract\n"
            "- one recall per turn assembles working turns + matching episodes + facts "
            "into the prompt context\n"
            "- compaction is automatic at a configurable threshold\n"
            "- when the loop finishes, the outcome is recorded as an episodic entry "
            "(what happened + what to remember) — groundwork for phase 8 reflection"
        ),
    },
    {
        "title": "Cost tracking and token usage per agent",
        "labels": ["phase-1", "agent"],
        "body": (
            "## What\n"
            "Every LLM call records tokens in/out, the model used, latency and a cost "
            "estimate, attributed to the agent and session.\n\n"
            "## Why\n"
            "MASTER_PLAN.md §2.1 and §2.14. Phase 1 only needs the *recording* to be "
            "honest and queryable; the dashboards are phase 12.\n\n"
            "## Contract\n"
            "- recorded through the store so it survives a restart\n"
            "- emitted on the event bus so anything can aggregate it\n"
            "- provider-reported counts preferred, estimated and marked as such when "
            "absent"
        ),
    },
    {
        "title": "Phase 1 spec — precise, reviewed, before implementation",
        "labels": ["phase-1", "documentation"],
        "body": (
            "## What\n"
            "A written spec for phase 1: the exact capability ids, message and tool-call "
            "types, router config shape, loop termination rules and the test plan — "
            "reviewed and approved before a line of implementation.\n\n"
            "## Why\n"
            "This is how this project is run: plan-first, approval-gated **on the "
            "spec**. Implementation is self-directed only after the spec is final.\n\n"
            "## Blocked by\n"
            "Nothing. This is the entry point to the milestone — the other issues "
            "describe the scope, this one pins down the design."
        ),
    },
]

for it in ISSUES:
    code, resp = api("POST", "/issues", {**it, "milestone": MS})
    num = resp.get("number") if isinstance(resp, dict) else None
    print(f"issue {it['title'][:58]!r}: {code} -> #{num}")
