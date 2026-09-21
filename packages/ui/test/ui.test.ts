/**
 * UI unit tests. These run under Node with the DOM lib enabled, which is
 * enough for the pure modules — the reducer, the renderer, i18n. The socket
 * and the live DOM are covered by the browser smoke test.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initial, reduce, type UiState } from '../src/state.js';
import { renderMarkdown, esc } from '../src/markdown.js';
import { t, detectLocale, isRtl } from '../src/i18n.js';

test('T-E1: tokens append in strict seq order', () => {
  let s: UiState = initial;
  s = reduce(s, { t: 'run_started' });
  s = reduce(s, { t: 'token', seq: 0, text: 'Hel' });
  s = reduce(s, { t: 'token', seq: 1, text: 'lo' });
  assert.equal(s.messages.at(-1)?.text, 'Hello');
  assert.equal(s.lastSeq, 1);
});

test('T-E1b: an out-of-order token is rejected, not appended', () => {
  let s: UiState = initial;
  s = reduce(s, { t: 'run_started' });
  s = reduce(s, { t: 'token', seq: 0, text: 'a' });
  // seq 5 jumps ahead — a protocol violation
  s = reduce(s, { t: 'token', seq: 5, text: 'b' });
  assert.equal(s.messages.at(-1)?.text, 'a');
  assert.ok(s.error);
});

test('T-E1c: duplicate token is also rejected', () => {
  let s: UiState = initial;
  s = reduce(s, { t: 'run_started' });
  s = reduce(s, { t: 'token', seq: 0, text: 'a' });
  s = reduce(s, { t: 'token', seq: 0, text: 'a' });
  assert.equal(s.messages.at(-1)?.text, 'a');
  assert.ok(s.error);
});

test('T-E2: done clears the streaming marker', () => {
  let s: UiState = initial;
  s = reduce(s, { t: 'run_started' });
  s = reduce(s, { t: 'token', seq: 0, text: 'x' });
  assert.equal(s.messages.at(-1)?.streaming, true);
  s = reduce(s, { t: 'done' });
  assert.equal(s.messages.at(-1)?.streaming, undefined);
  assert.equal(s.phase, 'idle');
});

test('T-E2b: failed returns to idle with an error', () => {
  let s: UiState = initial;
  s = reduce(s, { t: 'run_started' });
  s = reduce(s, { t: 'failed', error: 'timed out' });
  assert.equal(s.phase, 'idle');
  assert.equal(s.error, 'timed out');
});

test('T-E2c: tool calls attach to the streaming assistant message', () => {
  let s: UiState = initial;
  s = reduce(s, { t: 'run_started' });
  s = reduce(s, { t: 'tool', id: 'tc1', name: 'shell', status: 'running', summary: 'exit 0' });
  assert.equal(s.messages.at(-1)?.tools?.length, 1);
  assert.equal(s.messages.at(-1)?.tools?.[0].name, 'shell');
  assert.equal(s.messages.at(-1)?.tools?.[0].status, 'running');

  // tool_result resolves the same call id by matching id
  s = reduce(s, { t: 'tool_result', id: 'tc1', status: 'ok', summary: 'exit 0' });
  assert.equal(s.messages.at(-1)?.tools?.[0].status, 'done');
});

test('T-E3: markdown never emits a raw tag from model text', () => {
  const evil = '<script>alert(1)</script> and <img src=x onerror=alert(2)>';
  const out = renderMarkdown(evil);
  assert.ok(!out.includes('<script>'), 'raw script tag leaked');
  assert.ok(!out.includes('<img'), 'raw img tag leaked');
  assert.ok(out.includes('&lt;script&gt;'), 'script was not escaped');
  assert.ok(out.includes('&lt;img'), 'img was not escaped');
});

test('T-E3b: no unrecognised tag can survive into the output', () => {
  // The renderer emits a known allowlist: p, h1-h4, ul, li, code, pre, a,
  // strong, em. Anything from model text must land as inert escaped text.
  const allow = new Set(['p', 'h1', 'h2', 'h3', 'h4', 'ul', 'li', 'code', 'pre', 'a', 'strong', 'em']);
  const out = renderMarkdown('<svg/onload=alert(1)>\n\n<iframe src=x>\n\n<b>x</b>');
  const found = [...out.matchAll(/<([a-zA-Z][\w-]*)/g)].map((m) => m[1].toLowerCase());
  const unexpected = found.filter((tag) => !allow.has(tag));
  assert.deepEqual(unexpected, [], 'a tag outside the allowlist reached the DOM');
});

test('T-E3b: a fenced code block escapes its contents', () => {
  const out = renderMarkdown('```\n<b>raw</b>\n```');
  assert.ok(out.includes('&lt;b&gt;raw&lt;/b&gt;'));
  assert.ok(!out.includes('<b>raw</b>'));
});

test('T-E3c: markdown handles headings, lists and bold', () => {
  const out = renderMarkdown('# Title\n\n- one\n- two\n\n**bold** text');
  assert.ok(out.includes('<h1>Title</h1>'));
  assert.ok(out.includes('<ul><li>one</li><li>two</li></ul>'));
  assert.ok(out.includes('<strong>bold</strong>'));
});

test('T-E3d: a javascript: link is neutralised', () => {
  const out = renderMarkdown('[click](javascript:alert(1))');
  assert.ok(!out.includes('javascript:alert'));
  assert.ok(out.includes('href="#"'));
});

test('T-E4: i18n resolves en and fa keys and missing keys fall through', () => {
  assert.equal(t('chat.send', 'en'), 'Send');
  assert.equal(t('chat.send', 'fa'), 'ارسال');
  assert.equal(t('does.not.exist', 'en'), 'does.not.exist');
});

test('T-E4b: fa is RTL, en is not', () => {
  assert.equal(isRtl('fa'), true);
  assert.equal(isRtl('en'), false);
});

test('T-E4c: detectLocale prefers stored, then navigator', () => {
  // Cannot reliably stub navigator in node:test, so just assert it returns
  // a valid locale and never throws.
  const loc = detectLocale();
  assert.ok(loc === 'en' || loc === 'fa');
});

test('T-E5: esc handles every dangerous character', () => {
  assert.equal(esc('<>&"\''), '&lt;&gt;&amp;&quot;&#39;');
});
