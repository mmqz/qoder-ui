/**
 * Qoder UI 核心纯逻辑单元测试（零依赖，Node 内置 test runner）
 * 运行：npm test
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import '../src/qoder-core.js';
const C = globalThis.QoderCore;

/* ---------------- clamp / debounce / escapeHtml / uid ---------------- */

test('clamp 钳制到区间内', () => {
  assert.equal(C.clamp(5, 0, 10), 5);
  assert.equal(C.clamp(-3, 0, 10), 0);
  assert.equal(C.clamp(15, 0, 10), 10);
  assert.equal(C.clamp(0, 0, 10), 0);
  assert.equal(C.clamp(10, 0, 10), 10);
});

test('debounce 只在停止触发后执行一次', async () => {
  let calls = 0;
  const debounced = C.debounce(() => { calls++; }, 20);
  debounced(); debounced(); debounced();
  assert.equal(calls, 0);
  await new Promise(r => setTimeout(r, 50));
  assert.equal(calls, 1);
});

test('escapeHtml 转义全部危险字符', () => {
  assert.equal(C.escapeHtml('<script>&"\'</script>'),
    '&lt;script&gt;&amp;&quot;&#39;&lt;/script&gt;');
  assert.equal(C.escapeHtml(null), '');
  assert.equal(C.escapeHtml(123), '123');
});

test('uid 前缀 + 唯一性', () => {
  const a = C.uid('x');
  const b = C.uid('x');
  assert.ok(a.startsWith('x_'));
  assert.notEqual(a, b);
});

/* ---------------- LCS ---------------- */

test('lcs 基础公共子序列', () => {
  assert.deepEqual(C.lcs(['a', 'b', 'c'], ['a', 'x', 'c']), ['a', 'c']);
  assert.deepEqual(C.lcs([1, 2, 3], [1, 2, 3]), [1, 2, 3]);
  assert.deepEqual(C.lcs(['a'], ['b']), []);
  assert.deepEqual(C.lcs([], [1, 2]), []);
});

test('lcs 自定义相等函数', () => {
  const eq = (x, y) => x.id === y.id;
  assert.deepEqual(
    C.lcs([{ id: 1 }, { id: 2 }], [{ id: 2 }], eq).map(o => o.id),
    [2]
  );
});

/* ---------------- word-level diff ---------------- */

test('tokenizeLine 保留空白且重组无损', () => {
  const line = '  const x=1;';
  const tokens = C.tokenizeLine(line);
  assert.equal(tokens.join(''), line);
  assert.ok(tokens.includes('const'));
  assert.ok(tokens.includes(' '));
});

test('diffWords：前导空白差异被识别为 add 片段', () => {
  const segs = C.diffWords('const now = Date.now();', '    const now = Date.now();');
  const joined = segs.map(s => s.value).join('');
  assert.equal(joined, '    const now = Date.now();');
  assert.ok(segs.some(s => s.type === 'add' && s.value.trim() === ''));
  assert.ok(segs.some(s => s.type === 'equal' && s.value.includes('const')));
});

test('diffWords：中间词替换产生 del+add', () => {
  const segs = C.diffWords('let x = 1;', 'let y = 1;');
  assert.ok(segs.some(s => s.type === 'del' && s.value === 'x'));
  assert.ok(segs.some(s => s.type === 'add' && s.value === 'y'));
  // 重组无损
  assert.equal(
    segs.filter(s => s.type !== 'add').map(s => s.value).join(''),
    'let x = 1;'
  );
  assert.equal(
    segs.filter(s => s.type !== 'del').map(s => s.value).join(''),
    'let y = 1;'
  );
});

test('diffWords：完全相同的行只有 equal 片段', () => {
  const segs = C.diffWords('same line;', 'same line;');
  assert.ok(segs.every(s => s.type === 'equal'));
});

test('wordChanges 汇总改动词', () => {
  const wc = C.wordChanges('foo(bar)', 'foo(baz)');
  assert.deepEqual(wc.removed, ['bar']);
  assert.deepEqual(wc.added, ['baz']);
  assert.equal(wc.hasChanges, true);
  assert.equal(C.wordChanges('a', 'a').hasChanges, false);
});

