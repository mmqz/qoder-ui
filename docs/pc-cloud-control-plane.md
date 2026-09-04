# Qoder 桌面端云端控制面协议审计与 Cloudflare 连接器自建架构

**审计对象**：官方桌面双包 —— App `Qoder-CN-linux-amd64.deb`（Electron，`Package: qoder-cn`，asar 内 `0.1.6`，build 2026-09-02）+ IDE `qoder-cn-ide_amd64.deb`（VSCode fork，v1.1.3 线）｜ **方法**：asar 全量解包（主进程 5,931,013 B）+ IDE deb 解包，主进程单文件偏移级审计 + 脚本化常量核对（`scripts/pc_cloud_audit.py`，45/46 常量命中，6/6 IDE 信号命中）｜ **目的**：补全"移动端 ↔ 云端 ↔ 桌面端"三端链路的**桌面侧最后一块拼图**，并以 **Cloudflare 连接器（cloudflared）作为云端控制节点**给出可实施的自建后端架构

> 前置阅读：`docs/mobile-connectivity-report.md`（移动端视角十章）、`docs/android-capability-map.md`（45 端点 + 103 DTO 契约）、`docs/pc-coverage-audit.md`（PC 文案对账）。本文聚焦移动端报告遗留的悬案：**桌面上到底是谁、通过什么协议接入云端调度**。

---

## 一、结论摘要（TL;DR）

桌面端 App 主进程内存在**三条互相独立的云链路**，其中"协作控制面 loop-server"正是移动端报告推断的"桌面 = Environment + worker 心跳"的服务端真相：

```
┌─ 手机 App ──────────────┐         ┌─ 桌面 App（Electron）────────────────────────────┐
│ /api/v1/remote/*        │         │ ① CN 业务面: openapi/gateway.qoder.com.cn        │
│ sessions + SSE          │ ◄─云端─► │    登录(OAuth Device Flow)/jobToken/MCP/用量     │
│ environments/推送       │         │ ② 协作控制面 loop-server（QODER_SERVER_BASE_URL） │
└─────────────────────────┘         │    runtime-installations 注册+心跳               │
                                    │    turns 拉取式派单（claim→PATCH 回传）           │
┌─ 自建后端（CF 连接器）─┐            │    /v1/events SSE 增量                           │
│ Cloudflare Workers     │ ◄─等价──► │ ③ 国际云沙箱: api.qoder.com/api/v1/cloud         │
│ + DO + D1 + Tunnel     │           │    environments/agents/sessions/events           │
└────────────────────────┘            └──────────────────────────────────────────────────┘
```

| # | 核心事实 | 证据（asar `out/main/index.js` 偏移） |
|---|---|---|
| 1 | 桌面接入云端调度的控制面客户端在源码中叫 **loop-server**（`Collaboration` 服务），地址由环境变量 `QODER_SERVER_BASE_URL` 注入，**默认为空 = 功能关闭** | `@1534969` `function o1e(){…QODER_SERVER_BASE_URL?.trim()??""…}`；`@1508536` `this.baseURL=o1e()` |
| 2 | 桌面以 **runtime-installation** 身份注册并心跳：`POST /v1/runtime-installations/register`、`…/{id}/heartbeat`、`…/deregister`、`PUT …/registrations` 对账 | `@1526033`（四端点 + `listRuntimeRegistrations`） |
| 3 | 任务派发是**拉取式**：桌面主动 `POST /v1/runtime-registrations/{id}/turns/claim`（204 = 无任务），执行后 `PATCH /v1/turns/{id}` 回传——**桌面在 NAT 后无需任何公网入站** | `@1524909` `claimRuntimeTurn`；`@1520964` `syncTurnOutboxItem`（outbox 5s 重试） |
| 4 | Turn 状态机八态：`queued/starting/running/waiting-user/completed/failed/canceled/interrupted`，失败码三分类 `AUTH_REQUIRED / EXECUTION_INTERRUPTED / RUNTIME_EXECUTION_FAILED` | `@1506901` `f8()`；`@1533121` 尾部 `JP()` |
| 5 | 会话绑定协议：`POST /v1/sessions/{sessionId}/runtime-bindings`，声明 `executionPlaneKind:"client-managed"` + `Idempotency-Key` + `capabilities` | `@1518130` |
| 6 | 增量通道：`GET /v1/events?after={cursor}` SSE，`event: collaboration` 帧触发全量 refresh，断线 1s→30s 指数退避，401 自动刷新凭据重试 | `@1532314` `consumeEventStream`；`@1533409` `fetch()` |
| 7 | 桌面另接**国际云沙箱**（`https://api.qoder.com/api/v1/cloud`）：`environments`（云沙箱配置）/`agents`/`sessions`/SSE 事件流，Anthropic 风格 `user.message`/`user.tool_confirmation` 事件 | `@1449422` `wP` 常量；`@1449900-1454600` 服务全文 |
| 8 | 本地执行体：`@qoder-ai/qoder-cn-agent-sdk`（`WorkerTransport`/`ProcessTransport`）+ Remote-SSH `remote-runtime` 二进制（thin/full 双形态，stdio JSON 协议 `system.hello`/`system.ping` 15s 心跳/45s 超时） | `@3587` import；`@5835662` `remoteSsh{}`；`@415401-417347` |
| 9 | `qoder-cn://` 深链的真实注册方是 **IDE**（url-handler desktop `MimeType=x-scheme-handler/qoder-cn-ide;x-scheme-handler/qoder-cn`），App 侧经 `open-url`/`second-instance` 队列接收（20 条上限/600s 过期） | IDE `…-url-handler.desktop`；`@3258284` `fie` 类；`@5848064` |
| 10 | **自建关键**：桌面 App 的 openapi 基址、loop-server 基址、遥测基址均可环境变量覆盖（`QODER_OPENAPI_BASE_URL`/`QODER_SERVER_BASE_URL`/`QODER_TELEMETRY_BASE_URL`）——官方客户端零改动指向自建云端 | 审计 JSON `env_vars`（121 项注入面） |

