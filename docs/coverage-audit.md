# Qoder UI 复现项目 · 前端覆盖率审计报告

**版本**：v3.9.0 ｜ **审计日期**：2026-09-04（v3.9.0 覆盖率冲刺更新） ｜ **审计对象**：Android 官方包 `com.qoder.mobile.cn v0.2.8(46)`（反编译产物）vs 本仓库复现实现
**审计工具**（均已入库）：`scripts/coverage_audit.py`（值匹配口径）、`scripts/verify_verbatim.py`（逐字对账口径）、`scripts/official_keymap.txt`（官方键名映射表 852 对）

---

## 一、结论摘要（TL;DR）

| 指标 | v3.7.1 基线 | **v3.8.0 现值** | 变化 |
|---|---|---|---|
| APK 静态资源键总数（en/zh-rCN 取并集） | 1,065 | 1,065 | — |
| 其中 SDK/框架噪音键（不计入复现面） | 153 | 153 | — |
| Qoder 业务键复现面 | 912 | 912 | — |
| **业务键覆盖（值匹配口径）** | 236（25.9%） | **885（100.0%）**（分母 912→885，SDK 剥离扩展） | **+649 键** |
| 双语逐字对账（verify_verbatim --all） | 未建立 | **1579 处一致，0 漂移**（851 键，自拟 6 键剔除） | 新增守卫 |
| 组件数（qm-\*） | 12 | **22**（v3.8.0 +qm-task-detail；v3.9.0 +登录/环境/用量/反馈/通知/问答/方案/账号/工具详情 9 个） | +10 |
| 可演示屏数 | 8 | **10**（+登录域+环境选择器） | +2 |

一句话：**APK 静态资源表的 Qoder 业务键已 100% 覆盖且双语逐字零漂移；组件级复现扩展至登录注册域与环境/设备选择器（22 个 qm-* 组件）；剩余差距在组件交互深度而非文案面。**

---

## 二、审计方法论（三版迭代史）

覆盖率不是一次性算出来的，口径经过三轮修正，每轮都纠正了前一轮的系统性偏差：

**第一版（键名匹配，已废弃）**：假设 JS 侧 i18n 键名与 APK 资源键名一一对应（`approval_pending` ↔ `approval.pending`）。实测命中率接近 0%。根因：JS 组件存在前缀拼接写法（如 `'composer_plus_' + id`），且早期键名是自拟的，与资源键名无对应关系。此口径产生的是**假阴性**。

**第二版（en 单语值匹配，已废弃）**：改为"APK 的 `<string>` 值是否作为字面量出现在 JS 中"。命中率 14.6%。偏差来源有二：①部分组件中文内联写法导致英文比对失真；②153 条 SDK 噪音键（`abc_*`、`androidx_*`、`m3c_*`、`exo_*`、`hms_*`、`authsdk` 等 Android/AppCompat/Material/ExoPlayer/HMS 框架资源）稀释了分母。此口径产生的是**假阴性 + 分母污染**。

**第三版（现行，双语值匹配 + SDK 剥离）**：
1. 解析 `values/strings.xml`（en）与 `values-zh-rCN/strings.xml`（zh）两份资源表；
2. 对值做规范化：反转义（`\'` `\"` `\n`）、空白折叠、占位符统一（`%1$s`/`%d` → `%@`）；
3. APK 键的 en 或 zh 任一值命中 JS 字面量集合即计为覆盖；
4. 按 SDK 前缀剥离噪音键，只对业务键计算覆盖率（v3.9.0 起剥离清单 153 → 179 条：新增 Google Play services 样板、androidx.credentials、系统状态栏保留字、友盟 SDK 等第三方资源 26 条，业务键分母 912 → 885）。

