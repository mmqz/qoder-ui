/* ============================================================
   Qoder UI Transport — 后端无关的数据通道层 (v3.3)
   ------------------------------------------------------------
   目标：前端 UI 与任意后端（Rust / TS / Node / Python …）解耦。
   UI 组件（chat / terminal）只依赖本文件的高层接口，
   后端只需实现下方「协议 v1」的任意一种传输：

     1. mock  — 内置本地模拟（零后端，演示/离线可用）
     2. rest  — HTTP POST + SSE 流式（chat）+ JSON（terminal）
     3. ws    — WebSocket 双向信封（chat 流式 + terminal 全双工）
     4. 自定义 — 直接传入实现 TransportInstance 接口的对象

   ── 协议 v1（信封 Envelope）─────────────────────────────
   { v: 1, id, type, channel, payload, ts }

   Client → Server:
     chat.send       payload { text, sessionId? }
     chat.abort      payload { id }
     terminal.input  payload { tabId, cmd, cwd }

   Server → Client:
     chat.delta      payload { id, delta }
     chat.done       payload { id, content?, finishReason?, usage? }
     chat.error      payload { id, message }
     terminal.output payload { tabId, data, stream?: 'stdout'|'stderr' }
     terminal.exit   payload { tabId, code }
     terminal.cwd    payload { tabId, cwd }

   ── 高层接口（UI 依赖的最小面）──────────────────────────
   transport.chat(text, handlers, ctx)   -> { abort() }   流式对话
   transport.exec(cmd, cwd, handlers, ctx) -> { abort() } 执行终端命令
   transport.status / onStatus(cb) / connect() / close()
   transport.raw(cb) -> unsub / sendRaw(env)              自定义协议逃生口
   ============================================================ */
