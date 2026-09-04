/**
 * 移动端 API 契约客户端测试（v3.11.0 安卓端契约对齐+桌面控制面审计版）
 * 覆盖：45 端点目录与逆向契约 JSON 逐字对账 / 19 组枚举 / 14 个精选 DTO 线格式 /
 *       控制面 7 subtype + 三类审批应答体 / 事件语义（role 派生/文本兜底链/状态归一）/
 *       SSE 帧解析 / 六源混合同步 SyncStore（去重+@occurrence:n+乐观回显+审批队列）/
 *       HMAC 反馈签名黄金向量（node:crypto 独立复算）/ Mock 后端全闭环
 *       （会话→SSE→消息→工具卡→审批→结果→回合结束）/ 头族 / VPC 端点发现映射
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { webcrypto } from 'node:crypto';
import { createHmac, createHash } from 'node:crypto';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const src = readFileSync(join(root, 'src/qoder-mobile-api.js'), 'utf8');
const contract = JSON.parse(readFileSync(join(root, 'docs/android-api-contract.json'), 'utf8'));

/* ---------- 沙箱加载（无 DOM；crypto 注入 Node webcrypto） ---------- */
function loadApi() {
  const sandbox = {};
  sandbox.crypto = webcrypto;
  const fn = new Function('globalThis', src);
  fn.call(sandbox, sandbox);
  return sandbox.QoderUI.MobileApi;
}

const A = loadApi();

/* ============================================================
   1. 端点目录 ↔ 逆向契约 JSON 逐字对账
   ============================================================ */
describe('端点目录对账', () => {
  test('45 条端点与契约 JSON 的 (method,path,domain) 逐一相等', () => {
    assert.equal(A.ENDPOINTS.length, contract.endpoints.length);
    contract.endpoints.forEach((e, i) => {
      const mine = A.ENDPOINTS[i];
      assert.equal(mine.method, e.method, `#${i} method 不符`);
      assert.equal(mine.path, e.path, `#${i} path 不符`);
      assert.equal(mine.domain, e.domain, `#${i} domain 不符`);
    });
  });

  test('16 个域全覆盖', () => {
    const domains = new Set(A.ENDPOINTS.map((e) => e.domain));
    for (const d of ['sessions', 'auth', 'github', 'user', 'device', 'push', 'glasses',
      'feedback', 'artifacts', 'upload', 'telemetry', 'sandbox', 'system', 'environments', 'update', 'voice']) {
      assert.ok(domains.has(d), '缺域 ' + d);
    }
    assert.equal(domains.size, 16);
  });
});

/* ============================================================
   2. 枚举与线格式对账
   ============================================================ */
describe('枚举与 DTO 线格式', () => {
  test('19 组枚举与契约关键值一致', () => {
    assert.equal(A.ENUMS.PERMISSION_MODES.join('|'), 'default|acceptEdits|plan|bypassPermissions');
    assert.equal(A.ENUMS.APPROVAL_STATUS.join('|'), 'PENDING|APPROVED|REJECTED');
    assert.equal(A.ENUMS.APPROVAL_KIND.join('|'), 'GENERIC|EXECUTION|PLAN_REVIEW');
    assert.equal(A.ENUMS.TOOL_RISK_GROUP.join('|'), 'WRITE|EDIT|READ|RAN');
    assert.equal(A.ENUMS.REGION.join('|'), 'OFFICIAL_DEFAULT|VPC');
    assert.equal(A.ENUMS.SESSION_STATUS.includes('waiting_for_approval'), true);
    assert.equal(A.ENUMS.TOOL_TYPES.length, 14);
    assert.equal(A.ENUMS.ARTIFACT_TYPE.length, 14);
    assert.equal(A.ENUMS.EVENT_TYPES.join('|'), 'message|tool_use|tool_result|control_request|control_response|control_cancel|control_cancel_request');
  });

  test('精选 13 个 DTO 线名与契约 dto_wire_fields 完全一致', () => {
    const byName = {};
    for (const k of Object.keys(contract.dto_wire_fields)) byName[k.split('/').pop()] = contract.dto_wire_fields[k];
    for (const [name, fields] of Object.entries(A.WIRE)) {
      assert.ok(byName[name], name + ' 不在契约中');
      assert.deepEqual(fields, byName[name], name + ' 线名序不符');
    }
    assert.equal(Object.keys(A.WIRE).length, 13);
  });

  test('wire 双向映射（snake↔camel；StoredSession 线名本为 camel 恒等）', () => {
    const w = { session_id: 's1', session_status: 'running', external_metadata: { a: 1 } };
    const c = A.fromWire('ControlSessionDTO', w);
    assert.equal(c.sessionId, 's1');
    assert.equal(c.sessionStatus, 'running');
    assert.deepEqual(A.toWire('ControlSessionDTO', c), w);
    // StoredSession：camel 线名 → 恒等映射
    const st = { userId: 'u', accessToken: 'tk' };
    assert.deepEqual(A.toWire('StoredSession', st), st);
    // 未知字段透传（不做猜测式转换）
    assert.equal(A.fromWire('ControlSessionDTO', { custom_field: 9 }).customField, 9);
    assert.equal(A.toWire('ControlSessionDTO', { customField: 9 }).customField, 9);
  });
});

