/**
 * 产物导出测试（v3.3.2 新增）
 * 背景：v3.3.1 及之前，完整性测试只断言 Object.keys().length === 26，
 * 而 ESM/CJS 产物在 Node 下 21 个导出值为 undefined（模块把注册包进
 * `if (typeof window === 'undefined') return`）。本文件锁死"取值"而不仅是"键"。
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const require = createRequire(import.meta.url);
const here = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(here, '..', 'dist');

const EXPECTED_EXPORTS = [
  'ShadowElement', 'WC', 'chat', 'colorpicker', 'config', 'contextMenu',
  'core', 'createTransport', 'datepicker', 'default', 'dialog', 'diff',
  'draggable', 'hotkeys', 'i18n', 'markdown', 'mount', 'notificationCenter', 'palette',
  'sessions', 'setLocale', 'settings', 'shadow', 'shortcutsPanel', 'terminal',
  't', 'theme', 'toast', 'transport', 'upload', 'Mobile'
];

test('ESM 产物：31 个命名导出全部有值（非 undefined）', async () => {
  const m = await import(path.join(dist, 'qoder-ui.esm.mjs'));
  for (const k of EXPECTED_EXPORTS) {
    assert.notEqual(m[k], undefined, `ESM 导出 ${k} 为 undefined`);
  }
  assert.equal(Object.keys(m).filter(k => k !== '__proto__').length, EXPECTED_EXPORTS.length);
});

test('CJS 产物：31 个命名导出全部有值（require 不崩溃，SSR 安全）', () => {
  const m = require(path.join(dist, 'qoder-ui.cjs.js'));
  for (const k of EXPECTED_EXPORTS) {
    assert.notEqual(m[k], undefined, `CJS 导出 ${k} 为 undefined`);
  }
});

test('Node 下纯逻辑 API 真实可用（非空壳）', async () => {
  const { core, diff, shadow, transport, createTransport, WC, ShadowElement, t: tFn, setLocale } =
    await import(path.join(dist, 'qoder-ui.esm.mjs'));

  // i18n：t / setLocale 门面可用
  assert.equal(typeof tFn, 'function');
  assert.equal(typeof setLocale, 'function');
  assert.equal(tFn('已复制 ✓'), '已复制 ✓'); // 默认源串
  setLocale('en');
  assert.equal(tFn('已复制 ✓'), 'Copied ✓');
  setLocale(null); // 恢复，避免污染其他用例

  // core：模糊匹配 + 键解析
  assert.ok(core.fuzzyMatch('settings panel', 'set').score > 0);
  assert.equal(core.matchKeys({ ctrlKey: true, key: 'k' }, 'ctrl+k'), true);

  // diff：词级 LCS diff 引擎
  const d = diff.diffWords('hello world', 'hello qoder');
  assert.ok(Array.isArray(d) && d.length >= 2);
  assert.ok(diff.diffLines('a\nb', 'a\nc').length >= 2);

  // shadow：样式隔离引擎（prepare/applyStyles/resolveEntryCSS）+ 基类存在
  assert.equal(typeof shadow.prepare, 'function');
  assert.equal(typeof shadow.applyStyles, 'function');
  assert.equal(typeof ShadowElement, 'function');

  // WC：18 组件注册表
  assert.ok(Array.isArray(WC.components) || typeof WC.register === 'function');

  // transport：工厂可用
  const t = createTransport('mock');
  assert.equal(t.name, 'mock');
  await t.connect();
  assert.equal(t.status, 'open');

  // transport 管理器：create/use/get/clear 生命周期
  assert.equal(transport.get(), null);
  const used = await transport.use('mock');
  assert.equal(used.name, 'mock');
  assert.equal(transport.get(), used);
  await transport.clear();
  assert.equal(transport.get(), null);
});

test('Node 下 transport 实例 chat/exec 全链路（Mock 流式）', async () => {
  const { transport } = await import(path.join(dist, 'qoder-ui.esm.mjs'));
  const t = await transport.use('mock');
  assert.equal(typeof t.chat, 'function');
  assert.equal(typeof t.exec, 'function');
  let full = '';
  const handle = t.chat('你好', {
    onDelta: (chunk, acc) => { full = acc; },
    onDone: () => {}
  });
  assert.ok(handle && typeof handle.abort === 'function');
  await new Promise(r => setTimeout(r, 300));
  assert.ok(full.length > 0, 'Mock 流式应产出增量文本');
  await transport.clear();
});

test('SSR 语义：不触碰 window/document/localStorage 即可完成 import', async () => {
  // 子进程干净环境导入（无任何浏览器全局注入），能完整加载即为通过
  const { execFileSync } = await import('node:child_process');
  const script = `
    (async () => {
      const m = await import(${JSON.stringify(path.join(dist, 'qoder-ui.esm.mjs').replace(/\\/g, '/'))});
      if (!m.transport || !m.diff || !m.core) process.exit(3);
      const t = m.createTransport('mock');
      if (t.name !== 'mock') process.exit(4);
      process.exit(0);
    })().catch(() => process.exit(5));
  `;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.ok(out !== null);
});