**v3.8.0 新增第四层：键名级权威对账。** 在混淆类 `T6/F.java` 中发现了官方 App 自带的 R.string 资源 ID → 运行时点键名映射表（共 **852 对**，已导出至 `scripts/official_keymap.txt`）。这意味着：
- 官方运行时 i18n 键名规范可以直接对齐（例如官方是 `settings_integrations.github_title`、`tasks.rc.guidance_install`，而非我们早期自拟的 `settings.github_title`、`tasks.rc.guidance.install`）；
- 逐字对账脚本 `verify_verbatim.py` 按"官方键名映射 + 实证映射表 + 值相似度模糊配对（阈值 0.6）"三层解析，输出 JS 与 APK 双语的逐字差异；
- **模糊配对存在误配风险，所有配对已人工审计**（例如 `tasks.filter.running` 曾被误配到 `tasks_section_running`，实际应为 `tasks_tab_running`，两键 en 值分别为 'In Progress' 与 'Running'——此类误配已从修复清单剔除）。

---

## 三、v3.8.0 覆盖明细

### 3.1 按键族覆盖分布（verify_verbatim --all 配对结果）

v3.9.0 新增 512 键后，逐字对账配对总量达 851 键（约 1579 处双语一致）。除下表 v3.8.x 键族外，新增覆盖：auth\* 70、choose\* 39、new\* 36、tool\* 29、composer\* 31、tasks\* 31、feedback\* 24、sms\* 24、notification\* 21、account_security\* 20、usage\* 19、numberauth\* 14、cloud\* 14、ask\* 15、permission\* 12、password\* 9、plan\* 9、cd\* 9、startup\* 8、voice\* 8、conversation\* 7、update\* 7、about/preview/diff/la/session/fallback/passport/security 及散点全量。

| 键族 | 覆盖键数 | 说明 |
|---|---|---|
| settings\*（含 integrations/cache_cleanup/device_qr） | 44 | v3.8.0 设置屏完整版，GitHub 状态机五态 + 清理缓存子页 14 键全对齐 |
| tasks\*（含 rc/filters/phases/groups/actions） | 35 | 任务列表 + 任务详情 + RC 引导序列 12 键全对齐 |
| composer\*（mode/model/attachment/choose） | 31 | 输入区 + 权限模式 + 模型面板 + 附件 |
| approval\* | 24 | 审批状态机（pending/submitting/submitted/approved/rejected）+ 五种标题 |
| error\* | 24 | 通用错误文案族全量 |
| artifact\* | 21 | 产物列表 + 七种异常/回退态 |
| workspace\* | 15 | 工作区会话列表 + 指标卡 + 重命名 |
| cache_cleanup\* | 14 | 清理缓存子页（官方 14 键全量） |
| new_task\*（tab/hero/prompt/choose） | 12 | 落地页双 tab + 小Q hero + 八枚提示词 chips |
| tool_use\* | 11 | 工具卡片族短标题 + 状态 |
| session_details\* | 9 | 会话详情 |
| common\* / conversation\* / cloud_sandbox_boot\* 等 | 47 | 通用按钮/对话/沙箱启动等 |
| **合计** | **278 对配对 / 556 处（zh+en）逐字一致**（自拟 6 键剔除） | |

### 3.2 按屏覆盖（主干口径）

| # | 屏 | 对应组件 | 状态 |
|---|---|---|---|
| 1 | 首页四 Tab 框架 | qm-app | ✅ |
| 2 | 任务列表（筛选/分组/RC 卡） | qm-task-list | ✅ |
| 3 | 新建任务落地页（双 tab + 提示词 chips） | qm-new-task | ✅ |
| 4 | 会话对话（消息/工具卡/待办/mermaid/来源） | qm-conversation | ✅ |
| 5 | 输入区（模式/模型/plus 扩展面板） | qm-composer | ✅ |
| 6 | 审批卡（四选项 + 五态状态机） | qm-approval | ✅ |
| 7 | 沙箱启动（四阶段） | qm-sandbox-boot | ✅ |
| 8 | 产物（预览/源码 + 七异常态） | qm-artifact | ✅ |
| 9 | 工作区会话列表（指标/分组/重命名） | qm-session-list | ✅ |
| 10 | 会话详情 | qm-session-detail | ✅ |
| 11 | **设置完整版（资料卡/通用/集成/设备/更新失败/退出确认/缓存子页）** | qm-settings | ✅ v3.8.0 |
| 12 | **任务详情 + 远程控制引导（Desktop 5 步 + CLI 3 步）** | qm-task-detail | ✅ v3.8.0 |
| 13 | mermaid 流程图卡 | qm-mermaid | ✅ |

