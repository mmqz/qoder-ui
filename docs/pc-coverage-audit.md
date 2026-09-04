# Qoder UI 复现项目 · PC 端覆盖率审计报告

**版本**：v3.9.1 ｜ **审计日期**：2026-09-04 ｜ **审计对象**：官方 Qoder CN 桌面 App `qoder-cn 1:0.1.6`（Electron，2026-09-02 构建）与官方 IDE `qoder-cn-ide 1.1.3`（VS Code 基座）vs 本仓库 PC 侧复现实现
**审计工具**（均已入库）：`scripts/pc_coverage_audit.py`（双向值匹配口径）、`docs/pc-audit-data.json`（对账明细数据）

---

## 一、结论摘要（TL;DR）

| 指标 | 数值 | 说明 |
|---|---|---|
| 官方 App 版本 | `1:0.1.6`（deb 187MB） | **与 PC 复现依据的 v0.1.6 同版本号**，无版本漂移；但包体为 2026-09-02 重建，内容资源有演进 |
| 官方 App zh UI 值（去重） | **5,814** | 来源：渲染层主包 19.4MB（i18next key:value 对 4,642）+ 主进程 5.9MB（82）+ dynamic-text（38） |
| 官方键名映射 | **4,716** | camelCase 扁平键（如 `qoderWorkMigrationAction`），可直接对齐复现侧键名规范 |
| **A 向覆盖率（官方 → 复现）** | **14 / 5,814（0.2%）** | 精确 11 + 规范化 3；命中均为通用组件词（关闭/复制/编辑/视图/选择/新会话等） |
| **B 向可证率（复现 → 官方）** | **15 / 216（6.9%）** | 复现 PC 侧 zh 候选 216 条（去重），其中 103 条为嵌入字符串中的代码注释/文档串（提取噪音） |
| 官方未覆盖键清单 | **4,694 键** | 已随 `docs/pc-audit-data.json` 入库，即"哪里没分析"的逐键工作清单 |
| IDE 线（v1.1.3） | **0% 分析** | zh 面 = VS Code zh-hans 语言包（221k CJK）+ `aicoding-agent` 扩展（60k CJK，Qoder 自有 agent UI） |

一句话定性：**本仓库 PC 侧是「设计语言 + 通用组件库」级复现（主题/图标/对话框/终端/Diff/Markdown 等视觉与交互基座），官方 App 的「应用级」文案面（任务/会话/Agent/迁移/MCP/设置等 25+ 业务域，5,814 条 zh 值）从未进入分析射程——本报告首次给出其完整盘点与逐键清单。**

---

## 二、审计对象与版本核对

### 2.1 官方安装包获取

官方下载页（`qoder.com.cn/download`）的桌面端直链由 Next.js 配置对象下发（chunk `4916-e28b410c52bee543.js`），本次审计提取到的全量直链：

| 产品线 | 格式 | 直链 |
|---|---|---|
| **App（本审计主对象）** | Linux deb | `https://qoder-app.oss-cn-beijing.aliyuncs.com/qoder-app/releases/latest/Qoder-CN-linux-amd64.deb` |
| IDE | Linux deb | `https://qoder-ide-cn.oss-cn-hangzhou.aliyuncs.com/qoder/release/lastest/qoder-cn-ide_amd64.deb`（官方 URL 即含 `lastest` 拼写） |
| IDE | Windows | `QoderCNIDESetup-x64.exe` / `QoderCNIDEUserSetup-x64.exe`（同 bucket `release/lastest/`） |
| IDE | macOS | `Qoder-CN-IDE-darwin-{arm64,x64}.dmg` |
| QoderWake | win/dmg | `ide.qoder.com.cn/qoderwake-cn/installers/latest/…` |
| QoderWork | win/dmg | `static.qoder.com.cn/qoder-work-cn/releases/latest/…` |
| CLI | shell | `static.qoder.com.cn/qoder-cli-cn`（manifest 模式，`qoder.com.cn/install` 脚本驱动） |

### 2.2 版本核对的关键事实

- App 包（`/opt/Qoder CN`，Electron）：`control` 声明 `Package: qoder-cn, Version: 1:0.1.6`；asar 内 `package.json` 同为 `0.1.6`；`product.json` 声明 `productId: qoder-cn`、`protocolScheme: qoder-cn`、描述为 **"Agent workbench for human and AI software teams"**。**PC 复现依据的 v0.1.6 与当前 latest 同版本号**——但 deb 的 `Last-Modified` 为 2026-09-02，说明官方在同版本号下持续重建（epoch `1:` 版本段），复现库当时提取的文案（如 `assets/dynamic-content/qoder-mobile.zh.json`）在当前包中已演化为 `resources/dynamic-text/qoder-cn.json`（51 键，全部为 `model.*` 模型标签/详情），主文案载体转移进 asar 内嵌 i18next 资源。
- IDE 包（`/usr/share/qoder-cn-ide`）：`product.json` 版本 `1.1.3`（VS Code 基座 `1.105.0`，扩展宿主 package `1.28.0`），2026-09-02 构建。

