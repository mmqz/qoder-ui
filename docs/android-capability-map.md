# Qoder 安卓端代码能力完全解析

**审计对象**：官方 Android 包 `com.qoder.mobile.cn v0.2.8(46)` ｜ **方法**：apktool 2.10.0 + jadx 1.5.1（9,761 类全量），命名层 `com.qoder.mobile.*`（含 103 个 Moshi DTO）+ 混淆服务层（W6 341 类 / Y6 299 类 / G6 194 类 / k7 / p7 等）逐域还原 ｜ **定位**：本文是《移动端连接架构逆向报告》的续篇——那份回答"怎么连"，这一份回答"**能做什么、靠什么服务端契约**"。配套机器可读契约：`docs/android-api-contract.json`（端点 45 条 + DTO 全字段 + 枚举 + 控制指令面 + 签名算法）。

---

## 一、能力全景（TL;DR）

Qoder 手机端本质是一个**"AI 编码代理的遥控器"**：执行体在云端沙箱/桌面 worker，手机只做会话编排、审批、观测与产物消费。全部能力域如下：

| # | 能力域 | 手机端能做什么 | 服务端依赖 |
|---|---|---|---|
| 1 | 会话编排 | 创建/列表/分组/置顶/归档/删除/改名/已读态 | REST `/api/v1/remote/sessions/*` |
| 2 | 实时观测 | SSE 增量流 + REST 分页回填 + Room 缓存恢复的六源混合同步 | `events/stream` + `events` |
| 3 | **审批控制** | 工具审批（允许一次/总是/拒绝）/计划评审/AskUser 应答 | `control_response` 事件 |
| 4 | **指令下发** | 打断/结束/换模型/换权限模式/改名/准备产物 | `control_request` 事件（7 种 subtype） |
| 5 | 环境管理 | 桌面/CLI/云沙箱环境列表、连接态、可用模型与双模式（agent/experts） | `environments` |
| 6 | 代码源 | GitHub App 全流程 + 通用 git 来源 + 文件上传挂载 | `/sash/...github/*` + `/raw/upload` |
| 7 | 产物消费 | 产物树浏览/预签名直下/本地缓存/分享 | `artifacts` + `download-url` |
| 8 | 沙箱预览 | 会话内 web 服务时效端口转发预览 | `sandbox/grants` |
| 9 | 语音 | 自有 WebSocket ASR（非第三方 SDK）+ 语音润色 | `/api/v2/service/ws/asr` |
| 10 | 推送与活任务 | 厂商通道矩阵 + LiveActivity 聚合卡片（审批直达） | `push-tokens` + `system-events` |
| 11 | 认证与设备 | 四种登录 + 设备注册 + Tink 加密存储 + token 自动刷新 | `auth/*` + `devices/*` |
| 12 | 反馈/自更新/动态文案 | 录屏反馈/MD5 校验自更新/服务端下发文案 | `issue/*` + `app-versions` |

**关键定性**（对自建后端最重要的三个事实）：
1. **控制面契约完全闭合**——手机→桌面的全部指令就是 7 种 `control_request` subtype + 3 类审批应答体（§四），实现这些即可完整复刻"遥控器"；
2. **同步是六源混合模型**（§三.4）：Room 缓存先出 → REST 分页回填 → SSE 实时增量 → 本地派生，自建网关只需实现"REST 分页 + SSE 增量"两段语义即可获得同等的断线恢复体验；
3. **客户端零阿里云业务依赖**——业务链路（会话/审批/产物/GitHub）全部走 Qoder 自有网关，阿里云只在登录/OSS 策略/监控外围（§八）。

---

## 二、应用骨架

### 2.1 入口与导航

- **LAUNCHER = `DomesticLaunchActivity`**（noHistory 跳板）→ `MainActivity`（singleTask，承载全部深链）。主界面三 Tab：`Q2 = {WORKSPACE, CHATS, CLOUD}`（工作台/会话/云端沙箱）。
- **深链全表**（Manifest 实证）：