/* ============================================================
   3. 控制面（7 subtype + 三类审批应答体）
   ============================================================ */
describe('控制面构造器', () => {
  test('7 种 control_request 事件体逐字段符合 §4.3', () => {
    const check = (evt, subtype, extra) => {
      assert.equal(evt.event_type, 'control_request');
      assert.equal(evt.payload.type, 'control_request');
      assert.ok(/^[0-9a-f-]{36}$/.test(evt.payload.request_id), 'request_id 应为 UUID');
      assert.equal(evt.payload.uuid, 'control-request:' + evt.payload.request_id);
      assert.deepEqual({ subtype, ...extra }, evt.payload.request);
    };
    check(A.control.interrupt(), 'interrupt');
    check(A.control.endSession(), 'end_session', { reason: 'user_requested' });
    check(A.control.endSession('other'), 'end_session', { reason: 'other' });
    check(A.control.setModel('flagship'), 'set_model', { model: 'flagship' });
    check(A.control.setPermissionMode('acceptEdits'), 'set_permission_mode', { mode: 'acceptEdits' });
    check(A.control.rename('新名字'), 'session_title_changed', { title: '新名字', source: 'custom' });
    check(A.control.prepareArtifact('~/out/a.html'), 'prepare_artifact', { path: '~/out/a.html' });
    // control_cancel_request：uuid 前缀 control-cancel-request:，request_id 指向被撤销请求
    const cancel = A.control.cancelRequest('target-rid');
    assert.equal(cancel.event_type, 'control_request');
    assert.equal(cancel.payload.request.subtype, 'control_cancel_request');
    assert.equal(cancel.payload.request.request_id, 'target-rid');
    assert.equal(cancel.payload.request.uuid, 'control-cancel-request:target-rid');
    // 非法权限模式 / 空 title 抛错
    assert.throws(() => A.control.setPermissionMode('yolo'));
    assert.throws(() => A.control.rename(''));
    assert.throws(() => A.control.rename('x'.repeat(256)));
  });

  test('三类审批应答体逐字段符合 §4.2', () => {
    // 工具审批（批准一次）
    const ok = A.control.respondToolApproval('rid-1', { outcome: 'proceed_once' });
    assert.equal(ok.event_type, 'control_response');
    assert.equal(ok.payload.request_id, 'rid-1');
    assert.equal(ok.payload.response.subtype, 'success');
    assert.deepEqual(ok.payload.response.response, { outcome: 'proceed_once', allowed: true, payload: { feedback: '' } });
    // 拒绝 + 理由
    const no = A.control.respondToolApproval('rid-2', { outcome: 'reject', feedback: '太危险' });
    assert.deepEqual(no.payload.response.response, { outcome: 'reject', allowed: false, payload: { feedback: '太危险' } });
    // 选项归一：proceed_always_and_save/server/tool → proceed_always
    assert.equal(A.control.respondToolApproval('r', { outcome: 'proceed_always_and_save' }).payload.response.response.outcome, 'proceed_always');
    assert.equal(A.control.respondToolApproval('r', { outcome: 'proceed_always_server' }).payload.response.response.outcome, 'proceed_always');
    assert.equal(A.control.respondToolApproval('r', { outcome: 'proceed_always_tool' }).payload.response.response.outcome, 'proceed_always');
    // 计划评审：批准/拒绝两体
    const plan = A.control.respondPlanReview('r', { approved: true });
    assert.deepEqual(plan.payload.response.response, { approved: true, permissionMode: 'default' });
    const planNo = A.control.respondPlanReview('r', { approved: false, feedback: '改一下' });
    assert.deepEqual(planNo.payload.response.response, { approved: false, feedback: '改一下' });
    // AskUser：answers 映射
    const ask = A.control.respondAskUser('r', { q1: '答案A', q2: 'B' });
    assert.deepEqual(ask.payload.response.response, { outcome: 'proceed_once', allowed: true, payload: { answers: { q1: '答案A', q2: 'B' } } });
  });
});

