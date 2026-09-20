import * as fs from 'node:fs';
import * as path from 'node:path';
import type { CapabilityRegistry } from '../capabilities/registry.js';

/**
 * The on-disk manifest every plugin must ship. This is stable surface #2
 * (MASTER_PLAN.md §1.5).
 */
export interface PluginManifest {
  readonly name: string;
  readonly version: string;
  readonly description?: string;
  /** Capabilities this plugin provides. */
  readonly provides: readonly string[];
  /** Capabilities this plugin consumes (for ordering / diagnostics only). */
  readonly consumes?: readonly string[];
}

export interface PluginModule {
  readonly manifest: PluginManifest;
  /** Called at boot. Register defs and bind providers here. */
  register(ctx: PluginRegisterContext): Promise<void> | void;
  /** Called on graceful shutdown or unload. */
  teardown?(): Promise<void> | void;
}

export interface PluginRegisterContext {
  readonly registry: CapabilityRegistry;
  readonly config: Record<string, unknown>;
  /** The plugin's own directory — use for bundling assets. */
  readonly dir: string;
  /** Emit an event on the global bus (persisted to the session log). */
  readonly emit: (capability: string, type: string, payload: unknown) => void;
}

type LoadFn = () => Promise<PluginModule>;

/** Events a plugin may emit during registration, plumbed from the runtime. */
export interface PluginHooks {
  readonly emit: (capability: string, type: string, payload: unknown) => void;
  /**
   * Runtime profile config, so plugins can read settings the operator chose
   * (port, model, endpoints) instead of only what their own config.yaml ships.
   */
  readonly profileConfig?: () => Record<string, unknown>;
}

/**
 * Discovers plugins on disk and manages their lifecycle.
 *
 * A plugin is any directory containing a `plugin.yaml` (or `plugin.json`)
 * plus a JS entrypoint. A bad plugin must never take down the core: load
 * errors are caught and reported, and unload fully revokes its providers.
 */
export class PluginLoader {
  private readonly loaded = new Map<string, { module: PluginModule; dir: string }>();

  constructor(
    private readonly registry: CapabilityRegistry,
    private readonly hooks: PluginHooks,
    private readonly logger: { warn(m: string, f?: Record<string, unknown>): void },
  ) {}

  /**
   * Scan `dirs` for plugins and register all that are enabled.
   * `enabled === undefined` means "no profile restriction" — load everything.
   */
  async loadAll(dirs: string[], enabled?: ReadonlySet<string>): Promise<void> {
    for (const dir of dirs) {
      let entries: import('node:fs').Dirent[];
      try {
        entries = await fs.promises.readdir(dir, { withFileTypes: true });
      } catch {
        continue; // missing plugin dir is not fatal
      }
      for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        const pluginDir = path.join(dir, entry.name);
        if (enabled && !enabled.has(entry.name)) continue;
        await this.loadOne(entry.name, pluginDir);
      }
    }
  }

  private async loadOne(name: string, pluginDir: string): Promise<void> {
    try {
      const manifestPath = ['plugin.yaml', 'plugin.json'].map((f) => path.join(pluginDir, f));
      const manifestFile = manifestPath.find((p) => fs.existsSync(p));
      if (!manifestFile) {
        this.logger.warn('plugin has no manifest, skipping', { dir: pluginDir });
        return;
      }
      const manifest = readManifest(manifestFile, fs.readFileSync(manifestFile, 'utf8'));
      if (manifest.name !== name) {
        this.logger.warn('plugin dir name != manifest name, skipping', { dir: pluginDir });
        return;
      }
      const entry = ['index.ts', 'index.js']
        .map((f) => path.join(pluginDir, f))
        .find((p) => fs.existsSync(p));
      if (!entry) {
        this.logger.warn('plugin has no index.ts/js, skipping', { dir: pluginDir });
        return;
      }
      // Plugins export their register/teardown either as the default export
      // or as named exports on the module namespace.
      const raw = (await import(pathToFileUrl(entry))) as {
        register?: PluginModule['register'];
        teardown?: PluginModule['teardown'];
        default?: PluginModule;
      };
      const mod: PluginModule = (raw.default ?? raw) as PluginModule;
      if (!mod?.register) throw new Error('plugin module has no register()');

      await mod.register({
        registry: this.registry,
        config: { ...readConfig(pluginDir), ...(this.hooks.profileConfig?.() ?? {}) },
        dir: pluginDir,
        emit: this.hooks.emit,
      });
      this.loaded.set(name, { module: mod, dir: pluginDir });
      this.logger.warn('plugin loaded', { name, provides: manifest.provides });
    } catch (err) {
      // A broken plugin must never kill the core.
      this.logger.warn('plugin failed to load', { name, error: String(err) });
    }
  }

  /** Unload one plugin, revoking every capability it provided. */
  async unload(name: string): Promise<void> {
    const entry = this.loaded.get(name);
    if (!entry) return;
    await entry.module.teardown?.();
    this.registry.revoke(name);
    this.loaded.delete(name);
  }

  /** Unload everything, in reverse order. */
  async unloadAll(): Promise<void> {
    for (const name of [...this.loaded.keys()].reverse()) {
      await this.unload(name);
    }
  }

  list(): string[] {
    return [...this.loaded.keys()];
  }
}