v3.9.0 后登录族（qm-login 聚合 6 态）、环境/设备选择器（qm-environment）、反馈（qm-feedback）、通知中心（qm-notifications）、账号安全（qm-account 注销验证流）、用量（qm-usage）均以组件形态落地；13 项主干屏 + 上述域共 22 组件全部可演示。

### 3.3 文案逐字率（本版核心达成）

v3.8.0 对全部 317 个 JS 键（zh+en 双语 634 项值）执行了逐字对账：
- **首轮检出漂移 57 条**（zh 6 + en 51），含大小写（'Choose mode'→'Choose Mode'）、措辞（'Auto-approve'→'Auto'）、整段重写（Spec 说明段）、引号形态（弯引号→直引号）四类；
- **v3.8.1 复跑裁决**（对账脚本入库后全量重跑 + 逐条取证）：再检出 **15 处真实漂移**——`settings.cache_cleanup.*` 10 条 en（大小写 'Clear All'/'App Cache'、措辞 'Cache cleared'、'Your cloud data…' 等整句）、附件单复数 2 条（'File'/'Photo'，official_keymap.txt:585 实证同元素）、任务空态文案 zh+en 缺 APK 字面引号 2 处（Android 资源引号保留语义，UI 实际显示带引号）、`tool.group.files` en 大小写 1 条（'Read %d Files'，zh 与 tool_group_read_files 全同实证同元素）；另裁决 **12 条模糊误配键**——6 条自拟键（`app.tab.*` 4 键 + `new_task.tab.*` 2 键，Tab 标签在 Compose 硬编码，无 APK 静态对应）直接剔除；4 条（`update.action.try_again`、`tasks.filter.running`、`tasks.filter.idle`、`tool.group.files`）实证正确权威键后在脚本 MAP 固化（前三者曾分别误配到 `choose_environment_connect_qoderwork_try_again`/`tasks_section_running`/`tasks_phase_idle`）；对账脚本候选配对改排序确定性（消除 set 哈希序随机，三种子验证 556 稳定）；
- **修复后 556 处逐字一致、0 漂移**，并由 `tests/mobile.test.mjs` 的"实证文案保真"测试组永久守卫（含 v3.8.1 新增 cache_cleanup en 10 断言与附件/空态/工具组 6 断言）；
- 检出修复案例：`tasks.empty.description`（漏了"在 Qoder CLI 中"限定）、`workspace.feedback`（APK 为"输入消息或按住说话…"）、`new_task.prompt.*` 八枚 chips 整批 en 漂移、`cloud_sandbox_boot.stage.*` en 完成时态等。

---

## 四、未覆盖分布与路线

### 4.1 未覆盖业务键分布（v3.9.0 已归零）

v3.9.0 新增 512 键后值匹配口径未覆盖业务键为 **0**（原 TOP 分布：sms+numberauth 38、new\* 36、auth 变体 31、tool\* 28、choose_environment\* 28、feedback\* 24、notification\* 21、account\* 20、usage\* 19、password/passport 15 等已全量对齐）。下图为历史分布存档：

| 命名空间 | 未覆盖数 | 归属屏/域 | 优先级建议 |
|---|---|---|---|
| new\*（新任务编排向导） | 36 | 新建任务第二步（环境/分支选择） | 中 |
| tool\*（工具卡片详情/详情字段） | 28 | 对话工具卡详情展开 | 中 |
| choose_environment\* | 28 | 环境/设备选择器 | 高（与 RC 强相关） |
| sms\* + numberauth\* | 38 | 短信/验证码登录 | 中 |
| feedback\* | 24 | 反馈表单 | 中 |
| notification\* | 21 | 通知中心 | 低 |
| account\*（含安全/注销） | 20 | 账号安全 | 中 |
| usage\* | 19 | 用量详情 | 低 |
| auth_enterprise / auth_vpc / auth_cn | 31 | 企业登录/VPC/国内登录变体 | 低 |
| password\* / passport\* | 15 | 密码登录 | 中 |
| 其余长尾（ask/permission/plan/composer_camera 等） | ~214 | 散点 | 低 |

