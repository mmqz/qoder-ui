# Qoder 安卓端连接架构逆向报告

**审计对象**：官方 Android 包 `com.qoder.mobile.cn v0.2.8(46)`（static.qoder.com.cn latest，2026-09-04 复核与上轮一致）｜ **方法**：apktool 2.10.0 资源 + jadx 1.5.1 反编译（9,761 类），网络层/数据层全量源码审计 ｜ **目的**：为"RustDesk/CF 连接器替代阿里云链路、GitHub/码云替代代码存储与云端编译"的自建方案提供实证依据

---

## 一、结论摘要（TL;DR）

**Qoder 手机端与桌面端之间没有直连，也没有 P2P**。三方链路是：

```
[手机 App]  ──HTTPS REST + SSE(长轮询事件流)──►  [云端网关 gateway.qoder.com.cn]  ◄──WebSocket/自有协议──  [桌面 App/CLI (bridge+worker)]
     ▲                                              │        │
     │                                              │        └── 对象存储签名 URL（产物/附件直传直下）
     └────────────── 厂商推送通道（小米/OPPO/荣耀/华为）+ SSE 兜底 ──┘
```

| # | 核心事实 | 证据 |
|---|---|---|
| 1 | 实时通道是 **SSE（Server-Sent Events）**，不是 WebSocket，不是阿里云 ACCS 长连接 | `Accept: text/event-stream` + `Last-Event-ID` 重放头 + `from_sequence_num` 续传参数（`repositories/a.java:982`，日志串 "Opening SSE stream url=…"） |
| 2 | 桌面以 **环境（Environment）+ 桥（Bridge）** 身份注册，worker 心跳经云端中转 | `EnvironmentDTO{bridge_info{machine_name,directory}, connection_status, max_sessions}`；`ControlSessionDTO{runner_type, worker_status, current_worker_epoch, last_heartbeat_at}` |
| 3 | 手机端有 **VPC 私有化模式**：可整组替换网关/推理/遥测基址——自建替代方案的官方原生入口 | `Y6/D3` 枚举 `{OFFICIAL_DEFAULT, VPC}`；`VPCServiceEndpointsResponse{centerNodes, inferNodes, nesNodes, openapiNodes}` |
| 4 | 代码存储官方路径已是 **GitHub**（GitHub App 授权流），会话来源 = `{type, url, revision}` 通用 git 语义 | `GitHubAuthorizationURLResponseDTO/GitHubInstallURLResponseDTO/GitHubBranchesResponseDTO`；`SessionSourceDTO{type,url,revision}` |
| 5 | 会话产出 = **git 仓库+分支回传**，产物文件走对象存储**预签名 URL** 下载；不存在手机端触发的"云端编译" | `SessionOutcomeGitInfoDTO{type,repo,branches}`；`ArtifactDownloadURLResponse{presign_url, download_expires_at}` |
| 6 | 执行主体在**桌面 worker**（agent runner），"沙箱预览"是云端时效端口转发授权 | `SandboxPreviewGrantRequest{session_id, port}` → `{grant, url, expires_at}` |

---

## 二、端点全景（实证清单）

### 2.1 域名基座

| 基址 | 默认值 | 用途 | 覆盖字段（E3.ServiceEndpointOverrides） |
|---|---|---|---|
| API | `https://openapi.qoder.com.cn` | 主 API（`/api/v1/...`） | `apiBaseURL` |
| 网关 | `https://gateway.qoder.com.cn` | inference（模型推理）+ feedback 默认基址 | `inferenceBaseURL` / `feedbackBaseURL` |
| Web | `https://qoder.com.cn` | WebView 白名单域 | `webBaseURL` |
| 其余可覆盖位 | — | broker / 动态文案 / 遥测 | `brokerBaseURL` / `dynamicContentBaseURL` / `telemetryBaseURL` |

配置中心 `G6.v`（C0430v）持三套访问器：`a()`=API 基址、`c()`=feedback、`d()`=inference，全部支持被 `E3` 七字段服务端覆盖；区域枚举 `D3 = {OFFICIAL_DEFAULT, VPC}`，默认区域常量 `"sgp"`。

