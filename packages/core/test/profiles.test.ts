import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { ProfileLoader } from '../src/profiles/loader.js';

async function writeProfiles(files: Record<string, string>): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'magoco-prof-'));
  for (const [name, content] of Object.entries(files)) {
    await fs.writeFile(path.join(dir, name), content, 'utf8');
  }
  return dir;
}

test('extends chain resolves base then patch', () => {
  return (async () => {
    const dir = await writeProfiles({
      'base.yaml': 'profile: base\npatch:\n  plugins:\n    core: true\n    browser-use: true\n  config:\n    persistence.driver: sqlite',
      'hf-space.yaml': 'profile: hf-space\nextends: base\npatch:\n  plugins:\n    browser-use: false\n  config:\n    persistence.driver: postgres',
    });
    const p = new ProfileLoader(dir).load('hf-space');
    assert.equal(p.plugins.get('browser-use'), false);
    assert.equal(p.plugins.get('core'), true);
    assert.equal(p.config['persistence.driver'], 'postgres');
    await fs.rm(dir, { recursive: true });
  })();
});

test('cycle is rejected', () => {
  return (async () => {
    const dir = await writeProfiles({
      'a.yaml': 'profile: a\nextends: b',
      'b.yaml': 'profile: b\nextends: a',
    });
    assert.throws(() => new ProfileLoader(dir).load('a'), /cycle/);
    await fs.rm(dir, { recursive: true });
  })();
});

test('missing profile throws', () => {
  return (async () => {
    const dir = await writeProfiles({});
    assert.throws(() => new ProfileLoader(dir).load('nope'), /not found/);
    await fs.rm(dir, { recursive: true });
  })();
});
