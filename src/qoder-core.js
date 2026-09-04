/* ============================================================
   Qoder UI Core - 纯逻辑模块（无 DOM 依赖，可在 Node 中测试）
   包含：工具函数、word-level Diff 引擎（LCS）、行级 Diff、
         命令面板模糊匹配、快捷键组合解析
   加载顺序：必须在 qoder-ui.js / qoder-interactions.js /
             qoder-features.js / qoder-diff.js 之前
   ============================================================ */
(function(root) {
  'use strict';

  const Core = {};

  /* ============================================================
     1. 基础工具
     ============================================================ */

  /** 数值钳制 */
  Core.clamp = function clamp(val, min, max) {
    return Math.min(Math.max(val, min), max);
  };

  /** 防抖 */
  Core.debounce = function debounce(fn, ms) {
    let t;
    return function(...args) {
      clearTimeout(t);
      t = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  /** HTML 转义 */
  Core.escapeHtml = function escapeHtml(str) {
    return String(str == null ? '' : str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  /** 短随机 ID */
  Core.uid = function uid(prefix) {
    return (prefix || 'id') + '_' + Date.now().toString(36) + '_' +
      Math.random().toString(36).slice(2, 7);
  };

  /* ============================================================
     2. LCS 最长公共子序列（通用）
     ============================================================ */

  /**
   * 经典 DP LCS：返回 a 与 b 的最长公共子序列的元素数组。
   * 用于 word-diff 与 line-diff。
   * 为控制内存，超长输入自动降级为启发式（前 1200 项截断）。
   */
  Core.lcs = function lcs(a, b, equalsFn) {
    const eq = equalsFn || ((x, y) => x === y);
    const MAX = 1200;
    if (a.length > MAX || b.length > MAX) {
      // 启发式：仅保留顺序锚点，避免 O(n*m) 爆内存
      a = a.slice(0, MAX);
      b = b.slice(0, MAX);
    }
    const n = a.length, m = b.length;
    // 滚动数组计算长度，再回溯（节省一半内存）；必须初始化为 0
    const dp = new Array((n + 1) * (m + 1)).fill(0);
    const at = (i, j) => i * (m + 1) + j;
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        dp[at(i, j)] = eq(a[i], b[j])
          ? dp[at(i + 1, j + 1)] + 1
          : Math.max(dp[at(i + 1, j)], dp[at(i, j + 1)]);
      }
    }
    // 回溯出公共子序列
    const result = [];
    let i = 0, j = 0;
    while (i < n && j < m) {
      if (eq(a[i], b[j])) { result.push(a[i]); i++; j++; }
      else if (dp[at(i + 1, j)] >= dp[at(i, j + 1)]) i++;
      else j++;
    }
    return result;
  };

  /* ============================================================
     3. Word-level Diff 引擎
     ============================================================ */

  /**
   * 把一行代码拆成 token 数组（保留空白 token，保证重组无损）：
   *   "let x = 1;" -> ["let", " ", "x", " ", "=", " ", "1;", ""]
   * 规则：标识符/数字连续段为一个 token，其余单字符各成 token。
   */
  Core.tokenizeLine = function tokenizeLine(line) {
    return String(line == null ? '' : line).split(/([A-Za-z0-9_$]+|\s+)/).filter(t => t !== '');
  };

  /**
   * word-level diff：比较两行文本，返回片段数组。
   * 返回: [{ type: 'equal'|'del'|'add', value: string }]
   * 算法：tokenize -> LCS(公共token序列) -> 双指针扫描生成片段。
   */
  Core.diffWords = function diffWords(oldLine, newLine) {
    const a = Core.tokenizeLine(oldLine);
    const b = Core.tokenizeLine(newLine);
    const common = Core.lcs(a, b);

    const segments = [];
    let ia = 0, ib = 0, ic = 0;

    const pushSeg = (type, value) => {
      if (!value) return;
      const last = segments[segments.length - 1];
      if (last && last.type === type) last.value += value;
      else segments.push({ type, value });
    };

    while (ic < common.length) {
      const target = common[ic];
      // a/b 各前进到下一个等于 target 的 token，途中均为 del/add
      while (ia < a.length && a[ia] !== target) { pushSeg('del', a[ia]); ia++; }
      while (ib < b.length && b[ib] !== target) { pushSeg('add', b[ib]); ib++; }
      // 命中公共 token
      if (ia < a.length && ib < b.length) {
        pushSeg('equal', target);
        ia++; ib++; ic++;
      } else break; // 异常保护
    }
    // 尾部残余
    while (ia < a.length) { pushSeg('del', a[ia]); ia++; }
    while (ib < b.length) { pushSeg('add', b[ib]); ib++; }

    return segments;
  };

  /** 便捷封装：只提取被改动的词（无改返回空数组） */
  Core.wordChanges = function wordChanges(oldLine, newLine) {
    const segs = Core.diffWords(oldLine, newLine);
    return {
      removed: segs.filter(s => s.type === 'del').map(s => s.value),
      added: segs.filter(s => s.type === 'add').map(s => s.value),
      hasChanges: segs.some(s => s.type !== 'equal')
    };
  };

  /* ============================================================
     4. Line-level Diff（用于动态渲染整个 diff 块）
     ============================================================ */

  /**
   * 行级 diff：返回行片段数组。
   * 返回: [{ type: 'equal'|'del'|'add', oldNo, newNo, text }]
   * 行号在返回前已计算好（oldNo/newNo 从 1 开始，缺失为 null）。
   */
  Core.diffLines = function diffLines(oldText, newText) {
    const a = String(oldText == null ? '' : oldText).split('\n');
    const b = String(newText == null ? '' : newText).split('\n');
    // 去掉末尾空行干扰（常规文本以 \n 结尾时 split 出尾部 ''）
    if (a.length && a[a.length - 1] === '') a.pop();
    if (b.length && b[b.length - 1] === '') b.pop();
    const common = Core.lcs(a, b);

    const rows = [];
    let ia = 0, ib = 0, ic = 0, oldNo = 0, newNo = 0;
    const flush = (type, text) => {
      rows.push({
        type,
        text,
        oldNo: type === 'add' ? null : ++oldNo,
        newNo: type === 'del' ? null : ++newNo
      });
    };
    while (ic < common.length) {
      const target = common[ic];
      while (ia < a.length && a[ia] !== target) flush('del', a[ia++]);
      while (ib < b.length && b[ib] !== target) flush('add', b[ib++]);
      if (ia < a.length && ib < b.length) { flush('equal', target); ia++; ib++; ic++; }
      else break;
    }
    while (ia < a.length) flush('del', a[ia++]);
    while (ib < b.length) flush('add', b[ib++]);
    return rows;
  };

  /* ============================================================
     5. 命令面板模糊匹配
     ============================================================ */

  /**
   * 模糊匹配：包含匹配（质量高）优先，其次子序列匹配。
   * 返回 null（不匹配）或 { score, contains, subsequence }。
   */
  Core.fuzzyMatch = function fuzzyMatch(text, query) {
    if (!query) return { score: 0, contains: true, subsequence: true };
    const t = String(text).toLowerCase();
    const q = String(query).toLowerCase();
    const contains = t.indexOf(q) >= 0;
    let subsequence = false;
    // 子序列匹配
    let ti = 0;
    for (let qi = 0; qi < q.length; qi++) {
      const ch = q[qi];
      ti = t.indexOf(ch, ti);
      if (ti < 0) break;
      ti++;
      if (qi === q.length - 1) subsequence = true;
    }
    if (!contains && !subsequence) return null;
    // 评分：前缀包含 > 包含 > 子序列；越靠前分数越高
    let score;
    if (contains && t.indexOf(q) === 0) score = 100;
    else if (contains) score = 60 - Math.min(t.indexOf(q), 50);
    else score = 10;
    return { score, contains, subsequence };
  };

  /* ============================================================
     6. 快捷键组合解析
     ============================================================ */

  const MODIFIER_KEYS = ['control', 'shift', 'alt', 'meta'];

  /**
   * 规范化快捷键字符串："Ctrl + Shift+P" -> "ctrl+shift+p"
   * 排序固定为 ctrl -> shift -> alt -> <key>，保证可比较。
   * 特殊：'?' 等单字符原样保留。
   */
  Core.normalizeKeys = function normalizeKeys(keys) {
    return String(keys || '').toLowerCase().replace(/\s/g, '');
  };

  /**
   * 组合键解析："ctrl+shift+p" -> ['ctrl','shift','p']（固定顺序）
   */
  Core.parseCombo = function parseCombo(normalized) {
    return Core.normalizeKeys(normalized).split('+').filter(Boolean);
  };

  /**
   * 由键盘事件构建规范化组合串（供 matchKeys 使用）。
   * event 需要包含 ctrlKey/metaKey/shiftKey/altKey/key。
   */
  Core.comboFromEvent = function comboFromEvent(e) {
    const parts = [];
    if (e.ctrlKey || e.metaKey) parts.push('ctrl');
    if (e.shiftKey) parts.push('shift');
    if (e.altKey) parts.push('alt');
    const key = String(e.key || '').toLowerCase();
    if (MODIFIER_KEYS.indexOf(key) < 0) parts.push(key);
    return parts.join('+');
  };

  /** 判断事件组合是否命中注册的快捷键串 */
  Core.matchKeys = function matchKeys(event, normalizedKeys) {
    return Core.comboFromEvent(event) === Core.normalizeKeys(normalizedKeys);
  };

  Core.MODIFIER_KEYS = MODIFIER_KEYS;

  /* ============================================================
     7. 导出到全局
     ============================================================ */
  const g = root || (typeof globalThis !== 'undefined' ? globalThis : this);
  g.QoderCore = Core;

  // 浏览器环境同时挂到 QoderUI 命名空间（若已存在）
  if (typeof g.QoderUI !== 'undefined') {
    g.QoderUI.core = Core;
  }

})(typeof globalThis !== 'undefined' ? globalThis : this);
