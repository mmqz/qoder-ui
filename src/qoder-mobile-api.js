/* ============================================================
   Qoder Mobile API 客户端层（v3.10.0 安卓端契约对齐版）
   ============================================================
   依据《Qoder 安卓端连接架构逆向报告》（docs/mobile-connectivity-report.md）
   与《Qoder 安卓端代码能力完全解析》（docs/android-capability-map.md）
   + 机器可读契约 docs/android-api-contract.json（45 端点 / 103 DTO 线格式 /
   控制面 7 subtype / 三类审批应答体 / HMAC 签名规格），将逆向结论落成
   可运行的前端代码——自建 Rust/TS 后端即插即用的官方契约客户端。

   六层结构：
   1. ENDPOINTS   —— 45 条端点目录（与契约 JSON 逐字一致，测试对账）
   2. ENUMS/WIRE  —— 19 组枚举 + 精选 DTO 线格式（snake↔camel 双向映射）
   3. MobileClient —— REST + SSE 客户端（Last-Event-ID 续传 / from_sequence_num
                      / X-Gw 路由头族 / x-qoder-appid / Bearer 设备令牌）
   4. control     —— 控制面构造器（7 subtype + 三类审批应答体 + 选项归一）
   5. events      —— 会话事件语义（信封校验 / role 派生 / 文本提取兜底链 /
                      工具状态归一 / 风险分组 / SSE 帧解析）
   6. SyncStore   —— 六源混合同步（CACHE_RESTORE / REST_FULL / REST_INCREMENTAL
                      / OLDER_BACKFILL / SSE_INCREMENTAL / DERIVED_STATE，
                      display_key 去重 + @occurrence:n）
   附: HmacSigner（反馈子域签名全规格）+ MockMobileServer（内存后端，
      会话/事件/审批闭环脚本，供演示与测试，零网络依赖）

   无 DOM 顶层调用（SSR 安全）；Node 18+ 与浏览器同构（fetch/ReadableStream/
   WebCrypto 全局探测）。零第三方依赖。
   ============================================================ */