| Scheme/Host | 路径 | 用途 |
|---|---|---|
| `qodercn://` | `tasks` / `sessions` / `task-list` / `session` / `task-approval` | 任务/会话/审批直达（`task-approval` 配合 LiveActivity 审批按钮经 `TaskApprovalTrampolineActivity` 跳转） |
| `qoder-mobile://sso` | `/callback` | OAuth 回调（redirect_uri） |
| `qoder-mobile://sso` | `/phone-login` / `/password-login` | 登录方式深链 |
| `qoder-mobile://github` | `/callback` | GitHub App 回调 |
| `https://qoder.com`（autoVerify） | `/m/sessions`、`/m/session/*` | App Link |
| `https://daily.qoder.ai`、`https://test.qoder.ai`（autoVerify） | 同上 | 测试环境 App Link |
| `agoo://com.qoder.mobile.cn/thirdpush` | — | 友盟厂商推送点击落地（MfrMessageActivity） |
| `um.69dcba556f259537c797a50d` | — | 友盟 SDK scheme（= UMENG_APPKEY） |

### 2.2 组件清单（28 activity / 28 service / 11 receiver / 11 provider）

- **Qoder 自有 activity（12）**：登录族 7 个（LoginActivity/SmsLogin/PassportPasswordLogin/EnterpriseEmail/EnterpriseLoginOptions/VPCLogin/TermsAlert）+ SSOWebView + AuthLegalWeb + NumberAuthProtocolWeb + MainActivity/DomesticLaunch + TaskApprovalTrampoline + MfrMessage。
- **Qoder 自有 service（3）**：`NotificationPushService`（通知处理）、`ScreenRecordingForegroundService`（**全包唯一前台服务类型 mediaProjection**，MediaProjection+MediaRecorder 本地录屏，仅服务反馈功能）、`QoderFirebaseMessagingService`（**enabled=false**，国内包禁用）。
- **推送 service/receiver 矩阵**：友盟 ACCS 中枢（4 Umeng service + 4 ACCS ChannelService + Agoo 桥 4 个）→ 小米（:pushservice 独立进程）/华为（HmsMsgService）/OPPO·一加（DataMessageCallbackService）/荣耀（HonorMsgService）/vivo（CommandClientService + 自写 VivoPushMessageReceiver）。
- **Provider**：`ConversationImageFileProvider`（会话图片分享）、`ArtifactFileProvider`（产物文件分享）、通用 FileProvider（录屏视频/APK 安装）+ 第三方初始化 Provider 若干。
- **多进程**：主进程 + `:u_heap`（EFS 内存泄漏监控）+ `:pushservice`（小米）+ `:uploadLogProcess`（小米日志）。

### 2.3 权限清单（30 项分类）

网络 5（INTERNET/NETWORK_STATE/WIFI_STATE/CHANGE×2）；推送保活 11（POST_NOTIFICATIONS、各厂商角标/接收权限族）；前台服务 3（FOREGROUND_SERVICE、MEDIA_PROJECTION、DETECT_SCREEN_CAPTURE）；媒体 3（RECORD_AUDIO 录音、CAMERA、READ_MEDIA_IMAGES×2）；设备标识/风控 4（READ_PHONE_STATE、MSA/OAID、荣耀威胁检测、小米 XSOF）；安装包 1（REQUEST_INSTALL_PACKAGES，应用内自更新）；自定义 signature 权限 4。

**反证结论**：全源码 grep `vnc|remotedesktop|rtsp|screenstream` 零命中，MediaProjection 仅反馈录屏一处使用——**手机端不存在任何远程屏幕流/桌面控制直连组件**，"远程控制"全部是云端语义（§四）。

---

## 三、网络契约与同步模型

### 3.1 端点全景（45 条，机器可读版见 contract JSON）

按域分组（完整方法/请求/响应见 `docs/android-api-contract.json`）：

