import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseSimpleYaml } from '../plugins/loader.js';

/**
 * A profile is a named bundle of configuration. Profiles are composable:
 * every profile starts from `base` and layers a patch over it.
 *
 * Patch semantics (MASTER_PLAN.md §1.5 / §2.3): a profile may override any
 * single config key — including swapping one provider for another — without
 * touching a line of code.
 *
 *   profile: hf-space
 *   extends: base
 *   patch:
 *     plugins:
 *       browser-use: false     # no browser on a locked-down space
 *     config:
 *       persistence.driver: sqlite
 */
export interface Profile {
  readonly profile: string;
  readonly extends?: string | undefined;
  readonly patch?: Record<string, unknown> | undefined;
}

/** A fully resolved profile — no `extends` left, ready to boot. */
export interface ResolvedProfile {
  readonly name: string;
  readonly plugins: Map<string, boolean>;
  readonly config: Record<string, unknown>;
}

export class ProfileLoader {
  constructor(private readonly profilesDir: string) {}

  /** Load and fully resolve a profile by name (following `extends` chain). */
  load(name: string): ResolvedProfile {
    const chain: Profile[] = [];
    let cursor: string | undefined = name;
    const seen = new Set<string>();

    while (cursor) {
      if (seen.has(cursor)) throw new Error(`profile cycle detected at ${cursor}`);
      seen.add(cursor);
      const file = this.findFile(cursor);
      if (!file) throw new Error(`profile not found: ${cursor}`);
      const p = parseProfile(fs.readFileSync(file, 'utf8'), cursor);
      chain.unshift(p); // base first, most specific last
      cursor = p.extends;
    }

    const plugins = new Map<string, boolean>();
    const config: Record<string, unknown> = {};

    for (const p of chain) {
      const patch = p.patch ?? {};
      const patchPlugins = (patch.plugins ?? {}) as Record<string, boolean>;
      for (const [k, v] of Object.entries(patchPlugins)) plugins.set(k, v);
      const patchConfig = (patch.config ?? {}) as Record<string, unknown>;
      for (const [k, v] of Object.entries(patchConfig)) config[k] = v;
    }

    return { name, plugins, config };
  }

  private findFile(name: string): string | undefined {
    for (const ext of ['yaml', 'json']) {
      const f = path.join(this.profilesDir, `${name}.${ext}`);
      if (fs.existsSync(f)) return f;
    }
    return undefined;
  }
}

function parseProfile(raw: string, name: string): Profile {
  const p = parseSimpleYaml(raw);
  const ext = typeof p.extends === 'string' ? p.extends : undefined;
  const patch =
    p.patch && typeof p.patch === 'object' ? (p.patch as Record<string, unknown>) : undefined;
  return { profile: name, extends: ext, patch };
}