### 2.2 API 路径族（全部自源码字符串提取）

| 路径 | 方法/形态 | 作用 |
|---|---|---|
| `/api/v1/remote/sessions/` | POST/DELETE/GET | 会话 CRUD（`…/{id}` DELETE 删除；`…/{id}/read`、`…/{id}/unread` POST 已读态） |
| `/api/v1/remote/sessions/{id}/events/stream` | **GET SSE** | 会话事件流（`Last-Event-ID` 头重放、`from_sequence_num` 续传） |
| `/api/v1/remote/environments` | GET | 环境（桌面/CLI）列表 |
| `/api/v1/remote/system-events/stream` | **GET SSE** | 全局通知事件流 |
| `/api/v1/mobile/me/devices/`、`/api/v1/mobile/devices/` | POST | 手机设备注册 |
| `/api/v1/mobile/app-versions/check` | GET | 版本检查 |
| `/api/v1/userinfo`、`/api/v1/me/usage`、`/api/v1/me/plan`、`/api/v1/me/verificationCodes` | GET/POST | 用户/用量/套餐/验证码 |
| `/api/v1/raw/upload`、`/api/v1/mix/upload` | POST | 文件上传（→ `CMAFileUploadResponse{file_id,filename,size_bytes,mime_type}`） |
| `/api/v2/service/ws/asr` | **WebSocket** | 语音识别（独立签名体系，见 §五.4） |
| `/api/crashsdk/validate` | POST | 崩溃 SDK 校验 |

### 2.3 网关路由头（SSE 与关键请求）

```
Authorization: <bearer token>
X-GwRoute-Token: <网关路由令牌>
X-Gw-User-Id: <用户 ID>
X-Qoder-Mobile-Device-Id: <本地生成设备 ID>
```

`X-Gw-*` 头族表明云端前置统一网关做路由/鉴权分流；日志中还观测到 **"SSE replay active: rerouting conversation-detail stream from=… to=…"**——网关支持把 SSE 流动态重路由到另一基址（灰度/多活），复现自建网关时需支持该头语义。

---

## 三、手机 ↔ 云端 ↔ 桌面：连接方式核心还原

### 3.1 角色模型

- **环境（Environment）**：一个可执行 agent 的目标 = 桌面 App 或 CLI。`EnvironmentDTO` 携带 `type`、`connection_status`（在线/离线——qm-environment 组件已复现该态）、`max_sessions`/`session_count` 并发上限；
- **桥（Bridge）**：`bridge_info{machine_name, directory}`——桌面端在云端的注册身份（机器名+工作目录）。**手机端从不连接 broker**：`brokerBaseURL` 在源码中仅被持久化与透传（`W6/C1262p2` 存储链路），无任何主动连接代码——broker 是桌面侧组件；
- **Worker**：`ControlSessionDTO` 的 `runner_type`/`worker_status`/`current_worker_epoch`/`last_heartbeat_at` 表明 agent 执行器跑在桌面，**心跳与状态经云端中转**给手机。

### 3.2 手机侧的实时面 = 两条 SSE

1. **会话流** `GET /api/v1/remote/sessions/{id}/events/stream`：`Accept: text/event-stream`；断线重连带 `Last-Event-ID`（服务端事件 ID）或 `?from_sequence_num=` 序号续传（"SSE replay" 语义）；
2. **全局流** `GET /api/v1/remote/system-events/stream`：任务状态变更/审批请求等系统级推送，同一 SSE 机制。

### 3.3 手机侧的控制面 = REST

- 建会话：`CreateSessionRequest{environment_id, title, origin, origin_ref_id, resources[], session_context{client_type, cwd, machine_name, sources[], permission_mode, workspace_id…}, device_context}`——**指定环境 ID**，由云端投递到该环境的桌面 worker；
- 控制指令：`ControllerEventsRequest{payload{content}}` 上报控制事件（远控交互）；
- 设备能力：`AndroidCapabilityRequestDTO{locale, sdk_int, notifications_enabled, package_variant, schema_versions, vendor_local_ready, vendor_protocol}`——推送通道能力协商。