| 域 | 端点 | 要点 |
|---|---|---|
| 会话 | `POST/GET /api/v1/remote/sessions/`、`DELETE {id}`、`read/unread/archive` | CreateSessionRequest{environment_id, title, origin, origin_ref_id, session_context{cwd, workspace_type, workspace_id, project_name, machine_name, local_session_id, client_type, model, permission_mode, ide_session_mode, sources[], outcomes[]}, resources[], device_context} |
| 事件 | `GET/POST {id}/events`、`GET {id}/events/stream` | 分页 {data, has_more, next_after_sequence_num} + SSE 增量（Last-Event-ID/from_sequence_num） |
| 系统 | `GET /api/v1/remote/system-events/stream` | 五类系统事件 + notification + task.live_activity |
| 环境 | `GET /api/v1/remote/environments` | EnvironmentDTO{bridge_info{machine_name,directory}, connection_status, max_sessions, metadata{available_models_agent/experts, ide_available_session_mode}} |
| 认证 | `/app/auth/{token,logout,aliyun-ram/init,aliyun/callback}`、`/api/v1/me/verificationCodes` | PKCE S256 + client_id `c23680aa-…` |
| 用户 | `/api/v1/userinfo`、`/me/usage`、`/me/plan` | — |
| 设备 | `/api/v1/mobile/me/devices/`、`.../bind`、`/api/v1/mobile/devices/` | RegisterDeviceRequestDTO{mobile_device_id, platform, device_name} |
| 推送 | `.../push-tokens`、`.../push-tokens/{id}`、`.../configs/notification` | PushTokenRequestDTO{provider:'umeng', token, locale}；通知四开关 {task_completed, qa, ask_permission, plan_review} |
| 产物 | `{id}/artifacts`、`{id}/artifacts/download-url` | ArtifactListResponse 分组树 + presign_url 直下 |
| 沙箱 | `{id}/sandbox/grants` | {session_id, port}→{grant, url, expires_at} |
| 语音 | `WS /api/v2/service/ws/asr` | 自有协议 AsrWebSocketMessage 族 |
| GitHub | `/sash/api/v1/mobile/me/integrations/github/{authorization-url, install-url, connected, disconnect}` | GitHub App 全流程 |
| 眼镜 | `/sash/api/v1/glasses/pairings[/{id}/approve|cancel]` | 头 `x-qoder-appid: c23680aa-…` |
| 上传 | `/api/v1/raw/upload`、`/api/v1/mix/upload` | → CMAFileUploadResponse{file_id, …} |
| 反馈 | `/issue/oss/policy`、`/issue/image/upload`、`/issue/file/diagnose/upload` | HMAC 签名子域（§七.3） |
| 更新 | `/api/v1/mobile/app-versions/check` | has_update/force_update/md5/download_url |

### 3.2 请求头族

```
Authorization: Bearer <device_token>          ← 登录态
X-GwRoute-Token / X-Gw-User-Id                ← 网关路由/鉴权分流
X-Qoder-Mobile-Device-Id                      ← 本地 UUID 设备身份
x-qoder-appid: c23680aa-aa43-4e55-9a1e-146c6d752cdd   ← /sash 子域
X-Client-Timestamp + Authorization: Signature <hex>   ← 反馈子域 HMAC
```

### 3.3 网关重路由

SSE 建流时若服务端覆盖基址与默认不同，打点 `SSE replay active: rerouting conversation-detail stream from=… to=…`——网关支持 SSE 流动态重路由（灰度/多活语义），自建网关复刻时可忽略但需容忍该头/参数。

### 3.4 六源混合同步（Y6.W1 实证）

| 来源 | 机制 | 说明 |
|---|---|---|
| `CACHE_RESTORE` | Room `conversation_threads/events` 缓存反序列化 | 启动先出，秒开 |
| `REST_FULL` / `REST_INCREMENTAL` | `GET events` 分页（has_more + next_after_sequence_num，ASC/DESC） | 补齐/续接 |
| `OLDER_BACKFILL` | 上翻历史按 next_after_sequence_num 回填 | 聊天记录翻页 |
| `SSE_INCREMENTAL` | `events/stream` + Last-Event-ID 续传 | 实时 |
| `DERIVED_STATE` | 乐观回显 optimistic_user、审批队列合并、回合活动派生 | 纯本地 |