---

## 三、审计方法论（双向值匹配口径）

PC 端与移动端的根本差异在于**文案载体**：移动端官方文案在 `strings.xml` 资源表（键名天然可对账），PC 端则编译进 19.4MB 渲染层包 + 5.9MB 主进程包。因此移动端的"键名映射 + 逐字对账"体系在 PC 端退化为**值匹配**，且需双向进行：

**官方侧提取**（`official_inventory`）：
1. i18next 资源以 minified 扁平对存储（`qoderWorkMigrationAction:"一键迁移"`），正则 `[,{\[] key : "value"` 提取键值对（渲染层 4,642 + 主进程 82 + dynamic-text 38，跨源去重后键名映射 4,716 条）；
2. 辅以普通引号字面量（覆盖 JSX 文本节点与主进程菜单/对话框串）；
3. 反引号模板串整体跳过——主包内的巨型模板（最长 227KB）是内嵌 worker/shim 源码，非 UI 文案。

**复现侧提取**（`repro_inventory`）：复现库为 gettext 风格（zh 源串 + `t()` 包裹 + en 注册表），提取三类候选：`t('…')` 首参、普通引号 zh 字面量、模板串剥 HTML 标签后的文本节点（并剔除嵌入代码注释）。

**规范化两级**：`norm`（反转义 + 空白折叠）用于精确命中；`aggr`（再剥离全部空白与中英标点）用于容忍措辞微漂移。两侧取交集前各自去重（aggressive 冲突 45 对，取首见代表）。

**口径边界（诚实声明）**：① 含 `${}` 插值的模板串被放弃，个别动态拼接收进去失；② 官方值中混有 Agent 提示词/配置描述性文本（非界面 chrome 文案），A 向分母略有高估；③ 官方 en 资源对象与代码标识符无法静态区分，故以 zh 为权威语言（与移动端 zh-rCN 权威口径一致）。

---

## 四、A 向：官方文案面覆盖率（复现完整性）

官方 zh UI 值集合 **5,814 条**（键名映射 4,716 条）中，复现库 PC 侧（`qoder-core/features/ui/wc/markdown/diff/interactions/transport/shadow` 九模块，剔除移动端 `qoder-mobile.js`）仅命中 **14 条（0.2%）**：`关闭 / 关闭标签 / 复制 / 已复制 / 新会话 / 外观 / 系统 / 编辑 / 视图 / 选择 / 导航` 等通用词。这些命中全部落在"任何桌面应用都会共享"的词汇层，**没有任何一条官方业务域文案被复现库覆盖**。

这一数字必须被正确解读：它不是"复现质量缺陷"，而是**复现定位使然**。PC 侧复现目标是设计语言与组件基座（8 官方主题、400+ 图标、对话框/滑杆/标签页/终端/Diff/Markdown/通知中心/命令面板等 21+ 通用组件），官方 App 的应用级界面（Space/任务/会话/Agent 管理/迁移向导/连接器配置）从未是它的射程。移动端审计之所以能跑出 100%，是因为 `qm-*` 组件群从第一天就对着 APK 的资源表逐屏复现；PC 侧没有做过同级别对账，本报告即补上这一课。

---

## 五、「哪里没分析」精确清单（本报告核心交付）

### 5.1 App 应用级未覆盖域（键名前缀聚类 TOP20 / 共 4,694 未覆盖键）

| 域（键名首段） | 键数 | 代表键 → 官方值 |
|---|---|---|
| agent | 149 | `agentActivity` → "Agent 执行活动"；`agentActivityDescription` → "查看此 Issue 下主任务与成员任务的执行状态。" |
| profile | 124 | 资料卡/账号域整组 |
| no / open / create / add / edit / delete | 351 | 操作动词族（新建/打开/删除确认对话框文案） |
| voice | 83 | 语音输入/转写整域（`voiceChat` → "语音任务"） |
| runtime | 73 | 运行时/执行环境域 |
| import | 72 | 导入向导（含 QoderWork 迁移整组） |
| plugin / connector | 77 | 插件与连接器配置域 |
| model | 42 | 模型选择（与 dynamic-text 51 键互补） |
| terminal | 31 | **官方内置终端域**（`terminalCreate` → "新建终端"；复现库有自拟终端文案但措辞不同） |
| git / cloud / execution / local / file / chrome / qoder / empty | 301 | 版本管理/云同步/执行宿主/本地文件/浏览器集成/空态 |