/* ============================================================
   4. 事件语义
   ============================================================ */
describe('事件语义助手', () => {
  test('role 由 source 派生', () => {
    assert.equal(A.deriveRole('user'), 'user');
    assert.equal(A.deriveRole('controller'), 'user');
    assert.equal(A.deriveRole('assistant'), 'assistant');
    assert.equal(A.deriveRole('worker'), 'assistant');
    assert.equal(A.deriveRole('system'), 'system');
  });

  test('工具状态四态同义词归一', () => {
    assert.equal(A.normalizeToolStatus('in_progress'), 'running');
    assert.equal(A.normalizeToolStatus('waiting'), 'pending');
    assert.equal(A.normalizeToolStatus('succeeded'), 'completed');
    assert.equal(A.normalizeToolStatus('error'), 'failed');
    assert.equal(A.normalizeToolStatus('unknown-x'), '');
  });

  test('文本提取兜底链：content 块 → delta → response.text → output.text → chunk → text', () => {
    assert.equal(A.extractText({ content: [{ type: 'text', text: 'a' }, { type: 'tool_use' }, { type: 'text', text: 'b' }] }), 'ab');
    assert.equal(A.extractText({ content: 'plain' }), 'plain');
    assert.equal(A.extractText({ delta: 'd' }), 'd');
    assert.equal(A.extractText({ 'response.text': 'rt' }), 'rt');
    assert.equal(A.extractText({ 'output.text': 'ot' }), 'ot');
    assert.equal(A.extractText({ chunk: 'c' }), 'c');
    assert.equal(A.extractText({ text: 't' }), 't');
    assert.equal(A.extractText({}), '');
  });

  test('命令提取 command/rootCommand/cmd 三键 + 风险分组', () => {
    assert.equal(A.extractCommand({ request: { details: { command: 'ls' } } }), 'ls');
    assert.equal(A.extractCommand({ request: { rootCommand: 'git status' } }), 'git status');
    assert.equal(A.extractCommand({ cmd: 'pwd' }), 'pwd');
    assert.equal(A.riskGroup('BASH'), 'RAN');
    assert.equal(A.riskGroup('FILE_EDIT'), 'EDIT');
    assert.equal(A.riskGroup('FILE_WRITE'), 'WRITE');
    assert.equal(A.riskGroup('FILE_READ'), 'READ');
  });

  test('审批卡 kind 识别与回合语义', () => {
    assert.equal(A.approvalKind({ kind: 'EXECUTION' }), 'EXECUTION');
    assert.equal(A.approvalKind({ planContent: '## 计划' }), 'PLAN_REVIEW');
    assert.equal(A.approvalKind({ tool_name: 'ask_user' }), 'ASK_USER');
    assert.equal(A.isEndTurn({ stopReason: 'end_turn' }), true);
    assert.equal(A.isInterrupt({ 'system.interrupt': true }), true);
  });

  test('SSE 帧解析：多帧/残帧缓冲/非 JSON data', () => {
    const f1 = A.sseFrame({ event_id: 'e1', event_type: 'message', payload: { a: 1 } });
    const r = A.parseSseChunk(f1 + 'id: e2\ndata: not-json\n\n' + '残帧');
    assert.equal(r.events.length, 2);
    assert.equal(r.events[0].id, 'e1');
    assert.equal(r.events[0].event, 'message');
    assert.equal(r.events[0].data.payload.a, 1);
    assert.equal(r.events[1].data, 'not-json');
    assert.equal(r.rest, '残帧');
  });
});

/* ============================================================
   5. 六源混合同步 SyncStore
   ============================================================ */