每批渲染项带来源标签进 `D6.c.p()` 统一去重（display_key 冲突加 `@occurrence:n`）。**自建建议**：实现"分页 REST + SSE 增量 + 客户端缓存"三层即可对齐体验，DERIVED_STATE 是纯客户端逻辑。

---

## 四、会话事件模型与控制指令面（遥控器的全部按钮）

### 4.1 事件信封与类型

`SessionEventDTO{event_id, session_id, sequence_num, source, event_type, payload, created_at, ephemeral}`。event_type ∈ {`message`, `tool_use`, `tool_result`, `control_request`, `control_response`, `control_cancel`, `control_cancel_request`}；role 由 source 派生：`user/controller→用户(控制器)`、`assistant/worker→AI(执行器)`、`system→系统`。

**message payload 关键 key**：`content`（多内容块：text / tool_use(别名 tool-use/tooluse) / tool_result / input_image，图片字段 image_url.url / source，支持三种 base64 data-URI 正则提取）、`delta`/`response.text`/`chunk`（流式兜底链）、`stopReason`（`end_turn` 回合结束 / `tool_use` 等待工具授权）、`system.interrupt`（打断语义，UI 替换为"已停止"）、`thinking_placeholder`（思考占位）、`optimistic_user`（本地乐观回显）。

**tool_use/tool_result 关键 key**：`name`/`tool_name`/`function_name`、`input`/`arguments`/`args`、`id`/`tool_use_id`、`parent_tool_use_id`（**子代理嵌套**）、`is_error`、`status`（running/pending/completed/failed 四态同义词归一）、`input.todos[]`（待办清单工具）、`subagent_type`/`role`/`name`（Agent 作者块）。

### 4.2 审批三卡（手机端的核心交互）

| 卡型 | kind (K0) | payload 来源 | 应答体（经 control_response） |
|---|---|---|---|
| 工具审批 | GENERIC/EXECUTION | request.tool_name + command 提取（command/rootCommand/cmd）+ 风险分组 Y3{WRITE,EDIT,READ,RAN} | `{outcome: proceed_once|proceed_always|cancel|reject, allowed: bool, payload: {feedback}}` |
| 计划评审 | PLAN_REVIEW | planContent + planPath | 批准 `{approved: true, permissionMode: 'default'}`；拒绝 `{approved: false, feedback}` |
| AskUser | — | tool_name=ask_user/askuserquestion + questions[] | `{outcome: 'proceed_once', allowed: true, payload: {answers: {问题ID: 答案}}}` |

审批状态机 `S0={PENDING, APPROVED, REJECTED}`；选项归一：`proceed_always_and_save/server/tool` → `proceed_always`。工具类型全集：FILE_EDIT/FILE_WRITE/FILE_READ/BASH/MCP/SEARCH/WEB_SEARCH/WEB_FETCH/UPDATE_TODOS/SUB_AGENT/IMAGE_GEN/SKILL/ENTER_PLAN_MODE/GENERIC。

### 4.3 控制指令面（手机→桌面 7 种 subtype）

`POST {id}/events` body `{"events":[{"event_type":"control_request","payload":{"type":"control_request","request_id":<uuid>,"request":{"subtype":…},"uuid":"control-request:<id>"}}]}`：

| subtype | request 体 | 用途 |
|---|---|---|
| `interrupt` | `{subtype:"interrupt"}` | 打断当前回合 |
| `end_session` | `{subtype:"end_session", reason:"user_requested"}` | 结束会话 |
| `set_model` | `{subtype:"set_model", model:<id>}` | 切换模型 |
| `set_permission_mode` | `{subtype:"set_permission_mode", mode:<default|acceptEdits|plan|bypassPermissions>}` | 切换权限模式 |
| `session_title_changed` | `{subtype:"session_title_changed", title:<=255, source:"custom"}` | 改名 |
| `prepare_artifact` | `{subtype:"prepare_artifact", path:<路径>}` | 请求准备产物 |
| `control_cancel_request` | `{request_id, uuid:"control-cancel-request:<id>"}` | 撤销未决审批 |