---

## 二、桌面端三条云链路总览

### 2.1 CN 业务面（与移动端共享的账号/配额/集成通道）

App 主进程硬编码的基址族（含 test 环境）：

| 基址 | 用途 | 证据 |
|---|---|---|
| `openapi.qoder.com.cn` | 业务 API：`/api/v1/deviceToken/*`、`/api/v1/jobToken/*`、`/api/v1/me/*`、`/api/v1/organizations/*`、MCP | 审计 JSON `urls.by_group` |
| `gateway.qoder.com.cn` | 推理/反馈网关（`/algo/`、`feedback`） | 同上 |
| `static.qoder.com.cn` / `download.qoder.com.cn` | 包分发 + `…/releases/remote-runtime`（Remote-SSH runtime 清单基址） | `@138451` `_ge.downloadBaseUrl` |
| `test-*` 四件套 + `*.qoder.sh`（center/openapi/test-ops2） | 测试/内部环境基址（`QODER_ENV=test` 切换） | `@138387` 环境表 |

认证链与移动端互补成对：

- **OAuth Device Flow**（桌面无浏览器场景）：`POST /api/v1/deviceToken/poll?nonce=…&verifier=…&challenge_method=S256` 轮询 + `POST /api/v1/deviceToken/refresh` 刷新（`@250304`/`@244066`）。移动端能力图中的设备注册/扫码登录在桌面侧就是这条 Device Flow。
- **jobToken 三段式**（执行凭证，与账号 token 解耦）：`POST /api/v1/me/jobToken`（Bearer accessToken + clientId 签发）→ `POST /api/v1/jobToken/refresh`（refresh_token 续期）→ `POST /api/v1/jobToken/exchange`（personal_token 直接换取，供 CLI/自动化场景）（`@196345`/`@196631`/`@194651`）。

### 2.2 协作控制面 loop-server（本审计核心）

服务名 `Collaboration`，日志命名空间 `loop-server`。当 `QODER_SERVER_BASE_URL` 未配置时整个协作域降级为本地桩（错误码 `COLLABORATION_UNAVAILABLE`，提示"云端协作服务尚未连接，请检查 loop-server 配置后重试"，`@653609`/`@654158`）——这说明**官方产品形态中该控制面是一个可选接入的独立服务**，也正是自建后端的天然替换点。

### 2.3 国际云沙箱 Qoder Cloud（对照面）