(function() {
  'use strict';
  const _g = typeof globalThis !== 'undefined' ? globalThis : {};
  if (typeof window === 'undefined') return; // SSR 安全
  const QF = window.QoderUI = window.QoderUI || {};

  const PROTOCOL_VERSION = 1;
  let _seq = 0;
  function genId(prefix) {
    return (prefix || 'm') + '_' + Date.now().toString(36) + '_' + (++_seq).toString(36) +
      Math.random().toString(36).slice(2, 6);
  }
  function envelope(type, payload, channel) {
    return { v: PROTOCOL_VERSION, id: genId('e'), type, channel: channel || null, payload: payload || {}, ts: Date.now() };
  }
  function cloneError(e) {
    return { message: (e && e.message) || String(e || 'unknown error') };
  }

  /* ============================================================
     1. MockTransport — 本地模拟（与 v3.2 离线行为一致）
     ============================================================ */
  function MockTransport(opts) {
    opts = opts || {};
    this.name = 'mock';
    this.supportsTerminal = true;
    this.status = 'idle';
    this._statusCbs = new Set();
    this._aborts = new Set();
  }
  MockTransport.prototype._setStatus = function(s) {
    this.status = s;
    this._statusCbs.forEach(function(cb) { try { cb(s); } catch (_) {} });
  };
  MockTransport.prototype.connect = function() { this._setStatus('open'); return Promise.resolve(); };
  MockTransport.prototype.close = function() { this._setStatus('closed'); return Promise.resolve(); };
  MockTransport.prototype.onStatus = function(cb) { this._statusCbs.add(cb); const s = this.status; cb(s); return function() { this._statusCbs.delete(cb); }.bind(this); };
  MockTransport.prototype.raw = function() { return function() {}; };
  MockTransport.prototype.sendRaw = function() {};

  MockTransport.prototype.chat = function(text, handlers) {
    handlers = handlers || {};
    const full = '收到你的消息："' + text + '"。当前为本地 Mock 模式；配置 REST / WebSocket 后端后，这段回复将来自你的真实服务（Rust / TS / 任意语言）。';
    let i = 0; let stopped = false;
    const self = this;
    if (handlers.onStart) handlers.onStart();
    const timer = setInterval(function() {
      if (stopped) return void clearInterval(timer);
      const prev = i;
      i = Math.min(full.length, i + 4 + Math.floor(Math.random() * 4));
      if (handlers.onDelta) handlers.onDelta(full.slice(prev, i), full.slice(0, i));
      if (i >= full.length) {
        clearInterval(timer);
        self._aborts.delete(handle);
        if (handlers.onDone) handlers.onDone(full);
      }
    }, 20);
    const handle = {
      abort: function() {
        stopped = true; clearInterval(timer);
        self._aborts.delete(handle);
        if (handlers.onError) handlers.onError({ message: 'aborted' });
      }
    };
    this._aborts.add(handle);
    return handle;
  };

  MockTransport.prototype.exec = function(cmd, cwd, handlers) {
    handlers = handlers || {};
    const self = this;
    let stdout = ''; let stderr = ''; let exitCode = 0; let outCwd = cwd || '~';
    if (cmd === 'help') {
      stdout = '可用命令: help, clear, echo, date, whoami, ls, pwd, cd, exit';
    } else if (cmd === 'date') {
      stdout = new Date().toString();
    } else if (cmd === 'whoami') {
      stdout = 'user';
    } else if (cmd === 'ls') {
      stdout = 'src/  examples/  package.json  README.md';
    } else if (cmd === 'pwd') {
      stdout = '/home/user/qoder-ui';
    } else if (cmd.startsWith('echo ')) {
      stdout = cmd.slice(5);
    } else if (cmd.startsWith('cd')) {
      const target = cmd.slice(2).trim();
      if (!target || target === '~') outCwd = '~';
      else if (target === '..') {
        const parts = outCwd.split('/');
        outCwd = parts.length > 1 ? parts.slice(0, -1).join('/') || '/' : outCwd;
      } else {
        outCwd = (outCwd === '~' ? '' : outCwd) + '/' + target.replace(/^\/+/, '');
      }
    } else {
      stderr = 'command not found: ' + cmd; exitCode = 127;
    }
    const handle = {
      abort: function() { self._aborts.delete(handle); }
    };
    this._aborts.add(handle);
    setTimeout(function() {
      self._aborts.delete(handle);
      if (stdout && handlers.onOutput) handlers.onOutput(stdout, 'stdout');
      if (stderr && handlers.onOutput) handlers.onOutput(stderr, 'stderr');
      if (handlers.onCwd && outCwd !== cwd) handlers.onCwd(outCwd);
      if (handlers.onExit) handlers.onExit(exitCode);
    }, 120);
    return handle;
  };

  /* ============================================================
     2. RestTransport — HTTP POST（+ chat SSE 流式）
     约定端点（均可通过 opts 覆盖）：
       POST {baseUrl}/chat      body {text, sessionId} → SSE 流 / JSON {content}
       POST {baseUrl}/terminal  body {cmd, cwd}        → JSON {stdout, stderr, exitCode, cwd}
     SSE data 行为协议 v1 信封：data: {"type":"chat.delta","payload":{"id":"..","delta":".."}}
     ============================================================ */
  function RestTransport(opts) {
    opts = opts || {};
    this.name = 'rest';
    this.supportsTerminal = true;
    this.status = 'idle';
    this._statusCbs = new Set();
    this._baseUrl = (opts.baseUrl || '').replace(/\/+$/, '');
    this._headers = opts.headers || {};
    this._chatUrl = opts.chatUrl || (this._baseUrl + '/chat');
    this._termUrl = opts.terminalUrl || (this._baseUrl + '/terminal');
    this._fetch = opts.fetchImpl || (typeof fetch !== 'undefined' ? fetch.bind(_g) : null);
    if (!this._fetch) throw new Error('[QoderUI] RestTransport 需要 fetch 环境（浏览器 / Node>=18）');
  }
  RestTransport.prototype._setStatus = MockTransport.prototype._setStatus;
  RestTransport.prototype.onStatus = function(cb) { this._statusCbs.add(cb); cb(this.status); return function() { this._statusCbs.delete(cb); }.bind(this); };
  RestTransport.prototype.connect = function() { this._setStatus('open'); return Promise.resolve(); };
  RestTransport.prototype.close = function() { this._setStatus('closed'); return Promise.resolve(); };
  RestTransport.prototype.raw = function() { return function() {}; };
  RestTransport.prototype.sendRaw = function() {};

  RestTransport.prototype.chat = function(text, handlers, ctx) {
    handlers = handlers || {};
    const self = this;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const msgId = genId('chat');
    if (handlers.onStart) handlers.onStart();

    (async function() {
      try {
        const res = await self._fetch(self._chatUrl, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, self._headers),
          body: JSON.stringify({ v: PROTOCOL_VERSION, id: msgId, type: 'chat.send', channel: 'chat', payload: { text: text, sessionId: (ctx && ctx.sessionId) || null }, ts: Date.now() }),
          signal: ctrl ? ctrl.signal : undefined
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const ct = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
        if (ct.indexOf('text/event-stream') >= 0) {
          // ---- SSE 流式 ----
          const reader = res.body.getReader();
          const dec = new TextDecoder();
          let buf = ''; let full = ''; let done = false;
          for (;;) {
            const chunk = await reader.read();
            if (chunk.done) break;
            buf += dec.decode(chunk.value, { stream: true });
            let idx;
            while ((idx = buf.indexOf('\n')) >= 0) {
              const line = buf.slice(0, idx).replace(/\r$/, '');
              buf = buf.slice(idx + 1);
              if (!line.startsWith('data:')) continue;
              const data = line.slice(5).trim();
              if (data === '[DONE]') { done = true; continue; }
              let env = null;
              try { env = JSON.parse(data); } catch (_) { continue; }
              const p = env.payload || {};
              if (env.type === 'chat.delta' && p.delta != null) {
                full += p.delta;
                if (handlers.onDelta) handlers.onDelta(p.delta, full);
              } else if (env.type === 'chat.error') {
                throw new Error(p.message || 'backend error');
              } else if (env.type === 'chat.done') {
                done = true;
                if (p.content) full = p.content;
              }
            }
          }
          if (handlers.onDone) handlers.onDone(full, { done: done });
        } else {
          // ---- 一次性 JSON ----
          const json = await res.json();
          const content = json.content != null ? json.content : (json.payload && json.payload.content) || '';
          if (handlers.onDelta && content) handlers.onDelta(content, content);
          if (handlers.onDone) handlers.onDone(content);
        }
      } catch (e) {
        if (e && e.name === 'AbortError') { if (handlers.onError) handlers.onError({ message: 'aborted' }); }
        else if (handlers.onError) handlers.onError(cloneError(e));
      }
    })();

    return { abort: function() { if (ctrl) ctrl.abort(); } };
  };

  RestTransport.prototype.exec = function(cmd, cwd, handlers, ctx) {
    handlers = handlers || {};
    const self = this;
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    (async function() {
      try {
        const res = await self._fetch(self._termUrl, {
          method: 'POST',
          headers: Object.assign({ 'Content-Type': 'application/json' }, self._headers),
          body: JSON.stringify(envelope('terminal.input', { cmd: cmd, cwd: cwd || '~', tabId: (ctx && ctx.tabId) || null }, ctx ? 'terminal:' + ctx.tabId : null)),
          signal: ctrl ? ctrl.signal : undefined
        });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        const json = await res.json();
        const p = json.payload || json;
        if (p.stdout && handlers.onOutput) handlers.onOutput(p.stdout, 'stdout');
        if (p.stderr && handlers.onOutput) handlers.onOutput(p.stderr, 'stderr');
        if (p.cwd && handlers.onCwd) handlers.onCwd(p.cwd);
        if (handlers.onExit) handlers.onExit(p.exitCode != null ? p.exitCode : 0);
      } catch (e) {
        if (e && e.name === 'AbortError') { if (handlers.onError) handlers.onError({ message: 'aborted' }); }
        else {
          if (handlers.onOutput) handlers.onOutput((e && e.message) || String(e), 'stderr');
          if (handlers.onExit) handlers.onExit(1);
        }
      }
    })();
    return { abort: function() { if (ctrl) ctrl.abort(); } };
  };

  /* ============================================================
     3. WSTransport — WebSocket 双向信封（自动重连）
     opts: { url, reconnect=true, reconnectDelay=1500, maxRetries=0(无限), wsImpl }
     ============================================================ */
  function WSTransport(opts) {
    opts = opts || {};
    this.name = 'ws';
    this.supportsTerminal = true;
    this.status = 'idle';
    this._statusCbs = new Set();
    this._envelopeCbs = new Set();
    this._pending = new Map();     // chatId -> handlers
    this._termHandlers = new Map(); // tabId -> handlers
    this._url = opts.url || '';
    this._reconnect = opts.reconnect !== false;
    this._delay = opts.reconnectDelay || 1500;
    this._maxRetries = opts.maxRetries || 0;
    this._retries = 0;
    this._disposed = false;
    this._ws = null;
    this._wsImpl = opts.wsImpl || (typeof WebSocket !== 'undefined' ? WebSocket : null);
  }
  WSTransport.prototype._setStatus = MockTransport.prototype._setStatus;

  WSTransport.prototype.connect = function() {
    if (!this._wsImpl) return Promise.reject(new Error('[QoderUI] 当前环境无 WebSocket（可用 opts.wsImpl 注入）'));
    const self = this;
    if (this._ws && (this._ws.readyState === 0 || this._ws.readyState === 1)) return Promise.resolve();
    this._setStatus('connecting');
    return new Promise(function(resolve, reject) {
      let settled = false;
      let ws;
      try { ws = new self._wsImpl(self._url); } catch (e) { self._setStatus('error'); return reject(e); }
      self._ws = ws;
      ws.onopen = function() {
        self._retries = 0;
        self._setStatus('open');
        if (!settled) { settled = true; resolve(); }
      };
      ws.onmessage = function(ev) { self._receive(ev.data); };
      ws.onerror = function() { if (!settled) { settled = true; self._setStatus('error'); reject(new Error('WebSocket 连接失败: ' + self._url)); } };
      ws.onclose = function() {
        self._setStatus('closed');
        if (!settled) { settled = true; reject(new Error('WebSocket 已关闭')); }
        self._scheduleReconnect();
      };
    });
  };
  WSTransport.prototype._scheduleReconnect = function() {
    const self = this;
    if (this._disposed || !this._reconnect) return;
    if (this._maxRetries && this._retries >= this._maxRetries) return;
    this._retries++;
    this._reconnectTimer = setTimeout(function() {
      self.connect().catch(function() {});
    }, this._delay * Math.min(this._retries, 5)); // 简单线性退避（封顶 5x）
  };
  WSTransport.prototype.close = function() {
    this._disposed = true;
    if (this._reconnectTimer) clearTimeout(this._reconnectTimer);
    if (this._ws) { try { this._ws.close(); } catch (_) {} }
    this._setStatus('closed');
    return Promise.resolve();
  };
  WSTransport.prototype.onStatus = function(cb) { this._statusCbs.add(cb); cb(this.status); return function() { this._statusCbs.delete(cb); }.bind(this); };
  WSTransport.prototype.raw = function(cb) { const self = this; this._envelopeCbs.add(cb); return function() { self._envelopeCbs.delete(cb); }; };
  WSTransport.prototype.sendRaw = function(env) {
    if (this._ws && this._ws.readyState === 1) this._ws.send(typeof env === 'string' ? env : JSON.stringify(env));
  };

  WSTransport.prototype._receive = function(data) {
    let env = null;
    try { env = typeof data === 'string' ? JSON.parse(data) : data; } catch (_) { return; }
    if (!env || !env.type) return;
    this._envelopeCbs.forEach(function(cb) { try { cb(env); } catch (_) {} });
    const p = env.payload || {};
    if (env.type === 'chat.delta' || env.type === 'chat.done' || env.type === 'chat.error') {
      const h = this._pending.get(p.id);
      if (!h) return;
      if (env.type === 'chat.delta' && p.delta != null) { h.full = (h.full || '') + p.delta; if (h.handlers.onDelta) h.handlers.onDelta(p.delta, h.full); }
      else if (env.type === 'chat.done') { this._pending.delete(p.id); if (h.handlers.onDone) h.handlers.onDone(p.content != null ? p.content : (h.full || '')); }
      else if (env.type === 'chat.error') { this._pending.delete(p.id); if (h.handlers.onError) h.handlers.onError({ message: p.message || 'backend error' }); }
    } else if (env.type === 'terminal.output' || env.type === 'terminal.exit' || env.type === 'terminal.cwd') {
      const th = this._termHandlers.get(p.tabId);
      if (!th) return;
      if (env.type === 'terminal.output' && p.data != null && th.handlers.onOutput) th.handlers.onOutput(p.data, p.stream || 'stdout');
      else if (env.type === 'terminal.cwd' && th.handlers.onCwd) th.handlers.onCwd(p.cwd);
      else if (env.type === 'terminal.exit') { this._termHandlers.delete(p.tabId); if (th.handlers.onExit) th.handlers.onExit(p.code != null ? p.code : 0); }
    }
  };

  WSTransport.prototype.chat = function(text, handlers, ctx) {
    handlers = handlers || {};
    const self = this;
    const msgId = genId('chat');
    this._pending.set(msgId, { handlers: handlers, full: '' });
    if (handlers.onStart) handlers.onStart();
    // msgId 必须随 payload 下发，后端在 chat.delta/done 中原样回传以完成路由
    this.sendRaw(envelope('chat.send', { id: msgId, text: text, sessionId: (ctx && ctx.sessionId) || null }, 'chat'));
    return {
      abort: function() {
        self._pending.delete(msgId);
        self.sendRaw(envelope('chat.abort', { id: msgId }, 'chat'));
        if (handlers.onError) handlers.onError({ message: 'aborted' });
      }
    };
  };

  WSTransport.prototype.exec = function(cmd, cwd, handlers, ctx) {
    handlers = handlers || {};
    const self = this;
    const tabId = (ctx && ctx.tabId) || genId('tab');
    this._termHandlers.set(tabId, { handlers: handlers });
    this.sendRaw(envelope('terminal.input', { tabId: tabId, cmd: cmd, cwd: cwd || '~' }, 'terminal:' + tabId));
    return {
      abort: function() { self._termHandlers.delete(tabId); }
    };
  };

  /* ============================================================
     4. transport 管理器 — 创建 / 激活 / 状态广播
     ============================================================ */
  const transportApi = {
    PROTOCOL_VERSION: PROTOCOL_VERSION,
    MockTransport: MockTransport,
    RestTransport: RestTransport,
    WSTransport: WSTransport,
    active: null,

    /** 工厂：create('mock'|'rest'|'ws', opts) */
    create(type, opts) {
      if (type && typeof type === 'object') return type; // 自定义实例直通
      if (type === 'mock') return new MockTransport(opts);
      if (type === 'rest') return new RestTransport(opts);
      if (type === 'ws') return new WSTransport(opts);
      throw new Error('[QoderUI.transport] 未知类型: ' + type + '（可选 mock / rest / ws，或直接传入实例）');
    },

    /** 激活某个 transport（创建 + 置为 active + connect） */
    use(type, opts) {
      const t = this.create(type, opts);
      this.active = t;
      try { localStorage.setItem('qoder-ui:transport', JSON.stringify({ type: t.name === 'mock' ? 'mock' : type, opts: _safeOpts(opts), ts: Date.now() })); } catch (_) {}
      const p = t.connect ? t.connect() : Promise.resolve();
      window.dispatchEvent(new CustomEvent('qoder-transport-change', { detail: { transport: t } }));
      return p.then(function() { return t; });
    },

    /** 取当前激活 transport（无则 null → UI 回落本地行为） */
    get() { return this.active; },

    /** 断开并清除激活 */
    clear() {
      const t = this.active;
      this.active = null;
      try { localStorage.removeItem('qoder-ui:transport'); } catch (_) {}
      if (t && t.close) t.close();
      window.dispatchEvent(new CustomEvent('qoder-transport-change', { detail: { transport: null } }));
    },

    /** 从 localStorage 恢复上次连接（demo/刷新场景） */
    restore() {
      let saved = null;
      try { saved = JSON.parse(localStorage.getItem('qoder-ui:transport') || 'null'); } catch (_) {}
      if (!saved || !saved.type || saved.type === 'mock') return Promise.resolve(null);
      return this.use(saved.type, saved.opts || {}).then(function(t) { return t; }).catch(function() { return null; });
    }
  };

  function _safeOpts(opts) {
    if (!opts) return {};
    const o = Object.assign({}, opts);
    delete o.fetchImpl; delete o.wsImpl; delete o.headers; // 函数/敏感头不落盘
    return o;
  }

  QF.transport = transportApi;
  QF.createTransport = function(type, opts) { return transportApi.create(type, opts); };

  /* ============================================================
     5. QoderUI.mount() — 一行接入其他项目
     ------------------------------------------------------------
     QoderUI.mount('#app', {
       cssUrl: 'https://cdn.../qoder-ui.min.css',  // 省略则自动同源探测
       theme: 'dark',                              // 8 主题之一（可选）
       transport: 'rest',                          // 'mock'|'rest'|'ws'|实例（可选）
       transportOpts: { baseUrl: 'http://localhost:8787/api' },
       features: true                              // 是否自动初始化全部交互
     })  ->  { el, destroy(), setTheme(), useTransport() }
     ============================================================ */
  const MODULE_URL = (function() {
    if (typeof document === 'undefined') return '';
    if (document.currentScript && document.currentScript.src) return document.currentScript.src;
    // async/defer 场景 currentScript 为空：回退扫描同页 qoder-ui 脚本
    const scripts = document.querySelectorAll('script[src*="qoder-ui"]');
    return scripts.length ? scripts[scripts.length - 1].src : '';
  })();

  function injectCss(cssUrl) {
    if (!cssUrl) return null;
    if (document.querySelector('link[data-qoder-ui], style[data-qoder-ui]')) return null;
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = cssUrl;
    link.setAttribute('data-qoder-ui', '');
    document.head.appendChild(link);
    return link;
  }

  QF.mount = function(target, opts) {
    opts = opts || {};
    const el = typeof target === 'string' ? document.querySelector(target) : target;
    if (!el) throw new Error('[QoderUI.mount] 目标不存在: ' + target);

    // 1. CSS 注入（幂等：已有 data-qoder-ui 样式则跳过）
    const cssUrl = opts.cssUrl || (MODULE_URL ? new URL('qoder-ui.min.css', MODULE_URL).href : null);
    const cssLink = injectCss(cssUrl);

    // 2. 主题
    if (opts.theme && QF.theme) QF.theme.set(opts.theme);

    // 3. transport
    let transportReady = Promise.resolve(null);
    if (opts.transport) transportReady = QF.transport.use(opts.transport, opts.transportOpts).catch(function(e) { console.warn('[QoderUI.mount] transport 连接失败，回落 Mock：', e.message); return QF.transport.use('mock'); });

    // 4. 交互初始化
    if (opts.features !== false && QF.features) QF.features.init();

    return {
      el: el,
      cssLink: cssLink,
      ready: function() { return transportReady; },
      setTheme: function(t) { if (QF.theme) QF.theme.set(t); },
      useTransport: function(type, tOpts) { return QF.transport.use(type, tOpts); },
      destroy: function() {
        QF.transport.clear();
        if (cssLink && cssLink.parentNode) cssLink.parentNode.removeChild(cssLink);
      }
    };
  };
})();
