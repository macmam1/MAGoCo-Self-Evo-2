/**
 * Feasibility probe (not a shipped test): can the existing PluginLoader pick
 * up a plugin file that a running agent just wrote to disk — i.e. is a hot
 * reload possible without a process restart? The answer decides whether the
 * "agent builds its own plugin" feature needs a new mechanism, or only the
 * existing PluginLoader exposed behind a capability.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';

import { PluginLoader } from '../src/plugins/loader.js';
import { CapabilityRegistry } from '../src/capabilities/registry.js';
import { EventBus } from '../src/eventbus/bus.js';

const PROBE_DIR = '/opt/data/pf/plugins';
type Global = { __demo?: string };

function makeLoader() {
  const registry = new CapabilityRegistry();
  const bus = new EventBus();
  return new PluginLoader(
    registry,
    { emit: (c, t, p) => bus.publish({ capability: c, type: t, payload: p }) },
    { warn: (m, f) => console.log('  LOADERWARN', m, JSON.stringify(f ?? {})) },
  );
}

test('v1: a plugin on disk loads and runs', async () => {
  await fs.rm(PROBE_DIR, { recursive: true, force: true });
  await fs.mkdir(path.join(PROBE_DIR, 'demo'), { recursive: true });
  await fs.writeFile(
    path.join(PROBE_DIR, 'demo', 'plugin.yaml'),
    'name: demo\nversion: 0.1.0\nprovides: []\n',
  );
  await fs.writeFile(
    path.join(PROBE_DIR, 'demo', 'index.ts'),
    `export default {
  manifest: { name: 'demo', version: '0.1.0', provides: [] },
  register() {
    (globalThis as unknown as { __demo?: string }).__demo = 'FIRST';
  },
};
`,
  );

  const loader = makeLoader();
  await loader.loadAll([PROBE_DIR]);
  console.log('  after v1 load: list =', loader.list(), 'global =', (globalThis as Global).__demo);
  assert.equal((globalThis as Global).__demo, 'FIRST');
  await loader.unloadAll();
});

test('v2 after rewrite: unload + reload must see the NEW code, not the cached module', async () => {
  const g = globalThis as Global;
  const loader = makeLoader();
  await loader.loadAll([PROBE_DIR]);
  assert.equal(g.__demo, 'FIRST');
  await loader.unload('demo');

  // Rewrite the plugin on disk — exactly what an agent would do.
  await fs.writeFile(
    path.join(PROBE_DIR, 'demo', 'index.ts'),
    `export default {
  manifest: { name: 'demo', version: '0.1.0', provides: [] },
  register() {
    (globalThis as unknown as { __demo?: string }).__demo = 'SECOND';
  },
};
`,
  );

  await loader.loadAll([PROBE_DIR]);
  const got = g.__demo;
  console.log('  AFTER RELOAD global =', got);
  assert.equal(got, 'SECOND', 'hot reload must pick up the rewritten file');

  await loader.unloadAll();
  await fs.rm(PROBE_DIR, { recursive: true, force: true });
});
