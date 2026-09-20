import assert from 'node:assert/strict';
import { test } from 'node:test';
import { CapabilityRegistry } from '../src/capabilities/registry.js';
import { CapabilityNotRegisteredError, DuplicateProviderError } from '../src/capabilities/types.js';

/**
 * Contract test for the registry itself.
 *
 * Per MASTER_PLAN.md §1.5, every capability `def` ships a contract test that
 * any provider must pass. This is the test for the registry that enforces it.
 */
test('registers a def and resolves the bound provider', () => {
  const reg = new CapabilityRegistry();
  reg.registerDef({ id: 'test.foo', name: 'Foo', description: '', version: '1.0.0', create: () => ({ run: 1 }) });
  reg.provide('test.foo', 'plug-a', { run: 42 });

  const resolved = reg.resolve<{ run: number }>('test.foo');
  assert.equal(resolved.run, 42);
});

test('resolve throws when no provider is bound', () => {
  const reg = new CapabilityRegistry();
  reg.registerDef({ id: 'test.bar', name: 'Bar', description: '', version: '1.0.0', create: () => null });
  assert.throws(() => reg.resolve('test.bar'), CapabilityNotRegisteredError);
});

test('two plugins cannot provide the same capability', () => {
  const reg = new CapabilityRegistry();
  reg.registerDef({ id: 'test.dup', name: 'Dup', description: '', version: '1.0.0', create: () => null });
  reg.provide('test.dup', 'plug-a', {});
  assert.throws(() => reg.provide('test.dup', 'plug-b', {}), DuplicateProviderError);
});

test('the same plugin may re-provide its own capability (hot reload)', () => {
  const reg = new CapabilityRegistry();
  reg.registerDef({ id: 'test.reload', name: 'R', description: '', version: '1.0.0', create: () => null });
  reg.provide('test.reload', 'plug-a', { v: 1 });
  reg.provide('test.reload', 'plug-a', { v: 2 });
  assert.equal(reg.resolve<{ v: number }>('test.reload').v, 2);
});

test('revoke removes a plugin capabilities', () => {
  const reg = new CapabilityRegistry();
  reg.registerDef({ id: 'test.rv', name: 'Rv', description: '', version: '1.0.0', create: () => null });
  reg.provide('test.rv', 'plug-a', {});
  assert.equal(reg.has('test.rv'), true);
  reg.revoke('plug-a');
  assert.equal(reg.has('test.rv'), false);
});

test('list reflects what is currently bound', () => {
  const reg = new CapabilityRegistry();
  reg.registerDef({ id: 'test.l1', name: 'L1', description: '', version: '1.0.0', create: () => null });
  reg.registerDef({ id: 'test.l2', name: 'L2', description: '', version: '1.0.0', create: () => null });
  reg.provide('test.l1', 'plug-a', {});
  reg.provide('test.l2', 'plug-b', {});
  assert.deepEqual(
    reg.list().map((e) => e.capability).sort(),
    ['test.l1', 'test.l2'],
  );
});
