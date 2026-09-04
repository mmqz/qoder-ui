/* ============================================================
   Qoder UI v3.3 — Transport 层单元测试
   覆盖：协议信封 / Mock 流式与终端 / REST SSE+JSON / WS 信封路由与重连
   运行：node --test tests/transport.test.mjs
   ============================================================ */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/qoder-transport.js'), 'utf8');

/* ---------- 在 Node 中实例化浏览器 IIFE 模块（注入最小 window/document） ----------
   v3.3.2：模块注册改为 globalThis.QoderUI，此处以独立 sandbox 对象作 globalThis
   参数注入（参数遮蔽真实全局），既匹配新注册方式又保持用例间隔离 */
function loadModule() {
  const sandbox = {};
  const windowStub = { dispatchEvent() {} };
  const documentStub = {
    currentScript: null,
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: () => ({ style: {}, setAttribute() {}, appendChild() {} }),
    head: { appendChild() {} },
    readyState: 'complete',
  };
  const fn = new Function('window', 'document', 'localStorage', 'CustomEvent', 'globalThis', src + `
    ;return { transport: globalThis.QoderUI.transport, mount: globalThis.QoderUI.mount, createTransport: globalThis.QoderUI.createTransport };`);
  return fn(windowStub, documentStub, undefined, function CustomEvent(type, opts) { this.type = type; Object.assign(this, opts); }, sandbox);
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

/* ---------- Fake WebSocket ---------- */
class FakeWS {
  constructor(url) {
    this.url = url; this.readyState = 0;
    this.sent = [];
    FakeWS.instances.push(this);
  }
  send(data) { this.sent.push(JSON.parse(data)); }
  open() { this.readyState = 1; this.onopen && this.onopen(); }
  message(env) { this.onmessage && this.onmessage({ data: JSON.stringify(env) }); }
  close() { this.readyState = 3; this.onclose && this.onclose(); }
}
FakeWS.instances = [];

/* ============================================================ */
describe('协议信封', () => {
  test('PROTOCOL_VERSION = 1，工厂类型齐全', () => {
    const m = loadModule();
    assert.equal(m.transport.PROTOCOL_VERSION, 1);
    assert.ok(m.transport.MockTransport && m.transport.RestTransport && m.transport.WSTransport);
    assert.equal(typeof m.mount, 'function');
    assert.equal(typeof m.createTransport, 'function');
  });
});

describe('MockTransport', () => {
  test('chat 流式：delta 累积 → onDone 收到全文', async () => {
    const m = loadModule();
    const t = new m.transport.MockTransport();
    const deltas = []; let done = null; let startFired = false;
    t.chat('你好', {
      onStart: () => { startFired = true; },
      onDelta: (_d, full) => deltas.push(full),
      onDone: (full) => { done = full; },
    });
    await sleep(600);
    assert.ok(startFired);
    assert.ok(deltas.length >= 3, '应有多段 delta');
    assert.ok(done && done.includes('你好'), 'onDone 包含完整回声文本');
    assert.equal(done, deltas[deltas.length - 1], '最终 delta == 全文');
  });

  test('exec：echo/stdout、未知命令 stderr+127、cd 更新 cwd', async () => {
    const m = loadModule();
    const t = new m.transport.MockTransport();
    const echo = await new Promise(r => t.exec('echo hello', '~', {
      onOutput: (d, s) => r([d, s]), onExit: (c) => r(['__exit__', c]),
    }));
    assert.equal(echo[0], 'hello'); assert.equal(echo[1], 'stdout');

    const nf = await new Promise(r => t.exec('nope', '~', {
      onOutput: (d, s) => r([d, s]), onExit: (c) => r(['__exit__', c]),
    }));
    assert.equal(nf[1], 'stderr'); assert.ok(nf[0].includes('not found'));

    const cwd = await new Promise(r => t.exec('cd docs', '~', { onCwd: (c) => r(c), onExit: () => r('__exit__') }));
    assert.equal(cwd, '/docs');
  });
});

describe('RestTransport', () => {
  const sseChunk = (env) => `data: ${JSON.stringify(env)}\n\n`;

  test('chat：SSE 流式解析 delta/done', async () => {
    const m = loadModule();
    const sse = sseChunk({ type: 'chat.delta', payload: { id: 'x1', delta: '你好' } }) +
      sseChunk({ type: 'chat.delta', payload: { id: 'x1', delta: '，世界' } }) +
      sseChunk({ type: 'chat.done', payload: { id: 'x1' } });
    const fetchImpl = async () => new Response(sse, { headers: { 'content-type': 'text/event-stream' } });
    const t = new m.transport.RestTransport({ baseUrl: 'http://x/api', fetchImpl });
    const deltas = []; let done = null; let posted = null;
    const realFetch = fetchImpl; // 记录请求体
    const t2 = new m.transport.RestTransport({
      baseUrl: 'http://x/api',
      fetchImpl: async (url, init) => { posted = { url, body: JSON.parse(init.body) }; return realFetch(url, init); },
    });
    t.chat('hi', { onDelta: (d) => deltas.push(d), onDone: (f) => { done = f; } });
    await t2.chat('hi', { onDelta: () => {}, onDone: () => {} });
    await sleep(80);
    assert.deepEqual(deltas, ['你好', '，世界']);
    assert.equal(done, '你好，世界');
    assert.equal(posted.url, 'http://x/api/chat');
    assert.equal(posted.body.type, 'chat.send');
    assert.equal(posted.body.payload.text, 'hi');
    assert.equal(posted.body.v, 1);
  });

  test('chat：一次性 JSON 回复', async () => {
    const m = loadModule();
    const fetchImpl = async () => new Response(JSON.stringify({ content: 'plain answer' }), { headers: { 'content-type': 'application/json' } });
    const t = new m.transport.RestTransport({ baseUrl: 'http://x/api', fetchImpl });
    const done = await new Promise(r => t.chat('q', { onDone: (f) => r(f) }));
    assert.equal(done, 'plain answer');
  });

  test('exec：stdout/stderr/exitCode/cwd 全字段映射', async () => {
    const m = loadModule();
    const fetchImpl = async () => new Response(JSON.stringify({ stdout: 'file1\n', stderr: 'warn\n', exitCode: 1, cwd: '/sub' }));
    const t = new m.transport.RestTransport({ baseUrl: 'http://x/api', fetchImpl });
    const got = await new Promise(r => {
      const out = {};
      t.exec('ls', '~', {
        onOutput: (d, s) => { out[s] = d; },
        onCwd: (c) => { out.cwd = c; },
        onExit: (c) => { out.code = c; r(out); },
      });
    });
    assert.equal(out_or(got), 'file1\n');
    assert.equal(got.stderr, 'warn\n');
    assert.equal(got.code, 1);
    assert.equal(got.cwd, '/sub');
    function out_or(o) { return o.stdout; }
  });
});

describe('WSTransport', () => {
  test('connect → chat.send 信封出站，chat.delta/done 路由回 handlers', async () => {
    const m = loadModule();
    FakeWS.instances = [];
    const t = new m.transport.WSTransport({ url: 'ws://x', wsImpl: FakeWS });
    const connecting = t.connect();
    FakeWS.instances[0].open(); // 构造函数同步执行，手动触发 open
    await connecting;
    const ws = FakeWS.instances[0];
    assert.equal(ws.url, 'ws://x');
    assert.equal(t.status, 'open');

    const deltas = []; let done = null;
    t.chat('ping', { onDelta: (d) => deltas.push(d), onDone: (f) => { done = f; } });
    const sent = ws.sent[0];
    assert.equal(sent.type, 'chat.send');
    assert.equal(sent.payload.text, 'ping');
    assert.equal(sent.v, 1);

    const msgId = sent.payload.id; // 服务端视角：payload.id 原样回传
    ws.message({ type: 'chat.delta', payload: { id: msgId, delta: 'pong1' } });
    ws.message({ type: 'chat.delta', payload: { id: msgId, delta: 'pong2' } });
    ws.message({ type: 'chat.done', payload: { id: msgId } });
    assert.deepEqual(deltas, ['pong1', 'pong2']);
    assert.equal(done, 'pong1pong2');
  });

  test('exec：terminal.input 出站带 tabId，terminal.output/exit 按 tabId 路由', async () => {
    const m = loadModule();
    FakeWS.instances = [];
    const t = new m.transport.WSTransport({ url: 'ws://x', wsImpl: FakeWS });
    const connecting = t.connect();
    FakeWS.instances[0].open();
    await connecting;
    const ws = FakeWS.instances[0];

    const lines = []; let code = null; let cwd = null;
    t.exec('ls -la', '~', {
      onOutput: (d) => lines.push(d),
      onCwd: (c) => { cwd = c; },
      onExit: (c) => { code = c; },
    }, { tabId: 'tabA' });
    const sent = ws.sent[0];
    assert.equal(sent.type, 'terminal.input');
    assert.equal(sent.payload.tabId, 'tabA');
    assert.equal(sent.payload.cmd, 'ls -la');

    ws.message({ type: 'terminal.output', payload: { tabId: 'tabA', data: 'out-a' } });
    ws.message({ type: 'terminal.output', payload: { tabId: 'tabB', data: 'out-b' } }); // 其它标签不串扰
    ws.message({ type: 'terminal.cwd', payload: { tabId: 'tabA', cwd: '/x' } });
    ws.message({ type: 'terminal.exit', payload: { tabId: 'tabA', code: 0 } });
    assert.deepEqual(lines, ['out-a']);
    assert.equal(cwd, '/x');
    assert.equal(code, 0);
  });

  test('断线自动重连（retries 递增）', async () => {
    const m = loadModule();
    FakeWS.instances = [];
    const t = new m.transport.WSTransport({ url: 'ws://x', wsImpl: FakeWS, reconnectDelay: 30 });
    const connecting = t.connect();
    FakeWS.instances[0].open();
    await connecting;
    assert.equal(FakeWS.instances.length, 1);
    FakeWS.instances[0].close(); // 服务端断开
    await sleep(120);
    assert.ok(FakeWS.instances.length >= 2, '应发起重连');
    assert.equal(t._retries >= 1, true);
    await t.close();
  });

  test('raw/sendRaw 逃生口', async () => {
    const m = loadModule();
    FakeWS.instances = [];
    const t = new m.transport.WSTransport({ url: 'ws://x', wsImpl: FakeWS });
    const connecting = t.connect();
    FakeWS.instances[0].open();
    await connecting;
    const ws = FakeWS.instances[0];
    const seen = [];
    const off = t.raw((env) => seen.push(env));
    t.sendRaw({ v: 1, id: 'z', type: 'custom.ping', channel: null, payload: {}, ts: 1 });
    assert.equal(ws.sent[0].type, 'custom.ping'); // 出站原样到达 socket
    ws.message({ v: 1, id: 'z2', type: 'custom.pong', channel: null, payload: {}, ts: 2 }); // 入站
    assert.equal(seen[0].type, 'custom.pong'); // raw 监听收到原始信封
    off();
    await t.close();
  });

  test('审计 L6：未连接时 chat/exec 立即报错而非静默丢弃', async () => {
    const m = loadModule();
    FakeWS.instances = [];
    // chat：未连接 → onStart 后立即 onError，且不遗留 pending
    const t2 = new m.transport.WSTransport({ url: 'ws://x', wsImpl: FakeWS });
    let started = false;
    const got = await new Promise(r => {
      t2.chat('x', {
        onStart() { started = true; },
        onError(e) { r({ started, message: e.message }); },
      });
    });
    assert.equal(got.started, true, '未连接也应触发 onStart');
    assert.ok(got.message && got.message.length > 0, '未连接 chat 应有明确错误信息');
    assert.equal(t2._pending.size, 0, '未连接 chat 不应遗留 pending 条目');
    // exec：未连接 → stderr 输出 + exitCode 1
    const t3 = new m.transport.WSTransport({ url: 'ws://x', wsImpl: FakeWS });
    const ex = await new Promise(r => {
      t3.exec('ls', '~', {
        onOutput(d, s) { r({ stream: s }); },
        onExit(code) { r({ exit: code }); },
      });
    });
    assert.ok(ex.stream === 'stderr' || ex.exit === 1, '未连接 exec 应走 stderr/exit 通道');
  });
});

describe('transport 管理器生命周期', () => {
  test('use/get/clear + create 工厂', async () => {
    const m = loadModule();
    const t = await m.transport.use('mock');
    assert.equal(m.transport.get(), t);
    assert.equal(t.status, 'open');
    m.transport.clear();
    assert.equal(m.transport.get(), null);
    const inst = m.createTransport('mock');
    assert.ok(inst instanceof m.transport.MockTransport);
  });

  test('自定义实例直通（任意后端接入点）', async () => {
    const m = loadModule();
    const custom = {
      name: 'grpc-gateway', status: 'open', supportsTerminal: false,
      connect: async () => {}, close: async () => {},
      onStatus: () => () => {},
      chat: (text, h) => { h.onDelta('A'); h.onDone('AB'); return { abort() {} }; },
      exec: () => ({ abort() {} }),
    };
    await m.transport.use(custom);
    assert.equal(m.transport.get().name, 'grpc-gateway');
    const done = await new Promise(r => m.transport.get().chat('x', { onDelta: () => {}, onDone: r }));
    assert.equal(done, 'AB');
    m.transport.clear();
  });
});