`qoderCloudMainService` 以 **PAT（个人访问令牌）** 直连 `https://api.qoder.com/api/v1/cloud`，提供与 Anthropic Claude Code 云端沙箱同构的 API：创建云沙箱环境（`networking{type,allowed_hosts}`/`packages{apt,npm,pip}`/`setup_script`）、创建 Agent（`agent_toolset_20260401` 工具集 + skills）、创建会话（`{agent, environment_id}`）、`user.message`/`user.tool_confirmation` 事件收发、SSE 增量流（`Last-Event-ID` + `event_deltas[]=agent.message`）。**这条链路与 CN 三端手机-桌面调度无关**，但它的"事件即 API"会话语义与 loop-server 的 turn 模型互为印证，自建时二选一或并行皆可。

---

## 三、loop-server 协作控制面协议完整还原

### 3.1 服务寻址与配置注入

```js
// @1534969 — 控制面基址决定函数（完整还原）
function o1e(){
  if (process.env.QODER_DEMO_DATA === "true") return "";      // 本地演示数据
  const e = process.env.QODER_SERVER_BASE_URL?.trim() ?? "";
  if (!e) return "";                                           // 默认关闭
  try { return new URL(e).toString() } catch { return "" }
}
```

要点：**协议相对路径拼接**（`new URL("/v1/…", baseURL)`），因此自建服务可挂在任意子路径下；无路径前缀硬编码；TLS 由 `URL` 语义决定（生产应 https）。

### 3.2 认证模型

| 层 | 凭据 | 注入方式 | 失败行为 |
|---|---|---|---|
| 控制面 | 账号 accessToken | `Authorization: Bearer`（每请求取 `getAccessTokenInfo("initial")`） | 401 → 取 `getAccessTokenInfo("unauthorized")` 刷新重试一次，仍 401 则 `invalidateAccessToken`（`@1533409`） |
| 执行 | jobToken | `/api/v1/me/jobToken` 签发、`/api/v1/jobToken/refresh` 续期 | 400/401/403 → 抛 `UNAUTHORIZED` 要求重登 |
| 设备 | deviceToken | Device Flow S256 轮询签发 | refresh 过期 → `expireSession` |

错误响应结构：`{error:{message, code, requestId}}`，客户端透传 `X-Request-ID` 响应头——自建服务应保持该结构（`@1533121`）。

### 3.3 Runtime 生命周期（桌面 = 可调度执行节点的注册协议）

```http
POST /v1/runtime-installations/register          → { runtimeInstallation }
PUT  /v1/runtime-installations/{id}/registrations  body {registrations:[…]}   # 全量对账
POST /v1/runtime-installations/{id}/heartbeat      body {registrationIds:[…]}  # 心跳批量确认
POST /v1/runtime-installations/{id}/deregister     body {}
GET  /v1/runtime-registrations                   → { runtimeRegistrations }
GET  /v1/runtime-profiles                        → { runtimeProfiles }
GET  /v1/agent-runtime-targets                   → { agentRuntimeTargets }
```

数据模型（`@604161`/`@609937` 还原）：

- **runtimeProfile**：`{id, provider(=protocolFamily), placement, cloudEnvironmentId, capabilities[], name, description, kind, commandName, fixedArgs[], executablePath, version, enabled}`
- **registration**：profile 的**本机实例**（`registration:{id, profileId, …}`），心跳以 registrationId 为粒度
- **protocolFamily 枚举**：`"qoder" | "codex" | "pi"` —— 桌面把三种 Agent 协议适配器注册到同一控制面（自建可扩展）
- **placement**：执行位置语义（本地/云），与 `cloudEnvironmentId` 互补

> 与移动端报告的对账：安卓端 `ControlSessionDTO{runner_type, worker_status, last_heartbeat_at}` 与 `EnvironmentDTO{bridge_info}` 即本协议在移动端视图的投影——心跳源头就是这里的 `heartbeat`，"Environment"就是这里的 installation/registration。

### 3.4 会话绑定：runtime-bindings

```http
GET  /v1/sessions/{sessionId}/runtime-bindings   → { runtimeBindings[] }（找 lifecycleState==="active"）
POST /v1/sessions/{sessionId}/runtime-bindings
  Headers: If-Match: <ETag>, Idempotency-Key: "runtime-binding:{sessionId}"
  Body: { agentId, runtimeRegistrationId, executionPlaneKind:"client-managed",
          placement, protocolFamily, adapterId, adapterVersion:"1",
          capabilitySchemaVersion:1, capabilities[], clientRequestId }
```

`executionPlaneKind:"client-managed"` 是关键字：**执行面归客户端（桌面）管理**，云端只做登记与派发，不承载执行流量。`If-Match` ETag 并发控制贯穿 agents/sessions 全部写操作（`@1511189`/`@1518130`）。

