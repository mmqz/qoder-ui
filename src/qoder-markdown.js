/* ============================================================
   Qoder UI v3.4 - 轻量 Markdown 渲染器（聊天消息）
   ------------------------------------------------------------
   设计约束：
   - 安全优先：所有文本先整体 HTML 转义，再在转义后的文本上做
     白名单语法替换；链接仅允许 http/https/mailto/#/相对路径
   - SSR 安全：纯字符串处理，零 DOM 依赖，Node 可直接导入
   - 零依赖：不引入任何第三方解析器
   支持：标题(##) 粗体 斜体 删除线 行内码 代码块(围栏+语言)
        链接 任务列表 无序/有序列表(一级嵌套) 表格(对齐)
        引用 水平线 段内换行
   ============================================================ */
(function () {
  'use strict';

  const _g = typeof globalThis !== 'undefined' ? globalThis : {};
  const QF = _g.QoderUI = _g.QoderUI || {};

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);

  // 安全协议白名单（已还原 &amp; 后校验）
  const SAFE_URL = /^(https?:\/\/|mailto:|#|\/|\.\/|\.\.\/)/i;

  /* ---------- 行内语法：输入原始文本，内部先转义 ---------- */
  function inline(raw) {
    let s = escapeHtml(raw);

    // 行内代码：占位保护，避免内部内容被后续语法改写
    const codes = [];
    s = s.replace(/`([^`\n]+)`/g, (_, c) => {
      codes.push('<code class="qoder-md-code">' + c + '</code>');
      return '\u0000' + (codes.length - 1) + '\u0000';
    });

    // 链接 [text](url)
    s = s.replace(/\[([^\]\n]*)\]\(([^)\s]+)\)/g, (match, text, url) => {
      const rawUrl = url.replace(/&amp;/g, '&');
      if (SAFE_URL.test(rawUrl)) {
        return '<a href="' + url + '" target="_blank" rel="noopener noreferrer nofollow">' + text + '</a>';
      }
      return match; // 非白名单协议（javascript: 等）不产出 <a>，原样展示
    });

    // 粗体（先于斜体，避免 ** 误配）
    s = s.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/__([^_\n]+)__/g, '<strong>$1</strong>');
    // 斜体
    s = s.replace(/\*([^*\n]+)\*/g, '<em>$1</em>');
    // _italic_ 仅在词边界生效（避免 snake_case 误判）
    s = s.replace(/(^|[^\w\\])_([^_\n]+)_(?![\w])/g, '$1<em>$2</em>');
    // 删除线
    s = s.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');

    // 还原行内代码
    s = s.replace(/\u0000(\d+)\u0000/g, (_, i) => codes[+i] || '');
    return s;
  }

  /* ---------- 任务列表前缀 ---------- */
  function taskOrInline(text) {
    const m = text.match(/^\[( |x|X)\]\s+(.*)$/);
    if (m) {
      const done = m[1].toLowerCase() === 'x';
      return '<span class="qoder-md-task' + (done ? ' is-done' : '') + '">' + (done ? '☑' : '☐') + '</span>' + inline(m[2]);
    }
    return inline(text);
  }

  /* ---------- 列表构建（一级嵌套：缩进 ≥2 视为子列表） ---------- */
  function buildList(items, tag) {
    const top = [];
    let cur = null;
    for (const it of items) {
      if (it.indent >= 2 && cur) cur.children.push(it.text);
      else { cur = { text: it.text, children: [] }; top.push(cur); }
    }
    const li = (t) => '<li>' + taskOrInline(t) + '</li>';
    return '<' + tag + ' class="qoder-md-list">' + top.map((n) =>
      '<li>' + taskOrInline(n.text) +
      (n.children.length ? '<' + tag + ' class="qoder-md-list qoder-md-list--sub">' + n.children.map(li).join('') + '</' + tag + '>' : '') +
      '</li>').join('') + '</' + tag + '>';
  }

  /* ---------- 表格 ---------- */
  const ALIGN_RE = { center: /^:-+:$/, right: /^-+:/, left: /^:-+$/ };

  function parseRow(line) {
    return line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
  }

  function buildTable(head, sep, rows) {
    const aligns = sep.map((c) => {
      for (const k in ALIGN_RE) if (ALIGN_RE[k].test(c)) return k;
      return '';
    });
    const attr = (j) => aligns[j] ? ' style="text-align:' + aligns[j] + '"' : '';
    const th = head.map((c, j) => '<th' + attr(j) + '>' + inline(c) + '</th>').join('');
    const tb = rows.length
      ? '<tbody>' + rows.map((r) => '<tr>' + head.map((_, j) => '<td' + attr(j) + '>' + inline(r[j] || '') + '</td>').join('') + '</tr>').join('') + '</tbody>'
      : '';
    return '<table class="qoder-md-table"><thead><tr>' + th + '</tr></thead>' + tb + '</table>';
  }

  /* ---------- 块级解析 ---------- */
  function render(src) {
    if (src == null) return '';
    const lines = String(src).replace(/\r\n?/g, '\n').split('\n');
    const out = [];
    let para = [];
    const flushPara = () => {
      if (para.length) {
        out.push('<p>' + para.map((l) => inline(l)).join('<br>') + '</p>');
        para = [];
      }
    };

    let i = 0;
    while (i < lines.length) {
      const line = lines[i];

      // 围栏代码块 ```（内部纯文本转义，不做任何语法解析）
      const fence = line.match(/^```\s*([\w+#-]*)\s*$/);
      if (fence) {
        flushPara();
        const lang = fence[1];
        const buf = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i])) { buf.push(lines[i]); i++; }
        i++; // 跳过结束围栏（EOF 时自然结束）
        out.push('<pre class="qoder-md-pre"' + (lang ? ' data-lang="' + escapeHtml(lang) + '"' : '') + '><code>' + escapeHtml(buf.join('\n')) + '</code></pre>');
        continue;
      }

      // 标题 #~####（映射 h2-h5，聊天场景正文为基准）
      const h = line.match(/^(#{1,4})\s+(.*)$/);
      if (h) {
        flushPara();
        const lv = h[1].length + 1;
        out.push('<h' + lv + ' class="qoder-md-h">' + inline(h[2]) + '</h' + lv + '>');
        i++;
        continue;
      }

      // 水平线
      if (/^\s{0,3}([-*_])\s*(?:\1\s*){2,}$/.test(line)) {
        flushPara();
        out.push('<hr class="qoder-md-hr">');
        i++;
        continue;
      }

      // 引用（支持多行，内部递归渲染）
      if (/^>\s?/.test(line)) {
        flushPara();
        const buf = [];
        while (i < lines.length && /^>\s?/.test(lines[i])) { buf.push(lines[i].replace(/^>\s?/, '')); i++; }
        out.push('<blockquote class="qoder-md-quote">' + render(buf.join('\n')) + '</blockquote>');
        continue;
      }

      // 表格：当前行是 |...| 且下一行是分隔行
      if (/^\s*\|.*\|\s*$/.test(line) && i + 1 < lines.length && /^\s*\|?[\s:|-]+[\s:|-]*$/.test(lines[i + 1]) && lines[i + 1].includes('-')) {
        flushPara();
        const head = parseRow(line);
        const sep = parseRow(lines[i + 1]);
        i += 2;
        const rows = [];
        while (i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i])) { rows.push(parseRow(lines[i])); i++; }
        out.push(buildTable(head, sep, rows));
        continue;
      }

      // 无序列表（含任务列表）
      if (/^\s*[-*+]\s+/.test(line)) {
        flushPara();
        const items = [];
        while (i < lines.length && /^\s*[-*+]\s+/.test(lines[i])) {
          const m = lines[i].match(/^(\s*)[-*+]\s+(.*)$/);
          items.push({ indent: m[1].length, text: m[2] });
          i++;
        }
        out.push(buildList(items, 'ul'));
        continue;
      }

      // 有序列表
      if (/^\s*\d+[.)]\s+/.test(line)) {
        flushPara();
        const items = [];
        while (i < lines.length && /^\s*\d+[.)]\s+/.test(lines[i])) {
          const m = lines[i].match(/^(\s*)\d+[.)]\s+(.*)$/);
          items.push({ indent: m[1].length, text: m[2] });
          i++;
        }
        out.push(buildList(items, 'ol'));
        continue;
      }

      // 空行 → 结束当前段落
      if (/^\s*$/.test(line)) {
        flushPara();
        i++;
        continue;
      }

      // 普通文本（段内单换行 → <br>）
      para.push(line);
      i++;
    }
    flushPara();
    return out.join('');
  }

  QF.markdown = {
    render,
    inline,
    escapeHtml,
    version: '3.10.0'
  };
})();