function readManifest(file: string, raw: string): PluginManifest {
  const parsed = file.endsWith('.json') ? JSON.parse(raw) : parseSimpleYaml(raw);
  if (!parsed.name || !parsed.version || !Array.isArray(parsed.provides)) {
    throw new Error(
      `invalid manifest at ${file} — a manifest needs name, version and a provides list`,
    );
  }
  return parsed as PluginManifest;
}

/**
 * Minimal indentation-aware YAML reader for the subset this framework needs:
 * nested maps, lists of scalars, and scalar values. Enough for manifests and
 * profiles — and deliberately tiny, so behaviour is fully predictable.
 *
 *   name: greeter          # scalar
 *   provides:              # list
 *     - magoco.greet
 *   patch:                 # nested map
 *     plugins:
 *       browser-use: false
 */
export function parseSimpleYaml(raw: string): Record<string, unknown> {
    const lines: Array<{
      indent: number;
      key?: string;
      value?: string;
      item?: string;
    }> = [];
    for (const line of raw.split('\n')) {
      if (!line.trim() || line.trim().startsWith('#')) continue;
      const indent = line.length - line.trimStart().length;
      const body = line.trim();
      if (body.startsWith('- ')) {
        lines.push({ indent, item: body.slice(2).trim() });
        continue;
      }
      const m = /^([A-Za-z0-9_.-]+):\s*(.*)$/.exec(body);
      if (!m) continue;
      lines.push({
        indent,
        key: m[1]!,
        value: m[2]!.trim(),
      });
    }

    // Build the tree with an explicit stack of (indent, container).
    const root: Record<string, unknown> = {};
    const stack: Array<{ indent: number; target: Record<string, unknown> | string[] }> = [
      { indent: -1, target: root },
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      while (stack.length > 1 && stack[stack.length - 1]!.indent >= line.indent) stack.pop();
      const parent = stack[stack.length - 1]!;

      if (line.item !== undefined) {
        if (!Array.isArray(parent.target)) continue; // stray list item
        (parent.target as string[]).push(line.item);
        continue;
      }
      if (line.value !== undefined && line.value !== '') {
        (parent.target as Record<string, unknown>)[line.key!] = coerceScalar(line.value);
        continue;
      }
      // Empty value → a list or a nested map follows; peek at the next line to decide.
      const next = lines[i + 1];
      const asList = !!next && next.indent > line.indent && next.item !== undefined;
      const container = asList ? [] : {};
      (parent.target as Record<string, unknown>)[line.key!] = container;
      stack.push({ indent: line.indent, target: container });
    }
    return root;
  }

function readConfig(dir: string): Record<string, unknown> {
  const cfg = path.join(dir, 'config.yaml');
  if (!fs.existsSync(cfg)) return {};
  try {
    return parseSimpleYaml(fs.readFileSync(cfg, 'utf8'));
  } catch {
    return {};
  }
}

function pathToFileUrl(p: string): string {
  return 'file://' + path.resolve(p).replace(/\\/g, '/');
}

/** YAML scalars → JS: booleans, null, and ints are typed; the rest stay strings. */
function coerceScalar(raw: string): unknown {
  if (raw === 'true') return true;
  if (raw === 'false') return false;
  if (raw === 'null' || raw === '~') return null;
  if (/^-?\d+$/.test(raw)) return Number.parseInt(raw, 10);
  if (/^-?\d+\.\d+$/.test(raw)) return Number.parseFloat(raw);
  return raw;
}