### 3.5 任务派发：Turn 拉取式调度

```http
POST /v1/runtime-registrations/{registrationId}/turns/claim   body {}    # 204 = 暂无任务
→ 200 { turn: { id, chatSessionId, issueId?, discussionId?, sourceMessageId?|commentId?,
                runtimeBindingId, runtimeRegistrationId,
                initiatedByUserId, executorUserId, agentId,
                prompt, attempt, startedAt } }

PATCH /v1/turns/{turnId}
  Body: { status, result?, error?, observedDefinitionSha256?, failureCode?, publicErrorSummary? }

GET /v1/turns/{turnId}                                    # 中断对账
```

客户端行为规范（自建服务端需兼容）：

- **claim 排空循环**：`drainAvailableTurns` 对每个 registration **连续 claim 最多 8 次**直到 204（`@1525003`），即服务端应支持同连接突发连发；
- **派发路由校验**：`issueId`/`discussionId` 互斥且必有其一，`runtimeBindingId`/`runtimeRegistrationId`/`initiatedByUserId`/`executorUserId` 必填，否则 409 `CLAIMED_TURN_SNAPSHOT_REQUIRED`（`@1524909`）——**这是服务端响应契约的强校验清单**；
- **回传 outbox**：本地先落库再异步回传，失败 5s 指数重试；404 视为终态重新入队对账；
- **失败三分类**：`AUTH_REQUIRED`（错误文案含 auth/token/认证/登录等）、`EXECUTION_INTERRUPTED`（canceled/interrupted）、`RUNTIME_EXECUTION_FAILED`（其余），`publicErrorSummary` 固定文案（`@1533121` `JP()`）；
- **Agent 定义一致性**：claim 返回 `agentId` 后本地 `resolveAgentDefinition` 并比对 `definition.contentSha256`（`observedDefinitionSha256` 随 PATCH 回传）。

### 3.6 增量事件流

```http
GET /v1/events?after={eventCursor}
  Accept: text/event-stream
```

- cursor 为**单调递增正整数**，客户端从 0 起，帧内 `id:` 大于本地 cursor 才推进；
- 事件类型 `event: collaboration`（discussion 变更）→ 触发 `refresh()` 全量拉取——**事件流只做"变更信号"，数据靠 REST 回读**，与移动端 `from_sequence_num` 续传模型同构但更简单；
- 断线重连：1s 起指数退避、30s 封顶；`aborted` 后不重连。

### 3.7 协作数据面（CRUD 汇总）

端点族（审计 JSON `endpoints.dynamic_templates` 全量）：`/v1/projects/*`、`/v1/issues/*`（含 `assign-executor`）、`/v1/discussions/*`、`/v1/discussion-messages/*`、`/v1/issue-discussion-links/*`、`/v1/squads/*`、`/v1/squad-runs/*`、`/v1/invitations/*`、`/v1/agents/*`（`PUT` + `If-Match`、`archive`）。写操作统一 ETag 并发 + 幂等键。本地降级桩清单（`@653609`）同时给出了**各端点的最小可用集**：项目设置/描述可本地化，而 Runtime Target、项目邀请必须连服务端——自建 MVP 的优先级即由此导出。

---

## 四、执行体与传输（桌面内部的最后一跳）

| 执行体 | 传输 | 协议 | 证据 |
|---|---|---|---|
| 本地 Agent 会话 | `@qoder-ai/qoder-cn-agent-sdk`：`ProcessTransport` / `WorkerTransport` | SDK 内嵌（`query/jobToken/getSessionMessages/forkSession/listSubagents` 等） | `@3587` import 表 |
| Remote-SSH 远程机 | SSH 启动 `remote-runtime`（**thin/full 双形态**，`QODER_REMOTE_SSH_FORCE_THIN` 可强制 thin；清单基址 `static.qoder.com.cn/qoder-app/releases/remote-runtime`） | **stdio JSON-RPC 式**：`system.hello{protocol}` 握手（45s 超时）→ 15s `system.ping` 心跳（45s 判死）→ `{kind:"cancel"\|"event"\|"stream", id, …}` 帧，stdin/stdout | `@415401-417347`、`@5835662` |
| IDE 会话窗口 | IDE 内 `agents-window`（lingma 线） | 拉取 `/api/v1/remote/environments` 选择执行环境 + `/sash/api/v1/*` GitHub 集成 | IDE `out/lingma/agents-window/…` |