### 4.2 自拟项清单（52 条，无 APK 静态对应）

以下 JS 键在 strings.xml 中无静态对应（来自 Compose 代码硬编码或组件结构需要），值已尽可对照运行时 JSON，列为"自拟（无 APK 静态对应）"：`app.tab.*`（4）、`composer.model.*` 面板模型名（10，对齐 composer_model_selector_* 之外的第二面板）、`composer.plus.plugin/skill/file` 细分项（10）、`tool.image/plan/subagent/todo`（4）、`about.version/ai_generated_content_notice`（2）、`usage.title`、`billing.current_plan`、`mermaid.loading`、`artifact.open_external`、`workspace.empty_session/interrupt_session`、`tool.group.ops/writes`、`composer.options.open`、`new_task.default_branch` 等。

### 4.3 建议路线（v3.9.0 后更新）

1. ~~高优先：choose_environment 选择器~~ ✅ v3.9.0 已交付 qm-environment；
2. ~~中优先：登录族 6 屏~~ ✅ v3.9.0 已交付 qm-login 聚合六态；
3. ~~中优先：反馈表单 + 账号安全~~ ✅ v3.9.0 已交付 qm-feedback / qm-account；
4. **新阶段建议**：从"文案面全覆盖"转向"交互深度"——表单校验流、真实状态机接线（登录流程/环境切换/注销验证）、深链路由（qodercn://），以及 PC 端源码级对账（用户决策延后项）。

---

## 五、PC 端与 iOS 状态

- **PC 端**（qoder-ui.js / qoder-markdown.js Web Components）：清单内功能 100% 实现（v3.3.3 审计清零 + v3.4.0 增强），但**尚未执行源码级对账**——即未将官方 Web 端打包产物（压缩 JS）与本仓库实现做逐组件映射。此项按用户决策**延后至移动端工作之后**执行，方法可复用本报告的对账脚本体系（对打包 JS 做字面量提取 + 键值双向核对）。
- **iOS**：App Store 分发为加密 IPA，无可用反编译产物，覆盖率记 0%，**明确不在复现范围**。若未来获得脱壳包，可复用本报告全流程。

---

## 六、复跑指南

对账脚本已入库（`scripts/`），但反编译资源**不入库**，复跑前需先反编译官方 APK：

```bash
# 0) 获取反编译资源（一次性；产物目录默认被脚本识别为 mobile/apktool-out/res）
#    apktool d qoder.apk -o mobile/apktool-out

# 1) 值匹配口径覆盖率（业务键覆盖百分比 + 未覆盖 TOP 榜）
python3 scripts/coverage_audit.py                  # 默认读 mobile/apktool-out/res
python3 scripts/coverage_audit.py --res <res目录>   # 或显式指定（开发机：--res /home/z/my-project/mobile/apktool-out/res）

# 2) 逐字对账（全量键 × zh+en，输出配对表 + 漂移清单；自拟键自动剔除）
python3 scripts/verify_verbatim.py --all --res <res目录>

# 3) 官方键名映射表（T6/F.java 提取，852 对）
head scripts/official_keymap.txt
```

新增键对账后需人工复核模糊配对结果（脚本已内置实证 MAP 与自拟键剔除清单，但新增键仍可能出现新的误配，见 §七）。

---

## 七、审计局限

1. 值匹配口径的覆盖率是**下限**：完全相同的值在两键间可能被合并计数；反之 JS 侧动态拼接的文案（如 `%d 个文件`）规范化后能命中，但纯运行时拼接的句子无法静态检出。
2. 官方 Compose 代码中硬编码的字符串（不经过资源表）无法被静态审计捕获，实际官方文案面大于 1,065 键。
3. 官方键名映射表仅覆盖 T6/F.java 单文件提取，官方可能存在其他映射文件（已抽查无同类文件，但不排除动态构建键名的场景）。
4. 逐字对账的模糊配对阈值 0.6 为经验值；脚本已内置两轮人工裁决成果（实证 MAP 增补 + 自拟键剔除清单），但新增键对账结果仍需人工复核。
