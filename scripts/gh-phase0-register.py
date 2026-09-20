"""Register phase-0 completion in the GitHub repo: milestone + issues.

Reads the token from /opt/data/.env (GITHUB_API_KEY). The repo has no
issues or milestones yet, so there is no dedup work to do.
"""
import json
import os
import urllib.request
import urllib.error

TOKEN = [l.split("=", 1)[1].strip() for l in open("/opt/data/.env") if l.startswith("GITHUB_API_KEY=")][0]
OWNER_REPO = "macmam1/MAGoCo-Self-Evo-2"
API = f"https://api.github.com/repos/{OWNER_REPO}"


def api(method, path, body=None):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(
        API + path,
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


LABELS = [
    ("phase-0", "0E8AED", "Phase 0 — architecture foundation"),
    ("phase-1", "5319E7", "Phase 1 — agent core"),
    ("infra", "BFDADC", "Infrastructure: persistence, logging, CI"),
    ("agent", "D93F0B", "Agent loop, memory, LLM routing"),
    ("llm", "F9D0C4", "LLM providers and routing"),
    ("memory", "A2EEEF", "Three-layer memory"),
    ("bug", "D73A4A", "Something isn't working"),
    ("documentation", "0075CA", "Improvements or additions to documentation"),
    ("contract-test", "006B75", "Contract test for a capability def"),
]

# 1. labels (ignore 422 = already exists)
for name, color, desc in LABELS:
    code, _ = api("POST", "/labels", {"name": name, "color": color, "description": desc})
    print(f"label {name}: {code}")

# 2. milestone: Phase 0
code, ms = api("POST", "/milestones", {
    "title": "Phase 0 — Architecture foundation",
    "state": "closed",
    "description": (
        "The non-negotiable foundation (MASTER_PLAN.md §3, phase 0). Everything else "
        "is built on these surfaces:\n\n"
        "- event bus (typed pub/sub + session-log sink)\n"
        "- capability registry (def / provider / consumer seam)\n"
        "- session log (append-only JSONL, replayable)\n"
        "- profiles (extends + patch)\n"
        "- plugin loader (manifest + failure isolation)\n"
        "- persistence layer (node:sqlite, zero external services)\n"
        "- three-layer memory (working / episodic / semantic)\n"
        "- CLI: magoco --profile web boots the core and runs a capability\n\n"
        "Definition of done (§5): checklist ticked, real tests passing, docs written, "
        "and a repeatable real scenario.\n\n"
        "DONE — 28 contract tests pass, tsc --noEmit clean, verified from a fresh "
        "clone of the repo. Commits 435357f (core) and 115716b (persistence + memory, "
        "which 435357f had failed to stage)."
    ),
})
print("milestone:", code, ms.get("number") if isinstance(ms, dict) else ms)
MS = ms["number"]

ISSUES = [
    {
        "title": "Event bus: typed pub/sub with session-log sink",
        "body": (
            "## What\n`packages/core/src/eventbus/bus.ts` — a minimal typed pub/sub.\n\n"
            "## Why it matters\n"
            "Modules never call each other directly (MASTER_PLAN.md §1.5, mechanism 2). "
            "They publish and subscribe. Adding a consumer = a new file, zero changes to "
            "existing modules.\n\n"
            "## Contract\n"
            "- `publish(event)` — exact match `capability:type`, then capability wildcard "
            "`capability:*`, then global `*`\n"
            "- every published event is appended to the session log before any handler "
            "runs, so no event is ever lost\n"
            "- `subscribe(capability, type, handler)` returns an unsubscribe function\n\n"
            "## Tests\n"
            "`test/eventbus.test.ts` — 4 tests pass.\n\n"
            "Done in 435357f."
        ),
        "labels": ["phase-0", "contract-test"],
    },
    {
        "title": "Capability registry — the def / provider / consumer seam",
        "body": (
            "## What\n"
            "`packages/core/src/capabilities/{types,registry}.ts` — the contract layer.\n\n"
            "## Why it matters\n"
            "One of the three **stable surfaces** of the whole framework. Consumers "
            "program against the `def` only and never import a provider, so swapping an "
            "implementation (e.g. Qdrant → Chroma for vectors) touches no consumer code.\n\n"
            "## Contract\n"
            "- `registerDef(def)` — idempotent for an identical def\n"
            "- `provide(capabilityId, plugin, instance)` — one capability, one provider; "
            "a second provider for the same capability throws `DuplicateProviderError`\n"
            "- `resolve<T>(id)` — throws synchronously when unbound: fail loud, not silently\n"
            "- `revoke(plugin, capabilityId?)` on plugin unload\n\n"
            "## Tests\n"
            "`test/registry.test.ts` — 6 tests pass.\n\n"
            "Done in 435357f."
        ),
        "labels": ["phase-0", "contract-test"],
    },
    {
        "title": "Session log — append-only JSONL, the third stable surface",
        "body": (
            "## What\n`packages/core/src/session/log.ts`.\n\n"
            "## Why it matters\n"
            "The single source of truth for everything that happened. Every event lands "
            "here, so any moment of a run can be reconstructed from disk alone. The "
            "protocol of this file is one of the three stable surfaces (§1.5) — changing "
            "it is a breaking change.\n\n"
            "## Contract\n"
            "- writes are serialized through a promise chain so order is always correct\n"
            "- `read()` is an async generator over the whole log, in order\n\n"
            "## Tests\n`test/sessionlog.test.ts` — 2 tests pass.\n\nDone in 435357f."
        ),
        "labels": ["phase-0", "contract-test"],
    },
    {
        "title": "Profiles — named config bundles that compose via extends + patch",
        "body": (
            "## What\n`packages/core/src/profiles/loader.ts`.\n\n"
            "## Contract\n"
            "- a profile is a named bundle of config (`web`, `headless`, `hf-space`, ...)\n"
            "- `extends:` chain merges a base profile\n"
            "- `patch:` overrides config and can disable plugins — disabling a plugin is "
            "deleting one config line, never editing code\n"
            "- when no `plugins:` key is present every discovered plugin is enabled by "
            "default; a profile opts **out** of plugins, never into them\n\n"
            "## Tests\n`test/profiles.test.ts` — 3 tests pass.\n\nDone in 435357f."
        ),
        "labels": ["phase-0", "contract-test"],
    },
    {
        "title": "Plugin loader — discovery, isolation, revocation on unload",
        "body": (
            "## What\n`packages/core/src/plugins/loader.ts`.\n\n"
            "## Contract\n"
            "- discovers `plugin.yaml` manifests on disk and loads `index.js` next to them\n"
            "- a manifest declares `name`, `version`, `provides`, `consumes`\n"
            "- failure isolation: a broken or throwing plugin is reported and skipped; it "
            "cannot take down the core or any other plugin\n"
            "- on unload the loader revokes that plugin's providers from the registry, so "
            "a half-dead state is impossible\n\n"
            "## Tests\n`test/plugins.test.ts` — 3 tests pass (incl. a deliberately broken "
            "plugin proving isolation).\n\nDone in 435357f."
        ),
        "labels": ["phase-0", "contract-test"],
    },
    {
        "title": "Persistence layer — node:sqlite, zero external services",
        "body": (
            "## What\n`packages/core/src/persistence/store.ts`.\n\n"
            "## Why it matters\n"
            "MASTER_PLAN.md §2.0 requires SQLite as the default with no external service "
            "and Postgres optional. Built on `node:sqlite`, so there is no native module "
            "to compile and the same code runs on desktop, HF Space and ModelScope.\n\n"
            "## Surface\n"
            "- working memory rows (append / recent window / range / count / delete-before)\n"
            "- episodic memory rows (record / recent / keyword search / reinforce weight)\n"
            "- semantic key-value (set / get / delete / keys by prefix)\n"
            "- skill drafts (save / load / list / delete) — used by phase 8\n"
            "- prepared statements are cached and reused\n\n"
            "## Note\n"
            "This file was written but never staged by the phase-0 commit 435357f, so the "
            "repo initially shipped without it. Committed in 115716b.\n\n"
            "## Tests\ncovered by `test/memory.test.ts` (6 tests) against the real store."
        ),
        "labels": ["phase-0", "infra", "contract-test"],
    },
    {
        "title": "Three-layer memory — working / episodic / semantic",
        "body": (
            "## What\n`packages/core/src/memory/memory.ts`.\n\n"
            "## Contract (MASTER_PLAN.md §2.1)\n"
            "- **working** — the live conversation; bounded. `compact()` keeps the most "
            "recent N turns, summarizes the rest into one episodic entry and deletes the "
            "originals, so context never grows without limit\n"
            "- **episodic** — distilled experience from past sessions; recalled by "
            "relevance and recency; a lesson that proved useful gets reinforced\n"
            "- **semantic** — durable facts; key/value, written once, read forever\n"
            "- one `memory.recall(sessionId, query)` assembles what a prompt needs and "
            "the agent never has to know which layer answered\n\n"
            "## Bugs found by running the tests, not by reading (fixed in 115716b)\n"
            "1. `recall()` required the query to contain the **whole** dotted key, so "
            "`deploy.port` never matched \"deploy the app to modelscope\". Now any salient "
            "key segment recalls the fact.\n"
            "2. `searchEpisodes()` LIKE-wrapped the **entire** query, so a natural "
            "question matched nothing. Now it splits into words and OR-matches any.\n"
            "3. `recentEpisodes()` returned `sessionId: string | null` from the store "
            "while `Episode` declares `string` — incompatible under "
            "`exactOptionalPropertyTypes`.\n"
            "4. A test called `mem.recent(1)` — a working-memory method — to read an "
            "episodic entry.\n\n"
            "## Tests\n`test/memory.test.ts` — 6 tests pass."
        ),
        "labels": ["phase-0", "memory", "contract-test"],
    },
    {
        "title": "Runtime + CLI — boot, load plugins, run a capability",
        "body": (
            "## What\n"
            "- `packages/core/src/runtime.ts` — the only assembly point\n"
            "- `packages/core/src/cli.ts` — `magoco --profile web ...`\n\n"
            "## Boot order (deliberately fixed and dependency-ordered)\n"
            "`log → bus → registry → profile → plugins`\n\n"
            "The session log is attached to the bus **before** any plugin loads, so no "
            "event from plugin registration can ever be lost.\n\n"
            "## Real scenario (§5)\n"
            "```\n"
            "node --import tsx/esm src/cli.ts \\\n"
            "  --root examples/greeter --profile web \\\n"
            "  --exec 'call magoco.greet.hello {\"name\":\"World\"}'\n"
            "```\n"
            "Output: `\"GREETING[Hello from MAGoCo] World\"`. The `greeting` value comes "
            "from `profiles/web.yaml`, proving config flows from a profile through "
            "`ctx.config` into a provider — with no plugin importing anything from the "
            "core. The plugin was written **after** the core was frozen, which is the "
            "modularity contract proven rather than claimed.\n\n"
            "## Tests\n`test/runtime.test.ts` — 2 tests pass (end-to-end boot with a real "
            "plugin written to a temp dir).\n\nDone in 435357f."
        ),
        "labels": ["phase-0", "contract-test"],
    },
    {
        "title": "Phase 0 — files missing from the phase-0 commit",
        "body": (
            "## The problem\n"
            "The phase-0 commit `435357f` never ran `git add` on three files, so the "
            "repository on GitHub was missing its persistence layer and its memory layer "
            "entirely:\n"
            "- `packages/core/src/persistence/store.ts`\n"
            "- `packages/core/src/memory/memory.ts`\n"
            "- `packages/core/test/memory.test.ts`\n\n"
            "Locally the code existed and two memory tests were failing, so a local run "
            "looked \"mostly done\" while the pushed repo could not build.\n\n"
            "## Fix\n"
            "Committed as `115716b` together with the four bug fixes listed in "
            "“Three-layer memory — working / episodic / semantic”.\n\n"
            "## Guard going forward\n"
            "Before any commit: `git status --short` must be empty, and the repo must be "
            "verified by cloning it fresh and running the tests in the clone — not in the "
            "working tree."
        ),
        "labels": ["bug", "phase-0", "infra"],
    },
]

created = []
for it in ISSUES:
    code, resp = api("POST", "/issues", {**it, "milestone": MS})
    num = resp.get("number") if isinstance(resp, dict) else None
    print(f"issue {it['title'][:56]!r}: {code} -> #{num}")
    if num:
        created.append(num)

print("created:", created)
print("closing milestone", MS)
print(api("PATCH", f"/milestones/{MS}", {"state": "closed"}))
