# Phase 0 — Core runtime

The framework's foundation (MASTER_PLAN.md §3, phase 0). Everything else is built on these
five stable surfaces; nothing outside `packages/core` may reach past them.

| Module | Role |
| --- | --- |
| `capabilities/registry.ts` | The `def` / `provider` / `consumer` seam. Plugins register contracts and bind implementations here. |
| `capabilities/types.ts` | The three stable surfaces of the whole framework. **Changing this file is a breaking change.** |
| `eventbus/bus.ts` | Typed pub/sub. Modules talk to each other only through events — never direct calls. |
| `session/log.ts` | Append-only JSONL log. The single source of truth; the bus sinks into it before any plugin loads. |
| `plugins/loader.ts` | Discovers plugins on disk, isolates failures, revokes providers on unload. |
| `profiles/loader.ts` | A named bundle of config. Profiles compose via `extends`; `patch` overrides config and disables plugins. |
| `runtime.ts` | Boot order: log → bus → registry → profile → plugins. The only assembly point. |

## Modularity contract (MASTER_PLAN.md §1.5)

Adding a capability must be **one directory + one manifest + zero changes to the core**:

```
packages/core/examples/greeter/
├── plugins/greeter/
│   ├── plugin.yaml      # name, version, provides: [...]
│   └── index.js         # export default { register(ctx), teardown() }
└── profiles/web.yaml    # extends base, patch: { config: {...} }
```

## Run it

```bash
pnpm --filter @magoco/core exec tsx src/cli.ts \
  --root examples/greeter --profile web \
  --exec 'call magoco.greet.hello {"name":"World"}'
# "GREETING[Hello from MAGoCo] World"
```

The `greeting` value comes from `profiles/web.yaml`, proving config flows from a profile
through `ctx.config` into a provider — with no plugin importing anything from the core.

## Tests

```bash
./scripts/test-core.sh    # 22 contract tests + typecheck
```

Every capability has a contract test. The old repo's `assert result.success or not
result.success` pattern is gone: a test fails loudly when the contract breaks.