### 3.4 对"连接远端 PC"的定性结论

手机控制远端 PC 的**全部链路都在云端网关汇聚**：无内网穿透、无 P2P 打洞、无直连 IP/端口。桌面掉线 = `connection_status` 变化，手机被动感知。这决定了替代方案的形态（见 §九）：**不需要替代某种直连协议，需要替代的是"网关+事件流+对象存储"三件套**。

---

## 四、代码存储与执行/产物链路

### 4.1 代码从哪来（会话输入）

| 通道 | 契约 | 说明 |
|---|---|---|
| Git 仓库 | `SessionSourceDTO{type, url, revision}` | 通用 git 语义：仓库 URL + revision（commit/branch）——**官方不限定 GitHub 托管**，桌面端执行 clone |
| 文件挂载 | `CreateSessionResource{type, file_id, mount_path}` | 文件先经 `/api/v1/raw/upload`/`/api/v1/mix/upload` 上传得 `file_id`，再挂载进会话（`CMAFileUploadResponse{file_id…}`） |
| GitHub 选择器 | `GitHubAuthorizationURLResponseDTO{authorization_url, state}` → `GitHubInstallURLResponseDTO` → `GitHubRepositoriesResponseDTO` → `GitHubBranchesResponseDTO` | **GitHub App 授权流**（服务端持有 token）：授权→安装→选仓库→选分支；集成状态 `UserIntegrationsResponseDTO{github}` |

### 4.2 结果到哪去（会话输出）

| 通道 | 契约 | 说明 |
|---|---|---|
| Git 回传 | `SessionOutcomeGitInfoDTO{type, repo, branches}` | 桌面 worker 把产出提交为**仓库分支**——代码改动以 git 分支交付，天然兼容任何 git 托管 |
| 产物下载 | `ArtifactListResponse` → `ArtifactDownloadURLRequest{path}` → `ArtifactDownloadURLResponse{presign_url, download_url, download_expires_at}` | 产物存对象存储，**预签名 URL 时效直下**（S3/OSS 同构协议） |
| 沙箱预览 | `SandboxPreviewGrantRequest{session_id, port}` → `{grant, url, expires_at}` | 会话内跑起 web 服务后，云端下发**时效端口转发 URL** 供手机预览——预览隧道也是云端转发 |

### 4.3 本地缓存

`data/local/`（Room）：`ArtifactCacheManifest/ArtifactEntry/ScopedArtifactEntry` 产物缓存清单、`SessionEntry/ThumbnailEntry` 会话与缩略图——手机端对产物做本地缓存（`ArtifactCacheManifest` 含清理语义，qm-settings 缓存清理子页已复现）。

---

## 五、鉴权体系

1. **登录族**（`features/` 实证）：手机验证码（`/me/verificationCodes` + `numberauth` 阿里云号码认证）、密码登录（`NativePasswordLogin*`）、**阿里云 OAuth**（`AliyunLoginUrlRequest{client_id, redirect_uri}` → `AliyunLoginUrlResponse` → `AliyunCallbackRequest`；RAM 账号族 `AliyunRAM*`，VPC/企业场景）、登录类型探测（`CheckLoginTypeRequest`）、Authorization Code 交换（`AuthorizationCodeExchangeRequest`）、刷新（`RefreshRequest`→`TokenRefreshResponse`）、SSO 设备令牌（`SSODeviceTokenResponse`）；验证码前端为阿里云 captcha（`o.alicdn.com/captcha-frontend/aliyunCaptcha`）。
2. **设备身份**：本地生成 `mobile_device_id` 持久化，注册 `/api/v1/mobile/me/devices/`，随 `X-Qoder-Mobile-Device-Id` 头携带。
3. **网关路由**：`X-GwRoute-Token` + `X-Gw-User-Id` 双头（与 Authorization 并行）。
4. **ASR 独立签名**：`/api/v2/service/ws/asr` 两套鉴权——`Cosy-User/Cosy-Key/Cosy-Date` 头（阿里 Cosy 语音系）或 `Authorization: Signature <sig>` + `X-Client-Timestamp`（本地 HMAC 签名器 `Q6.r`）。WS 基址由 HTTP 基址推导（`http→ws`，否则加 `wss://`）。

