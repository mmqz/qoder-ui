/**
 * CSS / 组件完整性测试
 *  - index.css 的全部 @import 目标存在
 *  - examples/index.html 使用到的 qoder-* 类在 CSS 中有定义（防样式漂移）
 *  - examples/index.html 使用的 qoder-* 自定义元素已注册且有属性响应
 *  - v3.2 关键新类存在（word 高亮 / 终端分屏）
 *  - 构建产物存在且非空
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'src');

/* ---------- 工具 ---------- */

function read(p) { return readFileSync(join(ROOT, p), 'utf-8'); }

function collectClassNames(cssText) {
  const set = new Set();
  const re = /\.([a-zA-Z][\w-]*)/g;
  let m;
  while ((m = re.exec(cssText)) !== null) set.add(m[1]);
  return set;
}

function collectCssImports(entryPath) {
  const dir = dirname(entryPath);
  const out = [];
  const text = readFileSync(entryPath, 'utf-8');
  const re = /@import\s+['"]?([^'");]+)['"]?\s*;/g;
  let m;
  while ((m = re.exec(text)) !== null) {
    const rel = m[1].replace(/^\.\//, '');
    out.push(join(dir, rel));
  }
  return out;
}

/* ---------- 1. CSS @import 完整性 ---------- */

test('index.css 的全部 @import 目标文件存在', () => {
  const entry = join(SRC, 'index.css');
  const imports = collectCssImports(entry);
  assert.ok(imports.length >= 12, `期望 >=11 个模块，实际 ${imports.length}`);
  for (const p of imports) {
    assert.ok(existsSync(p), `缺失 CSS 模块: ${p}`);
  }
});

/* ---------- 2. 演示页类名在 CSS 中有定义 ---------- */

test('examples/index.html 使用的 qoder-* 类在库 CSS 中全部定义', () => {
  const cssFiles = [
    'src/themes/qoder-themes.css', 'src/styles/base.css',
    'src/components/qoder-components.css', 'src/components/qoder-advanced.css',
    'src/components/qoder-icons.css', 'src/components/qoder-markdown.css',
    'src/components/qoder-chat.css', 'src/components/qoder-panels.css',
    'src/components/qoder-extras.css', 'src/components/qoder-viz.css',
    'src/components/qoder-responsive.css',
    'src/components/qoder-compat.css',
  ];
  let allCss = '';
  for (const f of cssFiles) allCss += read(f);

  const defined = collectClassNames(allCss);
  const html = read('examples/index.html');
  const used = new Set();
  const re = /class="([^"]+)"/g;
  let m;
  while ((m = re.exec(html)) !== null) {
    m[1].split(/\s+/).forEach(c => { if (c.startsWith('qoder-')) used.add(c); });
  }
  const missing = [...used].filter(c => !defined.has(c));
  assert.deepEqual(missing, [], `演示页使用了 CSS 中不存在的类: ${missing.join(', ')}`);
});

/* ---------- 3. v3.2 新增关键类 ---------- */

test('v3.2 关键类存在：词级高亮 + 终端分屏 + diff 行式布局', () => {
  const extras = read('src/components/qoder-extras.css');
  for (const cls of [
    'qoder-diff__line', 'qoder-diff__line--added', 'qoder-diff__line--removed',
    'qoder-diff__word-ins', 'qoder-diff__word-del',
    'qoder-diff__stat--added', 'qoder-diff__stat--removed',
    'qoder-terminal__bodies', 'qoder-terminal__bodies--split',
  ]) {
    assert.ok(extras.includes('.' + cls), `缺少类: ${cls}`);
  }
});

/* ---------- 4. Web Components 注册与属性响应 ---------- */

test('全部 21 个自定义元素已注册且声明 observedAttributes', () => {
  const wcSrc = read('src/qoder-wc.js');
  const uiSrc = read('src/qoder-ui.js');

  const wcNames = [
    'qoder-button', 'qoder-input', 'qoder-badge', 'qoder-avatar', 'qoder-alert',
    'qoder-switch', 'qoder-tabs', 'qoder-progress', 'qoder-spinner',
    'qoder-select', 'qoder-slider', 'qoder-tooltip', 'qoder-card',
    'qoder-breadcrumb', 'qoder-steps', 'qoder-timeline', 'qoder-empty',
    'qoder-pagination',
  ];
  const uiNames = ['qoder-user-card', 'qoder-dialog', 'qoder-theme-switcher'];

  for (const name of wcNames) {
    assert.ok(wcSrc.includes(`'${name}'`), `qoder-wc.js 未注册 ${name}`);
  }
  for (const name of uiNames) {
    assert.ok(uiSrc.includes(`'${name}'`), `qoder-ui.js 未注册 ${name}`);
  }

  // qoder-wc.js 中每个组件类都必须有 static get observedAttributes
  const classBodies = wcSrc.split(/class\s+\w+\s+extends\s+Base\s*\{/).slice(1);
  assert.equal(classBodies.length, wcNames.length, 'WC 类数量与注册数不符');
  classBodies.forEach((body, i) => {
    assert.ok(
      body.includes('static get observedAttributes'),
      `${wcNames[i]} 缺少 observedAttributes`
    );
  });
});

test('v3.2 WC 基类能力：attributeChangedCallback / composed 事件 / Shadow 隔离', () => {
  const shadowSrc = read('src/qoder-shadow.js');
  assert.ok(shadowSrc.includes('adoptedStyleSheets'), '缺少共享样式表采用');
  assert.ok(shadowSrc.includes('CSSStyleSheet'), '缺少 CSSStyleSheet 构建');
  assert.ok(shadowSrc.includes('composed: true'), '事件未穿透 shadow 边界');
  assert.ok(shadowSrc.includes('no-shadow'), '缺少 light DOM 退路');

  const wcSrc = read('src/qoder-wc.js');
  assert.ok(wcSrc.includes('slot'), '内容型组件缺少 slot 投影');
  assert.ok(wcSrc.includes('emit('), '缺少标准事件派发');
});

/* ---------- 5. 构建产物 ---------- */

test('dist/ 构建产物存在且非空', () => {
  const files = ['qoder-ui.min.css', 'qoder-ui.min.js', 'qoder-ui.esm.js', 'qoder-ui.cjs.js'];
  for (const f of files) {
    const p = join(ROOT, 'dist', f);
    assert.ok(existsSync(p), `缺少产物 ${f}（请先 npm run build）`);
    assert.ok(statSync(p).size > 1024, `产物过小: ${f}`);
  }
  const fontDir = join(ROOT, 'dist', 'fonts');
  assert.ok(existsSync(fontDir), '缺少字体目录');
  assert.ok(readdirSync(fontDir).length >= 2, '字体资产不完整');
});

test('types/index.d.ts 覆盖全部公共 API', () => {
  const dts = read('types/index.d.ts');
  for (const api of ['theme', 'toast', 'palette', 'terminal', 'hotkeys', 'diff', 'WC', 'shadow', 'core']) {
    assert.ok(dts.includes(api), `.d.ts 缺少 ${api}`);
  }
  assert.ok(dts.includes('QoderTerminalApi'), '缺少终端 API 类型');
  assert.ok(dts.includes('QoderDiffApi'), '缺少 Diff API 类型');
});