(function () {
  'use strict';

  var G = typeof globalThis !== 'undefined' ? globalThis : {};
  var QI = ((typeof window !== 'undefined' ? window : G).QoderUI) || (G.QoderUI = {});

  /* ============================================================
     §0 工具
     ============================================================ */

  function uuid() {
    var c = G.crypto;
    if (c && typeof c.randomUUID === 'function') return c.randomUUID();
    // RFC4122 v4 手工回退（crypto.getRandomValues 缺失时用 Math.random 兜底）
    var b = new Array(16);
    if (c && c.getRandomValues) c.getRandomValues(new Uint8Array(16));
    for (var i = 0; i < 16; i++) {
      if (c && c.getRandomValues) { /* 已填充 */ }
      b[i] = Math.floor(Math.random() * 256);
    }
    if (c && c.getRandomValues) {
      var r = new Uint8Array(16); c.getRandomValues(r);
      for (var j = 0; j < 16; j++) b[j] = r[j];
    }
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    var h = '0123456789abcdef', out = '';
    for (var k = 0; k < 16; k++) {
      if (k === 4 || k === 6 || k === 8 || k === 10) out += '-';
      out += h[b[k] >> 4] + h[b[k] & 15];
    }
    return out;
  }

  function snakeToCamel(s) {
    return s.indexOf('_') < 0 ? s : s.replace(/_([a-zA-Z0-9])/g, function (_, c) { return c.toUpperCase(); });
  }
  function camelToSnake(s) {
    return s.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
  }
  function deepCamel(obj) {
    if (Array.isArray(obj)) return obj.map(deepCamel);
    if (obj && typeof obj === 'object') {
      var out = {};
      for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out[snakeToCamel(k)] = deepCamel(obj[k]);
      return out;
    }
    return obj;
  }

  function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

  /* ============================================================
     §1 端点目录（45 条，与 docs/android-api-contract.json 逐字一致）
     ============================================================ */

  var ENDPOINTS = [
    { method: 'POST', path: '/api/v1/remote/sessions/', domain: 'sessions' },
    { method: 'GET', path: '/api/v1/remote/sessions/', domain: 'sessions' },
    { method: 'DELETE', path: '/api/v1/remote/sessions/{id}', domain: 'sessions' },
    { method: 'POST', path: '/api/v1/remote/sessions/{id}/read', domain: 'sessions' },
    { method: 'POST', path: '/api/v1/remote/sessions/{id}/unread', domain: 'sessions' },
    { method: 'POST', path: '/api/v1/remote/sessions/{id}/archive', domain: 'sessions' },
    { method: 'POST', path: '/api/v1/remote/sessions/{id}/events', domain: 'sessions' },
    { method: 'GET', path: '/api/v1/remote/sessions/{id}/events', domain: 'sessions' },
    { method: 'GET SSE', path: '/api/v1/remote/sessions/{id}/events/stream', domain: 'sessions' },
    { method: 'GET', path: '/api/v1/remote/sessions/{id}/artifacts', domain: 'artifacts' },
    { method: 'POST', path: '/api/v1/remote/sessions/{id}/artifacts/download-url', domain: 'artifacts' },
    { method: 'POST', path: '/api/v1/remote/sessions/{id}/sandbox/grants', domain: 'sandbox' },
    { method: 'GET SSE', path: '/api/v1/remote/system-events/stream', domain: 'system' },
    { method: 'GET', path: '/api/v1/remote/environments', domain: 'environments' },
    { method: 'POST', path: '/app/auth/token', domain: 'auth' },
    { method: 'POST', path: '/app/auth/logout', domain: 'auth' },
    { method: 'POST', path: '/app/auth/aliyun-ram/init', domain: 'auth' },
    { method: 'POST', path: '/app/auth/aliyun/callback', domain: 'auth' },
    { method: 'POST', path: '/api/v1/me/verificationCodes', domain: 'auth' },
    { method: 'GET', path: '/api/v1/userinfo', domain: 'user' },
    { method: 'GET', path: '/api/v1/me/usage', domain: 'user' },
    { method: 'GET', path: '/api/v1/me/plan', domain: 'user' },
    { method: 'POST', path: '/api/v1/mobile/me/devices/', domain: 'device' },
    { method: 'POST', path: '/api/v1/mobile/me/devices/{id}/bind', domain: 'device' },
    { method: 'POST', path: '/api/v1/mobile/devices/', domain: 'device' },
    { method: 'POST', path: '/api/v1/mobile/devices/{mobile_device_id}/push-tokens', domain: 'push' },
    { method: 'DELETE', path: '/api/v1/mobile/devices/{mobile_device_id}/push-tokens/{push_token_id}', domain: 'push' },
    { method: 'GET/PUT', path: '/api/v1/mobile/devices/{id}/configs/notification', domain: 'push' },
    { method: 'GET', path: '/api/v1/mobile/app-versions/check', domain: 'update' },
    { method: 'WS', path: '/api/v2/service/ws/asr', domain: 'voice' },
    { method: 'POST', path: '/api/v1/raw/upload', domain: 'upload' },
    { method: 'POST', path: '/api/v1/mix/upload', domain: 'upload' },
    { method: 'POST', path: '/sash/api/v1/mobile/me/integrations/github/authorization-url', domain: 'github' },
    { method: 'POST', path: '/sash/api/v1/mobile/me/integrations/github/install-url', domain: 'github' },
    { method: 'POST', path: '/sash/api/v1/mobile/me/integrations/github/connected', domain: 'github' },
    { method: 'POST', path: '/sash/api/v1/mobile/me/integrations/github/disconnect', domain: 'github' },
    { method: 'POST', path: '/sash/api/v1/glasses/pairings', domain: 'glasses' },
    { method: 'POST', path: '/sash/api/v1/glasses/pairings/{id}/approve', domain: 'glasses' },
    { method: 'POST', path: '/sash/api/v1/glasses/pairings/{id}/cancel', domain: 'glasses' },
    { method: 'GET', path: '/issue/oss/policy', domain: 'feedback' },
    { method: 'POST', path: '/issue/image/upload', domain: 'feedback' },
    { method: 'POST', path: '/issue/file/diagnose/upload', domain: 'feedback' },
    { method: 'POST', path: '/api/v1/remote/sessions/…/generate-title-and-branch', domain: 'sessions' },
    { method: 'POST', path: '/api/crashsdk/validate', domain: 'telemetry' },
    { method: 'POST', path: '/api/v1/crashtrack/upload', domain: 'telemetry' }
  ];

  /* ============================================================
     §2 基址 / 区域 / 请求头常量（§连接架构逆向实证）
     ============================================================ */

  var DEFAULT_BASE_URLS = {
    api: 'https://openapi.qoder.com.cn',       // /api/... 主 REST
    inference: 'https://gateway.qoder.com.cn', // 推理/网关
    web: 'https://qoder.com.cn'                // Web
  };

  var REGION = { OFFICIAL_DEFAULT: 'OFFICIAL_DEFAULT', VPC: 'VPC' }; // D3
  var APP_ID = 'c23680aa-aa43-4e55-9a1e-146c6d752cdd'; // x-qoder-appid / PKCE client_id

  var HEADER = {
    AUTH: 'Authorization',
    ROUTE: 'X-GwRoute-Token',
    ROUTE_USER: 'X-Gw-User-Id',
    DEVICE: 'X-Qoder-Mobile-Device-Id',
    APPID: 'x-qoder-appid',
    CLIENT_TS: 'X-Client-Timestamp',
    LAST_EVENT_ID: 'Last-Event-ID'
  };

  // VPC 端点发现协议（§六 实证）：四节点族 → 基址映射；缺省回退用户 baseURL
  function mapVpcEndpoints(resp, fallbackBase) {
    var base = fallbackBase || DEFAULT_BASE_URLS.api;
    var r = resp || {};
    var first = function (a) { return a && a.length ? a[0] : null; };
    var center = first(r.centerNodes), infer = first(r.inferNodes), openapi = first(r.openapiNodes);
    return {
      region: REGION.VPC,
      api: openapi || base,
      inference: infer || base,
      web: center || base,
      feedback: center || base,          // centerNodes → feedbackBaseURL
      dynamicContent: center || base,    // centerNodes → dynamicContentBaseURL
      broker: openapi || base,           // openapiNodes → brokerBaseURL
      nes: first(r.nesNodes) || base,    // nesNodes 手机侧未消费，留待桌面侧
      telemetry: (openapi || base) + '/otel' // OpenTelemetry 接收器
    };
  }

  /* ============================================================
     §3 枚举（19 组，契约 enums 全量）
     ============================================================ */

  var ENUMS = {
    SESSION_STATUS: ['queued', 'running', 'waiting_for_approval', 'completed', 'failed', 'cancelled'],
    WORKER_STATUS: ['working', 'idle'],
    CONNECTION_STATUS: ['connected', 'disconnected'],
    APPROVAL_STATUS: ['PENDING', 'APPROVED', 'REJECTED'],
    APPROVAL_KIND: ['GENERIC', 'EXECUTION', 'PLAN_REVIEW'],
    TOOL_RISK_GROUP: ['WRITE', 'EDIT', 'READ', 'RAN'],
    TOOL_TYPES: ['FILE_EDIT', 'FILE_WRITE', 'FILE_READ', 'BASH', 'MCP', 'SEARCH', 'WEB_SEARCH', 'WEB_FETCH', 'UPDATE_TODOS', 'SUB_AGENT', 'IMAGE_GEN', 'SKILL', 'ENTER_PLAN_MODE', 'GENERIC'],
    PERMISSION_MODES: ['default', 'acceptEdits', 'plan', 'bypassPermissions'],
    IDE_SESSION_MODE: ['agent', 'experts'],
    ARTIFACT_TYPE: ['FOLDER', 'CODE', 'HTML', 'MARKDOWN', 'IMAGE', 'AUDIO', 'VIDEO', 'TEXT', 'ARCHIVE', 'PDF', 'DOCUMENT', 'SPREADSHEET', 'PRESENTATION', 'FILE'],
    CONTENT_TYPE: ['TEXT', 'MARKDOWN', 'IMAGE', 'ANIMATED_IMAGE', 'PDF', 'AUDIO', 'VIDEO', 'HTML', 'EXTERNAL_DOCUMENT', 'UNSUPPORTED'],
    ENV_META_VISIBILITY: ['INTERNAL', 'EXTERNAL_OPEN', 'RESTRICTED', 'DISABLED'],
    NAV_TABS: ['WORKSPACE', 'CHATS', 'CLOUD'],
    LIST_SORT: ['DATE', 'STATUS', 'PROJECT'],
    ARTIFACT_DOWNLOAD: ['CLOUD_PATH_PRESIGN', 'PREPARED'],
    UPDATE_QUEUE: ['DISPLAYED', 'DUPLICATE', 'HOST_INACTIVE', 'QUEUED', 'QUEUE_FULL'],
    REGION: ['OFFICIAL_DEFAULT', 'VPC'],
    SYSTEM_EVENT_TYPES: ['session.created', 'session.updated', 'environment.created', 'environment.updated', 'task.live_activity', 'notification'],
    EVENT_TYPES: ['message', 'tool_use', 'tool_result', 'control_request', 'control_response', 'control_cancel', 'control_cancel_request']
  };

  /* ============================================================
     §4 DTO 线格式映射（契约 dto_wire_fields 精选 13 个，测试对账；
     VPC 端点发现为协议结构非 Moshi DTO，见 mapVpcEndpoints）
     wire 数组 = 服务端线格式字段序（Moshi @Json 线名）
     ============================================================ */

  var WIRE = {
    ControlSessionDTO: ['session_id', 'title', 'machine_name', 'runner_type', 'origin', 'connection_status', 'session_status', 'worker_status', 'current_worker_epoch', 'last_heartbeat_at', 'last_end_turn_at', 'environment_id', 'environment_type', 'environment_name', 'created_at', 'updated_at', 'unread', 'pinned', 'external_metadata', 'session_context'],
    SessionEventDTO: ['event_id', 'session_id', 'sequence_num', 'source', 'event_type', 'payload', 'created_at', 'ephemeral'],
    CreateSessionRequest: ['title', 'environment_id', 'origin', 'origin_ref_id', 'session_context', 'resources', 'device_context'],
    EnvironmentDTO: ['id', 'type', 'bridge_info', 'metadata', 'connection_status', 'disabled', 'max_sessions', 'session_count', 'created_at'],
    RegisterDeviceRequestDTO: ['mobile_device_id'],
    PushTokenRequestDTO: ['token', 'locale'],
    NotificationConfigDTO: ['task_completed', 'qa', 'ask_permission', 'plan_review'],
    ArtifactListResponse: ['data', 'has_more'],
    ArtifactDownloadURLRequest: ['path'],
    ArtifactDownloadURLResponse: ['download_url', 'presigned_url', 'presign_url', 'download_expires_at'],
    SandboxPreviewGrantRequest: ['session_id', 'port'],
    SandboxPreviewGrantResponse: ['url', 'grant', 'expires_at'],
    StoredSession: ['userId', 'userName', 'userUsername', 'userAvatarUrl', 'userEmail', 'userOrganizationId', 'userOrganizationName', 'userStaffId', 'accessToken', 'refreshToken', 'expiresAt', 'refreshTokenExpiresAt', 'serviceAccess']
  };

  // dto → { camelKey: wireName }（ StoredSession 线名本就是 camel，恒等映射）
  var WIRE_INDEX = {};
  (function () {
    for (var name in WIRE) if (Object.prototype.hasOwnProperty.call(WIRE, name)) {
      var idx = {};
      WIRE[name].forEach(function (w) { idx[snakeToCamel(w)] = w; });
      WIRE_INDEX[name] = idx;
    }
  })();

  // wire → camel（浅映射：已知字段转换，未知字段原样透传）
  function fromWire(dtoName, obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var idx = WIRE_INDEX[dtoName] || {};
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out[idx[k] || snakeToCamel(k)] = obj[k];
    return out;
  }
  // camel → wire（浅映射：仅映射已知字段，未知字段原样透传）
  function toWire(dtoName, obj) {
    if (!obj || typeof obj !== 'object') return obj;
    var idx = WIRE_INDEX[dtoName] || {};
    var out = {};
    for (var k in obj) if (Object.prototype.hasOwnProperty.call(obj, k)) out[idx[k] || k] = obj[k];
    return out;
  }

  /* ============================================================
     §5 会话事件语义（§四 实证）
     ============================================================ */

  var EVENT_TYPES = ENUMS.EVENT_TYPES;

  // role 由 source 派生：user/controller→用户(控制器)；assistant/worker→AI(执行器)；system→系统
  function deriveRole(source) {
    var s = String(source || '').toLowerCase();
    if (s === 'user' || s === 'controller') return 'user';
    if (s === 'assistant' || s === 'worker') return 'assistant';
    return 'system';
  }

  // 工具状态四态同义词归一（running/pending/completed/failed）
  function normalizeToolStatus(s) {
    var v = String(s || '').toLowerCase();
    if (v === 'running' || v === 'in_progress' || v === 'started') return 'running';
    if (v === 'pending' || v === 'waiting' || v === 'scheduled') return 'pending';
    if (v === 'completed' || v === 'success' || v === 'succeeded' || v === 'ok' || v === 'done') return 'completed';
    if (v === 'failed' || v === 'error' || v === 'failure') return 'failed';
    return '';
  }

  // message 文本提取：content 块数组 → text 块拼接；流式兜底链 delta → response.text → output.text → chunk → text
  function extractText(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var c = payload.content;
    if (Array.isArray(c)) {
      var parts = [];
      for (var i = 0; i < c.length; i++) {
        var b = c[i];
        if (!b || typeof b !== 'object') { if (typeof b === 'string') parts.push(b); continue; }
        var t = String(b.type || 'text').toLowerCase();
        if (t === 'text' && typeof b.text === 'string') parts.push(b.text);
      }
      if (parts.length) return parts.join('');
    } else if (typeof c === 'string' && c) {
      return c;
    }
    return payload.delta || payload['response.text'] || payload['output.text'] || payload.chunk || payload.text || '';
  }

  // 工具命令提取：command / rootCommand / cmd 三键（审批卡 §4.2）
  function extractCommand(payload) {
    if (!payload || typeof payload !== 'object') return '';
    var r = payload.request || payload;
    var d = r.details || {};
    return d.command || d.rootCommand || d.cmd || r.command || r.rootCommand || r.cmd || payload.command || payload.rootCommand || payload.cmd || '';
  }

  // 风险分组 Y3{WRITE,EDIT,READ,RAN}（BASH 系→RAN，其余按工具类型直映射；未列类型保守归 WRITE）
  function riskGroup(toolType) {
    var t = String(toolType || '').toUpperCase();
    if (t === 'BASH') return 'RAN';
    if (t === 'FILE_EDIT') return 'EDIT';
    if (t === 'FILE_WRITE' || t === 'IMAGE_GEN') return 'WRITE';
    if (t === 'FILE_READ' || t === 'SEARCH' || t === 'WEB_SEARCH' || t === 'WEB_FETCH') return 'READ';
    if (t === 'MCP' || t === 'SUB_AGENT' || t === 'SKILL') return 'RAN';
    return 'WRITE';
  }

  function isEndTurn(payload) { return !!payload && payload.stopReason === 'end_turn'; }
  function isInterrupt(payload) { return !!payload && !!payload['system.interrupt']; }

  // AskUser 识别（ask_user/askuserquestion 工具名）
  function isAskUser(payload) {
    if (!payload) return false;
    var r = payload.request || {};
    var names = [payload.tool_name, r.tool_name, r.name].map(function (x) { return String(x || '').toLowerCase(); });
    return names.indexOf('ask_user') >= 0 || names.indexOf('askuserquestion') >= 0;
  }

  // 审批卡 kind 识别（K0）：planContent→PLAN_REVIEW；ask_user→AskUser；否则 payload.kind
  function approvalKind(payload) {
    if (!payload) return null;
    if (isAskUser(payload)) return 'ASK_USER';
    var k = payload.kind || (payload.request && payload.request.kind);
    if (k === 'PLAN_REVIEW' || payload.planContent || (payload.request && payload.request.planContent)) return 'PLAN_REVIEW';
    if (k === 'GENERIC' || k === 'EXECUTION') return k;
    return k || 'GENERIC';
  }

  // 审批选项归一：proceed_always_and_save/server/tool → proceed_always
  function normalizeOutcome(raw) {
    var v = String(raw || '');
    if (v === 'proceed_always_and_save' || v === 'proceed_always_server' || v === 'proceed_always_tool') return 'proceed_always';
    return v;
  }

  // SSE 帧解析：按 \n\n 切帧，id:/event:/data: 三行；返回解析出的事件与剩余缓冲
  function parseSseChunk(buf) {
    var events = [], rest = buf, idx;
    while ((idx = buf.indexOf('\n\n')) >= 0) {
      var frame = buf.slice(0, idx);
      buf = buf.slice(idx + 2);
      var ev = { id: null, event: null, data: null };
      var lines = frame.split('\n'), dataLines = [];
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (line.slice(0, 3) === 'id:') ev.id = line.slice(3).trim();
        else if (line.slice(0, 6) === 'event:') ev.event = line.slice(6).trim();
        else if (line.slice(0, 5) === 'data:') dataLines.push(line.slice(5).trim());
      }
      if (dataLines.length) {
        var raw = dataLines.join('\n');
        try { ev.data = JSON.parse(raw); } catch (e) { ev.data = raw; }
      }
      events.push(ev);
    }
    rest = buf;
    return { events: events, rest: rest };
  }

  function sseFrame(evt) {
    return 'id: ' + (evt.event_id || '') + '\nevent: ' + (evt.event_type || '') + '\ndata: ' + JSON.stringify(evt) + '\n\n';
  }

  /* ============================================================
     §6 控制面构造器（§4.3 七 subtype + §4.2 三类审批应答体）
     POST {id}/events body {"events":[ ... ]}
     ============================================================ */

  function controlRequestBody(events) { return { events: events }; }

  function controlRequest(subtype, requestExtra) {
    var rid = uuid();
    var req = requestExtra || {};
    req.subtype = subtype;
    return {
      event_type: 'control_request',
      payload: { type: 'control_request', request_id: rid, request: req, uuid: 'control-request:' + rid }
    };
  }

  var control = {
    // 打断当前回合
    interrupt: function () { return controlRequest('interrupt'); },
    // 结束会话 reason 默认 user_requested
    endSession: function (reason) { return controlRequest('end_session', { reason: reason || 'user_requested' }); },
    // 切换模型
    setModel: function (model) { return controlRequest('set_model', { model: model }); },
    // 切换权限模式 default|acceptEdits|plan|bypassPermissions
    setPermissionMode: function (mode) {
      if (ENUMS.PERMISSION_MODES.indexOf(mode) < 0) throw new Error('非法权限模式: ' + mode + '（合法: ' + ENUMS.PERMISSION_MODES.join('|') + '）');
      return controlRequest('set_permission_mode', { mode: mode });
    },
    // 会话改名 title ≤255，source=custom
    rename: function (title) {
      if (typeof title !== 'string' || !title.length || title.length > 255) throw new Error('title 必须为 1-255 字符');
      return controlRequest('session_title_changed', { title: title, source: 'custom' });
    },
    // 请求准备产物
    prepareArtifact: function (path) { return controlRequest('prepare_artifact', { path: path }); },
    // 撤销未决审批（targetRequestId = 被撤销的 control_request 的 request_id）
    cancelRequest: function (targetRequestId) {
      var rid = uuid();
      return {
        event_type: 'control_request',
        payload: {
          type: 'control_request', request_id: rid,
          request: { subtype: 'control_cancel_request', request_id: targetRequestId, uuid: 'control-cancel-request:' + targetRequestId },
          uuid: 'control-request:' + rid
        }
      };
    },
    // —— 三类审批应答（control_response 信封：{response:{subtype:'success', request_id, response:{...}}}）——
    // 工具审批：{outcome: proceed_once|proceed_always|cancel|reject, allowed, payload:{feedback}}
    respondToolApproval: function (requestId, opts) {
      opts = opts || {};
      var outcome = normalizeOutcome(opts.outcome || 'proceed_once');
      var allowed = typeof opts.allowed === 'boolean' ? opts.allowed : (outcome === 'proceed_once' || outcome === 'proceed_always');
      var answer = { outcome: outcome, allowed: allowed, payload: { feedback: opts.feedback || '' } };
      return controlResponse(requestId, answer);
    },
    // 计划评审：批准 {approved:true, permissionMode:'default'}；拒绝 {approved:false, feedback}
    respondPlanReview: function (requestId, opts) {
      opts = opts || {};
      var approved = !!opts.approved;
      var answer = approved ? { approved: true, permissionMode: opts.permissionMode || 'default' } : { approved: false, feedback: opts.feedback || '' };
      return controlResponse(requestId, answer);
    },
    // AskUser：{outcome:'proceed_once', allowed:true, payload:{answers:{<问题ID>:<答案>}}}
    respondAskUser: function (requestId, answers) {
      var answer = { outcome: 'proceed_once', allowed: true, payload: { answers: answers || {} } };
      return controlResponse(requestId, answer);
    }
  };

  function controlResponse(requestId, answer) {
    return {
      event_type: 'control_response',
      payload: { type: 'control_response', request_id: requestId, response: { subtype: 'success', request_id: requestId, response: answer } }
    };
  }

  /* ============================================================
     §7 六源混合同步 SyncStore（§3.4 Y6.W1 实证）
     ============================================================ */

  var SYNC_SOURCES = ['CACHE_RESTORE', 'REST_FULL', 'REST_INCREMENTAL', 'OLDER_BACKFILL', 'SSE_INCREMENTAL', 'DERIVED_STATE'];

  function SyncStore() {
    this._items = [];            // 按 sequence_num 升序
    this._byId = new Map();      // event_id → item
    this._occ = new Map();       // display_key → 已出现次数
    this._lastSeq = 0;
    this._optimistic = new Map();// clientId → item（待服务端回执替换）
    this._approvals = new Map(); // request_id → {requestId, kind, status, payload}
  }

  SyncStore.prototype.SOURCES = SYNC_SOURCES;

  // display_key：event_id 优先，缺省 session_id:sequence_num；冲突且内容不同 → @occurrence:n
  SyncStore.prototype._displayKey = function (evt) {
    var base = evt.event_id || (evt.session_id + ':' + evt.sequence_num);
    var n = (this._occ.get(base) || 0) + 1;
    if (n > 1) {
      // 同 base 重复：event_id 相同视为重放去重，不同视为新渲染项
      if (this._byId.has(evt.event_id)) return null;
      this._occ.set(base, n);
      return base + '@occurrence:' + n;
    }
    this._occ.set(base, n);
    return base;
  };

  SyncStore.prototype._insert = function (evt, source) {
    if (!evt || !evt.event_type) return false;
    var key = this._displayKey(evt);
    if (!key) return false; // 重放/重复
    var item = { key: key, source: source, event: evt, seq: typeof evt.sequence_num === 'number' ? evt.sequence_num : 0 };
    this._items.push(item);
    if (evt.event_id) this._byId.set(evt.event_id, item);
    if (item.seq > this._lastSeq) this._lastSeq = item.seq;
    this._replaceOptimistic(evt);

    // 审批队列：control_request 入队 PENDING；control_response/control_cancel 对账
    if (evt.event_type === 'control_request') {
      var p = evt.payload || {};
      var reqId = p.request_id || (p.request && p.request.request_id);
      if (reqId) {
        this._approvals.set(reqId, {
          requestId: reqId, kind: approvalKind(p), status: 'PENDING',
          payload: p, toolName: (p.request && p.request.tool_name) || p.tool_name || '',
          eventKey: key, source: source
        });
      }
    } else if (evt.event_type === 'control_response' || evt.event_type === 'control_cancel' || evt.event_type === 'control_cancel_request') {
      var pid = evt.payload && evt.payload.request_id;
      var a = pid && this._approvals.get(pid);
      if (a && a.status === 'PENDING') {
        if (evt.event_type === 'control_response') {
          var resp = evt.payload.response || {};
          var body = resp.response || resp;
          a.status = (body && (body.approved === false || body.outcome === 'reject' || body.outcome === 'cancel' || body.allowed === false)) ? 'REJECTED' : 'APPROVED';
        } else {
          a.status = 'REJECTED'; // 撤销视为拒绝
        }
      }
    }
    return true;
  };

  // CACHE_RESTORE：Room 缓存整体反序列化（启动先出，秒开）
  SyncStore.prototype.reset = function (events) {
    this._items = []; this._byId.clear(); this._occ.clear();
    this._lastSeq = 0; this._optimistic.clear(); this._approvals.clear();
    (events || []).forEach(function (e) { this._insert(e, 'CACHE_RESTORE'); }, this);
    return this;
  };

  // 服务端同文 user 消息到达 → 替换乐观回显项（DERIVED_STATE 对账）
  SyncStore.prototype._replaceOptimistic = function (evt) {
    if (evt.event_type !== 'message') return;
    var src = String(evt.source || '').toLowerCase();
    if (src !== 'user' && src !== 'controller') return;
    var text = extractText(evt.payload);
    if (!text) return;
    var self = this;
    this._optimistic.forEach(function (item, cid) {
      if (item._replaced) return;
      if (extractText(item.event.payload) === text) {
        item._replaced = true;
        var i = self._items.indexOf(item);
        if (i >= 0) self._items.splice(i, 1);
        self._optimistic.delete(cid);
      }
    });
  };

  // REST_FULL / REST_INCREMENTAL / OLDER_BACKFILL
  SyncStore.prototype.ingestPage = function (events, mode) {
    var self = this;
    if (mode === 'REST_FULL') {
      this.reset();
      (events || []).forEach(function (e) { this._insert(e, 'REST_FULL'); }, this);
      this._sort();
      return this;
    }
    var known = new Set(this._items.map(function (i) { return i.key; }));
    var incoming = (events || []).slice();
    if (mode === 'OLDER_BACKFILL') incoming.reverse();
    incoming.forEach(function (e) {
      var key = e && (e.event_id || (e.session_id + ':' + e.sequence_num));
      if (key && known.has(key + (self._occ.get(key) > 1 ? '@occurrence:' + self._occ.get(key) : ''))) return;
      if (key && known.has(key)) return;
      self._insert(e, mode || 'REST_INCREMENTAL');
    });
    this._sort();
    return this;
  };

  // SSE_INCREMENTAL：实时增量（含重连重放去重）
  SyncStore.prototype.ingestSse = function (evt) {
    this._insert(evt, 'SSE_INCREMENTAL');
    return this._sort();
  };

  // DERIVED_STATE：乐观回显（发送即插入，服务端同文 user 消息到达后替换）
  SyncStore.prototype.optimisticUser = function (text, clientId) {
    var cid = clientId || uuid();
    var item = {
      key: 'optimistic:' + cid, source: 'DERIVED_STATE', seq: this._lastSeq + 0.5, optimistic: true,
      event: { event_id: 'optimistic:' + cid, session_id: '', sequence_num: this._lastSeq + 0.5, source: 'user', event_type: 'message', payload: { content: [{ type: 'text', text: text }], optimistic_user: true }, created_at: new Date().toISOString(), ephemeral: true }
    };
    this._items.push(item);
    this._optimistic.set(cid, item);
    return cid;
  };

  SyncStore.prototype._sort = function () {
    this._items.sort(function (a, b) { return a.seq - b.seq; });
    return this;
  };

  SyncStore.prototype.state = function () {
    var pending = [];
    this._approvals.forEach(function (a) { if (a.status === 'PENDING') pending.push(a); });
    return {
      items: this._items.slice(),
      pendingApprovals: pending,
      lastSequence: this._lastSeq,
      sources: SYNC_SOURCES
    };
  };

  /* ============================================================
     §8 HMAC 签名器（§7.3 反馈子域全规格还原）
     key = hex(SHA256("cosy" + ":" + version))
     msg = METHOD \n PATH(去?后缀) \n BODY \n version \n unix秒 \n hex(SHA256(contentLength))
     sig = HmacSHA256(msg, key) 小写 hex
     ============================================================ */

  function _hex(buf) {
    var b = new Uint8Array(buf), h = '0123456789abcdef', out = '';
    for (var i = 0; i < b.length; i++) out += h[b[i] >> 4] + h[b[i] & 15];
    return out;
  }
  function _hexToBytes(hexStr) {
    var out = new Uint8Array(hexStr.length / 2);
    for (var i = 0; i < out.length; i++) out[i] = parseInt(hexStr.slice(i * 2, i * 2 + 2), 16);
    return out;
  }
  var _subtle = (G.crypto && G.crypto.subtle) || null;

  function _sha256Hex(str) {
    return _subtle.digest('SHA-256', new TextEncoder().encode(str)).then(_hex);
  }
  function _byteLen(str) { return new TextEncoder().encode(str).length; }

  var HmacSigner = {
    // 独立可用：给定规格返回 {timestamp, signature}；缺省 timestamp 取当前 unix 秒
    sign: function (opts) {
      if (!_subtle) return Promise.reject(new Error('WebCrypto 不可用（需 Node 18+ 或安全上下文浏览器）'));
      opts = opts || {};
      var version = String(opts.version || '');
      var method = String(opts.method || 'POST').toUpperCase();
      var path = String(opts.path || '').split('?')[0];
      var body = opts.body == null ? '' : (typeof opts.body === 'string' ? opts.body : JSON.stringify(opts.body));
      var contentLength = opts.contentLength != null ? String(opts.contentLength) : String(_byteLen(body));
      var ts = opts.timestamp != null ? String(opts.timestamp) : String(Math.floor(Date.now() / 1000));
      return _sha256Hex('cosy:' + version).then(function (keyHex) {
        var key = _subtle.importKey('raw', _hexToBytes(keyHex), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
        return _sha256Hex(contentLength).then(function (lenHashHex) {
          var msg = [method, path, body, version, ts, lenHashHex].join('\n');
          return Promise.resolve(key).then(function (k) {
            return _subtle.sign('HMAC', k, new TextEncoder().encode(msg)).then(_hex);
          });
        });
      }).then(function (sig) { return { timestamp: ts, signature: sig }; });
    },
    // 生成反馈子域请求头：{ 'X-Client-Timestamp': ts, 'Authorization': 'Signature <hex>' }
    headers: function (opts) {
      return this.sign(opts).then(function (r) {
        var h = {}; h[HEADER.CLIENT_TS] = r.timestamp; h[HEADER.AUTH] = 'Signature ' + r.signature;
        return h;
      });
    }
  };

  /* ============================================================
     §9 MockMobileServer —— 契约忠实内存后端（演示/测试零网络依赖）
     会话 CRUD + 事件分页/SSE + 审批闭环脚本（消息→工具卡→审批→结果→回合结束）
     ============================================================ */

  function MockMobileServer(opts) {
    opts = opts || {};
    this.botDelay = opts.botDelay != null ? opts.botDelay : 30;      // 每步机器人延迟 ms
    this.behavior = opts.behavior || null;                            // 自定义 async(server, {sessionId, text})
    this._sessions = [];                                              // ControlSessionDTO 线格式
    this._events = new Map();                                         // sessionId → SessionEventDTO[]
    this._subs = new Map();                                           // sessionId → Set(sink)
    this._seq = 0;
    this._archived = new Set();
    this._devices = [];                                               // 已注册设备
    this._pushTokens = new Map();                                     // mobile_device_id → tokens[]
    this._notifCfg = new Map();                                       // device row id → NotificationConfigDTO
    this._pendingBot = new Map();                                     // request_id → sessionId
    this._envs = [{
      id: 'env-desktop-1', type: 'DESKTOP', connection_status: 'connected', disabled: false,
      max_sessions: 3, session_count: 0, created_at: new Date().toISOString(),
      bridge_info: { machine_name: 'My-MacBook-Pro', directory: '~/workspace' },
      metadata: { available_models_agent: ['auto', 'efficient', 'flagship'], available_models_experts: ['auto'], ide_available_session_mode: 'agent' }
    }];
  }

  MockMobileServer.prototype._now = function () { return new Date().toISOString(); };
  MockMobileServer.prototype._nextSeq = function () { return ++this._seq; };

  MockMobileServer.prototype._eventsFor = function (sid) {
    if (!this._events.has(sid)) this._events.set(sid, []);
    return this._events.get(sid);
  };

  MockMobileServer.prototype._sub = function (sid, sink) {
    if (!this._subs.has(sid)) this._subs.set(sid, new Set());
    this._subs.get(sid).add(sink);
    return function () { this._subs.get(sid).delete(sink); }.bind(this);
  };

  // 追加事件：补全信封（event_id/sequence_num/created_at），推送订阅者
  MockMobileServer.prototype.appendEvent = function (sid, partial, source) {
    var evt = {
      event_id: partial.event_id || uuid(),
      session_id: sid,
      sequence_num: this._nextSeq(),
      source: partial.source || source || 'system',
      event_type: partial.event_type,
      payload: partial.payload || {},
      created_at: this._now(),
      ephemeral: false
    };
    this._eventsFor(sid).push(evt);
    var set = this._subs.get(sid);
    if (set) set.forEach(function (sink) { sink.push(evt); });
    return evt;
  };

  MockMobileServer.prototype.createSession = function (req) {
    var r = req || {};
    var env = this._envs[0];
    var s = {
      session_id: 'sess-' + uuid().slice(0, 8),
      title: r.title || '新任务',
      machine_name: env.bridge_info.machine_name,
      runner_type: 'worker',
      origin: r.origin || 'mobile',
      connection_status: 'connected',
      session_status: 'queued',
      worker_status: 'idle',
      current_worker_epoch: 1,
      last_heartbeat_at: this._now(),
      last_end_turn_at: null,
      environment_id: r.environment_id || env.id,
      environment_type: env.type,
      environment_name: '桌面',
      created_at: this._now(),
      updated_at: this._now(),
      unread: false,
      pinned: false,
      external_metadata: {},
      session_context: r.session_context || {}
    };
    this._sessions.push(s);
    env.session_count += 1;
    return s;
  };

  MockMobileServer.prototype._touch = function (s) { s.updated_at = this._now(); };

  // 默认机器人脚本：回执 → 工具卡 → 审批 → （等应答）→ 结果 → 回合结束
  MockMobileServer.prototype._bot = function (sid, text) {
    var self = this;
    var steps = [
      function () {
        self.appendEvent(sid, { event_type: 'message', source: 'assistant', payload: { content: [{ type: 'text', text: '收到：' + text }] } });
        self._settleStatus(sid, 'running');
      },
      function () {
        var toolUseId = 'tool-' + uuid().slice(0, 8);
        self.appendEvent(sid, { event_type: 'tool_use', source: 'assistant', payload: { name: 'bash', tool_name: 'BASH', input: { command: 'ls -la' }, id: toolUseId, status: 'running' } });
        var rid = uuid();
        self._pendingBot.set(rid, sid);
        self.appendEvent(sid, {
          event_type: 'control_request', source: 'system',
          payload: { request_id: rid, request: { tool_name: 'BASH', details: { type: 'command', command: 'ls -la' } }, kind: 'EXECUTION' }
        });
        self._settleStatus(sid, 'waiting_for_approval');
      }
    ];
    var i = 0;
    (function next() {
      if (i >= steps.length) return;
      var fn = steps[i++];
      setTimeout(function () { fn(); next(); }, self.botDelay);
    })();
  };

  MockMobileServer.prototype._settleStatus = function (sid, status) {
    var s = this._sessions.filter(function (x) { return x.session_id === sid; })[0];
    if (s) { s.session_status = status; this._touch(s); }
  };

  MockMobileServer.prototype._onControlResponse = function (sid, payload) {
    var self = this;
    var rid = payload && payload.request_id;
    if (!rid || !this._pendingBot.has(rid)) return;
    this._pendingBot.delete(rid);
    var body = (payload.response && payload.response.response) || {};
    var allowed = !(body.approved === false || body.outcome === 'reject' || body.outcome === 'cancel' || body.allowed === false);
    setTimeout(function () {
      // 找到对应 tool_use（最近一个 running 的 bash 卡）
      var evs = self._eventsFor(sid);
      var toolUse = null;
      for (var i = evs.length - 1; i >= 0; i--) {
        var p = evs[i].payload || {};
        if (evs[i].event_type === 'tool_use' && p.tool_name === 'BASH') { toolUse = p; break; }
      }
      if (toolUse) {
        self.appendEvent(sid, {
          event_type: 'tool_result', source: 'assistant',
          payload: { tool_use_id: toolUse.id, is_error: !allowed, content: allowed ? 'total 0' : 'user denied', status: allowed ? 'completed' : 'failed' }
        });
      }
      self.appendEvent(sid, {
        event_type: 'message', source: 'assistant',
        payload: { content: [{ type: 'text', text: allowed ? '已完成目录查看。' : '已按您的拒绝终止。' }], stopReason: 'end_turn' }
      });
      self._settleStatus(sid, 'completed');
    }, this.botDelay);
  };

  // fetch 兼容入口：client 可直接 fetchImpl = server.handle() 接入
  MockMobileServer.prototype.handle = function () {
    var self = this;
    return function (url, init) { return self._fetch(url, init || {}); };
  };

  MockMobileServer.prototype._fetch = function (url, init) {
    var u = new URL(String(url), 'http://mock.local');
    var p = u.pathname.replace(/\/+$/, '') || '/';
    var m = String(init.method || 'GET').toUpperCase();
    // 请求捕获（测试断言头族/路径用）
    this.lastRequest = { url: String(url), path: p, method: m, headers: Object.assign({}, init.headers || {}) };
    var body = {};
    if (init.body && typeof init.body === 'string') { try { body = JSON.parse(init.body); } catch (e) { body = {}; } }
    var self = this;

    var json = function (obj, status) {
      return new Response(JSON.stringify(obj == null ? {} : obj), {
        status: status || 200, headers: { 'Content-Type': 'application/json' }
      });
    };

    // —— 会话域 ——
    if (p === '/api/v1/remote/sessions' || p === '/api/v1/remote/sessions/') {
      if (m === 'POST') { var s = self.createSession(body); return json(s); }
      if (m === 'GET') {
        var data = self._sessions.filter(function (x) { return !self._archived.has(x.session_id); });
        return json({ data: data, has_more: false, next_after_sequence_num: self._seq });
      }
    }
    var mSession = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)$/);
    if (mSession && m === 'DELETE') {
      var sid = mSession[1];
      self._sessions = self._sessions.filter(function (x) { return x.session_id !== sid; });
      self._events.delete(sid);
      return json({});
    }
    var mRead = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/(read|unread|archive)$/);
    if (mRead) {
      var s2 = self._sessions.filter(function (x) { return x.session_id === mRead[1]; })[0];
      if (!s2) return json({ error: 'session not found' }, 404);
      if (mRead[2] === 'read') s2.unread = false;
      else if (mRead[2] === 'unread') s2.unread = true;
      else self._archived.add(s2.session_id);
      self._touch(s2);
      return json({});
    }
    var mEvents = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/events$/);
    if (mEvents) {
      var sid2 = mEvents[1];
      if (m === 'POST') {
        var list = Array.isArray(body.events) ? body.events : [];
        list.forEach(function (e) {
          var appended = self.appendEvent(sid2, { event_type: e.event_type, payload: e.payload, event_id: e.event_id }, e.source || 'user');
          if (e.event_type === 'control_response') self._onControlResponse(sid2, e.payload);
          else if (e.event_type === 'message' && (e.source || 'user') === 'user') {
            var t = extractText(e.payload);
            self._settleStatus(sid2, 'queued');
            if (self.behavior) Promise.resolve(self.behavior(self, { sessionId: sid2, text: t })).catch(function () {});
            else self._bot(sid2, t);
          }
        });
        return json({ accepted: list.length });
      }
      if (m === 'GET') {
        var after = Number(u.searchParams.get('after_sequence_num') || 0);
        var limit = Number(u.searchParams.get('limit') || 100);
        var evs = self._eventsFor(sid2).filter(function (e) { return e.sequence_num > after; });
        var page = evs.slice(0, limit);
        var last = page.length ? page[page.length - 1].sequence_num : after;
        return json({ data: page, has_more: evs.length > page.length, next_after_sequence_num: last });
      }
    }
    var mStream = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/events\/stream$/);
    if (mStream && m === 'GET') return self._sse(mStream[1], u);

    if (p === '/api/v1/remote/system-events/stream' && m === 'GET') return self._systemSse(u);

    if (p === '/api/v1/remote/environments' && m === 'GET') return json(self._envs);

    var mArtifacts = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/artifacts$/);
    if (mArtifacts && m === 'GET') return json({ data: [], has_more: false });

    var mDl = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/artifacts\/download-url$/);
    if (mDl && m === 'POST') return json({ download_url: '', presigned_url: '', presign_url: 'https://mock.local/obj/' + uuid().slice(0, 8) + '?sig=mock', download_expires_at: new Date(Date.now() + 3600e3).toISOString() });

    var mGrant = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/sandbox\/grants$/);
    if (mGrant && m === 'POST') return json({ url: 'https://mock.local/p/' + uuid().slice(0, 6), grant: 'grant-' + uuid().slice(0, 8), expires_at: new Date(Date.now() + 600e3).toISOString() });

    // —— 认证/用户 ——
    if (p === '/app/auth/token' && m === 'POST') return json({ access_token: 'mock-token', refresh_token: 'mock-refresh', expires_in: 3600 });
    if (p === '/app/auth/logout' && m === 'POST') return json({});
    if (p === '/api/v1/userinfo' && m === 'GET') return json({ userId: 'u-1', userName: 'Mock User', userEmail: 'mock@qoder.local' });
    if (p === '/api/v1/me/usage' && m === 'GET') return json({ credits: 100, used: 42 });
    if (p === '/api/v1/me/plan' && m === 'GET') return json({ plan: 'free' });

    // —— 设备/推送 ——
    if ((p === '/api/v1/mobile/me/devices' || p === '/api/v1/mobile/me/devices/' || p === '/api/v1/mobile/devices' || p === '/api/v1/mobile/devices/') && m === 'POST') {
      var dev = { id: 'dev-' + uuid().slice(0, 6), mobile_device_id: body.mobile_device_id || uuid(), platform: body.platform || 'android', device_name: body.device_name || 'Mock Device' };
      self._devices.push(dev);
      self._notifCfg.set(dev.id, { task_completed: true, qa: true, ask_permission: true, plan_review: true });
      return json(dev);
    }
    var mBind = p.match(/^\/api\/v1\/mobile\/me\/devices\/([^/]+)\/bind$/);
    if (mBind && m === 'POST') return json({ bound: true, id: mBind[1] });
    var mPush = p.match(/^\/api\/v1\/mobile\/devices\/([^/]+)\/push-tokens(?:\/([^/]+))?$/);
    if (mPush) {
      var mid = mPush[1];
      if (m === 'POST') {
        var arr = self._pushTokens.get(mid) || [];
        var tok = { id: 'pt-' + uuid().slice(0, 6), provider: body.provider || 'umeng', token: body.token, locale: body.locale || 'zh-CN' };
        arr.push(tok); self._pushTokens.set(mid, arr);
        return json(tok);
      }
      if (m === 'DELETE' && mPush[2]) {
        self._pushTokens.set(mid, (self._pushTokens.get(mid) || []).filter(function (t) { return t.id !== mPush[2]; }));
        return json({});
      }
    }
    var mNotif = p.match(/^\/api\/v1\/mobile\/devices\/([^/]+)\/configs\/notification$/);
    if (mNotif) {
      var cfg0 = self._notifCfg.get(mNotif[1]) || { task_completed: true, qa: true, ask_permission: true, plan_review: true };
      if (m === 'PUT') { cfg0 = { task_completed: !!body.task_completed, qa: !!body.qa, ask_permission: !!body.ask_permission, plan_review: !!body.plan_review }; self._notifCfg.set(mNotif[1], cfg0); }
      return json(cfg0);
    }

    if (p === '/api/v1/mobile/app-versions/check' && m === 'GET') return json({ has_update: false, force_update: false, md5: '', download_url: '' });

    // —— GitHub / 眼镜 / 上传 / 反馈 / 遥测（ canned ） ——
    if (p.indexOf('/sash/api/v1/mobile/me/integrations/github/') === 0 && m === 'POST') return json({ url: 'https://mock.local/github/flow' });
    if (p.indexOf('/sash/api/v1/glasses/pairings') === 0 && m === 'POST') return json({ id: 'pair-' + uuid().slice(0, 6) });
    if ((p === '/api/v1/raw/upload' || p === '/api/v1/mix/upload') && m === 'POST') return json({ file_id: 'file-' + uuid().slice(0, 8) });
    if (p === '/issue/oss/policy' && m === 'GET') return json({ policy: 'mock' });
    if (p === '/issue/image/upload' || p === '/issue/file/diagnose/upload') return json({ ok: true });
    if (p === '/api/crashsdk/validate' || p === '/api/v1/crashtrack/upload') return json({ ok: true });
    var mGen = p.match(/^\/api\/v1\/remote\/sessions\/([^/]+)\/generate-title-and-branch$/);
    if (mGen && m === 'POST') return json({ title: 'Mock 标题', branches: ['main'] });

    return json({ error: 'not found', path: p, method: m }, 404);
  };

  MockMobileServer.prototype._sse = function (sid, url) {
    var self = this;
    var from = Number(url.searchParams.get('from_sequence_num') || 0);
    var enc = new TextEncoder();
    var sink = null;
    var stream = new ReadableStream({
      start: function (controller) {
        self._eventsFor(sid).forEach(function (e) {
          if (e.sequence_num > from) { try { controller.enqueue(enc.encode(sseFrame(e))); } catch (err) {} }
        });
        sink = {
          push: function (evt) { try { controller.enqueue(enc.encode(sseFrame(evt))); } catch (err) {} }
        };
        self._sub(sid, sink);
      },
      cancel: function () {
        var set = self._subs.get(sid);
        if (set && sink) set.delete(sink);
      }
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' } });
  };

  MockMobileServer.prototype._systemSse = function (url) {
    var self = this;
    var enc = new TextEncoder();
    var sink = null;
    var stream = new ReadableStream({
      start: function (controller) {
        sink = { push: function (evt) { try { controller.enqueue(enc.encode(sseFrame(evt))); } catch (err) {} } };
        self._systemSink = sink;
      },
      cancel: function () { self._systemSink = null; }
    });
    return new Response(stream, { status: 200, headers: { 'Content-Type': 'text/event-stream' } });
  };

  // 系统事件广播（session.created/updated、environment.*、task.live_activity、notification）
  MockMobileServer.prototype.emitSystem = function (type, payload) {
    var evt = { event_id: uuid(), session_id: '', sequence_num: this._nextSeq(), source: 'system', event_type: type, payload: payload || {}, created_at: this._now(), ephemeral: false };
    if (this._systemSink) this._systemSink.push(evt);
    return evt;
  };

  /* ============================================================
     §10 MobileClient —— REST + SSE 契约客户端
     头族：Bearer 设备令牌 / X-GwRoute-Token / X-Gw-User-Id /
           X-Qoder-Mobile-Device-Id / x-qoder-appid（/sash 子域）
     ============================================================ */

  function QoderApiError(status, body, path) {
    var e = new Error('Qoder API ' + status + (path ? ' ' + path : '') + (body && body.error ? ': ' + body.error : ''));
    e.name = 'QoderApiError'; e.status = status; e.body = body; e.path = path;
    return e;
  }

  function buildPath(tpl, params) {
    var p = String(tpl || '');
    var ps = params || {};
    for (var k in ps) if (Object.prototype.hasOwnProperty.call(ps, k)) {
      p = p.split('{' + k + '}').join(encodeURIComponent(String(ps[k])));
    }
    return p;
  }

  function createClient(opts) {
    opts = opts || {};
    var cfg = {
      baseUrl: (opts.baseUrl || DEFAULT_BASE_URLS.api).replace(/\/+$/, ''),
      token: opts.token || '',
      deviceId: opts.deviceId || '',
      routeToken: opts.routeToken || '',
      routeUser: opts.routeUser || '',
      appId: opts.appId === false ? false : (opts.appId || APP_ID),
      fetchImpl: opts.fetchImpl || (typeof G.fetch === 'function' ? G.fetch.bind(G) : null),
      sseRetryBaseMs: opts.sseRetryBaseMs != null ? opts.sseRetryBaseMs : 300,
      sseRetryMaxMs: opts.sseRetryMaxMs != null ? opts.sseRetryMaxMs : 8000
    };
    if (!cfg.fetchImpl) throw new Error('createClient: 需要提供 fetchImpl（或运行环境含全局 fetch）');

    function headers(domain, extra) {
      var h = Object.assign({}, extra || {});
      if (cfg.token) h[HEADER.AUTH] = 'Bearer ' + cfg.token;
      if (cfg.deviceId) h[HEADER.DEVICE] = cfg.deviceId;
      if (cfg.routeToken) h[HEADER.ROUTE] = cfg.routeToken;
      if (cfg.routeUser) h[HEADER.ROUTE_USER] = cfg.routeUser;
      if (domain === 'sash' && cfg.appId) h[HEADER.APPID] = cfg.appId;
      return h;
    }
    function domainOf(tpl) {
      if (tpl.indexOf('/sash/') === 0) return 'sash';
      if (tpl.indexOf('/issue/') === 0) return 'feedback';
      return 'api';
    }

    // 核心 REST：method + 路径模板 + 路径参数 + JSON/FormData 体
    function request(method, tpl, params, body, reqOpts) {
      reqOpts = reqOpts || {};
      var path = buildPath(tpl, params);
      var h = headers(reqOpts.domain || domainOf(tpl), reqOpts.headers);
      var init = { method: method, headers: h, signal: reqOpts.signal };
      if (body !== undefined && body !== null) {
        if (typeof FormData !== 'undefined' && body instanceof FormData) {
          init.body = body; // 浏览器/undici 自动补 multipart 边界
        } else {
          h['Content-Type'] = 'application/json';
          init.body = typeof body === 'string' ? body : JSON.stringify(body);
        }
      }
      return Promise.resolve(cfg.fetchImpl(cfg.baseUrl + path, init)).then(function (res) {
        if (res.status === 204) return null;
        return res.text().then(function (txt) {
          var data = null;
          if (txt) { try { data = JSON.parse(txt); } catch (e) { data = txt; } }
          if (!res.ok) throw QoderApiError(res.status, data, path);
          return data;
        });
      });
    }

    // SSE 引擎：Last-Event-ID 续传 + from_sequence_num 续传 + 指数退避重连
    // 返回 Promise<{lastSequence, lastEventId, reason}>，signal.abort() 结束
    function sseLoop(buildUrl, onEvent, opts) {
      opts = opts || {};
      var signal = opts.signal;
      var lastSeq = opts.fromSequenceNum || 0;
      var lastEventId = opts.lastEventId || null;
      var attempt = 0;

      function aborted() { return !!(signal && signal.aborted); }

      function once() {
        var h = headers('api', { 'Accept': 'text/event-stream' });
        if (lastEventId) h[HEADER.LAST_EVENT_ID] = lastEventId;
        return Promise.resolve(cfg.fetchImpl(buildUrl(lastSeq), { method: 'GET', headers: h, signal: signal }))
          .then(function (res) {
            if (!res.ok) throw QoderApiError(res.status, null, 'sse');
            if (!res.body) throw new Error('SSE 响应无 body（需流式 fetch 实现）');
            attempt = 0;
            var reader = res.body.getReader();
            var dec = new TextDecoder();
            var buf = '';
            function readChunk() {
              if (aborted()) return Promise.resolve();
              return Promise.race([
                reader.read(),
                new Promise(function (resolve) {
                  if (!signal) return resolve(null);
                  signal.addEventListener('abort', function () { resolve(null); }, { once: true });
                })
              ]).then(function (r) {
                if (!r || r.done || aborted()) { try { reader.cancel(); } catch (e) {} return; }
                buf += dec.decode(r.value, { stream: true });
                var parsed = parseSseChunk(buf);
                buf = parsed.rest;
                for (var i = 0; i < parsed.events.length; i++) {
                  var ev = parsed.events[i];
                  if (ev.id) lastEventId = ev.id;
                  if (ev.data && typeof ev.data === 'object') {
                    if (typeof ev.data.sequence_num === 'number' && ev.data.sequence_num > lastSeq) lastSeq = ev.data.sequence_num;
                    if (onEvent(ev.data) === false) { try { reader.cancel(); } catch (e) {} return; }
                  }
                }
                return readChunk();
              });
            }
            return readChunk();
          });
      }

      function run() {
        if (aborted()) return Promise.resolve({ lastSequence: lastSeq, lastEventId: lastEventId, reason: 'aborted' });
        return once().then(function (stopped) {
          if (stopped || aborted()) return { lastSequence: lastSeq, lastEventId: lastEventId, reason: stopped ? 'stopped' : 'aborted' };
          var delay = Math.min(cfg.sseRetryMaxMs, cfg.sseRetryBaseMs * Math.pow(2, Math.min(attempt, 5)));
          attempt++;
          return sleep(delay).then(run);
        }).catch(function (err) {
          if (aborted()) return Promise.resolve({ lastSequence: lastSeq, lastEventId: lastEventId, reason: 'aborted' });
          attempt++;
          var delay = Math.min(cfg.sseRetryMaxMs, cfg.sseRetryBaseMs * Math.pow(2, Math.min(attempt, 5)));
          return sleep(delay).then(run);
        });
      }
      return run();
    }

    function eventsStreamUrl(sid) {
      return function (fromSeq) {
        return cfg.baseUrl + '/api/v1/remote/sessions/' + encodeURIComponent(sid) + '/events/stream?from_sequence_num=' + fromSeq;
      };
    }

    // 会话状态线格式 → UI 卡片字段适配（session_status → 工作区卡片六态）
    function sessionToCard(w) {
      var s = fromWire('ControlSessionDTO', w);
      var MAP = { queued: 'idle', running: 'running', waiting_for_approval: 'attention', completed: 'closed', failed: 'error', cancelled: 'closed' };
      var st = MAP[String(s.sessionStatus || '').toLowerCase()] || s.sessionStatus || 'idle';
      return {
        id: s.sessionId, title: s.title || '', status: st,
        updated: s.updatedAt || '', unread: !!s.unread,
        machineName: s.machineName || '', connectionStatus: s.connectionStatus || ''
      };
    }

    var client = {
      config: cfg,
      _request: request,
      _sseLoop: sseLoop,
      _eventsStreamUrl: eventsStreamUrl,
      _sessionToCard: sessionToCard,
      setToken: function (t) { cfg.token = t || ''; return client; },
      setRoute: function (routeToken, routeUser) { cfg.routeToken = routeToken || ''; cfg.routeUser = routeUser || ''; return client; },
      setBaseUrl: function (u) { cfg.baseUrl = String(u || '').replace(/\/+$/, ''); return client; },

      sessions: {
        list: function () { return request('GET', '/api/v1/remote/sessions/'); },
        create: function (req) { return request('POST', '/api/v1/remote/sessions/', null, toWire('CreateSessionRequest', req || {})); },
        remove: function (id) { return request('DELETE', '/api/v1/remote/sessions/{id}', { id: id }); },
        markRead: function (id) { return request('POST', '/api/v1/remote/sessions/{id}/read', { id: id }, {}); },
        markUnread: function (id) { return request('POST', '/api/v1/remote/sessions/{id}/unread', { id: id }, {}); },
        archive: function (id) { return request('POST', '/api/v1/remote/sessions/{id}/archive', { id: id }, {}); },
        generateTitleAndBranch: function (id, body) { return request('POST', '/api/v1/remote/sessions/{id}/generate-title-and-branch', { id: id }, body || {}); },
        toCard: sessionToCard
      },

      events: {
        list: function (id, q) {
          q = q || {};
          var qs = [];
          if (q.after != null) qs.push('after_sequence_num=' + encodeURIComponent(q.after));
          if (q.limit != null) qs.push('limit=' + encodeURIComponent(q.limit));
          if (q.order) qs.push('order=' + encodeURIComponent(q.order));
          return request('GET', '/api/v1/remote/sessions/{id}/events' + (qs.length ? '?' + qs.join('&') : ''), { id: id });
        },
        send: function (id, events) {
          return request('POST', '/api/v1/remote/sessions/{id}/events', { id: id }, controlRequestBody(events || []));
        },
        sendUserMessage: function (id, text) {
          return client.events.send(id, [{ event_type: 'message', payload: { content: [{ type: 'text', text: String(text || '') }] } }]);
        },
        sendControl: function (id, eventObj) { return client.events.send(id, [eventObj]); },
        // SSE 增量流：onEvent(SessionEventDTO)；返回 Promise（signal.abort 结束）
        stream: function (id, opts) {
          opts = opts || {};
          return sseLoop(eventsStreamUrl(id), opts.onEvent || function () {}, {
            signal: opts.signal, fromSequenceNum: opts.fromSequenceNum || 0, lastEventId: opts.lastEventId
          });
        }
      },

      system: {
        // 五类系统事件 + notification + task.live_activity
        stream: function (opts) {
          opts = opts || {};
          var urlFn = function () { return cfg.baseUrl + '/api/v1/remote/system-events/stream'; };
          return sseLoop(urlFn, opts.onEvent || function () {}, {
            signal: opts.signal, fromSequenceNum: 0, lastEventId: opts.lastEventId
          });
        }
      },

      environments: {
        list: function () { return request('GET', '/api/v1/remote/environments'); }
      },

      artifacts: {
        list: function (id) { return request('GET', '/api/v1/remote/sessions/{id}/artifacts', { id: id }); },
        downloadUrl: function (id, req) { return request('POST', '/api/v1/remote/sessions/{id}/artifacts/download-url', { id: id }, toWire('ArtifactDownloadURLRequest', req || {})); }
      },

      sandbox: {
        grant: function (id, req) { return request('POST', '/api/v1/remote/sessions/{id}/sandbox/grants', { id: id }, toWire('SandboxPreviewGrantRequest', req || {})); }
      },

      auth: {
        token: function (body) { return request('POST', '/app/auth/token', null, body || {}); },
        logout: function () { return request('POST', '/app/auth/logout', null, {}); },
        aliyunRamInit: function (body) { return request('POST', '/app/auth/aliyun-ram/init', null, body || {}); },
        aliyunCallback: function (body) { return request('POST', '/app/auth/aliyun/callback', null, body || {}); },
        verificationCodes: function (body) { return request('POST', '/api/v1/me/verificationCodes', null, body || {}); }
      },

      user: {
        info: function () { return request('GET', '/api/v1/userinfo'); },
        usage: function () { return request('GET', '/api/v1/me/usage'); },
        plan: function () { return request('GET', '/api/v1/me/plan'); }
      },

      devices: {
        register: function (body) { return request('POST', '/api/v1/mobile/me/devices/', null, body || {}); },
        bind: function (id, body) { return request('POST', '/api/v1/mobile/me/devices/{id}/bind', { id: id }, body || {}); },
        registerLegacy: function (body) { return request('POST', '/api/v1/mobile/devices/', null, body || {}); }
      },

      pushTokens: {
        // PushTokenRequestDTO{token, locale} + provider（契约端点注记 provider:'umeng'）
        set: function (mobileDeviceId, body) { return request('POST', '/api/v1/mobile/devices/{mobile_device_id}/push-tokens', { mobile_device_id: mobileDeviceId }, body || {}); },
        remove: function (mobileDeviceId, pushTokenId) { return request('DELETE', '/api/v1/mobile/devices/{mobile_device_id}/push-tokens/{push_token_id}', { mobile_device_id: mobileDeviceId, push_token_id: pushTokenId }); }
      },

      notificationConfigs: {
        get: function (deviceId) { return request('GET', '/api/v1/mobile/devices/{id}/configs/notification', { id: deviceId }); },
        put: function (deviceId, cfg) { return request('PUT', '/api/v1/mobile/devices/{id}/configs/notification', { id: deviceId }, toWire('NotificationConfigDTO', cfg || {})); }
      },

      update: {
        check: function (q) {
          var b = q || {};
          var qs = [];
          for (var k in b) if (Object.prototype.hasOwnProperty.call(b, k)) qs.push(encodeURIComponent(k) + '=' + encodeURIComponent(b[k]));
          return request('GET', '/api/v1/mobile/app-versions/check' + (qs.length ? '?' + qs.join('&') : ''));
        }
      },

      github: {
        authorizationUrl: function (body) { return request('POST', '/sash/api/v1/mobile/me/integrations/github/authorization-url', null, body || {}); },
        installUrl: function (body) { return request('POST', '/sash/api/v1/mobile/me/integrations/github/install-url', null, body || {}); },
        connected: function (body) { return request('POST', '/sash/api/v1/mobile/me/integrations/github/connected', null, body || {}); },
        disconnect: function (body) { return request('POST', '/sash/api/v1/mobile/me/integrations/github/disconnect', null, body || {}); }
      },

      glasses: {
        createPairing: function (body) { return request('POST', '/sash/api/v1/glasses/pairings', null, body || {}); },
        approve: function (id, body) { return request('POST', '/sash/api/v1/glasses/pairings/{id}/approve', { id: id }, body || {}); },
        cancel: function (id, body) { return request('POST', '/sash/api/v1/glasses/pairings/{id}/cancel', { id: id }, body || {}); }
      },

      upload: {
        raw: function (formData) { return request('POST', '/api/v1/raw/upload', null, formData); },
        mix: function (formData) { return request('POST', '/api/v1/mix/upload', null, formData); }
      },

      feedback: {
        policy: function () { return request('GET', '/issue/oss/policy'); },
        imageUpload: function (formData) { return request('POST', '/issue/image/upload', null, formData, { domain: 'feedback' }); },
        diagnoseUpload: function (formData) { return request('POST', '/issue/file/diagnose/upload', null, formData, { domain: 'feedback' }); }
      },

      telemetry: {
        crashValidate: function (body) { return request('POST', '/api/crashsdk/validate', null, body || {}); },
        crashUpload: function (body) { return request('POST', '/api/v1/crashtrack/upload', null, body || {}); }
      },

      vpc: {
        // VPC 私有化端点发现：向自建服务请求端点清单 → 映射七基址（§六 协议）
        discover: function (discoveryUrl, fallbackBase) {
          return Promise.resolve(cfg.fetchImpl(discoveryUrl, { method: 'GET', headers: headers('api') })).then(function (res) {
            return res.json();
          }).then(function (resp) {
            return mapVpcEndpoints(resp, fallbackBase || cfg.baseUrl);
          });
        },
        map: mapVpcEndpoints
      },

      // 控制面快捷方法（事件体构造见 MobileApi.control）
      control: {
        interrupt: function (id) { return client.events.send(id, [control.interrupt()]); },
        endSession: function (id, reason) { return client.events.send(id, [control.endSession(reason)]); },
        setModel: function (id, model) { return client.events.send(id, [control.setModel(model)]); },
        setPermissionMode: function (id, mode) { return client.events.send(id, [control.setPermissionMode(mode)]); },
        rename: function (id, title) { return client.events.send(id, [control.rename(title)]); },
        prepareArtifact: function (id, path) { return client.events.send(id, [control.prepareArtifact(path)]); },
        cancelRequest: function (id, targetRequestId) { return client.events.send(id, [control.cancelRequest(targetRequestId)]); },
        respondToolApproval: function (id, requestId, opts) { return client.events.send(id, [control.respondToolApproval(requestId, opts)]); },
        respondPlanReview: function (id, requestId, opts) { return client.events.send(id, [control.respondPlanReview(requestId, opts)]); },
        respondAskUser: function (id, requestId, answers) { return client.events.send(id, [control.respondAskUser(requestId, answers)]); }
      },

      // HMAC 签名（反馈子域，specs 见 HmacSigner）
      signFeedback: HmacSigner
    };
    return client;
  }

  /* ============================================================
     §11 注册 QoderUI.MobileApi
     ============================================================ */

  QI.MobileApi = {
    version: '3.11.0',
    ENDPOINTS: ENDPOINTS,
    DEFAULT_BASE_URLS: DEFAULT_BASE_URLS,
    REGION: REGION,
    APP_ID: APP_ID,
    HEADER: HEADER,
    ENUMS: ENUMS,
    WIRE: WIRE,
    fromWire: fromWire,
    toWire: toWire,
    deepCamel: deepCamel,
    snakeToCamel: snakeToCamel,
    camelToSnake: camelToSnake,
    uuid: uuid,
    deriveRole: deriveRole,
    normalizeToolStatus: normalizeToolStatus,
    extractText: extractText,
    extractCommand: extractCommand,
    riskGroup: riskGroup,
    isEndTurn: isEndTurn,
    isInterrupt: isInterrupt,
    isAskUser: isAskUser,
    approvalKind: approvalKind,
    normalizeOutcome: normalizeOutcome,
    parseSseChunk: parseSseChunk,
    sseFrame: sseFrame,
    control: control,
    controlRequestBody: controlRequestBody,
    mapVpcEndpoints: mapVpcEndpoints,
    SyncStore: SyncStore,
    SYNC_SOURCES: SYNC_SOURCES,
    HmacSigner: HmacSigner,
    MockMobileServer: MockMobileServer,
    createClient: createClient,
    createMobileClient: createClient
  };

})();
