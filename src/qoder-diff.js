/* ============================================================
   Qoder UI Diff - 行内 word-level 高亮 + 动态 Diff 渲染
   依赖：qoder-core.js（diffWords/diffLines/escapeHtml）
   功能：
     1. enhance(root)  — 扫描现有 .qoder-diff 容器，
        将相邻的删除/新增行配对，行内命中词高亮
     2. render(opts)   — 由两段文本动态生成完整 diff（行级 + 词级）
     3. 自动初始化 + QoderUI.diff.refresh() 手动刷新
   ============================================================ */
(function() {
  'use strict';

  if (typeof window === 'undefined') return; // SSR 安全

  const Core = window.QoderCore || null;
  if (!Core) {
    console.error('[QoderUI.diff] 需要 qoder-core.js，请先于本文件加载');
    return;
  }
  const escapeHtml = Core.escapeHtml;

  const QI = window.QoderUI = window.QoderUI || {};

  /* ============================================================
     内部工具
     ============================================================ */

  /** 判断行类型：'added' | 'removed' | 'context' */
  function lineType(row) {
    if (row.classList.contains('qoder-diff__line--added')) return 'added';
    if (row.classList.contains('qoder-diff__line--removed')) return 'removed';
    return 'context';
  }

  function contentEl(row) {
    return row.querySelector('.qoder-diff__content');
  }

  /** 取出行文本（去掉 +/- 前缀由 CSS ::before 承担，不在文本里） */
  function rowText(row) {
    const el = contentEl(row);
    if (!el) return '';
    // 若已被增强过，先还原为纯文本
    return el.textContent;
  }

  /**
   * 生成行内容 HTML：只渲染属于本行的片段
   *   removed 行 = equal + del（del 段高亮）
   *   added   行 = equal + add（add 段高亮）
   * 这样重建文本与原行完全一致（不串行对侧内容）。
   */
  function renderRowHtml(text, side, segments) {
    if (!segments) return escapeHtml(text);
    let html = '';
    for (const seg of segments) {
      const escaped = escapeHtml(seg.value);
      if (seg.type === 'equal') html += escaped;
      else if (seg.type === 'del' && side === 'removed')
        html += '<span class="qoder-diff__word-del">' + escaped + '</span>';
      else if (seg.type === 'add' && side === 'added')
        html += '<span class="qoder-diff__word-ins">' + escaped + '</span>';
      // 对侧片段跳过（本行不显示对侧改动词）
    }
    return html;
  }

  /* ============================================================
     1. enhance — 增强现有静态 diff
     ============================================================ */

  /**
   * 扫描 root（默认 document）内所有 .qoder-diff，
   * 对相邻「删除行 + 新增行」配对做 word-level diff 并高亮。
   * 幂等：已增强的行（data-word-diff="1"）自动跳过。
   */
  function enhance(root) {
    const scope = root || document;
    scope.querySelectorAll('.qoder-diff').forEach(diffEl => {
      // 跳过动态渲染产生的（已带 word 高亮）
      const rows = Array.from(diffEl.querySelectorAll('.qoder-diff__line'));
      if (!rows.length) return;

      let i = 0;
      while (i < rows.length) {
        const row = rows[i];
        if (row.dataset.wordDiff) { i++; continue; }

        if (lineType(row) === 'removed') {
          // 收集连续 removed 块
          let j = i;
          const removedBlock = [];
          while (j < rows.length && lineType(rows[j]) === 'removed' && !rows[j].dataset.wordDiff) {
            removedBlock.push(rows[j]); j++;
          }
          // 收集紧随其后的连续 added 块
          const addedBlock = [];
          while (j < rows.length && lineType(rows[j]) === 'added' && !rows[j].dataset.wordDiff) {
            addedBlock.push(rows[j]); j++;
          }
          // 相邻配对（1:1，多余行保持整行高亮）
          const pairCount = Math.min(removedBlock.length, addedBlock.length);
          for (let k = 0; k < pairCount; k++) {
            const delRow = removedBlock[k], addRow = addedBlock[k];
            const oldText = rowText(delRow), newText = rowText(addRow);
            const segs = Core.diffWords(oldText, newText);
            const hasChange = segs.some(s => s.type !== 'equal');
            if (hasChange) {
              const delEl = contentEl(delRow), addEl = contentEl(addRow);
              if (delEl) delEl.innerHTML = renderRowHtml(oldText, 'removed', segs);
              if (addEl) addEl.innerHTML = renderRowHtml(newText, 'added', segs);
              delRow.dataset.wordDiff = addRow.dataset.wordDiff = '1';
              delRow.classList.add('qoder-diff__line--worded');
              addRow.classList.add('qoder-diff__line--worded');
            } else {
              delRow.dataset.wordDiff = addRow.dataset.wordDiff = '1';
            }
          }
          // 未配对的行也标记，避免重复扫描
          removedBlock.forEach(r => { r.dataset.wordDiff = '1'; });
          addedBlock.forEach(r => { r.dataset.wordDiff = '1'; });
          i = j;
        } else {
          row.dataset.wordDiff = '1';
          i++;
        }
      }
    });
  }

  /* ============================================================
     2. render — 动态渲染完整 diff
     ============================================================ */

  /**
   * QoderUI.diff.render({ old, new, filename, view })
   * 返回一个 .qoder-diff DOM 元素（含行级 + 词级高亮 + 统计）。
   * options.old  旧文本
   * options.new  新文本（注意解构时用引号或别名）
   */
  function render(options) {
    const opts = options || {};
    const oldText = opts.old != null ? String(opts.old) : '';
    const newText = opts['new'] != null ? String(opts['new']) : (opts.newText != null ? String(opts.newText) : '');

    const rows = Core.diffLines(oldText, newText);

    // 统计
    let added = 0, removed = 0;
    rows.forEach(r => { if (r.type === 'add') added++; if (r.type === 'del') removed++; });

    const el = document.createElement('div');
    el.className = 'qoder-diff';
    el.setAttribute('data-diff-dynamic', '1');

    let html = '<div class="qoder-diff__header">';
    if (opts.filename) {
      html += '<span class="qoder-diff__filename"><span class="qoder-icon">📄</span>' + escapeHtml(opts.filename) + '</span>';
    }
    html += '<span class="qoder-diff__stats">' +
      '<span class="qoder-diff__stat qoder-diff__stat--add">+' + added + '</span>' +
      '<span class="qoder-diff__stat qoder-diff__stat--del">-' + removed + '</span>' +
      '<span class="qoder-diff__stat">' + (opts.filename ? '1 file' : rows.length + ' lines') + ' changed</span>' +
      '</span></div>';

    html += '<div class="qoder-diff__body">';
    rows.forEach(r => {
      const cls = r.type === 'add' ? 'qoder-diff__line qoder-diff__line--added'
        : r.type === 'del' ? 'qoder-diff__line qoder-diff__line--removed'
        : 'qoder-diff__line qoder-diff__line--context';
      html += '<div class="' + cls + '">' +
        '<span class="qoder-diff__gutter">' + (r.oldNo != null ? r.oldNo : '') + '</span>' +
        '<span class="qoder-diff__gutter">' + (r.newNo != null ? r.newNo : '') + '</span>' +
        '<span class="qoder-diff__content">' + escapeHtml(r.text) + '</span>' +
        '</div>';
    });
    html += '</div>';
    el.innerHTML = html;

    // 行内 word 高亮
    enhance(el);
    return el;
  }

  /* ============================================================
     3. 导出到全局 + 自动初始化
     ============================================================ */

  QI.diff = {
    enhance,
    render,
    /** 动态插入 diff 后手动刷新 */
    refresh(root) { enhance(root || document); },
    /** 工具透传，便于外部使用 */
    diffWords: Core.diffWords,
    diffLines: Core.diffLines
  };

  function autoInit() { enhance(document); }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInit);
    } else {
      autoInit();
    }
  }

})();
