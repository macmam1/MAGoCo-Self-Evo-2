# Phase 3 — Code and Sandbox

**Status:** DRAFT — awaiting approval
**Spec owner:** macmam1
**Prior phase:** `bdb17d0` (Phase 2, closed; 125/125 tests green from a fresh clone, real E2E chat verified)
**Master plan ref:** §3 Phase 3, §2.4, §4 risk 1, §1.5

> «فاز ۳ — کد و سندباکس: file manager + Monaco + ترمینال واقعی + سندباکس + live preview + diff + AI code gen/review/debug.» — MASTER_PLAN.md §3

## 0. What this phase is

Phase 2 made MAGoCo a product a human can talk to in a browser. Phase 3 makes it
one a human can **build software with** — and, critically, one the *agent* can
build software inside.

Three things arrive at once and they are not independent:

1. **A filesystem the user's project lives in** — visible as a file tree, edited
   in a real Monaco editor, not a textarea.
2. **A real execution boundary** — code leaves the editor and actually runs, in
   isolation, with limits. Not a mock, not an echo.
3. **A real terminal** — a live shell attached to that filesystem, streaming
   stdout as it happens, same way OpenHands and Kilo do it.

Everything in §2.4 that is pure UI (diff viewer, live preview, command palette
modes) builds on these three. Everything that is pure AI (code generation,
review, debug, completion) is *deliberately out of the first cut* — see §9
decision 1. The reason is not scope cowardice: #38 (execute code) is what makes
#44 (AI debugging) even testable, and #38 has no value until #39 (the sandbox)
exists. The AI layer in Phase 3.5 will be built on a *running* sandbox, which is
the only honest way to build it.

## 1. Scope

### 1.1 In scope (this phase, in delivery order)

| # | Item | Issue | §ref |
|---|------|-------|------|
| A | **Filesystem capability** — a project root with read/write/list/watch, exposed as `magoco.fs.*` | #36 | §2.4 |
| B | **Sandbox** — process-isolated code execution with timeout, resource caps, and a pluggable backend | #39 | §2.4, §4.1 |
| C | **Live code execution** — run a file or a snippet, stream stdout/stderr/exit | #38 | §2.4 |
| D | **Real terminal** — pty-backed shell over WebSocket, multiplexed per session | #37 | §2.4 |
| E | **Monaco editor** with multi-file tabs | #35 | §2.4 |
| F | **Atomic multi-file edit** — a change spanning several files lands all-or-nothing | #46 | §2.4 |

### 1.2 Explicitly out of scope (Phase 3.5 or later)

