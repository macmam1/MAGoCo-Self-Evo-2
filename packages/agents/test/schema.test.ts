import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../src/schema.js';

test('validate: accepts a value that matches the schema', () => {
  const schema = {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' }, count: { type: 'integer', minimum: 0 } },
    additionalProperties: false,
  };
  assert.deepEqual(validate({ name: 'x', count: 3 }, schema), { ok: true, errors: [] });
});

test('validate: reports a wrong type and stops there', () => {
  const schema = { type: 'string' };
  const r = validate(42, schema);
  assert.equal(r.ok, false);
  assert.match(r.errors[0]!.message, /expected string/);
});

test('validate: reports a missing required property by path', () => {
  const schema = {
    type: 'object',
    required: ['name'],
    properties: { name: { type: 'string' } },
  };
  const r = validate({}, schema);
  assert.equal(r.ok, false);
  assert.equal(r.errors[0]!.path, 'name');
  assert.match(r.errors[0]!.message, /required/);
});

test('validate: reports an out-of-range number', () => {
  const schema = { type: 'integer', minimum: 1, maximum: 10 };
  const r = validate(0, schema);
  assert.match(r.errors[0]!.message, />= 1/);
  const r2 = validate(11, schema);
  assert.match(r2.errors[0]!.message, /<= 10/);
});

test('validate: recurses into nested objects with a dotted path', () => {
  const schema = {
    type: 'object',
    properties: {
      target: {
        type: 'object',
        required: ['port'],
        properties: { port: { type: 'integer' } },
      },
    },
  };
  const r = validate({ target: {} }, schema);
  assert.equal(r.errors[0]!.path, 'target.port');
});

test('validate: checks every item of an array', () => {
  const schema = { type: 'array', items: { type: 'string' } };
  const r = validate(['ok', 7, 'ok'], schema);
  assert.equal(r.ok, false);
  assert.equal(r.errors[0]!.path, '[]');
});

test('validate: honours enum', () => {
  const schema = { type: 'string', enum: ['fast', 'slow'] };
  assert.equal(validate('fast', schema).ok, true);
  assert.equal(validate('medium', schema).ok, false);
});

test('validate: boolean schema true accepts, false rejects', () => {
  assert.equal(validate('anything', true).ok, true);
  assert.equal(validate('anything', false).ok, false);
});

test('validate: oneOf requires exactly one match', () => {
  const schema = { oneOf: [{ type: 'string' }, { type: 'number' }] };
  assert.equal(validate('x', schema).ok, true);
  assert.equal(validate(9, schema).ok, true);
  assert.equal(validate(true, schema).ok, false);
});

test('validate: additionalProperties:false rejects unknown keys', () => {
  const schema = {
    type: 'object',
    properties: { a: { type: 'string' } },
    additionalProperties: false,
  };
  const r = validate({ a: 'x', b: 1 }, schema);
  assert.equal(r.ok, false);
  assert.equal(r.errors[0]!.path, 'b');
});

test('validate: the tools-seam prefix appears in error paths', () => {
  const schema = { type: 'object', required: ['query'], properties: { query: { type: 'string' } } };
  const r = validate({}, schema, 'args');
  assert.equal(r.errors[0]!.path, 'args.query');
});