**没有** follow_up/stop/resume 指令——后续追问就是发普通 message 事件。发送前统一注入 Bearer/X-Gw 头（W6.O0.h()）。

### 4.4 回合活动与多智能体呈现

- `AGENT/EXPERTS`（EnumC1457s3）是 **IDE 会话双模式**，环境元数据按模式给可用模型（available_models_agent / available_models_experts）；
- 回合活动面板聚合：`TurnActivity{todo: Todo{toolUse, items}, agents: [Agent{toolUse, isExpert, expertAvatarIndex}]}`，UI 显示「N agents / N experts / todo x/y」；
- "专家"呈现 = SUB_AGENT 工具卡（subagent_type/role/name）+ parent_tool_use_id 嵌套 + experts 计数，无独立事件流；
- 会话元数据回执：external_metadata{model, permission_mode, available_models[{model_id, price_factor, discount_factor, is_default, promotion, window…}], current_permission_mode}——**计价因子随模型下发**。

---

## 五、本地持久化

### 5.1 Room（QoderDatabase，4 表）

- `conversation_threads`（33 列）：会话列表缓存全量投影（title/status/phase/tagsJson/unreadCount/isPinned/connectionStatus/sessionStatus/environment*/project*/workspace*/latestSequenceNumber/latestEventID/model…）；
- `conversation_events`（8 列）：eventId/threadId/sequenceNumber/source/eventType/**payloadJson**/createdAt/sortOrder——事件缓存就是原始 JSON 落库；
- `answered_requests`（requestId, threadId）：已应答审批去重；
- `environment_list_cache`（id, payloadJson, updatedAt）：环境列表缓存。

### 5.2 加密存储与键空间

`EncryptedSharedPreferences("qoder_encrypted_prefs")`（androidx security-crypto：keyset AES256_SIV / value AES256_GCM，主密钥 AndroidKeyStore `_androidx_security_master_key_`）。键全集：`auth.session`（StoredSession JSON：userId/userName/userAvatarUrl/userEmail/userOrganization*/accessToken/refreshToken/expiresAt/refreshTokenExpiresAt/serviceAccess）、`mobile_device_id`、`fcm_token`、`push_token_id`、`qoder_machine_token`、`live_activity_token_*` 族、`live_task_activity_state`、`account_deletion.pending_cleanup.v2`。

### 5.3 DataStore（Preferences）

`workspace_prefs` / `language_prefs`（ENGLISH|CHINESE）/ `appearance_prefs` / `update_fatigue_prefs`（更新疲劳抑制）。

---

## 六、认证、设备与推送

### 6.1 四种登录流

| 方式 | 链路 | 关键契约 |
|---|---|---|
| 短信验证码 | 阿里通行证 `passport.aliyun.com/havanaone/loginLegacy/sms/login.do` → 换 Qoder token | 本地验证码 `POST /me/verificationCodes{channel, scene}`；阿里侧信封 + `AliyunCallbackRequest` → `/app/auth/aliyun/callback` → `/app/auth/token` |
| 密码 | 原生 `NativePasswordLoginRequest{email, password, client_id}` | 响应 NativePasswordLoginResponse{device_token, refresh_token, expires_at, refresh_token_expires_at, is_new_user…}；登录类型探测 CheckLoginTypeResponse{login_type, organization_id, sso_url, require_sso}（企业 SSO 分流） |
| 阿里云 OAuth/RAM | PKCE：`/app/auth/aliyun-ram/init{client_id, redirect_uri, code_challenge, code_challenge_method:S256}` → 浏览器授权 → `AuthorizationCodeExchangeRequest{grant_type, code, redirect_uri:qoder-mobile://sso/callback, code_verifier}` → `/app/auth/token` | SSODeviceTokenResponse；RAM 账号族 AliyunRAM*（企业/VPC 场景） |
| 一键登录 | 阿里号码认证 SDK（com.mobile.auth，CMCC/CUCC/CT 三网）`loginLegacy/sim/simLogin.do{spToken}` → `/app/auth/token` | 一键登录环境探测埋点 login_one_click_env_checked |

