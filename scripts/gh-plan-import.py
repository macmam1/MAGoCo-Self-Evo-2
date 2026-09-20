"""Register the whole MASTER_PLAN on GitHub: milestones for every phase + issues.

Every issue body is derived from MASTER_PLAN.md text, not from memory. Phase 0
already has its milestone (#1) and issues (#1-#9) — this skips them entirely.

The phase-0 checklist gaps found by audit (MASTER_PLAN §2.0: no retry/backoff,
no log rotation, no Postgres driver, no CI workflow) are filed as phase-0
issues attached to the closed milestone, since the milestone tracks the phase
and the phase is not complete without them.
"""
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


# ─────────────────────────────────────────────────────────────────────────────
# Labels needed by the bulk import
# ─────────────────────────────────────────────────────────────────────────────
LABELS = [
    ("ui", "C5DEF5", "Frontend: canvas, chat, panels, themes"),
    ("workflow", "FBCA04", "DAG engine, designer, triggers"),
    ("rag", "0052CC", "Knowledge base, vector DB, retrieval"),
    ("security", "B60205", "Auth, secrets, permissions"),
    ("collaboration", "1D76DB", "Multi-user, real-time, sharing"),
    ("analytics", "E4E669", "Usage, cost, tracing, alerting"),
    ("marketplace", "5319E7", "Templates, plugins, community"),
    ("deploy", "0E8AED", "Docker, desktop, spaces, CI/CD"),
    ("skills", "C2E0C6", "SKILL.md system and authoring"),
    ("self-evolution", "D93F0B", "Reflection, prompt optimization, self-heal"),
    ("integration", "F9D0C4", "MCP, webhooks, connectors, storage"),
]
for name, color, desc in LABELS:
    code, _ = api("POST", "/labels", {"name": name, "color": color, "description": desc})
    print(f"label {name}: {code}")

# ─────────────────────────────────────────────────────────────────────────────
# Phase-0 gaps (§2.0 audit) — attached to milestone 1, which stays closed as a
# record; the work is incomplete but the milestone remains the phase marker.
# ─────────────────────────────────────────────────────────────────────────────
GAP_ISSUES = [
    {
        "title": "[§2.0 gap] retry + error handling layer with backoff",
        "labels": ["phase-0", "infra", "bug"],
        "body": (
            "## The gap\n"
            "MASTER_PLAN.md §2.0 requires \"لایه‌ی retry و error handling با backoff\" "
            "as a prerequisite of **every** phase. It does not exist in the codebase "
            "today — no retry helper, no backoff, nothing the LLM router (phase 1) can "
            "lean on when a provider times out.\n\n"
            "## Why it now blocks phase 1\n"
            "Phase 1's router is specified with auto-fallback across providers. Without "
            "a retry-with-backoff primitive, a flaky provider fails straight through to "
            "the next candidate and the router looks unreliable. This belongs in phase 0, "
            "not phase 1, because every later phase needs it too.\n\n"
            "## Contract\n"
            "- `retry(fn, { attempts, baseMs, maxMs, factor })` — exponential backoff "
            "with jitter\n"
            "- retries only on the declared retryable set (network, 429, 5xx, timeout), "
            "never on 4xx auth/validation\n"
            "- each attempt and its outcome is logged, and the whole sequence is a single "
            "bus event so it is replayable from the session log"
        ),
    },
    {
        "title": "[§2.0 gap] structured logging with levels and rotation",
        "labels": ["phase-0", "infra"],
        "body": (
            "## The gap\n"
            "§2.0 requires \"لایه‌ی logging ساختاریافته + levels + rotation\". Levels "
            "exist (`CapabilityLogger` debug/info/warn/error, JSON fields), but there is "
            "no rotation and no sink other than stderr.\n\n"
            "## Contract\n"
            "- a rotating file sink with a size/age policy\n"
            "- structured fields preserved end to end\n"
            "- log level configurable per profile"
        ),
    },
    {
        "title": "[§2.0 gap] CI — automated test + typecheck on every PR",
        "labels": ["phase-0", "infra", "deploy"],
        "body": (
            "## The gap\n"
            "§2.0 requires \"CI: تست و typecheck خودکار روی هر PR\". There is no "
            "`.github/workflows` at all.\n\n"
            "## Contract\n"
            "- GitHub Actions workflow on pull_request: `pnpm install`, "
            "`scripts/test-core.sh` (28 tests), `tsc --noEmit`\n"
            "- runs on a fresh checkout, so a forgotten `git add` (which is exactly what "
            "happened to phase 0 — see #9) fails CI instead of shipping an empty repo\n\n"
            "This one is cheap and it would have caught the missing files. High value."
        ),
    },
    {
        "title": "[§2.0 gap] Postgres persistence driver (optional)",
        "labels": ["phase-0", "infra"],
        "body": (
            "## The gap\n"
            "§2.0 requires SQLite as default (done, via `node:sqlite`) **and** Postgres "
            "as an optional driver. Only the SQLite driver exists; the `Store` interface "
            "was written with a Postgres implementation in mind but none exists.\n\n"
            "## Contract\n"
            "- implement the same `Store` surface against Postgres\n"
            "- selected by profile config `persistence.driver: postgres` (the "
            "`hf-space` profile already exercises this key in the tests)\n\n"
            "Low priority — nothing in phases 1-8 needs Postgres; it matters for "
            "multi-tenant deployments (phase 11). Filed here only because §2.0 lists it."
        ),
    },
]