test('diffWords：特殊字符与空行安全', () => {
  // 空行无 token，不产生任何片段（调用方按原文转义即可）
  assert.deepEqual(C.diffWords('', ''), []);
  const segs = C.diffWords('a<b && c', 'a<b && d');
  assert.ok(segs.some(s => s.type === 'del' && s.value === 'c'));
  assert.ok(segs.some(s => s.type === 'add' && s.value === 'd'));
});

/* ---------------- line-level diff ---------------- */

test('diffLines：修改行被配对为 del+add，行号正确', () => {
  const rows = C.diffLines('a\nb\nc', 'a\nx\nc');
  assert.deepEqual(rows, [
    { type: 'equal', text: 'a', oldNo: 1, newNo: 1 },
    { type: 'del', text: 'b', oldNo: 2, newNo: null },
    { type: 'add', text: 'x', oldNo: null, newNo: 2 },
    { type: 'equal', text: 'c', oldNo: 3, newNo: 3 },
  ]);
});

test('diffLines：纯新增', () => {
  const rows = C.diffLines('a', 'a\nb\nc');
  assert.equal(rows.filter(r => r.type === 'add').length, 2);
  assert.equal(rows[0].type, 'equal');
  assert.equal(rows[rows.length - 1].newNo, 3);
});

test('diffLines：纯删除', () => {
  const rows = C.diffLines('a\nb\nc', 'a');
  assert.equal(rows.filter(r => r.type === 'del').length, 2);
  assert.equal(rows[rows.length - 1].type, 'del');
});

test('diffLines：末尾换行不产生空行噪音', () => {
  const rows = C.diffLines('a\n', 'a\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].text, 'a');
});

/* ---------------- 模糊匹配 ---------------- */

test('fuzzyMatch：空 query 匹配一切', () => {
  const r = C.fuzzyMatch('任意', '');
  assert.equal(r.contains, true);
  assert.equal(r.subsequence, true);
});

test('fuzzyMatch：包含匹配评分高于子序列', () => {
  const contains = C.fuzzyMatch('切换主题', '主题');
  const sub = C.fuzzyMatch('主__题', '主题');
  assert.ok(contains.contains);
  assert.ok(sub.subsequence && !sub.contains);
  assert.ok(contains.score > sub.score);
});

test('fuzzyMatch：前缀包含得分最高', () => {
  const prefix = C.fuzzyMatch('主题色', '主题');
  const mid = C.fuzzyMatch('切换主题色', '主题');
  assert.ok(prefix.score > mid.score);
});

test('fuzzyMatch：不匹配返回 null（大小写不敏感）', () => {
  assert.equal(C.fuzzyMatch('Open Settings', 'zzz'), null);
  const r = C.fuzzyMatch('Open Settings', 'open');
  assert.equal(r.contains, true);
});

/* ---------------- 快捷键 ---------------- */

test('normalizeKeys：大小写与空白规范化', () => {
  assert.equal(C.normalizeKeys('Ctrl + Shift + P'), 'ctrl+shift+p');
  assert.equal(C.normalizeKeys('?'), '?');
});

test('parseCombo：固定顺序拆分', () => {
  assert.deepEqual(C.parseCombo('ctrl+shift+p'), ['ctrl', 'shift', 'p']);
});

test('comboFromEvent：修饰键完整组合', () => {
  assert.equal(C.comboFromEvent({ ctrlKey: true, metaKey: false, shiftKey: true, altKey: false, key: 'P' }), 'ctrl+shift+p');
  assert.equal(C.comboFromEvent({ ctrlKey: false, metaKey: true, shiftKey: false, altKey: false, key: 'k' }), 'ctrl+k');
  assert.equal(C.comboFromEvent({ key: '?' }), '?');
  // 纯修饰键按下不产生尾随 + 
  assert.equal(C.comboFromEvent({ ctrlKey: true, key: 'Control' }), 'ctrl');
});

test('matchKeys：shift+? 应命中注册的 ?（可打印键容错）', () => {
  const ev = { ctrlKey: false, metaKey: false, shiftKey: true, altKey: false, key: '?' };
  assert.equal(C.matchKeys(ev, 'shift+?'), true);
  // 库内 hotkeys.init 的容错逻辑：shift+? 去掉 shift 后命中 ?
  const combo = C.comboFromEvent(ev);
  assert.equal(combo.replace(/^shift\+/, ''), '?');
});