### 5.2 从未分析的四个面

1. **App 渲染层应用级 UI**（上表 25+ 域）——复现库零涉及；
2. **App 主进程**（5.9MB，82 条 zh 串）——原生菜单/托盘/更新器/协议处理文案，`qoder-cn://` 深链族在移动端已复现 `qodercn://` 同构物，PC 主进程面未动；
3. **IDE 产品线 v1.1.3**——VS Code workbench 由官方 zh-hans 语言包承载（221k CJK，第三方维护可豁免）；**Qoder 自有的 `aicoding-agent` 扩展（displayName: AICoding Agent，60k CJK）是 IDE 侧真正的 Qoder 差异面，完全未分析**；
4. **bundled-resources 插件体系**——`qoder-cn-context-plugin v1.0.27` 按 manifest+SHA256 下发，属动态能力层，静态审计只能标记存在。

### 5.3 B 向：复现文案忠实度（自造风险）

复现 PC 侧 216 条 zh 候选中，官方可证 15 条（6.9%）；未检出 201 条按性质二分：**103 条为代码注释/文档串**（嵌入字符串的实现注释、版本说明，如 `* 组合键解析：`、`[QoderUI.mount] 目标不存在:`，非 UI 文案，不计自造）；**98 条为疑似真实 UI 文案**（命令面板"没有找到匹配的命令/输入命令名称..."、终端"Shell ready. 输入 help 查看可用命令。"、会话"重新生成中..."等）。这批文案是 clean-room 自拟的组件演示文案——官方存在同功能界面（如终端域 31 键、命令面板）但措辞不同。**结论：PC 侧不存在"冒充官方"的文案风险（它是显性的组件库），但若目标升级为应用级复现，这 98 条需全部对照官方键值重写。**

---

## 六、与移动端审计的口径对照

| 维度 | 移动端（docs/coverage-audit.md） | PC 端（本报告） |
|---|---|---|
| 官方文案载体 | strings.xml（1,065 键，静态资源表） | asar 内嵌 i18next（5,814 值/4,716 键）+ 主进程串 |
| 键名权威 | T6/F.java 混淆映射 852 对 | camelCase 扁平键天然可读，无需反混淆 |
| 对账方向 | 单向覆盖率 + 逐字漂移 | **双向**：A 覆盖率 + B 自造率 |
| 结果 | 业务键 100%（885/885），逐字 0 漂移 | A 0.2%（组件库定位使然）；B 可证 6.9% |
| 未分析清单 | 无（已收敛至交互深度） | **4,694 键 + IDE 线 + 主进程 + 插件体系** |

---

## 七、路线建议（按投入产出排序）

1. **若维持组件库定位**：现状已自洽——把 `docs/pc-audit-data.json` 当作"官方词频参考"，仅按需吸收官方措辞（如空态/按钮通用模式），无需追求 A 向百分比；
2. **若升级应用级复现**（工作量约等于再做一次移动端冲刺）：按 §5.1 域表分四批推进——先 `create/open/delete/edit` 动词族与 `empty` 空态族（高频通用，约 400 键），再 `profile/model/terminal`（约 200 键），后 `agent/voice/runtime/plugin/connector` 深水区（约 450 键），最后迁移向导与 `import` 族；
3. **IDE 线最小切入点**：`aicoding-agent` 扩展（60k CJK）是 Qoder 在 IDE 的全部差异面，一个扩展的文案量 ≈ 移动端 APK 业务键的量级，方法论可直接复用本报告工具链；
4. **持续项**：官方同版本号重建会漂移文案载体（`dynamic-content/` → `dynamic-text/` → asar 内嵌即三迁），建议每次对账前先跑 §八 复跑第 1 步核对构建日期。

---

## 八、复跑指南

```bash
# 1) 获取官方包（App 187MB；直链见 §2.1，官方可能随重建更换 bucket）
curl -L -o /tmp/qoder-app.deb https://qoder-app.oss-cn-beijing.aliyuncs.com/qoder-app/releases/latest/Qoder-CN-linux-amd64.deb
# 2) 解包（反编译产物不入库，与移动端 apktool-out 同约定）
mkdir -p pc/app_x && cd pc/app_x && ar x /tmp/qoder-app.deb && tar xf data.tar.xz && cd ../..
# 3) 解 asar
npx @electron/asar extract "pc/app_x/opt/Qoder CN/resources/app.asar" pc/asar_x
# 4) 双向对账（脚本默认路径即上述布局；--official/--src-dir 可覆盖）
python3 scripts/pc_coverage_audit.py
# 明细落盘 pc/audit_out/pc_audit.json（未覆盖键/值、自造候选三清单）
```