---

## 六、VPC 私有化模式（自建替代的官方原生入口）★

**这是本次逆向对用户方案最有价值的发现**：客户端原生支持整组替换服务端点。

1. **模式切换**：`D3 = {OFFICIAL_DEFAULT, VPC}`；登录域存在 `VPCLoginActivity`（qm-login 组件已复现 VPC 表单）。
2. **端点发现协议**：VPC 流程向用户提供的 VPC 服务地址请求端点清单：
   ```json
   { "centerNodes":  ["…"],   // → feedbackBaseURL + dynamicContentBaseURL
     "inferNodes":   ["…"],   // → inferenceBaseURL
     "nesNodes":     ["…"],   // → 独立节点族（用途未在手机侧消费，留待桌面侧分析）
     "openapiNodes": ["…"] }  // → apiBaseURL + brokerBaseURL
   ```
   任一节点族缺省时回退到用户输入的 baseURL；`telemetryBaseURL = <baseURL>/otel`（**OpenTelemetry** 遥测端点，自建服务需实现接收器）。
3. **注入实现**（`N2.g.S` 还原）：构造 `C3(D3.VPC, baseURL, E3(七元组))` 并持久化（`StoredServiceAccess{region, baseURL, 七基址…}`）。
4. **含义**：自建一套兼容服务（实现 §二 端点面 + §六 端点发现 + otel），手机端**无需改包**即可通过 VPC 模式接入——这是官方留出的合法接入面。

---

## 七、推送与辅助通道

| 通道 | 实证 | 状态 |
|---|---|---|
| 厂商推送 | 小米 `MIPUSH_RECEIVE`、OPPO/一加 `coloros.mcs`/`heytap.mcs`、荣耀 `hihonor.push`、华为角标；`QoderApplication` 引 `com.xiaomi.mipush.sdk.PushMessageHelper` | **CN 包主推送面** |
| FCM | `QoderFirebaseMessagingService` 在 Manifest **enabled=false** | CN 包禁用 |
| SSE 兜底 | `system-events/stream` 全局事件流 | 与推送并行 |
| 阿里云 ACCS/anet/agoo 长连接 SDK | 打包于 APK（com.taobao.accs 等），但 Qoder 主链路无初始化引用 | **未启用**（易误判，特此澄清） |
| 动态文案 | `LiveDynamicTextProvider` + assets/dynamic-content | 服务端可下发文案（`dynamicContentBaseURL` 可覆盖） |
| 反馈录屏 | `FOREGROUND_SERVICE_MEDIA_PROJECTION` + `ScreenRecordingForegroundService` | 前台服务 |
| 智能眼镜 | `GlassesPairingDeviceDTO/GlassesPairingResponseDTO` | 配对协议存在（本报告不展开） |

---

## 八、阿里云依赖清单（可替代面盘点）

| 依赖 | 用途 | 可替代性 |
|---|---|---|
| 阿里云 OAuth/RAM + 号码认证 + captcha | 登录族 | 自建 IdP（OIDC）可整体替换；手机端登录 UI 需对应改造 |
| OSS（presign 签名直传/直下） | 反馈附件、会话产物 | **任何 S3 兼容存储**（MinIO/R2/OSS 均同构）——客户端只消费 `presign_url`，不绑定厂商 |
| ACCS 长连接 SDK | 打包未启用 | 无需替代（不存在于链路） |
| EFS/ApmInsight（crash/性能） | 可观测 | Self-host Sentry/OTel（VPC 模式已预留 otel） |
| 阿里云 terms 协议页 | 法务 | — |

**关键澄清**：用户原认知"阿里云做链接远端 PC 的通道"不准确——**远端连接通道是 Qoder 自建网关（gateway.qoder.com.cn）+ SSE/REST**，阿里云只承担登录/存储/监控等外围。替代的主战场是**网关 + 事件流 + 对象存储**，而非某个"阿里云连接服务"。

