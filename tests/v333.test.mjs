/**
 * v3.3.3 新能力测试
 * 覆盖：i18n（t/setLocale/register）/ WS 心跳（死链检测+pong+服务端ping）/ REST 建连超时 / 终端 scrollback 上限
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- core（纯逻辑，直接实例化 IIFE） ---------- */
const coreSrc = readFileSync(join(root, 'src/qoder-core.js'), 'utf8');
function loadCore() {
  const sandbox = {};
  const fn = new Function('globalThis', coreSrc);
  fn(sandbox);
  return sandbox.QoderCore;
}

/* ---------- transport 源码实例化（同 transport.test.mjs 沙箱模式） ---------- */
const transportSrc = readFileSync(join(root, 'src/qoder-transport.js'), 'utf8');
function loadTransport(opts) {
  const sandbox = {};
  const windowStub = { dispatchEvent() {} };
  const documentStub = { currentScript: null, querySelector: () => null, querySelectorAll: () => [], createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }), head: { appendChild() {} }, readyState: 'complete' };
  const fn = new Function('window', 'document', 'localStorage', 'CustomEvent', 'globalThis', transportSrc + `
    ;return { QF: globalThis.QoderUI, transport: globalThis.QoderUI.transport };`);
  return fn(windowStub, documentStub, undefined, function CustomEvent(type, o) { this.type = type; Object.assign(this, o); }, sandbox);
}

/* ---------- FakeWS（支持静默死链模拟） ---------- */
class FakeWS {
  constructor(url) { this.url = url; this.readyState = 0; this.sent = []; FakeWS.instances.push(this); }
  send(data) { this.sent.push(JSON.parse(data)); }
  open() { this.readyState = 1; this.onopen && this.onopen(); }
  message(env) { this.onmessage && this.onmessage({ data: typeof env === 'string' ? env : JSON.stringify(env) }); }
  close() { this.readyState = 3; this.onclose && this.onclose(); }
}
FakeWS.instances = [];
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ============================================================ */
describe('v3.3.3 i18n', () => {
  test('t() 默认回退源串；use(en) 切换生效；未知 key 回退', () => {
    const Core = loadCore();
    assert.equal(Core.t('已复制 ✓'), '已复制 ✓');          // 无语言 → 源串
    Core.setLocale('en');
    assert.equal(Core.t('已复制 ✓'), 'Copied ✓');
    assert.equal(Core.t('不存在的串xyz'), '不存在的串xyz'); // 表中无 → 回退
    Core.setLocale(null);
    assert.equal(Core.t('已复制 ✓'), '已复制 ✓');          // 回到源串
    assert.equal(Core.i18n.current(), 'zh-CN（源串）');
  });

  test('register 自定义语言 + {n} 模板由调用方插值', () => {
    const Core = loadCore();
    Core.i18n.register('ja', { '已复制 ✓': 'コピーしました' });
    Core.i18n.use('ja');
    assert.equal(Core.t('已复制 ✓'), 'コピーしました');
    Core.setLocale(null);
    assert.equal(Core.t('已添加 {n} 个文件').replace('{n}', 3), '已添加 3 个文件');
    Core.setLocale('en');
    assert.equal(Core.t('共 {n} 页').replace('{n}', 2), 'Page 2 of {total}');
    Core.setLocale(null);
  });

  test('无效 register/use 安全拒绝', () => {
    const Core = loadCore();
    Core.i18n.register('bad', null);
    Core.i18n.use('never-registered');
    assert.equal(Core.i18n.locale, null);
  });
});

describe('v3.3.3 WS 心跳', () => {
  function makeWS(opts) {
    const m = loadTransport();
    // 显式注入 FakeWS：Node>=21 存在原生 WebSocket，未注入时会尝试真实联网
    const t = new m.QF.transport.WSTransport({ url: 'ws://test', reconnect: true, reconnectDelay: 10, wsImpl: FakeWS, ...opts });
    return t;
  }

  test('死链检测：ping 无应答 → close → 自动重连', async () => {
    FakeWS.instances.length = 0;
    const t = makeWS({ heartbeat: { interval: 40, timeout: 30 } });
    const p = t.connect();     // 创建 FakeWS#1
    FakeWS.instances[0].open(); // 触发 onopen → 心跳启动 → connect 兑现
    await p;
    await sleep(130);           // ≥ interval + timeout
    // 无应答：第一连接被断开并重连 → 出现第二个 FakeWS 实例
    assert.ok(FakeWS.instances.length >= 2, '死链应触发重连');
    const first = FakeWS.instances[0];
    assert.ok(first.sent.some(s => s.type === 'ping'), '应发出 ping 信封');
    assert.equal(first.readyState, 3, '死链应被主动关闭');
    await t.close();
  });

  test('pong 应答：连接保持存活，不重连', async () => {
    FakeWS.instances.length = 0;
    const t = makeWS({ heartbeat: { interval: 40, timeout: 30 } });
    const p = t.connect();
    const ws = FakeWS.instances[0];
    ws.open();
    await p;
    // 每次收到 ping 都回 pong（模拟正常服务端）
    const origSend = ws.send.bind(ws);
    ws.send = (data) => { origSend(data); try { const env = JSON.parse(data); if (env.type === 'ping') ws.message({ type: 'pong', payload: {} }); } catch (_) {} };
    await sleep(150);
    assert.equal(FakeWS.instances.length, 1, '正常应答不应重连');
    assert.ok(ws.sent.filter(s => s.type === 'ping').length >= 2, '多跳 ping 持续发出');
    assert.equal(t.status, 'open');
    await t.close();
  });

  test('服务端 ping → 客户端自动回 pong；任意入站消息重置活性', async () => {
    FakeWS.instances.length = 0;
    const t = makeWS({ heartbeat: { interval: 40, timeout: 30 } });
    const p = t.connect();
    const ws = FakeWS.instances[0];
    ws.open();
    await p;
    // 服务端主动 ping → 客户端应自动回 pong
    ws.message({ type: 'ping', payload: {} });
    assert.ok(ws.sent.some(s => s.type === 'pong'), '应回 pong');
    // 模拟正常服务端：对客户端 ping 也应答 pong，验证连接保持
    const origSend = ws.send.bind(ws);
    ws.send = (data) => { origSend(data); try { const env = JSON.parse(data); if (env.type === 'ping') ws.message({ type: 'pong', payload: {} }); } catch (_) {} };
    await sleep(90);
    // 有应答 → 不应重连
    assert.equal(FakeWS.instances.length, 1);
    await t.close();
  });

  test('heartbeat:false 可关闭心跳', async () => {
    FakeWS.instances.length = 0;
    const t = makeWS({ heartbeat: false });
    const p = t.connect();
    FakeWS.instances[0].open();
    await p;
    await sleep(90);
    assert.ok(FakeWS.instances[0].sent.every(s => s.type !== 'ping'), '关闭后不发 ping');
    assert.equal(FakeWS.instances.length, 1);
    await t.close();
  });
});

