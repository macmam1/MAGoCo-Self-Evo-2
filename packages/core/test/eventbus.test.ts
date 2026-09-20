import assert from 'node:assert/strict';
import { test } from 'node:test';
import { EventBus } from '../src/eventbus/bus.js';

test('scoped subscribers receive only their events', () => {
  const bus = new EventBus();
  const gotA: string[] = [];
  const gotB: string[] = [];
  bus.subscribe('cap.a', 'started', (e) => gotA.push(e.type));
  bus.subscribe('cap.b', 'started', (e) => gotB.push(e.type));

  bus.publish({ capability: 'cap.a', type: 'started', payload: null });
  bus.publish({ capability: 'cap.b', type: 'started', payload: null });
  bus.publish({ capability: 'cap.a', type: 'finished', payload: null });

  assert.deepEqual(gotA, ['started']);
  assert.deepEqual(gotB, ['started']);
});

test('wildcard subscriber sees everything', () => {
  const bus = new EventBus();
  const seen: string[] = [];
  bus.subscribe('*', '*', (e) => seen.push(`${e.capability}.${e.type}`));

  bus.publish({ capability: 'cap.a', type: 'x', payload: null });
  bus.publish({ capability: 'cap.b', type: 'y', payload: null });

  assert.deepEqual(seen, ['cap.a.x', 'cap.b.y']);
});

test('unsubscribe stops delivery', () => {
  const bus = new EventBus();
  const seen: string[] = [];
  const off = bus.subscribe('cap.a', '*', (e) => seen.push(e.type));
  bus.publish({ capability: 'cap.a', type: 'one', payload: null });
  off();
  bus.publish({ capability: 'cap.a', type: 'two', payload: null });
  assert.deepEqual(seen, ['one']);
});

test('sink receives monotonically numbered events', () => {
  const stored: { seq: number; capability: string }[] = [];
  const bus = new EventBus((e) => stored.push(e));
  bus.publish({ capability: 'cap.a', type: 'one', payload: null });
  bus.publish({ capability: 'cap.a', type: 'two', payload: null });
  assert.deepEqual(stored.map((s) => s.seq), [1, 2]);
  assert.deepEqual(stored.map((s) => s.capability), ['cap.a', 'cap.a']);
});