登录阶段状态机 `g7.j`：LOGIN_TYPE_CHECK → … → QODER_TOKEN_EXCHANGE → USER_INFO_FETCH → SESSION_PERSIST。错误枚举 `Y6.L`（含 ACCOUNT_BANNED/CAPTCHA_FAILED 等 12 态）。登出：`POST /app/auth/logout` → 清 auth.session → push_unregister → live_activity_cleanup → conversation_cache（登出编排状态机）。

### 6.2 Token 生命周期

- 存储：`auth.session` 加密 JSON（§五.2）；
- 刷新：距 expiresAt ≤ 3600s（refreshLeeway）时自动 `RefreshRequest{refresh_token}` → `TokenRefreshResponse`；Bearer 注入统一拦截器 + CredentialSnapshot(epoch, token, refresher) 保证并发请求凭证一致；
- 401/过期不可刷新 → 清会话回登录。

### 6.3 设备注册与推送 token

1. 首启生成 `mobile_device_id`（UUID）入加密存储；隐私同意后 `POST /api/v1/mobile/devices/` 注册，登录后 `POST /api/v1/mobile/me/devices/{id}/bind` 绑定用户；
2. 推送 token：厂商 SDK（友盟 agoo registrationId / vivo RegId / FCM）→ `PushTokenRequestDTO{provider:'umeng', token, locale}` → `POST .../push-tokens`，响应 id 存 `push_token_id`（缺 device_id 时延迟重试）；
3. 能力协商 AndroidCapabilityRequestDTO{locale, sdk_int, notifications_enabled, package_variant, schema_versions, vendor_local_ready, vendor_protocol}；
4. 通知偏好：`GET/PUT .../configs/notification` 四开关 {task_completed, qa, ask_permission, plan_review}；
5. 应用内推送队列决策 `j7.EnumC2560b`：去重 DISPLAYED / 排队 QUEUED / 窗口内重复 DUPLICATE / 队列满(≥3) QUEUE_FULL / 宿主不可用 HOST_INACTIVE。

### 6.4 LiveActivity（Android 端"灵动岛"等价物）

服务端经 system-events 下发 `task.live_activity`，严格 schema `task_aggregate_v1`：聚合 ≤3 个任务卡（session_id/display_title/state/progress{current,total}）+ overall_state + 审批直达 `attention{request_id, actions:[ALLOW, REJECT], expires_at}` + completion_stats{files_changed, added, deleted} + machine_name/directory + 解码失败降级 fallback{titleKey, bodyKey…}。生命周期绑定按用户哈希键迁移（live_activity_token_active_binding:sha256(uid)），呈现层状态机含 superseded/user_dismissed/collision 等。

---

## 七、安全机制

### 7.1 传输与存储

- 传输：TLS + Bearer + 网关双头（X-GwRoute-Token/X-Gw-User-Id）；
- 存储：全部敏感键走 Tink/AndroidKeyStore 加密（§五.2），**未发现明文 token 落盘**。

### 7.2 设备身份

mobile_device_id 本地 UUID 自管（服务端不参与生成），请求头全量携带，日志侧有脱敏正则。

### 7.3 HMAC 签名器（反馈/诊断子域，完整算法还原）

```
key  = hex(SHA256("cosy" + ":" + clientVersion))     # 种子 = Base64(reverse("==Qez92Y"))
msg  = METHOD \n PATH(去?后缀) \n BODY \n version \n unix秒 \n hex(SHA256(contentLength))
sig  = HmacSHA256(msg, key) 小写 hex
头   = X-Client-Timestamp: <unix秒> + Authorization: Signature <sig>
```

另有 COSY 双通道鉴权（AES-CBC info + RSA 公钥包 AES key → `Authorization: Bearer COSY.…`），用于 ASR 语音链路。自建后端若不复刻反馈子域可跳过；若复刻，以上即全部规格。

---

## 八、第三方 SDK 与阿里云依赖终版清单