created_gaps = []
for it in GAP_ISSUES:
    code, resp = api("POST", "/issues", {**it, "milestone": 1})
    num = resp.get("number") if isinstance(resp, dict) else None
    print(f"gap issue {it['title'][:56]!r}: {code} -> #{num}")
    if num:
        created_gaps.append(num)

# ─────────────────────────────────────────────────────────────────────────────
# Phases 2..14 — one milestone each, issues from the MASTER_PLAN checklist
# ─────────────────────────────────────────────────────────────────────────────
PHASES = [
    (
        2,
        "Phase 2 — Minimal visible interface",
        "The first phase where the product becomes touchable (MASTER_PLAN.md §3): "
        "streaming chat, inline tool cards, Cmd+K, the Adaptive Canvas, themes, i18n. "
        "Definition of done (§5) is the phase-0/1 bar **plus**: a real user can use the "
        "feature in the UI.",
        [
            ("Streaming chat: live markdown + code highlighting", ["phase-2", "ui"], "§2.10. Tokens arrive and render as they come; code blocks highlight when complete. Groundwork for this is laid in phase 1, which emits a stream."),
            ("Thinking / reasoning blocks", ["phase-2", "ui"], "§2.10. The model's reasoning is shown in a collapsible block. Phase 1 already writes the trace to the session log — this is the rendering."),
            ("Conversation history + search", ["phase-2", "ui"], "§2.10. Persisted across sessions (phase-0 store), searchable."),
            ("Branching + regenerate + edit message", ["phase-2", "ui"], "§2.10. A conversation is a tree, not a list."),
            ("Export conversations (JSON / MD / PDF)", ["phase-2", "ui"], "§2.10."),
            ("Share conversations", ["phase-2", "ui"], "§2.10. Public/private links."),
            ("Voice input (Whisper) + voice output (TTS)", ["phase-2", "ui"], "§2.10."),
            ("Image upload + vision, file upload, multimodal responses", ["phase-2", "ui"], "§2.10. Requires the LLM provider to declare multimodal capability."),
            ("Persona selection", ["phase-2", "ui"], "§2.10 / §2.1 agent personas. Choosing a persona must be config, not a fork."),
            ("i18n: fa + en", ["phase-2", "ui"], "§2.10. Persian and English from day one; the UI must not hard-code a language."),
            ("Adaptive Canvas (3 levels)", ["phase-2", "ui"], "§2.17. The canvas adapts its density to the task. This is the signature UI element."),
            ("Command Palette (Cmd+K)", ["phase-2", "ui"], "§2.17."),
            ("Keyboard shortcuts + vim mode", ["phase-2", "ui"], "§2.17."),
            ("Themes: dark/light + multiple", ["phase-2", "ui"], "§2.17."),
            ("Resizable panels, tabs, undo/redo, global search, skeleton loaders, notifications, mobile layout", ["phase-2", "ui"], "§2.17 remainder — the fit-and-finish batch. Grouped because individually each is small."),
        ],
    ),
    (
        3,
        "Phase 3 — Code and sandbox",
        "A real development surface: file manager, Monaco, a real terminal, an isolated "
        "sandbox, live preview, diffs, and AI code generation/review/debug.",
        [
            ("Monaco editor with multi-file tabs", ["phase-3", "ui"], "§2.4."),
            ("File tree + file manager", ["phase-3", "ui"], "§2.4."),
            ("Real terminal (xterm) — not a fake display", ["phase-3", "ui"], "§2.4. Must be an actual shell, streaming output."),
            ("Live code execution + output streaming", ["phase-3"], "§2.4."),
            ("Internal sandbox: isolated, timeout, multi-language", ["phase-3"], "§2.4 and §4 risk 1. Two tiers per the risk note: process-isolated (default, light) and an external runtime (optional)."),
            ("Diff viewer (file / code / workflow)", ["phase-3", "ui"], "§2.4."),
            ("Live preview (iframe) for built apps", ["phase-3", "ui"], "§2.4."),
            ("AI code generation from a prompt", ["phase-3"], "§2.4."),
            ("AI code review", ["phase-3"], "§2.4. Uses the ReAct loop with a reviewer persona (phase 6 supplies the role)."),
            ("AI debugging: read the error, suggest the fix", ["phase-3"], "§2.4. Feeds directly into phase 8 self-healing."),
            ("Inline code completion", ["phase-3", "ui"], "§2.4."),
            ("Atomic multi-file editing", ["phase-3", "ui"], "§2.4. A change touches several files and lands all-or-nothing."),
            ("Modes: Code / Architect / Debug / Ask", ["phase-3", "ui"], "§2.4."),
            ("Design system import (Figma / GitHub) + component library (shadcn et al.)", ["phase-3", "ui"], "§2.4."),
        ],
    ),
    (
        4,
        "Phase 4 — Browser and computer use",
        "A live browser inside the chat panel that the user can watch, plus "
        "human-like browsing and computer use, feeding extracted content to RAG.",
        [
            ("In-chat live browser the user can watch", ["phase-4", "ui"], "§2.5 and §4 risk 2 — the heaviest part of the UI. On desktop this is normal; on HF Space it needs streaming over a restricted port."),
            ("browser-use: human-like browsing", ["phase-4"], "§2.5."),
            ("computer use: click / type / scroll / drag / key", ["phase-4"], "§2.5."),
            ("Content extraction from a page → RAG", ["phase-4", "rag"], "§2.5. Handoff into phase 7."),
            ("Browser session management", ["phase-4"], "§2.5."),
            ("Headless and headed mode", ["phase-4"], "§2.5."),
        ],
    ),
    (
        5,
        "Phase 5 — Workflows",
        "A DAG engine plus a drag-and-drop designer, live prompt-to-graph workflow "
        "generation, triggers, HITL gates, and per-node re-run.",
        [
            ("Visual workflow designer (drag & drop) on canvas", ["phase-5", "ui", "workflow"], "§2.6."),
            ("Live workflow: describe → the agent builds the graph node by node", ["phase-5", "workflow"], "§2.6. The signature feature of this phase."),
            ("Conditional branch + loop + parallel execution", ["phase-5", "workflow"], "§2.6."),
            ("Triggers: webhook / schedule / event", ["phase-5", "workflow"], "§2.6."),
            ("Sub-workflow + reuse", ["phase-5", "workflow"], "§2.6."),
            ("Inline HITL approval gates — not modals", ["phase-5", "workflow"], "§2.6."),
            ("Live execution log + re-run a single node, not the whole workflow", ["phase-5", "workflow"], "§2.6."),
            ("Mock data for testing", ["phase-5", "workflow"], "§2.6."),
            ("Workflow versioning + diff", ["phase-5", "workflow"], "§2.6."),
            ("Import/export (JSON) + webhook receiver", ["phase-5", "workflow"], "§2.6."),
        ],
    ),
    (
        6,
        "Phase 6 — Automated production and team building",
        "The PM → Architect → Coder → QA pipeline, recursive task splitting, and the "
        "automatic team builder that creates a new agent when no existing one fits.",
        [
            ("Pipeline: PM → Architect → Developer → QA", ["phase-6"], "§2.7 / §2.1 role-based orchestration."),
            ("SOP-based planning", ["phase-6"], "§2.7."),
            ("Structured output (JSON schema)", ["phase-6"], "§2.7. Already delivered as a primitive in phase 1 — here it is used at the orchestration layer."),
            ("Iterative refinement", ["phase-6"], "§2.7."),
            ("Recursive task splitting + dependency graph", ["phase-6"], "§2.7."),
            ("Milestone management + progress tracking", ["phase-6"], "§2.7."),
            ("Automatic team building: plan → split → pick an existing sub-agent, or build a new one if none fits", ["phase-6"], "§2.1. The MAGoCo signature feature of this phase."),
            ("Inter-agent messaging (1:1 and broadcast)", ["phase-6"], "§2.1."),
            ("Knowledge distillation between agents", ["phase-6"], "§2.1. An agent teaches another what it learned — feeds phase 8."),
            ("Agent personas / roles / ready-made templates", ["phase-6"], "§2.1."),
        ],
    ),
    (
        7,
        "Phase 7 — Knowledge",
        "Full RAG: vector DB (selectable), document ingestion, chunking, hybrid "
        "search, citations, and a knowledge base per agent.",
        [
            ("Complete RAG pipeline", ["phase-7", "rag"], "§2.8."),
            ("Vector DB — Qdrant / Chroma / pgvector, selectable", ["phase-7", "rag"], "§2.8. Selectable is the point: this is a capability seam (§1.5), swapping must touch no consumer."),
            ("Document upload: PDF / DOCX / MD / TXT", ["phase-7", "rag"], "§2.8."),
            ("Chunking strategies", ["phase-7", "rag"], "§2.8."),
            ("Hybrid search: BM25 + vector", ["phase-7", "rag"], "§2.8."),
            ("Citation / source tracking", ["phase-7", "rag"], "§2.8."),
            ("Knowledge base per agent", ["phase-7", "rag"], "§2.8."),
            ("Automatic KB update + versioning", ["phase-7", "rag"], "§2.8."),
        ],
    ),
    (
        8,
        "Phase 8 — Self-evolution",
        "The MAGoCo signature: reflection after every task, pattern mining, automatic "
        "prompt optimization with A/B and auto-rollback, skill generation from success, "
        "and self-healing.",
        [
            ("Reflection after every task (success / failure)", ["phase-8", "self-evolution"], "§2.2. Phase 1's recordOutcome() is already writing the raw material for this."),
            ("Pattern mining from history", ["phase-8", "self-evolution"], "§2.2."),
            ("Automatic prompt optimization", ["phase-8", "self-evolution"], "§2.2."),
            ("A/B testing of prompts", ["phase-8", "self-evolution"], "§2.2."),
            ("Auto-rollback on regression", ["phase-8", "self-evolution"], "§2.2. A/B only matters if a losing variant can be retracted automatically."),
            ("Automatic skill generation from successful patterns", ["phase-8", "self-evolution", "skills"], "§2.2. Writes into the phase-0 skill store, which exists already."),
            ("Meta-learning: learning from history", ["phase-8", "self-evolution"], "§2.2."),
            ("Auto-evaluation of output quality", ["phase-8", "self-evolution"], "§2.2."),
            ("Self-healing: detect its own error and fix it", ["phase-8", "self-evolution"], "§2.2. Phase 3's AI debugging is the human-facing twin of this."),
            ("Learning from user interaction and feedback", ["phase-8", "self-evolution"], "§2.2."),
        ],
    ),
    (
        9,
        "Phase 9 — Integrations",
        "A built-in MCP client, custom connectors, OAuth, per-user API keys, "
        "webhooks, and storage backends.",
        [
            ("Built-in MCP client — no dependency on Hermes", ["phase-9", "integration"], "§2.11. Explicitly standalone."),
            ("Custom API connector (REST / GraphQL)", ["phase-9", "integration"], "§2.11."),
            ("OAuth 2.0 flow", ["phase-9", "integration", "security"], "§2.11."),
            ("Per-user API key management", ["phase-9", "integration", "security"], "§2.11."),
            ("Webhook system (in / out)", ["phase-9", "integration"], "§2.11."),
            ("Email: SMTP / SendGrid / Resend", ["phase-9", "integration"], "§2.11."),
            ("GitHub / GitLab", ["phase-9", "integration"], "§2.11."),
            ("Slack / Discord / Telegram", ["phase-9", "integration"], "§2.11."),
            ("Notion / Airtable", ["phase-9", "integration"], "§2.11."),
            ("Calendar / CRM", ["phase-9", "integration"], "§2.11."),
            ("Storage backends: local / S3 / R2 / MinIO / GCS", ["phase-9", "integration"], "§2.11."),
        ],
    ),
    (
        10,
        "Phase 10 — Security and authentication",
        "JWT, OAuth, 2FA, API keys, an encrypted secret store, rate limiting, session "
        "management, and password policies.",
        [
            ("JWT (access + refresh)", ["phase-10", "security"], "§2.13."),
            ("OAuth (Google / GitHub)", ["phase-10", "security"], "§2.13."),
            ("2FA (TOTP)", ["phase-10", "security"], "§2.13."),
            ("API key auth", ["phase-10", "security"], "§2.13."),
            ("Encrypted secret store", ["phase-10", "security"], "§2.13. Needed before any phase-9 integration that holds credentials is safe to ship."),
            ("Rate limiting", ["phase-10", "security"], "§2.13."),
            ("Session management + IP allowlist", ["phase-10", "security"], "§2.13."),
            ("Password policies", ["phase-10", "security"], "§2.13."),
        ],
    ),
    (
        11,
        "Phase 11 — Multi-user and collaboration",
        "Workspaces, RBAC, team management, real-time collaboration, comments, audit "
        "log, and share links.",
        [
            ("Multi-tenant workspaces", ["phase-11", "collaboration"], "§2.12."),
            ("RBAC (admin / user / viewer / custom)", ["phase-11", "collaboration", "security"], "§2.12."),
            ("Team management", ["phase-11", "collaboration"], "§2.12."),
            ("Real-time collaboration (Yjs)", ["phase-11", "collaboration"], "§2.12 and §4 risk 3 — if this proves too complex it degrades to async comments. The fallback is decided here, not later."),
            ("Comments on artifacts", ["phase-11", "collaboration"], "§2.12."),
            ("@mentions + activity feed", ["phase-11", "collaboration"], "§2.12."),
            ("Share links (public / private)", ["phase-11", "collaboration"], "§2.12."),
            ("Immutable audit log", ["phase-11", "collaboration", "security"], "§2.12. The session log is already append-only; this is the multi-user projection of it."),
        ],
    ),
    (
        12,
        "Phase 12 — Analytics and monitoring",
        "Usage and cost dashboards, performance graphs, tracing, error tracking, "
        "alerting, custom reports, and quotas.",
        [
            ("Live dashboard: usage (tokens / requests / cost)", ["phase-12", "analytics"], "§2.14. Phase 1 records this; phase 12 displays it."),
            ("Performance graphs (latency / success rate)", ["phase-12", "analytics"], "§2.14."),
            ("Tracing (LangSmith-style)", ["phase-12", "analytics"], "§2.14. The session log already carries the span boundaries."),
            ("Error tracking (Sentry-style)", ["phase-12", "analytics"], "§2.14."),
            ("Alerting (webhook / email)", ["phase-12", "analytics"], "§2.14."),
            ("Custom reports + export CSV/JSON", ["phase-12", "analytics"], "§2.14."),
            ("Usage quotas per user", ["phase-12", "analytics", "security"], "§2.14."),
        ],
    ),
    (
        13,
        "Phase 13 — Marketplace and community",
        "Marketplaces for agents, workflow templates, tools and skills; a plugin "
        "registry, prompt library, ratings, forking, and one-click install.",
        [
            ("Agent marketplace", ["phase-13", "marketplace"], "§2.15."),
            ("Workflow templates marketplace", ["phase-13", "marketplace", "workflow"], "§2.15."),
            ("Tool + skill marketplace", ["phase-13", "marketplace", "skills"], "§2.15."),
            ("Plugin registry", ["phase-13", "marketplace"], "§2.15."),
            ("Prompt library", ["phase-13", "marketplace"], "§2.15."),
            ("Rating + reviews", ["phase-13", "marketplace"], "§2.15."),
            ("Fork + customize", ["phase-13", "marketplace"], "§2.15."),
            ("One-click install", ["phase-13", "marketplace"], "§2.15."),
        ],
    ),
    (
        14,
        "Phase 14 — Multi-platform deployment",
        "Docker, the Tauri desktop app, the web app, HF Space / ModelScope Studio "
        "profiles, CI/CD, backup, migration, and monitoring.",
        [
            ("docker / docker-compose (multi-stage + healthcheck)", ["phase-14", "deploy"], "§2.16."),
            ("Desktop app (Tauri)", ["phase-14", "deploy"], "§2.16."),
            ("Web app", ["phase-14", "deploy"], "§2.16."),
            ("HF Space / ModelScope Studio compatible", ["phase-14", "deploy"], "§2.16. The deploy profiles the framework was designed around."),
            ("CI/CD (GitHub Actions)", ["phase-14", "deploy"], "§2.16. Note the §2.0 gap issue filed against phase 0 — a basic pipeline belongs there; this is the mature one."),
            ("Backup automation", ["phase-14", "deploy"], "§2.16."),
            ("Migration tools", ["phase-14", "deploy"], "§2.16."),
            ("Monitoring + structured logging", ["phase-14", "deploy"], "§2.16. Overlaps the §2.0 logging gap — resolve there, expose here."),
        ],
    ),
]

for num, title, desc, issues in PHASES:
    # the phase-1 milestone (#2) already exists and already holds #10-#15
    if num == 1:
        continue
    label = f"phase-{num}"
    code, _ = api("POST", "/labels", {"name": label, "color": "5319E7", "description": f"Phase {num}"})
    print(f"label {label}: {code}")
    code, ms = api("POST", "/milestones", {"title": title, "state": "open", "description": desc})
    mid = ms.get("number") if isinstance(ms, dict) else None
    print(f"milestone phase {num}: {code} -> {mid}")
    if not mid:
        continue
    for t, labels, body in issues:
        code, resp = api("POST", "/issues", {"title": t, "labels": labels, "body": body, "milestone": mid})
        num_i = resp.get("number") if isinstance(resp, dict) else None
        print(f"  issue {t[:52]!r}: {code} -> #{num_i}")