describe('六源混合同步 SyncStore', () => {
  const ev = (i, type, extra) => ({
    event_id: 'e' + i, session_id: 's1', sequence_num: i, source: 'assistant',
    event_type: type || 'message', payload: extra || {}, created_at: '2026-01-01T00:00:00Z', ephemeral: false
  });

  test('六源常量齐全', () => {
    assert.deepEqual(A.SYNC_SOURCES, ['CACHE_RESTORE', 'REST_FULL', 'REST_INCREMENTAL', 'OLDER_BACKFILL', 'SSE_INCREMENTAL', 'DERIVED_STATE']);
  });

  test('CACHE_RESTORE 启动秒开 + REST 增量去重 + OLDER_BACKFILL 回填', () => {
    const st = new A.SyncStore();
    st.reset([ev(1), ev(2)]);
    assert.equal(st.state().items.length, 2);
    assert.ok(st.state().items.every((i) => i.source === 'CACHE_RESTORE'));
    // REST_INCREMENTAL：含重复 e2 + 新 e3
    st.ingestPage([ev(2), ev(3)], 'REST_INCREMENTAL');
    assert.equal(st.state().items.length, 3);
    // OLDER_BACKFILL：更早的 e0 回填
    st.ingestPage([ev(0)], 'OLDER_BACKFILL');
    const seqs = st.state().items.map((i) => i.seq);
    assert.deepEqual(seqs, [0, 1, 2, 3]);
    assert.equal(st.state().items[0].source, 'OLDER_BACKFILL');
  });

  test('REST_FULL 整页替换', () => {
    const st = new A.SyncStore();
    st.ingestPage([ev(1), ev(2)], 'REST_FULL');
    const s = st.state();
    assert.equal(s.items.length, 2);
    assert.ok(s.items.every((i) => i.source === 'REST_FULL'));
    assert.equal(s.lastSequence, 2);
  });

  test('SSE 重放去重 + display_key 冲突 @occurrence:n', () => {
    const st = new A.SyncStore();
    st.ingestSse(ev(1));
    st.ingestSse(ev(1)); // 同 event_id 重放 → 去重
    assert.equal(st.state().items.length, 1);
    // 无 event_id 的同 base 事件 → @occurrence:2
    const noId = { session_id: 's1', sequence_num: 9, source: 'system', event_type: 'message', payload: {} };
    st.ingestSse(noId);
    st.ingestSse({ ...noId });
    const keys = st.state().items.filter((i) => i.seq === 9).map((i) => i.key);
    assert.deepEqual(keys, ['s1:9', 's1:9@occurrence:2']);
  });

  test('DERIVED_STATE 乐观回显：发送即显，服务端同文回执替换', () => {
    const st = new A.SyncStore();
    st.ingestPage([ev(1)], 'REST_FULL');
    const cid = st.optimisticUser('你好');
    assert.equal(st.state().items.length, 2);
    assert.ok(st.state().items[1].optimistic);
    // 服务端同文 user 消息到达 → 乐观项移除
    st.ingestSse({ ...ev(2), source: 'user', payload: { content: [{ type: 'text', text: '你好' }] } });
    const items = st.state().items;
    assert.equal(items.length, 2);
    assert.ok(items.every((i) => !i.optimistic));
    assert.equal(items[items.length - 1].event.payload.content[0].text, '你好');
  });

  test('审批队列：control_request 入队 PENDING，应答/撤销翻转状态', () => {
    const st = new A.SyncStore();
    st.ingestSse({ ...ev(1, 'control_request'), payload: { request_id: 'r1', request: { tool_name: 'BASH' }, kind: 'EXECUTION' } });
    st.ingestSse({ ...ev(2, 'control_request'), payload: { request_id: 'r2', planContent: '计划' } });
    let s = st.state();
    assert.equal(s.pendingApprovals.length, 2);
    assert.equal(s.pendingApprovals[0].kind, 'EXECUTION');
    assert.equal(s.pendingApprovals[1].kind, 'PLAN_REVIEW');
    // 批准 r1
    st.ingestSse({ ...ev(3, 'control_response'), payload: { request_id: 'r1', response: { subtype: 'success', request_id: 'r1', response: { outcome: 'proceed_once', allowed: true } } } });
    // 撤销 r2
    st.ingestSse({ ...ev(4, 'control_cancel'), payload: { request_id: 'r2' } });
    s = st.state();
    assert.equal(s.pendingApprovals.length, 0);
    assert.equal(s.lastSequence, 4);
  });
});

/* ============================================================
   6. HMAC 反馈签名黄金向量（node:crypto 独立复算）
   ============================================================ */
