import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { CapabilityRegistry } from '../src/capabilities/registry.js';
import { PluginLoader } from '../src/plugins/loader.js';

/**
 * Modularity contract test (MASTER_PLAN.md §1.5):
 * adding a capability must be a new directory + a manifest, with zero
 * changes to the core. We verify it by loading a plugin the core has never
 * seen and checking its capability is bound.
 */
async function makePlugin(root: string, name: string, cap: string): Promise<string> {
  const dir = path.join(root, name);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(
    path.join(dir, 'plugin.yaml'),
    `name: ${name}\nversion: 1.0.0\nprovides:\n  - ${cap}\n`,
    'utf8',
  );
  await fs.writeFile(
    path.join(dir, 'index.js'),
    `export const manifest = { name: '${name}', version: '1.0.0', provides: ['${cap}'] };\n` +
      `export async function register(ctx) {\n` +
      `  ctx.registry.registerDef({ id: '${cap}', name: 'T', description: '', version: '1.0.0', create: () => null });\n` +
      `  ctx.registry.provide('${cap}', '${name}', { from: '${name}' });\n` +
      `}\n`,
    'utf8',
  );
  return dir;
}

test('loads a plugin from disk and binds its capability', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-plug-'));
  await makePlugin(tmp, 'greeter', 'magoco.greet.hello');

  const reg = new CapabilityRegistry();
  const loader = new PluginLoader(reg, { emit: () => {} }, console);
  await loader.loadAll([tmp], new Set(['greeter']));

  assert.equal(reg.has('magoco.greet.hello'), true);
  assert.deepEqual(reg.resolve<{ from: string }>('magoco.greet.hello').from, 'greeter');
  await fs.rm(tmp, { recursive: true });
});

test('a broken plugin does not stop the core or other plugins', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-plug-'));
  await makePlugin(tmp, 'good', 'magoco.good.ok');
  // a plugin whose register() throws
  await fs.mkdir(path.join(tmp, 'bad'), { recursive: true });
  await fs.writeFile(path.join(tmp, 'bad', 'plugin.yaml'), 'name: bad\nversion: 1.0.0\nprovides:\n  - magoco.bad.x\n', 'utf8');
  await fs.writeFile(
    path.join(tmp, 'bad', 'index.js'),
    `export const manifest = { name: 'bad', version: '1.0.0', provides: ['magoco.bad.x'] };\nexport async function register() { throw new Error('boom'); }\n`,
    'utf8',
  );

  const reg = new CapabilityRegistry();
  const loader = new PluginLoader(reg, { emit: () => {} }, console);
  await loader.loadAll([tmp], new Set(['good', 'bad']));

  assert.equal(reg.has('magoco.good.ok'), true);
  assert.equal(reg.has('magoco.bad.x'), false);
  await fs.rm(tmp, { recursive: true });
});

test('unload revokes a plugin capabilities', async () => {
  const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-plug-'));
  await makePlugin(tmp, 'tmpplug', 'magoco.tmp.x');

  const reg = new CapabilityRegistry();
  const loader = new PluginLoader(reg, { emit: () => {} }, console);
  await loader.loadAll([tmp], new Set(['tmpplug']));
  assert.equal(reg.has('magoco.tmp.x'), true);

  await loader.unload('tmpplug');
  assert.equal(reg.has('magoco.tmp.x'), false);
  await fs.rm(tmp, { recursive: true });
});