---

## 九、替代方案映射（RustDesk / CF / GitHub / 码云）

### 9.1 连接远端 PC

| 官方组件 | 官方实现 | 用户方案落点 |
|---|---|---|
| 网关+事件流 | gateway.qoder.com.cn：REST + SSE（Last-Event-ID 重放） | **自建轻网关**（任一栈实现 §二 端点面）经 **Cloudflare Tunnel/Connector** 暴露——天然获得公网可达+TLS，等价替代网关的"可达性"角色 |
| 桌面信令 | 桌面 bridge 主动长连云端（手机端不可见 broker） | **RustDesk 自建**（hbbs/hbdr 中继+信令）承接"控制远端 PC"的屏幕/输入面；与自建网关并存：RustDesk 管桌控，自建网关管会话/任务事件 |
| 手机端接入 | 官方 App 仅认自家协议 | 两条路：① 官方 **VPC 模式**接入自建网关（零改包，需实现端点发现+otel，工作量在服务端）② 手机侧直接装 **RustDesk 客户端**管桌控、放弃官方 App 的会话面（最短路径） |

### 9.2 代码存储

- 官方路径本就含 **GitHub App 全流程**（授权/选仓库/选分支/分支回传）——GitHub 无需"替代"，官方原生支持；
- **码云（Gitee）替代点**：`SessionSourceDTO{type,url,revision}` 是通用 git 语义，桌面端 clone 不校验托管方——**Gitee 仓库 URL 可以直接作为会话来源**（桌面 CLI 驱动）；缺口仅在"手机端仓库选择器 UI"绑死 GitHub API，可用"手输 URL"或自建网关扩展 Gitee 端点补齐；
- 分支回传（`{repo, branches}`）同样是 git 原生语义，托管方无关。

### 9.3 "云端编译"

- 官方语义澄清：**没有手机触发的云端编译**——执行在桌面 worker（`runner_type/worker_status/heartbeat`），"沙箱预览"是云端端口转发授权；
- 替代建议：① 延续官方模型 = 桌面本地执行（无云端编译需求）；② 若确需无人值守云构建，用 **GitHub Actions / Gitee Go** 承接构建，产物推 S3 兼容存储出 presign URL——与官方产物链路协议同构（`presign_url + expires_at`），自建网关可直接复用该契约。

### 9.4 建议实施顺序

1. **先 RustDesk 自建**打通"手机→远端 PC"桌控面（小时级，无需任何逆向成果）；
2. **Gitee 仓库 + 桌面 CLI** 走通代码面（`SessionSource` 通用 git 语义已备好）；
3. 若要保留官方 App 会话体验 → **自建 VPC 兼容网关**（工作量：§二 端点面 + §六 端点发现 + otel；SSE 重放与 X-Gw 头族是两个关键兼容点），经 **CF Tunnel** 暴露；
4. 产物存储选任一 S3 兼容实现，出 presign URL 即兼容官方契约。

---

## 十、方法与局限

- **方法**：apktool 2.10.0（Manifest/assets/res）+ jadx 1.5.1（9,761 类）；网络契约以 `data/repositories/*JsonAdapter` 的 Moshi 线格式名为准（等价 API schema）；端点以源码字符串字面量 + 调用点交叉验证；配置链路以 `G6.v`/`Y6.C3/E3`/`N2.g.S` 三点还原。
- **局限**：① 桌面端（bridge/worker/broker 的桌面侧实现）不在 APK 内，其与云端的私有协议未知——本报告的手机侧证据只能证明"手机不直连"，不能给出桌面侧协议细节，如需完整 broker 协议需对 Windows/macOS 桌面安装包做同方法审计；② 两个方法体（`repositories/a.g0` 等）反编译失败，但其语义（服务端下发 URL + http→https 升级）已由 smali 佐证；③ `nesNodes` 的业务含义未在手机侧消费，标注为待桌面侧确认；④ 未做动态抓包（不做登录态下的流量分析），全部结论为静态实证。