describe('HMAC 反馈签名（§7.3 全规格）', () => {
  test('签名与 node:crypto 独立实现逐字节一致', async () => {
    const version = '0.2.8', method = 'POST', path = '/issue/image/upload?x=1';
    const body = '{"a":"测试"}', ts = 1757000000;
    const r = await A.HmacSigner.sign({ method, path, body, version, timestamp: ts });
    // 独立复算
    const key = createHash('sha256').update('cosy:' + version).digest('hex');
    const lenHash = createHash('sha256').update(String(Buffer.byteLength(body))).digest('hex');
    const msg = [method, path.split('?')[0], body, version, String(ts), lenHash].join('\n');
    const expect = createHmac('sha256', Buffer.from(key, 'hex')).update(msg).digest('hex');
    assert.equal(r.timestamp, String(ts));
    assert.equal(r.signature, expect);
    // 头族形状
    const h = await A.HmacSigner.headers({ method, path, body, version, timestamp: ts });
    assert.equal(h['X-Client-Timestamp'], String(ts));
    assert.equal(h['Authorization'], 'Signature ' + expect);
  });
});

/* ============================================================
   7. VPC 端点发现映射
   ============================================================ */
describe('VPC 私有化端点发现', () => {
  test('四节点族 → 七基址映射 + 缺省回退 + otel', () => {
    const m = A.mapVpcEndpoints({
      centerNodes: ['https://center.vpc'], inferNodes: ['https://infer.vpc'],
      nesNodes: ['https://nes.vpc'], openapiNodes: ['https://openapi.vpc']
    }, 'https://user.base');
    assert.equal(m.api, 'https://openapi.vpc');
    assert.equal(m.inference, 'https://infer.vpc');
    assert.equal(m.feedback, 'https://center.vpc');
    assert.equal(m.dynamicContent, 'https://center.vpc');
    assert.equal(m.broker, 'https://openapi.vpc');
    assert.equal(m.web, 'https://center.vpc');
    assert.equal(m.telemetry, 'https://openapi.vpc/otel');
    // 缺省回退
    const m2 = A.mapVpcEndpoints({}, 'https://user.base');
    assert.equal(m2.api, 'https://user.base');
    assert.equal(m2.telemetry, 'https://user.base/otel');
  });
});

/* ============================================================
   9. 组件 ↔ 客户端集成（qm-approval / qm-session-list API 接线）
   ============================================================ */