| 依赖 | 职责 | 主链路引用 | 可替代性 |
|---|---|---|---|
| 友盟全家桶（umeng+ACCS+agoo, 775 类） | 统计 + **推送中枢**（厂商通道桥接） | 是（40 文件） | 自建推送：厂商通道直连或统一 SSE 兜底 |
| 小米/华为/OPPO/荣耀/vivo 推送 | 厂商通道 | 是 | 同上 |
| com.mobile.auth + cmic/unicom/CT | 一键登录三网 | 是（22 文件） | 自建 IdP 后可整体移除 |
| 阿里无线保镖 securityguard | 登录风控 | 是（1） | 可移除 |
| EFS/UC crashsdk/xCrash/nirvana/uyumao(反作弊插件) | 监控/崩溃/设备 ID | 外围 | Self-host Sentry/OTel |
| Tink + androidx security-crypto | 本地加密 | 是 | 标准库，保留 |
| GMS 登录 | 海外登录（CN 包枚举留存） | 弱 | 视市场 |
| JLatexMath/AndroidSVG/Coil/OkHttp | 渲染/图片/HTTP | 是 | 标准库，保留 |

**阿里云依赖最终定性**：业务零依赖（会话/审批/产物/GitHub 全走自有网关），外围四项 = 登录（OAuth/号码认证/captcha/保镖）、OSS 直传策略（反馈/诊断）、监控（EFS/UC）、法务协议页。前两项自建时由 OIDC + 任意 S3 兼容存储替代（§九）。

---

## 九、自建 Rust/TS 后端实现清单（从本解析直接落地）

按优先级排序，全部契约已在 `docs/android-api-contract.json`：

1. **核心闭环（必须）**：会话 CRUD + events 分页 + events/stream SSE（Last-Event-ID 重放 + from_sequence_num 续传）+ environments + control_request/control_response 七 subtype + 三类审批应答体 + 网关双头。≈ 一周工作量（SSE 重放语义是唯一难点）。
2. **产物与上传**：raw/mix upload（file_id 挂载）+ artifacts 树 + presign 直下（任意 S3 兼容存储出 `presign_url + download_expires_at` 即同构）。
3. **GitHub 面**：官方 App 绑死 GitHub App 流（`/sash/...`）；自建可先不做——手机端支持手输 git URL？**不支持**（SessionSource 由 composer 注入，桌面端才可手输）；替代路径 = 自建网关把 Gitee 仓库映射为 `sources[{type:'git', url, revision}]`（桌面 worker clone 时托管方无关）。
4. **推送面（可后置）**：SSE 兜底先行；厂商通道可接统一推送服务或复用友盟个人版；`configs/notification` 四开关建议实现（设置页依赖）。
5. **认证面**：四种登录任选其一（密码最简：NativePasswordLogin 契约固定）；token 刷新 3600s leeway 语义照抄；设备注册 bind 流简单。
6. **不做也不影响**：HMAC 反馈子域、COSY/ASR（语音可自选第三方）、LiveActivity 聚合卡（无厂商推送时可退化为普通通知）、眼镜配对、云沙箱 boot 状态机（若不提供云沙箱环境）。

**风险提示**：`W6` 服务层两个核心方法体（payload 主解析器/refresh 调用）jadx 反编译失败，但其线格式已由 Moshi 适配器与调用方完整佐证；桌面端 worker↔云端私有协议仍不在本 APK 内（需桌面包审计，见连接架构报告 §十）。

---

## 十、方法与局限

- **提取器**：`scripts/android_capability_extract.py`（线名 `F0.A1` × 构造器参数 zip → 103 DTO 全字段）+ 全局字面量扫描（端点/枚举/状态机/字符串键域）；三路子任务深挖（Manifest+SDK / 事件语义+控制面 / 认证+设备+持久化+安全+自更新）。
- **局限**：① 两处核心方法体反编译失败（线格式不受影响）；② 云沙箱 boot 状态机（cloud_sandbox_boot.* 21 键）仅还原键面，未逐态验证服务端交互；③ 混淆 UI 层（p7 等）仅按字符串键域归纳，未逐屏还原；④ 全部结论为静态实证，未做动态抓包。
