/* ============================================================
   Qoder UI Shadow - Shadow DOM 样式隔离引擎（v3.2）
   ============================================================
   功能：
     1. 共享样式表：全库 CSS 只 fetch/解析一次，构建单个
        CSSStyleSheet，被所有组件的 shadow root 复用
        （adoptedStyleSheets，零重复解析）
     2. 自动字体保障：向 document 注入样式链接，
        保证 @font-face（codicon/seti 图标）在文档层可用
     3. 相对 URL 重写：拼接 CSS 时把 url(...) 重写为绝对地址
     4. file:// 降级：fetch 不可用时，每个 shadow root 内联
        <style>@import url(...)</style>（浏览器仍可隔离渲染）
     5. 组件基类 QoderElement：shadow/light 双模渲染 + 属性响应 +
        事件 composed 派发

   配置：
     window.QoderUIConfig = { shadow: false }   // 全局关闭
     <html data-qoder-shadow="false">            // 文档级关闭
     <qoder-badge no-shadow>...</qoder-badge>    // 单组件关闭
   ============================================================ */
(function() {
  'use strict';

  if (typeof window === 'undefined') return; // SSR 安全

  const QI = window.QoderUI = window.QoderUI || {};

  /* ============================================================
     1. 配置
     ============================================================ */
  const config = QI.config = Object.assign(
    { shadow: true },
    window.QoderUIConfig || {}
  );

  function shadowEnabled(el) {
    if (config.shadow === false) return false;
    if (document.documentElement.getAttribute('data-qoder-shadow') === 'false') return false;
    if (el && el.hasAttribute('no-shadow')) return false;
    return true;
  }
  QI.shadowEnabled = shadowEnabled;

  /* ============================================================
     2. CSS 入口探测 + 字体保障
     ============================================================ */
  let _entryUrl = null;      // 解析出的入口 CSS 绝对地址
  let _docLinkInjected = false;

  function scriptBaseDir() {
    const scripts = document.querySelectorAll('script[src]');
    for (const s of scripts) {
      if (/qoder/i.test(s.src || '')) {
        return s.src.replace(/[^/]*$/, '');
      }
    }
    return '';
  }

  /** 依次探测候选入口 CSS（dist 优先，其次 src） */
  function resolveEntryCSS() {
    if (_entryUrl) return Promise.resolve(_entryUrl);
    const dir = scriptBaseDir();
    const candidates = [];
    if (dir) {
      candidates.push(dir + 'qoder-ui.min.css'); // 构建产物
      candidates.push(dir + 'index.css');        // 源码目录
    }
    // 已有文档级 qoder 样式链接（examples 等场景）
    document.querySelectorAll('link[rel="stylesheet"]').forEach(link => {
      if (/qoder/i.test(link.href || '')) candidates.push(link.href);
    });

    const tryFetch = (url) => fetch(url, { mode: 'same-origin' })
      .then(r => r.ok ? r.text().then(() => url) : Promise.reject(new Error(url)));

    return candidates.reduce(
      (p, url) => p.catch(() => tryFetch(url)),
      Promise.reject()
    ).then(url => { _entryUrl = new URL(url, location.href).href; return _entryUrl; });
  }

  /** 向 document 注入入口 CSS 链接（字体 + 文档级兜底），只注入一次 */
  function ensureDocumentCSS() {
    if (_docLinkInjected) return;
    resolveEntryCSS().then(url => {
      // 若文档已有同款链接则跳过
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]'))
        .some(l => l.href === url);
      if (exists) { _docLinkInjected = true; return; }
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.qoderAuto = '1';
      document.head.appendChild(link);
      _docLinkInjected = true;
    }).catch(() => { /* file:// 等场景静默失败 */ });
  }

  /* ============================================================
     3. 共享样式表构建（fetch + @import 展开 + url 重写）
     ============================================================ */
  let _sheetPromise = null;
  const _preparedRoots = new Set();

  /** 把 CSS 文本中的相对 url(...) 重写为绝对地址 */
  function rewriteUrls(cssText, baseUrl) {
    return cssText.replace(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g, (m, q, ref) => {
      if (/^(data:|https?:|\/\/)/i.test(ref)) return m;
      try {
        return 'url(' + q + new URL(ref, baseUrl).href + q + ')';
      } catch (e) { return m; }
    });
  }

  /** 递归展开 @import（相对入口 CSS） */
  function fetchCSSRecursive(url) {
    return fetch(url).then(r => {
      if (!r.ok) throw new Error('CSS fetch failed: ' + url);
      return r.text();
    }).then(text => {
      const imports = [];
      const re = /@import\s+(?:url\(\s*)?['"]?([^'")\s]+)['"]?\s*\)?\s*[^;]*;/g;
      let m;
      while ((m = re.exec(text)) !== null) imports.push(m);
      if (!imports.length) return rewriteUrls(text, url);
      let out = text;
      return Promise.all(imports.map(im =>
        fetchCSSRecursive(new URL(im[1], url).href).then(sub => ({ im, sub }))
      )).then(results => {
        results.forEach(({ im, sub }) => {
          out = out.replace(im[0], '');   // 移除 @import
          out = sub + '\n' + out;          // 内联到最前
        });
        return out;
      });
    });
  }

  /**
   * prepare(): 返回 Promise<{ mode:'sheet', sheet } | { mode:'import', url }>
   * sheet 模式：所有 shadow root 共享一个 CSSStyleSheet
   */
  function prepare() {
    if (_sheetPromise) return _sheetPromise;
    _sheetPromise = resolveEntryCSS().then(entry => {
      ensureDocumentCSS();
      return fetchCSSRecursive(entry).then(css => {
        if (typeof CSSStyleSheet !== 'undefined' && 'replaceSync' in CSSStyleSheet.prototype) {
          const sheet = new CSSStyleSheet();
          sheet.replaceSync(css);
          return { mode: 'sheet', sheet };
        }
        return { mode: 'import', url: entry };
      });
    }).catch(() => {
      // fetch 失败（file:// CORS 等）：降级为 shadow 内 @import
      ensureDocumentCSS();
      return _entryUrl
        ? { mode: 'import', url: _entryUrl }
        : { mode: 'none' };
    });
    return _sheetPromise;
  }

  /** 把共享样式应用到 shadow root（幂等） */
  function applyStyles(root) {
    if (!root) return;
    _preparedRoots.add(root);
    prepare().then(p => {
      if (p.mode === 'sheet') {
        const sheets = Array.from(root.adoptedStyleSheets || []);
        if (sheets.indexOf(p.sheet) < 0) {
          root.adoptedStyleSheets = sheets.concat([p.sheet]);
        }
      } else if (p.mode === 'import') {
        if (!root.querySelector('style[data-qoder-import]')) {
          const s = document.createElement('style');
          s.setAttribute('data-qoder-import', '');
          s.textContent = '@import url("' + p.url + '")';
          root.insertBefore(s, root.firstChild);
        }
      }
    }).catch(() => {});
  }
  QI.shadow = { prepare, applyStyles, resolveEntryCSS };

  /* ============================================================
     4. 组件基类 QoderElement
        - shadow 优先渲染（样式隔离），no-shadow/降级时 light DOM
        - 属性变化 -> 微任务批量重渲染
        - emit(): 派发 bubbles+composed 事件（穿透 shadow 边界）
     ============================================================ */
  QI.ShadowElement = class QoderElement extends HTMLElement {
    constructor() {
      super();
      this._renderPending = false;
      this._rendered = false;
      this._everConnected = false;
      // Shadow DOM：默认开启；不支持/配置关闭时退回 light DOM
      this._useShadow = shadowEnabled(this) &&
        typeof this.attachShadow === 'function';
      if (this._useShadow) this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this._everConnected = true;
      this._schedule(true);
    }

    disconnectedCallback() { /* 保留 DOM 状态，不销毁 */ }

    attributeChangedCallback() {
      // 升级期的初始属性由 connectedCallback 首渲染处理
      if (!this._everConnected) return;
      this._schedule(false);
    }

    /** 渲染调度：初次连接在文档解析中则等一拍（确保子节点就绪） */
    _schedule(initial) {
      if (this._renderPending) return;
      this._renderPending = true;
      const run = () => {
        this._renderPending = false;
        if (this._everConnected) this._renderNow();
      };
      if (initial && document.readyState === 'loading') {
        setTimeout(run, 0);
      } else {
        Promise.resolve().then(run);
      }
    }

    _renderNow() {
      const root = this.shadowRoot || this;
      const hostCss = this.constructor.hostCss || '';
      const tpl = typeof this.template === 'function' ? this.template() : '';
      if (this.shadowRoot) {
        this.shadowRoot.innerHTML =
          (hostCss ? '<style>' + hostCss + '</style>' : '') + tpl;
        applyStyles(this.shadowRoot);
      } else {
        root.innerHTML = tpl;
      }
      if (typeof this._bind === 'function') this._bind(root);
      this._rendered = true;
    }

    /** 作用域查询（自动适配 shadow/light） */
    $(sel) { return (this.shadowRoot || this).querySelector(sel); }
    $$(sel) { return Array.prototype.slice.call((this.shadowRoot || this).querySelectorAll(sel)); }

    /** 标准事件派发：穿透 shadow 边界 */
    emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, {
        detail, bubbles: true, composed: true
      }));
    }
  };

  /* ============================================================
     5. 辅助：转义（供组件模板使用）
     ============================================================ */
  QI.escapeHtml = (window.QoderCore && window.QoderCore.escapeHtml) ||
    function(s) { return String(s == null ? '' : s); };

})();