describe('组件 ↔ MobileApi 接线', () => {
  // 同沙箱装载：api 模块先建 QoderUI，再注入 ShadowElement 桩，后装载组件族
  function loadMobileInSameSandbox() {
    const sandbox = {};
    sandbox.crypto = webcrypto;
    new Function('globalThis', src).call(sandbox, sandbox);
    sandbox.QoderCore = { escapeHtml: (s) => String(s == null ? '' : s) };
    sandbox.QoderUI.ShadowElement = class ShadowStub {
      constructor() { if (this.initStub) this.initStub(); }
      static get observedAttributes() { return []; }
      emit(type, detail) { this._events = (this._events || []); this._events.push({ type, detail }); }
      $(sel) { return null; }
      $$(sel) { return []; }
    };
    const mobileSrc = readFileSync(join(root, 'src/qoder-mobile.js'), 'utf8');
    new Function('globalThis', mobileSrc).call(sandbox, sandbox);
    return sandbox.QoderUI.Mobile.WC;
  }

  function fakeEl(Cls, attrs) {
    const inst = Object.create(Cls.prototype);
    inst.getAttribute = (k) => (k in attrs ? attrs[k] : null);
    inst.hasAttribute = (k) => k in attrs;
    inst.setAttribute = (k, v) => { attrs[k] = v; };
    inst.removeAttribute = (k) => { delete attrs[k]; };
    return inst;
  }

  test('qm-approval.api：点击允许 → control_response 直达服务端 + 状态翻 submitted', async () => {
    const WC = loadMobileInSameSandbox();
    const server = new A.MockMobileServer({ botDelay: 5 });
    const client = A.createClient({ baseUrl: 'https://mock.local', fetchImpl: server.handle(), token: 't', deviceId: 'd' });
    const s = await client.sessions.create({ title: '集成' });
    const sid = s.session_id;
    const rid = 'req-int-1';
    server.appendEvent(sid, { event_type: 'control_request', source: 'system', payload: { request_id: rid, request: { tool_name: 'BASH', details: { type: 'command', command: 'ls' } }, kind: 'EXECUTION' } });

    const El = WC['qm-approval'];
    const el = fakeEl(El, { kind: 'action', command: 'ls', state: 'pending', 'session-id': sid, 'request-id': rid });
    el.api = client;
    assert.equal(el.api, client);

    el._approve({ option: 'allow_once' });
    assert.equal(el.getAttribute('state'), 'submitting');
    // emit 仍同步派发（纯 UI 行为保留）
    assert.equal(el._events.filter((e) => e.type === 'approve').length, 1);
    // 等待 api 应答落地
    for (let i = 0; i < 50 && el.getAttribute('state') === 'submitting'; i++) await new Promise((r) => setTimeout(r, 10));
    assert.equal(el.getAttribute('state'), 'submitted');
    const page = await client.events.list(sid, {});
    const resp = page.data.filter((e) => e.event_type === 'control_response' && e.payload.request_id === rid)[0];
    assert.ok(resp, '服务端应收到 control_response');
    assert.deepEqual(resp.payload.response.response, { outcome: 'proceed_once', allowed: true, payload: { feedback: '' } });
    // api-responded 事件
    assert.ok(el._events.some((e) => e.type === 'api-responded' && e.detail.requestId === rid));
  });

  test('qm-approval.api：计划评审卡 spec→批准 / 拒绝带 feedback', async () => {
    const WC = loadMobileInSameSandbox();
    const server = new A.MockMobileServer({ botDelay: 5 });
    const client = A.createClient({ baseUrl: 'https://mock.local', fetchImpl: server.handle() });
    const s = await client.sessions.create({ title: '计划' });
    const sid = s.session_id;
    const El = WC['qm-approval'];
    const el = fakeEl(El, { kind: 'plan', state: 'pending', 'session-id': sid, 'request-id': 'plan-1' });
    el.api = client;
    el._approve({ option: 'spec' });
    for (let i = 0; i < 50 && el.getAttribute('state') === 'submitting'; i++) await new Promise((r) => setTimeout(r, 10));
    assert.equal(el.getAttribute('state'), 'submitted');
    const page = await client.events.list(sid, {});
    const resp = page.data.filter((e) => e.event_type === 'control_response' && e.payload.request_id === 'plan-1')[0];
    assert.deepEqual(resp.payload.response.response, { approved: true, permissionMode: 'default' });
  });

  test('qm-approval 无 api 时保持纯 UI 行为（不触网）', () => {
    const WC = loadMobileInSameSandbox();
    const El = WC['qm-approval'];
    const el = fakeEl(El, { kind: 'action', state: 'pending' });
    el._approve({ option: 'allow' });
    assert.equal(el._events.filter((e) => e.type === 'approve').length, 1);
    assert.equal(el.getAttribute('state'), 'pending');
  });

  test('qm-session-list.api：loadSessions 数据驱动渲染 + rename 同步 control 面', async () => {
    const WC = loadMobileInSameSandbox();
    const server = new A.MockMobileServer({ botDelay: 5 });
    const client = A.createClient({ baseUrl: 'https://mock.local', fetchImpl: server.handle() });
    await client.sessions.create({ title: '任务甲' });
    const s2 = await client.sessions.create({ title: '任务乙' });
    server._settleStatus(s2.session_id, 'completed');

    const El = WC['qm-session-list'];
    const el = fakeEl(El, {});
    el.api = client;
    const cards = await el.loadSessions();
    assert.equal(cards.length, 2);
    assert.ok(el._events.some((e) => e.type === 'sessions-loaded' && e.detail.count === 2));
    const rendered = JSON.parse(el.getAttribute('sessions'));
    assert.equal(rendered[0].title, '任务甲');
    assert.equal(rendered[0].status, 'idle'); // queued → idle
    assert.equal(rendered[1].status, 'closed'); // completed → closed
    // rename 走 api.control.rename
    const el2 = fakeEl(El, { renaming: s2.session_id });
    el2.api = client;
    // 模拟 _bind 中 rename OK 回调逻辑
    el2.emit('rename', { id: s2.session_id, title: '新名字乙' });
    await client.control.rename(s2.session_id, '新名字乙');
    const page = await client.events.list(s2.session_id, {});
    const ren = page.data.filter((e) => e.event_type === 'control_request' && e.payload.request.subtype === 'session_title_changed')[0];
    assert.ok(ren, '改名指令应到达服务端');
    assert.equal(ren.payload.request.title, '新名字乙');
  });
});

/* ============================================================
   8. Mock 后端全闭环（会话→SSE→消息→审批→结果→回合结束）
   ============================================================ */