> "Remote Host" stdio 协议本质是**传输无关的执行机协议**：SSH 只是把 stdin/stdout 隧道过去。自建架构下可用同一模型把执行机换成任意 NAT 后设备（含经 cloudflared 隧道的 SSH），而无需改协议。

---

## 五、深链归属澄清（qoder-cn:// 的真实处理方）

- **IDE 是 `qoder-cn://` 的系统级注册方**：deb 内 `usr/share/applications/qoder-cn-ide-url-handler.desktop` 声明 `MimeType=x-scheme-handler/qoder-cn-ide;x-scheme-handler/qoder-cn`，`Exec=… --open-url %U`；
- **App 侧**深链走 Electron `open-url`（macOS）/`second-instance`+argv（Win/Linux），统一进入 `fie` 队列服务：上限 20 条、600s 过期、`startListening` 后补放；
- 已识别的深链路由：`aicoding.aicoding-deeplink://mcp/add`（MCP 服务器安装提案，与眼镜配对无关——纠正移动端报告中"/approve 属眼镜配对"的表述适用范围：那是移动端 App 内的端点语义，桌面 MCP 安装确认走本地 UI 提案流）。

---

## 六、Cloudflare 连接器自建架构（云端控制节点方案）

用户决策：**云端控制节点采用 Cloudflare 连接器**。结合上文协议事实，给出映射与实施路径。

### 6.1 官方组件 → Cloudflare 映射

| 官方组件 | 职责 | Cloudflare 承载物 | 说明 |
|---|---|---|---|
| loop-server 控制面 | runtime 注册/心跳、turn 派发/回传、agents/issues/squads CRUD、SSE 事件流 | **Workers**（REST）+ **Durable Objects**（每会话/每 registration 一个 DO：turn 队列、SSE 长连接、cursor 单调序） | 拉取式 claim 模型与 Workers 无状态扩缩天然契合；DO 保序出队满足"同 registration 连发排空" |
| 数据库 | 项目/issue/discussion/agent 定义/turn 历史 | **D1**（SQLite，关系面）+ **KV**（定义 sha256 缓存） | 表结构可由审计 JSON 的 DTO 集直接导出 |
| 会话事件总线 | `user.message`/`agent.message`/审批事件 | **DO broadcast + D1 落库**（after=cursor 重放） | 移动端 SSE 与桌面 claim 共用同一事件存储，`sequence_num` 即 cursor |
| 产物/附件 | presign 直传直下 | **R2**（S3 兼容 API 自带 presign） | 对齐移动端 `presign_url, download_expires_at` 契约 |
| 认证 | accessToken/jobToken/deviceToken | **CF Access (Zero Trust) + Workers 自签 JWT**；PAT = Workers Secret | 三层凭据模型可原样保留（§3.2 表） |
| 移动端接入 | openapi 基址 | **Workers 自定义域**（如 `api.example.example.com`） | 移动端走 VPC 端点发现七基址覆盖（官方合法面）或直接改 `MobileApi` baseURL（qoder-ui v3.10.0 已参数化） |
| 桌面接入 | `QODER_SERVER_BASE_URL` | 同一自定义域 | 官方桌面客户端**零改动**接入 |
| 内网 PC 远程（替代"远端 PC 连接"） | SSH/文件/远程执行 | **cloudflared tunnel**：内网机跑 `cloudflared` 出站隧道，把 sshd/HTTP 服务映射为 CF 边缘域名，CF Access 策略门禁 | 桌面 App 的 Remote-SSH（§四）可直接把执行机指向该隧道域名（`~/.ssh/config` + askpass 环境变量族 `QODER_SSH_ASKPASS_*`） |
| 代码存储/编译 | git 语义 | GitHub/码云（`SessionSource{type,url,revision}` 通用 git 语义，无需自建） | 移动端报告结论不变 |

### 6.2 拓扑图

```
 [手机 App]                         [桌面 App/IDE]                     [内网 PC]
   │ SSE/REST                         │ QODER_SERVER_BASE_URL             │ cloudflared(出站)
   │ (MobileApi 已参数化)              ▼                                   ▼
   └──────────► ┌──────────────────────────────────────┐    ┌────────────────────┐
                │  Cloudflare 边缘（云端控制节点）        │    │ CF 边缘域名(隧道)   │
                │  Workers: /v1/* + /api/v1/remote/*    │◄───│ ssh.example(Access)│
                │  DO: TurnQueue / EventStream / Cursor │    └────────────────────┘
                │  D1: 协作关系数据   R2: 产物 presign    │
                └──────────────────────────────────────┘
```

