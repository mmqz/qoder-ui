/**
 * v3.4 Markdown 渲染器测试
 * 覆盖：块级语法 / 行内语法 / 链接白名单 / XSS 防护 / SSR 导入
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

const here = path.dirname(fileURLToPath(import.meta.url));
// src 模块直接挂 globalThis（纯字符串处理，无 DOM 依赖，Node 可导入）
await import(path.join(here, '..', 'src', 'qoder-markdown.js'));
const md = globalThis.QoderUI.markdown;

test('markdown 模块导出完整（render/inline/escapeHtml/version）', () => {
  assert.equal(typeof md.render, 'function');
  assert.equal(typeof md.inline, 'function');
  assert.equal(typeof md.escapeHtml, 'function');
  assert.ok(md.version);
});

test('标题映射：#~#### → h2~h5', () => {
  assert.ok(md.render('# T').includes('<h2 class="qoder-md-h">T</h2>'));
  assert.ok(md.render('## T').includes('<h3 class="qoder-md-h">T</h3>'));
  assert.ok(md.render('#### T').includes('<h5 class="qoder-md-h">T</h5>'));
  // # 后无空格不是标题
  assert.ok(md.render('#T').startsWith('<p>'));
});

test('行内语法：粗体/斜体/删除线/行内码', () => {
  assert.ok(md.inline('**b**').includes('<strong>b</strong>'));
  assert.ok(md.inline('*i*').includes('<em>i</em>'));
  assert.ok(md.inline('~~d~~').includes('<del>d</del>'));
  assert.ok(md.inline('`c`').includes('<code class="qoder-md-code">c</code>'));
  // 行内码保护内部语法
  assert.equal(md.inline('`**x**`'), '<code class="qoder-md-code">**x**</code>');
  // snake_case 不误判斜体
  assert.ok(md.inline('my_var_name').includes('my_var_name'));
});

test('链接白名单：http/https/相对路径通过，javascript: 不产出 <a>', () => {
  const ok = md.inline('[x](https://a.com)');
  assert.ok(ok.includes('<a href="https://a.com"'));
  assert.ok(ok.includes('rel="noopener noreferrer nofollow"'));
  assert.ok(md.inline('[x](/rel)').includes('<a href="/rel"'));
  assert.ok(!md.inline('[x](javascript:alert(1))').includes('<a '));
  assert.ok(!md.inline('[x](data:text/html,evil)').includes('<a '));
});

test('XSS 防护：标签/事件属性全部转义', () => {
  assert.ok(!md.render('<img src=x onerror=alert(1)>').includes('<img'));
  assert.ok(!md.render('<script>alert(1)</script>').includes('<script>'));
  assert.ok(md.render('<b>bold</b>').includes('&lt;b&gt;'));
  assert.ok(!md.inline('"onmouseover="x').includes('"onmouseover'));
});

test('代码块：围栏/语言标注/内部不解析语法', () => {
  const html = md.render('```js\nconst a = "<b>";\n**not bold**\n```');
  assert.ok(html.includes('data-lang="js"'));
  assert.ok(html.includes('&quot;&lt;b&gt;&quot;'));
  assert.ok(html.includes('**not bold**')); // 内部不做行内解析
  assert.ok(!html.includes('<strong>'));
});

test('列表：无序/有序/嵌套/任务列表', () => {
  const ul = md.render('- a\n- b\n  - b1\n- c');
  assert.ok(ul.includes('<ul class="qoder-md-list">'));
  assert.ok(ul.includes('qoder-md-list--sub'));
  const ol = md.render('1. one\n2. two');
  assert.ok(ol.includes('<ol class="qoder-md-list">'));
  const task = md.render('- [x] done\n- [ ] todo');
  assert.ok(task.includes('qoder-md-task is-done'));
  assert.ok(task.includes('☑'));
  assert.ok(task.includes('☐'));
});

test('表格：表头/对齐/行解析', () => {
  const html = md.render('| A | B |\n|---|--:|\n| 1 | 2 |');
  assert.ok(html.includes('<th>A</th>'));
  assert.ok(html.includes('text-align:right'));
  assert.ok(html.includes('<td>1</td>'));      // 无对齐列
  assert.ok(html.includes('>2</td>'));          // 右对齐列
});

test('引用与水平线', () => {
  const q = md.render('> line1\n> line2 **b**');
  assert.ok(q.includes('<blockquote class="qoder-md-quote">'));
  assert.ok(q.includes('<strong>b</strong>'));
  assert.ok(md.render('---').includes('<hr class="qoder-md-hr">'));
  assert.ok(md.render('***').includes('<hr class="qoder-md-hr">'));
});

test('段内换行与空行分段', () => {
  const html = md.render('a\nb\n\nc');
  assert.ok(html.includes('a<br>b'));
  assert.ok((html.match(/<p>/g) || []).length === 2);
});

test('边界输入：null/undefined/空串不崩溃且返回空', () => {
  assert.equal(md.render(null), '');
  assert.equal(md.render(undefined), '');
  assert.equal(md.render(''), '');
});

test(' SSR 安全：干净子进程导入 src 模块不崩溃', () => {
  const { execFileSync } = require('node:child_process');
  const script = `
    const m = await import(${JSON.stringify(path.join(here, '..', 'src', 'qoder-markdown.js'))});
    const md = globalThis.QoderUI.markdown;
    if (typeof md.render !== 'function') process.exit(1);
    if (md.render('**x**') !== '<p><strong>x</strong></p>') process.exit(1);
    console.log('SSR markdown OK');
  `;
  const out = execFileSync(process.execPath, ['--input-type=module', '-e', script], { encoding: 'utf8' });
  assert.ok(out.includes('SSR markdown OK'));
});