describe('Mock 后端 + 契约客户端全闭环', () => {
  function makePair() {
    const server = new A.MockMobileServer({ botDelay: 5 });
    const client = A.createClient({ baseUrl: 'https://mock.local', fetchImpl: server.handle(), token: 'tok-1', deviceId: 'dev-1' });
    return { server, client };
  }

  test('创建会话 → 环境列表 → SSE 流 → 消息 → 审批 → 完成', async () => {
    const { server, client } = makePair();
    // 头族断言
    await client.environments.list();
    assert.equal(server.lastRequest.headers['Authorization'], 'Bearer tok-1');
    assert.equal(server.lastRequest.headers['X-Qoder-Mobile-Device-Id'], 'dev-1');

    const envs = await client.environments.list();
    assert.equal(envs.length, 1);
    assert.equal(envs[0].bridge_info.machine_name, 'My-MacBook-Pro');

    const created = await client.sessions.create({ title: '逆向任务', environmentId: envs[0].id });
    const sid = created.session_id;
    assert.ok(sid);

    // sash 子域头族
    await client.github.connected({});
    assert.equal(server.lastRequest.headers['x-qoder-appid'], A.APP_ID);

    const seen = [];
    const ctl = new AbortController();
    let pendingRid = null;
    const streamP = client.events.stream(sid, {
      signal: ctl.signal, fromSequenceNum: 0,
      onEvent: (e) => {
        seen.push(e);
        if (e.event_type === 'control_request') pendingRid = e.payload.request_id;
        return true;
      }
    });

    await client.events.sendUserMessage(sid, '列出文件');
    for (let i = 0; i < 50 && !pendingRid; i++) await new Promise((r) => setTimeout(r, 10));
    assert.ok(pendingRid, '应收到工具审批 control_request');

    await client.control.respondToolApproval(sid, pendingRid, { outcome: 'proceed_once' });
    for (let i = 0; i < 80 && seen.filter((e) => e.event_type === 'message' && e.payload.stopReason === 'end_turn').length === 0; i++) {
      await new Promise((r) => setTimeout(r, 10));
    }
    ctl.abort();
    const done = await streamP;
    assert.equal(done.reason, 'aborted');

    const types = seen.map((e) => e.event_type);
    assert.ok(types.includes('message'), '应有回执消息');
    assert.ok(types.includes('tool_use'), '应有工具卡');
    assert.ok(types.includes('control_request'), '应有审批');
    assert.ok(types.includes('control_response'), '应有应答回执');
    assert.ok(types.includes('tool_result'), '应有工具结果');
    const finalMsg = seen.filter((e) => e.event_type === 'message' && e.payload.stopReason === 'end_turn')[0];
    assert.ok(finalMsg, '应以 end_turn 收尾');
    // 事件信封完整性
    for (const e of seen) {
      for (const k of ['event_id', 'session_id', 'sequence_num', 'source', 'event_type', 'payload', 'created_at', 'ephemeral']) {
        assert.ok(k in e, '信封缺字段 ' + k);
      }
    }
  });

  test('会话 CRUD + read/unread/archive + 列表适配 active/closed', async () => {
    const { server, client } = makePair();
    const s1 = await client.sessions.create({ title: '甲' });
    const s2 = await client.sessions.create({ title: '乙' });
    await client.sessions.markUnread(s1.session_id);
    let list = await client.sessions.list();
    const raw1 = list.data.filter((x) => x.session_id === s1.session_id)[0];
    assert.equal(raw1.unread, true);
    await client.sessions.markRead(s1.session_id);
    list = await client.sessions.list();
    assert.equal(list.data.filter((x) => x.session_id === s1.session_id)[0].unread, false);
    // 状态适配：queued → idle；completed → closed（六态映射，复用既有 i18n 键）
    const cardQueued = client.sessions.toCard(list.data[0]);
    assert.equal(cardQueued.status, 'idle');
    server._settleStatus(s2.session_id, 'completed');
    const list2 = await client.sessions.list();
    const card2 = client.sessions.toCard(list2.data.filter((x) => x.session_id === s2.session_id)[0]);
    assert.equal(card2.status, 'closed');
    // 删除
    await client.sessions.remove(s1.session_id);
    const list3 = await client.sessions.list();
    assert.equal(list3.data.filter((x) => x.session_id === s1.session_id).length, 0);
  });

  test('控制面其余指令 + 事件分页 + 产物/沙箱/设备/推送/更新链路', async () => {
    const { server, client } = makePair();
    const s = await client.sessions.create({ title: '控' });
    const sid = s.session_id;
    // 控制指令直达服务端（事件流可读回）
    await client.control.rename(sid, '改名任务');
    await client.control.setModel(sid, 'flagship');
    await client.control.setPermissionMode(sid, 'plan');
    await client.control.interrupt(sid);
    await client.control.endSession(sid);
    await client.control.prepareArtifact(sid, 'a.html');
    const page = await client.events.list(sid, { limit: 100 });
    const subtypes = page.data.filter((e) => e.event_type === 'control_request').map((e) => e.payload.request.subtype);
    assert.deepEqual(subtypes, ['session_title_changed', 'set_model', 'set_permission_mode', 'interrupt', 'end_session', 'prepare_artifact']);
    assert.equal(page.has_more, false);
    // 产物 presign + 沙箱授权
    const dl = await client.artifacts.downloadUrl(sid, { path: 'a.html' });
    assert.ok(dl.presign_url.startsWith('https://'));
    const grant = await client.sandbox.grant(sid, { sessionId: sid, port: 3000 });
    assert.ok(grant.grant && grant.url && grant.expires_at);
    // 设备注册 + 推送 token + 通知四开关
    const dev = await client.devices.register({ mobile_device_id: 'mid-1', platform: 'android', device_name: 'Test' });
    assert.ok(dev.id);
    const pt = await client.pushTokens.set('mid-1', { provider: 'umeng', token: 'tkn', locale: 'zh-CN' });
    assert.ok(pt.id);
    const cfg = await client.notificationConfigs.get(dev.id);
    assert.deepEqual(cfg, { task_completed: true, qa: true, ask_permission: true, plan_review: true });
    await client.notificationConfigs.put(dev.id, { task_completed: false, qa: true, ask_permission: true, plan_review: false });
    const cfg2 = await client.notificationConfigs.get(dev.id);
    assert.equal(cfg2.task_completed, false);
    // 更新检查 + 用户面
    const upd = await client.update.check({ platform: 'android' });
    assert.equal(upd.has_update, false);
    const usage = await client.user.usage();
    assert.ok(usage.credits != null);
    // 错误路径 → QoderApiError
    await assert.rejects(() => client._request('GET', '/api/v1/not/exist'), (e) => e.name === 'QoderApiError' && e.status === 404);
  });

  test('SSE 断线重连：from_sequence_num 续传不丢事件', async () => {
    const { server, client } = makePair();
    const s = await client.sessions.create({ title: '续传' });
    const sid = s.session_id;
    // 先注入 2 条历史
    server.appendEvent(sid, { event_type: 'message', source: 'user', payload: { content: [{ type: 'text', text: '历史1' }] } });
    server.appendEvent(sid, { event_type: 'message', source: 'assistant', payload: { content: [{ type: 'text', text: '历史2' }] } });
    const seen = [];
    const ctl = new AbortController();
    const p = client.events.stream(sid, { signal: ctl.signal, fromSequenceNum: 0, onEvent: (e) => { seen.push(e); return true; } });
    await new Promise((r) => setTimeout(r, 60));
    // 流中追加 → 实时可达
    server.appendEvent(sid, { event_type: 'message', source: 'assistant', payload: { content: [{ type: 'text', text: '实时' }] } });
    await new Promise((r) => setTimeout(r, 60));
    ctl.abort();
    await p;
    const texts = seen.map((e) => A.extractText(e.payload));
    assert.deepEqual(texts, ['历史1', '历史2', '实时']);
    // 续传：from_sequence_num=2 只拿增量
    const seen2 = [];
    const ctl2 = new AbortController();
    const p2 = client.events.stream(sid, { signal: ctl2.signal, fromSequenceNum: 2, onEvent: (e) => { seen2.push(e); return true; } });
    await new Promise((r) => setTimeout(r, 60));
    ctl2.abort();
    await p2;
    assert.deepEqual(seen2.map((e) => A.extractText(e.payload)), ['实时']);
  });

  test('系统事件流 + emitSystem 广播', async () => {
    const { server, client } = makePair();
    const seen = [];
    const ctl = new AbortController();
    const p = client.system.stream({ signal: ctl.signal, onEvent: (e) => { seen.push(e); return true; } });
    await new Promise((r) => setTimeout(r, 50));
    server.emitSystem('session.created', { session_id: 'x' });
    server.emitSystem('task.live_activity', { state: 'running' });
    await new Promise((r) => setTimeout(r, 50));
    ctl.abort();
    await p;
    assert.deepEqual(seen.map((e) => e.event_type), ['session.created', 'task.live_activity']);
  });
});