describe('v3.3.3 REST 建连超时', () => {
  function fetchHang(signalAware, delay) {
    return (url, opts = {}) => new Promise((resolve, reject) => {
      if (opts.signal) {
        opts.signal.addEventListener('abort', () => {
          const e = new Error('The operation was aborted'); e.name = 'AbortError'; reject(e);
        });
      }
      if (!signalAware) return; // 永远挂起（模拟死后端）
      setTimeout(() => resolve(new Response(JSON.stringify({ content: 'ok' }), { status: 200, headers: { 'content-type': 'application/json' } })), delay || 400);
    });
  }
  function makeREST(fetchImpl, timeout) {
    const m = loadTransport();
    return new m.QF.transport.RestTransport({ baseUrl: 'http://test/api', fetchImpl, timeout });
  }

  test('后端挂起 + timeout:50 → onError {message:"timeout"}', async () => {
    const t = makeREST(fetchHang(false), 50);
    const err = await new Promise((resolve) => {
      t.chat('hi', { onError: (e) => resolve(e) });
    });
    assert.equal(err.message, 'timeout');
  });

  test('响应及时到达 → 正常完成，计时器清除（无 timeout 误报）', async () => {
    const t = makeREST((u, o) => fetchHang(true, 60)(u, o), 200); // 响应 60ms < 超时 200ms
    const result = await new Promise((resolve) => {
      t.chat('hi', { onDone: (full) => resolve({ ok: true, full }), onError: (e) => resolve({ ok: false, e }) });
    });
    assert.ok(result.ok && result.full === 'ok');
  });

  test('exec 同样受超时保护', async () => {
    const t = makeREST(fetchHang(false), 50);
    const result = await new Promise((resolve) => {
      t.exec('ls', '~', { onError: (e) => resolve(e), onExit: (c) => resolve({ exit: c }) });
    });
    assert.equal(result.message, 'timeout');
  });
});

describe('v3.3.3 终端 scrollback 上限', () => {
  function loadTerminal() {
    const sandbox = {};
    new Function('globalThis', coreSrc)(sandbox);
    const featsSrc = readFileSync(join(root, 'src/qoder-features.js'), 'utf8');
    new Function('globalThis', featsSrc)(sandbox);
    sandbox.QoderUI.config = { terminalScrollback: 5 };
    return { term: sandbox.QoderUI.terminal, QF: sandbox.QoderUI };
  }
  function fakeLine(isInput) {
    const n = {
      _isInput: isInput,
      classList: { contains: (c) => c === 'qoder-terminal__input-line' && isInput },
      querySelector: (s) => (isInput && s === '.qoder-terminal__input-text') ? {} : null,
      removed: false
    };
    Object.defineProperty(n, 'nextElementSibling', { get() { const i = nodes.indexOf(n); return nodes[i + 1] || null; } });
    return n;
  }
  let nodes = [];
  function fakeBody() {
    nodes = [];
    return {
      get children() { return nodes; },
      get firstElementChild() { return nodes[0] || null; },
      removeChild(el) { const i = nodes.indexOf(el); if (i >= 0) nodes.splice(i, 1); el.removed = true; }
    };
  }

  test('超出上限裁剪最老行，保留活动输入行', () => {
    const { term } = loadTerminal();
    const body = fakeBody();
    const input = fakeLine(true);
    nodes.push(input);
    for (let i = 0; i < 8; i++) nodes.push(fakeLine(false));
    term._trimScrollback(body);
    assert.ok(nodes.length <= 5, '应裁剪到上限内：' + nodes.length);
    assert.ok(!input.removed, '活动输入行绝不能被裁剪');
    assert.ok(!nodes[0].removed);
  });

  test('上限设 0 或缺失 → 不裁剪（防御）', () => {
    const { term, QF } = loadTerminal();
    QF.config = {};
    const body = fakeBody();
    for (let i = 0; i < 10; i++) nodes.push(fakeLine(false));
    term._trimScrollback(body);
    assert.equal(nodes.length, 10);
  });
});