- **AI code generation from prompt (#42), review (#43), debugging (#44), inline completion (#45).** These are #1.1's direct dependents but they need §2.2's memory layer and Phase 8's self-healing to be more than a prompt template. Building them before the sandbox runs would mean testing them against echoes.
- **Live preview / iframe (#41), diff viewer (#40), modes Code/Architect/Debug/Ask (#47), design-system import (#48).** Pure UI. They are cheap once A–F exist and they are the *first* thing a contributor can add without touching the capability layer — good first PRs, not a v1 blocker.
- **External runtime tier** (Docker, microVM, firecracker). §4 risk 1 names two tiers; this phase implements **tier 1 only**. The seam in §2 makes tier 2 a drop-in.
- **Multi-user FS isolation.** The filesystem is single-user and local until Phase 11 — the boundary that matters is process isolation, not user isolation (§5).

### 1.3 What must not change (§1.5 contract)

`@magoco/core` gains two capability *defs* and nothing else. `@magoco/agents`
gains nothing. The existing `magoco.web.*` protocol is **extended, not
rewritten** — the client speaks new command/frame types over the same socket,
and a Phase 2-only client still renders a chat session correctly against a
Phase 3 server (it ignores unknown frame types). That backwards-compatibility
line is a test, not an aspiration.

## 2. Architecture — one new package, one new seam

```
┌──────────────────────────────────────────────────────────────────────────┐
│  packages/ui                                                              │
│   file tree · Monaco · terminal view (xterm canvas) · tab bar             │
└───────▲──────────────────────────────▲────────────────────────────────────┘
        │ ClientCommand (JSON)          │ binary + text frames
        │   fs.* / code.* / term.*      │ (§6.2 — the one place binary is allowed)
┌───────┴──────────────────────────────┴────────────────────────────────────┐
│  packages/web   (existing server — new routes on the same socket)          │
└───────▲────────────────────────────────────────────────────────────────────┘
        │ CapabilityRegistry + EventBus  (unchanged from Phase 2)
┌───────┴────────────────────────────────────────────────────────────────────┐
│  packages/sandbox  ← NEW                                                  │
│   magoco.fs.read/write/list/watch   magoco.code.run                       │
│   magoco.term.open/write/resize/kill                                      │
│   plugin/sandbox/plugin.yaml  (discovered like packages/web)              │
└────────────────────────────────────────────────────────────────────────────┘
```

**Why a new package, and why not in `web`.** The terminal is the single most
dangerous thing in this phase: it hands a shell to the browser. Putting that in
`packages/web` would re-couple the transport to the capability (the exact
core↔web cycle Phase 2's `bdb17d0` broke) and would make `web` untestable
without a pty. `packages/sandbox` owns all three capabilities, is testable in
isolation against a temp dir, and registers exactly the way `web` does —
`packages/sandbox/plugin/sandbox/plugin.yaml`, picked up by the existing
`packages/<name>/plugin` scan. Zero new loader code.

**Why not `packages/fs` + `packages/code` + `packages/term` separately.** All
three share the same project-root lifecycle (one root per session, torn down
together), the same event vocabulary namespace, and the same resource limits.
Splitting them would mean three manifests, three plugin entries, and a
cross-package coordination problem for what is one subsystem. When terminal
grows heavy enough to warrant its own release train, it can graduate — the
capability ids already make that a rename-free move.

### 2.1 New capability defs (all in `packages/core/src/capabilities/`)

The contract lives in core; the implementation lives in `packages/sandbox`.

| Capability | Kind | Purpose |
|---|---|---|
| `magoco.fs.read` | async | Read a file (text or base64 for binary) |
| `magoco.fs.write` | async | Write a file, creating parent dirs |
| `magoco.fs.list` | async | Recursive listing of a subtree |
| `magoco.fs.watch` | async | Subscribe to change events |
| `magoco.code.run` | async | Execute code; returns an `ExecutionHandle` |
| `magoco.term.open` | async | Allocate a pty; returns a `TerminalHandle` |
| `magoco.term.write` | async | Send bytes to the pty stdin |
| `magoco.term.resize` | async | cols/rows |
| `magoco.term.kill` | async | Signal the process group |

Every one is `def` + `provider` + contract test, per §1.5 mechanism 1. Consumers
(the UI, or the agent's tool layer — §9 decision 3) see only the def.

### 2.2 Event vocabulary

Published on the same bus as Phase 2. The terminal is the first capability to
emit a **high-volume streaming** event; §6.2 covers how it gets to the socket.

```
magoco.fs.changed       { root, path, kind: 'create'|'modify'|'delete' }
magoco.code.stdout      { runId, data: string (utf-) }
magoco.code.stderr      { runId, data }
magoco.code.exit        { runId, code, ms, killed }
magoco.term.data        { termId, data: string }
magoco.term.exited      { termId, code }
```

All are session-logged (Phase 0), so a terminal session and every code run are
replayable from disk — which is also how the UI rehydrates after refresh.

## 3. The filesystem capability

### 3.1 Project roots

A **project root** is a directory the framework is permitted to touch. It is
created on demand, scoped to a session, and lives under a configurable base:

```
$XDG_RUNTIME_DIR/magoco/sessions/<sessionId>/project   (default /tmp/magoco)
```

Rationale: putting projects in the repo's own tree would make `git status`
noisy and `pnpm install` unpredictable; putting them in `/tmp` keeps the
working tree clean and makes cleanup a `rm -rf` that the OS handles on reboot.
`config.magoco.fs` sets `rootBase` and `maxBytes` (default 200 MiB).

**The sandbox can never escape its project root.** This is not a request. §5.

### 3.2 Symlinks and path resolution

All paths are resolved with `path.resolve(root, p)` and then checked with
`path.startsWith(root + path.sep)`. Symlinks inside the root that point outward
are **followed** (that is the user's choice) but the *target* must also be
inside a permitted root, else the write is refused with `E_SYMLINK_ESCAPE`.
Symlinks pointing outside are the classic sandbox escape; the test creates one
and asserts the refusal (T-S6).

## 4. The sandbox

This is the highest-risk item in the phase and the one §4 risk 1 calls out by
name. The decision here is deliberately conservative.

### 4.1 Isolation tier 1: process isolation

```
┌─ parent (node, uid 10000) ────────────────────────────────┐
│                                                            │
│  child_process.fork/spawn(…)  ──►  uid 65534 (nobody)      │
│     argv via an executor stub that:                        │
│       · drops to nobody via setuid (needs CAP_SETUID)      │
│       · chroots to the project root                        │
│       · closes inherited fds 3+                            │
│       · execs the real interpreter                         │
└────────────────────────────────────────────────────────────┘
```

**In this environment** the machine is a container, we run as uid 10000, and
`setpriv`/`unshare` are available but **no CAP_SETUID and no container runtime
(Docker, firecracker) is present**. Dropping to `nobody` requires root or
`CAP_SETUID`, neither of which we have. So the *mandatory* isolation primitives
here are the ones that do not need privileges:

- **`chdir` into the project root + `argv[0]` and `cwd` never absolute-escapable**
- **`env` sanitisation** — a whitelist, not a blacklist: `PATH`, `LANG`, `HOME`
  set to the project root, and nothing else. The sandbox does **not** inherit
  `MS_TOKEN`, `MODELSCOPE_TOKEN_*`, `OPENAI_API_KEY`, `GITHUB_TOKEN`, or any
  other secret from the parent — this is the single most important property of
  the whole phase and it is a test (T-S1).
- **no network** by default — the executor stub uses `unshare --net` when the
  kernel permits it, and when it does not, network is simply *not configured
  for the child*: no proxy env, and a preload-free guard. This is best-effort
  and **documented as such in the capability description**, not claimed as
  a hard guarantee. §9 decision 5 explains why an honest "best effort" beats
  a pretend-hard boundary.
- **resource caps** — `RLIMIT_AS` (memory), `RLIMIT_CPU` (cpu seconds),
  `RLIMIT_NPROC` (fork bombs), `RLIMIT_FSIZE` (cannot write past the project
  root's byte cap), enforced via `setrlimit` in the executor stub.
- **timeout** — a hard wall-clock kill; the process is `SIGKILL`ed and the run
  resolves as `killed: true` (never silently, never orphaned — T-S4).

Defaults, all overridable in the profile:

| Limit | Default | Why |
|---|---|---|
| `timeoutMs` | 20000 | Most user code that runs 20s is stuck |
| `memoryMB` | 512 | Fits python + node; leaves the host usable |
| `cpuMs` | 5000 | Compiles are fast or they are wrong |
| `maxProcesses` | 64 | Fork bombs contained |
| `maxOutputBytes` | 1 MiB | Output streaming is the point, not dumping |
| `maxProcessesPerRun` | 64 | see RLIMIT_NPROC |

### 4.2 Language adapters

A small registry, keyed by file extension. Phase 3 ships **exactly two**: `js`
and `py`. `js` runs under the same node the framework uses (no extra runtime to
install); `py` runs under `/usr/bin/python3` — **explicitly the system python,
not `/opt/hermes/.venv/bin/python3`**, which is the agent's own interpreter and
contains tooling a sandboxed program has no business seeing.

| ext | runner | note |
|---|---|--- |
| `.js` | `node --input-type=module` or the file directly | same runtime as the framework |
| `.py` | `/usr/bin/python3` | system python; never the venv |

Adding a language is a ~10-line adapter and a test — this is a *designed* seam,
not a placeholder. `go`, `ruby`, `php`, `c` are absent here only because their
runtimes are not installed (verified: `ruby`, `go`, `php` all `MISSING`),
not because the design cannot hold them.

### 4.3 The `magoco.code.run` contract

```ts
export interface RunRequest {
  /** File inside the project root, or inline source with `language`. */
  readonly path?: string;
  readonly source?: string;
  readonly language?: 'js' | 'py';
  /** Stdin lines to feed (for interactive-style programs). */
  readonly stdin?: string[];
  readonly limits?: Partial<RunLimits>;
}
export interface RunResult {
  readonly runId: string;
  /** Resolves on exit; reject only if the sandbox itself failed to spawn. */
  readonly done: Promise<ExitInfo>;
  /** Stream while running. */
  readonly stdout: AsyncIterable<string>;
  readonly stderr: AsyncIterable<string>;
  kill(): void;
}
```

**The contract deliberately exposes streaming first and a promise second.** A
caller that `await`s `done` gets the full picture; a caller that wants live
output subscribes to the iterables. Both are the same underlying stream —
there is no "buffer-then-emit" mode, because that is how a UI ends up showing
output after a 20s timeout instead of during it.

## 5. Security boundary — stated plainly

| Threat | Mitigation | Status |
|---|---|---|
| Sandbox reads framework secrets | env whitelist; **secrets never inherited** | **hard** (T-S1) |
| Sandbox writes outside project root | path resolution + symlink check + RLIMIT_FSIZE | **hard** (T-S2, T-S6) |
| Fork bomb / resource exhaustion | RLIMIT_NPROC, RLIMIT_AS, RLIMIT_CPU, wall timeout | **hard** (T-S3, T-S4) |
| Sandbox escapes via interpreter startup files | `HOME` set to project root, `PYTHONSTARTUP`/`NODE_OPTIONS`/`NODE_PATH` cleared | **hard** (T-S1) |
| Network exfiltration | `unshare --net` where available; env sanitisation + no proxy config otherwise | **best effort — documented** |
| Malicious code reaches the host | tier 2 (container/microVM) | **not in this phase** |

**The line between "hard" and "best effort" is a real one and the spec does not
blur it.** Tier 1 is safe to run *user-written* code from a *local single-user*
session. It is **not** safe to run untrusted code from the internet — that
requires tier 2, and the capability description says so in the string itself so
no one has to read this spec to know it.

## 6. Wire protocol

### 6.1 New client commands (JSON, same socket as Phase 2)

```
{ c: 'fs_list',     path?: string }
{ c: 'fs_read',     path: string }
{ c: 'fs_write',    path: string, content: string }
{ c: 'code_run',    path?: string, source?: string, language?: 'js'|'py' }
{ c: 'term_open',   cols?: number, rows?: number }
{ and a special case, below }
```

### 6.2 The terminal frame — the one binary exception

Phase 2 §9.1 decision 3 drew a hard line: **no binary frames, fragmented frames
rejected with close 1002.** The terminal breaks that assumption, and it breaks
it for a reason: terminal output is byte-oriented, not text-oriented. Forcing
UTF-8 validation on it means a program printing raw bytes or a non-UTF-8 locale
either corrupts or closes the socket — both are wrong.

**Resolution: a separate subprotocol, negotiated on a separate path, not bolted
onto the chat socket.**

```
GET /terminal?id=<termId>   ← HTTP upgrade, same WS implementation
  · client frames:  BINARY (op 2) → raw bytes to pty stdin
                    TEXT (op 1)   → JSON control: { resize: [c,r] } | { kill: true }
  · server frames:  BINARY → raw pty stdout (masked client→server as per RFC 6455)
                    TEXT    → JSON control: { exited: code } | { error }
```

The chat socket's §9.1 table is **unchanged** — it still rejects binary and
fragmented frames with 1002. This is a new endpoint with an explicitly wider
scope, named in code (`TERMINAL_WS_PATH`), and the rejection test (T-W1b from
Phase 2) keeps passing because the two sockets are separate objects with
separate frame policies. Phase 2's commitment — "the moment binary is needed we
switch to `ws` behind the same seam" — is honoured by containing the change to
one new handler, not by rewriting the chat socket.

The terminal handler reuses `packages/web/src/ws.ts`'s frame codec; only its
*accept list* differs (~15 lines).

### 6.3 Backpressure

Terminal output is bursty (a `cat` of a big file can flood). The server applies
the same drain strategy as Phase 2 §4: if the socket's buffered amount exceeds
1 MiB it `await`s a drain instead of dropping. A slow consumer slows the pty,
which is the correct failure mode — terminal programs are expected to handle
backpressure via their own stdout blocking.

## 7. Package layout

### 7.1 `packages/sandbox` — new

```
packages/sandbox/
  package.json          { "name": "@magoco/sandbox", deps: @magoco/core only }
  tsconfig.json
  src/
    index.ts            public exports
    plugin.ts           manifest + register() — same shape as web's
    fs.ts               magoco.fs.* implementation
    runner.ts           magoco.code.run — limits, spawn, streaming
    pty.ts              magoco.term.* — node-pty or stdlib fallback
    adapters.ts         js / py (and the registry for more)
    paths.ts            root resolution + escape checks
    limits.ts           RunLimits defaults + setrlimit bridge
  plugin/sandbox/
    plugin.yaml         provides: [magoco.fs.*, magoco.code.run, magoco.term.*]
    index.ts            re-export of src/plugin.ts (the loader's convention)
  test/
    fs.test.ts · runner.test.ts · pty.test.ts · limits.test.ts · security.test.ts
```

**`@magoco/sandbox` depends on `@magoco/core` only.** It does not import
`@magoco/web` (the server resolves capabilities; it never imports the sandbox
package directly, exactly as it never imports `@magoco/agents`' internals).
This is the same directionality rule that made `bdb17d0` work, and it is
asserted by a test that statically checks `packages/sandbox/src` for imports of
`@magoco/web` or `@magoco/ui` (T-S8).

### 7.2 `packages/ui` — new views

- `views/files.ts` — tree, lazy-expand (a 10k-file project must not load the
  whole tree at once; the UI requests subtrees with `fs_list` on expand)
- `views/editor.ts` — Monaco via CDN ESM import **with a no-build guarantee**:
  the UI has no bundler, and Monaco is loaded from a CDN as an ES module, with
  a **textarea fallback** when the CDN is unreachable (offline, air-gapped,
  HF Space with no egress). The fallback is not decorative — it is a test
  (T-U-T1) that the UI degrades to an editable text area and the file still
  saves via `fs_write`.
- `views/terminal.ts` — xterm.js canvas renderer, same CDN-or-fallback policy;
  the fallback is a `<pre>` with line-buffered stdin via a form. Ugly but
  functional, and it keeps `pnpm test` hermetic.
- `state/reducer.ts` folds `fs.changed`, `code.*`, `term.data` into state.

### 7.3 `packages/web` — new routes, no new deps

`fs.*` and `code.*` commands are handled by the existing socket's command
router, extended. The terminal endpoint is a new `http.upgrade` branch in
`http.ts`. `packages/web/package.json` gains **no** new dependency — the pty
lives in the sandbox package, and the web server only routes to it via the
capability registry.

### 7.4 Monaco and xterm: the dependency question

Monaco (~5 MB) and xterm.js (~200 KB) are the first genuinely heavy UI assets in
the project. Three options were considered:

1. **CDN ESM + fallback** ← **chosen**
2. Vendor the built bundles into `packages/ui/vendor/` (adds ~5 MB to the repo,
   every clone pays it, every update is a manual diff)
3. Add a bundler to the UI (contradicts Phase 2 §6.2's no-bundler rule and adds
   a build step to every contributor's loop)

(1) keeps the repo cloneable, the tests hermetic, and the upgrade path a URL
bump — and the fallback means the CDN being blocked does not brick the editor.
The tradeoff is a runtime network dependency for the *nice* editor, which is
acceptable because the *product* still works without it. This is the same
engineering rule Phase 2 invoked: **hand-roll or degrade when failure is
visible and testable; take the dependency when failure only shows up offline.**

### 7.5 `node-pty`: the one native dependency

The terminal needs a real pty. Options: `node-pty` (native addon, needs a C
compiler to build on install) or `script -qc` / `util-linux` (stdlib, no
native build). Both are present here:

- `gcc`, `g++`, `make` — available (verified)
- `script` (util-linux) — available (verified)

**Decision: `node-pty` as the primary, with a `script`-based fallback.** The
native build is the risk: on a machine without a toolchain the install fails
and the terminal feature is dead. The fallback keeps `pnpm install` + `pnpm
test` green everywhere, and the capability def's description says which backend
is active. `node-pty` is an **optional** dependency of `@magoco/sandbox`, not a
required one — the tests exercise the fallback path by default and the
native path when the addon loads. This is why T-S9 exists.

## 8. Test plan (the §5 gate)

Contract tests live next to the code; the suite must pass from a fresh clone.
**The sandbox's tests run against a real temp dir and real processes.** No
mocked `child_process`, no stubbed fs. A test that mocks execution cannot fail
on the bug that matters.

| ID | Suite | Asserts |
|---|---|---|
| T-S1 | `sandbox/security.test.ts` | Child env contains **no** secret from parent; `HOME` is the project root; `NODE_OPTIONS`/`PYTHONSTARTUP` absent |
| T-S2 | `sandbox/paths.test.ts` | `../escape`, absolute `/etc/passwd`, `foo/../../etc` all refused |
| T-S3 | `sandbox/limits.test.ts` | Fork bomb (`while(1)fork()` → python `os.fork` loop) killed by RLIMIT_NPROC; memory hog killed by RLIMIT_AS |
| T-S4 | `sandbox/runner.test.ts` | `while(true)` killed at `timeoutMs`; run resolves `killed: true`, no orphan process remains (checked via `ps`) |
| T-S5 | `sandbox/runner.test.ts` | js + py both execute; stdout and stderr arrive in order; exit code propagates |
| T-S6 | `sandbox/fs.test.ts` | Symlink pointing outside root → `E_SYMLINK_ESCAPE`; symlink inside → followed |
| T-S7 | `sandbox/fs.test.ts` | Recursive list, read, write, create-parent-dirs, watch emits `changed` |
| T-S8 | `sandbox/deps.test.ts` | `packages/sandbox/src` imports neither `@magoco/web` nor `@magoco/ui` (static scan) |
| T-S9 | `sandbox/pty.test.ts` | With node-pty: real pty, `echo hi` round-trips, resize changes window size, kill ends process. **Without** it (addon absent): the `script` backend round-trips the same commands — both paths are run and both must pass |
| T-S10 | `sandbox/atomicity.test.ts` | A multi-file write that fails on file 2 of 3 leaves **zero** files written |
| T-S11 | `sandbox/streaming.test.ts` | A program emitting 1000 lines streams them as ~1000 chunks, not one buffer; a slow `sleep(1)`-between-lines program yields chunks over time |
| T-U-T1 | `ui/editor.test.ts` | Monaco unavailable → textarea fallback; content still saves via `fs_write` |
| T-U-T2 | `ui/files.test.ts` | Tree renders lazily: a 10k-file listing renders only expanded nodes |
| T-U-T3 | `ui/terminal.test.ts` | Fake terminal WS: bytes round-trip, `exited` frame ends the view, resize command sent on container resize |
| T-W8 | `web/sandbox-routes.test.ts` | `fs_list`/`fs_read`/`fs_write`/`code_run` over the real socket; unknown capability → error frame, not a crash |
| T-W9 | `web/terminal.test.ts` | Terminal endpoint: binary round-trip, resize control, `exited`, **and** the chat socket still rejects binary with 1002 (T-W1b still green) |
| T-E2E2 | `e2e-code.test.ts` | Full stack: `--profile web` → write `print('hi')` via the editor → run → **`hi` appears in the output panel**; open a terminal → `echo hello` → `hello` appears |
| T-CL | `cli.test.ts` | `magoco run --code <file>` from CLI executes and streams to stdout (headless path, no browser) |

**Live suite (opt-in):** `MAGOCO_LOCAL_LLM=1` runs T-E2E2 with the local
`qwen.gguf` model on `127.0.0.1:8432` available for the agent's own tool calls —
this is the seam Phase 3.5 will build #44 on.

**Existing suite:** all 125 Phase 0–2 tests must stay green. A regression in
Phase 2 chat to fund a Phase 3 feature is a failed phase.

## 9. Decisions (final)

1. **AI features (#42/#43/#44/#45) are deferred to Phase 3.5, a point release.**
   Not because they are hard — because they are untestable without a running
   sandbox. AI debugging means "read the error, suggest the fix", and the error
   only exists if code actually ran. Phase 3.5 ships against a *live* `magoco.code.run`,
   which is the only honest substrate. The four issues move to a new milestone,
   not to the backlog of this one. This is the same reasoning Phase 2 used for
   branching (§9.1): protect the data model and the testability, not the feature
   count.

2. **Pure-UI items (#40 diff, #41 preview, #47 modes, #48 design import) move
   to Phase 3.6** as community-shaped work. They touch no capability. A
   contributor can implement the diff viewer against `magoco.fs.read` alone.
   Keeping them out of the critical path keeps *this* phase's review focused on
   the one thing that can fail dangerously: execution.

3. **The agent gets `magoco.code.run` as a tool, not a UI feature.** In Phase 2
   the web plugin exposed `ctx.registry.resolve(capability)` to the ReAct loop's
   tool layer; Phase 3 wires `magoco.code.run` into that same path so the agent
   can *execute its own generated code*. This is the seed of Phase 6 (production
   pipelines) and Phase 8 (self-evolution) and it costs nothing extra — the
   capability already exists, it only needs registering as a callable tool.

4. **`/usr/bin/python3`, never the venv.** The system python is `/usr/bin/python3.13`;
   `/opt/hermes/.venv/bin/python3` is the agent's own interpreter with its own
   installed packages. Sandboxed code runs the system one. Both are real
   choices on this machine; only one is safe.

5. **Network isolation is best-effort and the docs say so.** `unshare --net`
   works or it does not; there is no way to *guarantee* no-network on a host
   without privileges. The capability string says "process-isolated; network
   not guaranteed — do not run untrusted code". An honest soft boundary beats
   a silent hard claim that a container escape would falsify.

6. **One PR per delivered item, in delivery order (A→F).** Each PR is: capability
   def + implementation + contract tests + a working `--exec`/`--serve` demo.
   No PR lands with a stubbed test or a `// TODO: real isolation`. §6 of the
   master plan already requires this; restating it because Phase 3 is where the
   temptation is strongest.

7. **The sandbox's own tests must not skip.** `it.skip` on a security test is
   worse than no test — it documents a gap and hides it from the run output.
   If a limit cannot be enforced on this host, the test asserts the *documented*
   behaviour and the reason is in the capability description, not in a `.skip`.

## 10. Done definition (§5 of the master plan)

All four, from a fresh clone of `main`:

1. **Every test green** — the existing 125, plus T-S1–T-S11, T-U-T1–T-U-T3,
   T-W8, T-W9, T-E2E2, T-CL. Zero `.skip`.
2. **`tsc --noEmit` clean** — for `core`, `agents`, `web`, `ui`, **and `sandbox`**.
3. **A real CLI run** — `magoco run --code hello.py` executes and streams, and
   `magoco --profile web` shows the editor, the tree, and a live terminal in
   the browser.
4. **The security tests are not green by accident** — T-S1 (no secret leakage)
   and T-S2 (no path escape) are re-run explicitly in the PR description with
   their output pasted, because those two are the ones a reviewer cannot
   verify from reading the diff.

## 11. Delivery order and issue mapping

Each row is one PR. Each PR closes its issue and updates the master plan checklist.

| PR | Capability | Closes | Depends on |
|----|-----------|--------|------------|
| 1 | `magoco.fs.*` — file manager + tree | #36 | — |
| 2 | `magoco.code.run` + tier-1 sandbox + limits | #39 | PR1 |
| 3 | Execution UI: run button, output panel, streaming | #38 | PR2 |
| 4 | `magoco.term.*` + `/terminal` WS + xterm UI | #37 | PR1, PR2 |
| 5 | Monaco + tabs + textarea fallback | #35 | PR1 |
| 6 | Atomic multi-file edit | #46 | PR1, PR5 |

**Deferred to Phase 3.5** (new milestone `Phase 3.5 — Code AI`): #42, #43, #44, #45.
**Deferred to Phase 3.6** (new milestone `Phase 3.6 — Code UI polish`): #40, #41,
#47, #48.

At the end of PR6, milestone #4 closes with 6 of 14 issues done and the other 8
moved to named follow-up milestones — not silently dropped, not left to rot in
an open milestone that never closes.