三个入口共享同一事件存储与派发队列：手机经 REST+SSE 订阅，桌面经 claim 拉取，内网 PC 经隧道承接 Remote-SSH 执行——**云端控制节点自始至终不需要向任何一端发起入站连接**，这正是官方拉取式设计带来的部署红利，也是 CF 连接器方案的可行性根基。

### 6.3 端点实现清单（按优先级）

**MVP（打通"手机派任务→桌面执行→手机看结果"闭环）**：
1. `POST/PUT/POST/POST /v1/runtime-installations/*`（register/registrations/heartbeat/deregister）
2. `POST /v1/runtime-registrations/{id}/turns/claim`（204 语义）+ `PATCH/GET /v1/turns/{id}`
3. `GET /v1/events?after=`（SSE，collaboration 帧）
4. `GET/POST /v1/sessions/{id}/runtime-bindings`
5. `POST /api/v1/me/jobToken` + `/api/v1/jobToken/{refresh,exchange}`（凭据链）
6. 错误结构 `{error:{message,code,requestId}}` + `X-Request-ID` + ETag/If-Match + Idempotency-Key

**第二阶段**：agents/projects/issues/discussions/squads CRUD + `agent-runtime-targets` + `runtime-profiles`。

**第三阶段（移动端全量对齐）**：`/api/v1/remote/sessions/*` 族 45 端点（契约见 `docs/android-api-contract.json`，qoder-ui `MobileApi` 已按该契约实现客户端，可直接对拍）。

### 6.4 风险与边界

- loop-server 的**官方部署域不在客户端代码中**（全部经环境变量注入），官方云内网拓扑（手机网关 → loop-server 的服务端桥接）属推断：移动端 `/api/v1/remote/sessions` 与桌面 `/v1/turns` 在官方云内部如何互转，客户端不可证——但自建时两端由同一服务实现，**无此不一致问题**；
- `attempt` 重试语义、`waiting-user` 态的进入条件（审批暂停）需在自建时自定义策略；
- Turn 里 `prompt` 是云端下发文本，本地以 `agentId` 解析定义执行——自建可在此插入自有模型路由；
- CF Workers 出站 fetch 无限制，DO 计费按活跃时长——SSE 空闲需心跳保活（对齐 `event: heartbeat` 帧语义，客户端解析器已确认会跳过该帧，`@1449008`）。

---

## 七、证据索引与复跑指南

```bash
# 1) 重建桌面反编译现场（产物不入库）
curl -L -o /tmp/qoder-app.deb https://qoder-app.oss-cn-beijing.aliyuncs.com/qoder-app/releases/latest/Qoder-CN-linux-amd64.deb
mkdir -p pc/app_x && cd pc/app_x && ar x /tmp/qoder-app.deb && tar xf data.tar.xz && cd ../..
npx @electron/asar extract "pc/app_x/opt/Qoder CN/resources/app.asar" pc/asar_x
# （如遇 app.asar.unpacked 内 sharp 库缺文件报错：mkdir -p 缺失目录 + touch 空文件占位即可）

curl -L -o /tmp/qoder-ide.deb https://qoder-ide-cn.oss-cn-hangzhou.aliyuncs.com/qoder/release/lastest/qoder-cn-ide_amd64.deb
mkdir -p pc/ide_x && cd pc/ide_x && ar x /tmp/qoder-ide.deb && tar xf data.tar.xz && cd ../..

# 2) 控制面审计（本报告数据源）
python3 scripts/pc_cloud_audit.py --out docs/pc-cloud-audit.json

# 3) 上下文抽查（单行大文件窗口提取工具）
python3 scripts/pc_ctx.py pc/asar_x/out/main/index.js "claimRuntimeTurn" 380 6
```

本文全部偏移引用基于 `pc/asar_x/out/main/index.js`（5,931,013 B，2026-09-02 build）；不同版本偏移会漂移，定位请以 `scripts/pc_cloud_audit.py` 的常量表与关键词为准。配套数据：`docs/pc-cloud-audit.json`（端点 39 静态 + 59 动态模板、环境变量 121 项、协议常量 45/46 命中、IDE 信号 6/6 命中）。
