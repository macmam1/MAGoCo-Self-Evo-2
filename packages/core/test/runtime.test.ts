import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { Runtime } from '../src/runtime.js';

/**
 * End-to-end boot test: a real runtime, a real profile, a real plugin
 * written after the core was frozen. This is the proof that modularity
 * works, not a claim.
 */
test('runtime boots, loads a plugin, persists events, shuts down', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-rt-'));

  // minimal profile + plugin, as a user would write them
  await fs.mkdir(path.join(root, 'profiles'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'profiles', 'headless.yaml'),
    'profile: headless\npatch:\n  plugins:\n    greeter: true\n',
    'utf8',
  );
  await fs.mkdir(path.join(root, 'plugins', 'greeter'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'plugins', 'greeter', 'plugin.yaml'),
    'name: greeter\nversion: 1.0.0\nprovides:\n  - magoco.greet.hello\n',
    'utf8',
  );
  await fs.writeFile(
    path.join(root, 'plugins', 'greeter', 'index.js'),
    `export const manifest = { name: 'greeter', version: '1.0.0', provides: ['magoco.greet.hello'] };\n` +
      `export async function register(ctx) {\n` +
      `  ctx.registry.registerDef({ id: 'magoco.greet.hello', name: 'Greet', description: '', version: '1.0.0', create: () => null });\n` +
      `  ctx.registry.provide('magoco.greet.hello', 'greeter', { hello: 'world' });\n` +
      `  ctx.emit({ capability: 'magoco.greet.hello', type: 'registered', payload: { ok: true } });\n` +
      `}\n`,
    'utf8',
  );

  const rt = await Runtime.boot({ rootDir: root, profile: 'headless' });

  assert.equal(rt.registry.has('magoco.greet.hello'), true);
  assert.equal(rt.registry.resolve<{ hello: string }>('magoco.greet.hello').hello, 'world');

  // an event emitted from the runtime itself must land in the session log
  rt.emit('magoco.greet.hello', 'ping', { n: 1 });
  // give the async append a tick to flush
  await new Promise((r) => setTimeout(r, 50));

  const logFile = path.join(root, 'sessions', rt.sessionId, 'log.jsonl');
  const content = await fs.readFile(logFile, 'utf8');
  assert.ok(content.includes('"type":"ping"'), 'session log must contain emitted event');
  assert.ok(content.includes('"type":"registered"'), 'plugin event must be persisted too');

  await rt.shutdown();
  await fs.rm(root, { recursive: true });
});

test('invoke passes profile config to the provider through ctx.config', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-cfg-'));
  await fs.mkdir(path.join(root, 'plugins', 'cfgtest'), { recursive: true });
  await fs.mkdir(path.join(root, 'profiles'), { recursive: true });
  await fs.writeFile(
    path.join(root, 'profiles', 'p.yaml'),
    'patch:\n  config:\n    prefix: LIVE\n',
  );
  await fs.writeFile(
    path.join(root, 'plugins', 'cfgtest', 'plugin.yaml'),
    'name: cfgtest\nversion: 0.0.1\nprovides:\n  - magoco.cfg.echo\n',
  );
  await fs.writeFile(
    path.join(root, 'plugins', 'cfgtest', 'index.js'),
    `export default {
      async register(ctx) {
        ctx.registry.registerDef({ id: 'magoco.cfg.echo', description: 'echo', version: '0.0.1', name: 'echo' });
        ctx.registry.provide('magoco.cfg.echo', 'cfgtest', async (input, c) => {
          return c.config.prefix + ':' + input.text;
        });
      },
    };`,
  );
  const rt = await Runtime.boot({ rootDir: root, profile: 'p' });
  try {
    assert.equal(await rt.invoke('magoco.cfg.echo', { text: 'hi' }), 'LIVE:hi');
  } finally {
    await rt.shutdown();
  }
  await fs.rm(root, { recursive: true });
});
