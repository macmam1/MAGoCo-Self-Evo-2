import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseSimpleYaml } from '../src/plugins/loader.js';

test('parses scalar keys and list values', () => {
  const out = parseSimpleYaml([
    'name: greeter',
    'version: 1.0.0',
    'provides:',
    '  - magoco.greet.hello',
    '  - magoco.greet.bye',
  ].join('\n'));
  assert.equal(out.name, 'greeter');
  assert.equal(out.version, '1.0.0');
  assert.deepEqual(out.provides, ['magoco.greet.hello', 'magoco.greet.bye']);
});

test('skips comments and blank lines', () => {
  const out = parseSimpleYaml('# a comment\n\nname: x\n');
  assert.equal(out.name, 'x');
});
