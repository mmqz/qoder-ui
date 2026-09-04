# Qoder UI 代码审计报告（v3.3.1）

- **审计对象**：`mmqz/qoder-ui` @ v3.3.0（commit 2683617）
- **审计范围**：9 个 JS 源模块（约 4,400 行）、11 个 CSS 模块、构建脚本、`types/index.d.ts`、
  单元测试、示例页、双参考后端（Node `backend-demo.mjs` / Rust `backend-axum.rs`）
- **审计方法**：逐行静态审查 → 无头浏览器动态复现（agent-browser，真实 DOM/事件）→ 修复 → 复验 → 测试锁死
- **结论**：发现 **14 项问题（3 高危 / 4 中危 / 7 低危），全部修复并验证**；测试 43 → 52 用例

---

## 一、核验（审计前置）

在审计开始前对既有交付做了全量核验，确认此前工作真实完成：

| 项 | 结果 |
|----|------|
| git 同步 | `main` 与 `origin/main` 一致（2683617），工作区干净 |
| 单元测试 | 43/43 通过 |
| 构建 | 可复现（rebuild 后产物哈希一致），四格式齐全，CJS require / ESM import 正常，26 个导出 |
| 交付物 | dist/、types/、tests/、双参考后端、README v3.0–v3.3 章节齐备 |

---

## 二、问题清单与修复

### 高危（运行时 Bug / 安全，均已实测复现）

**H1 · 每次 ESC 抛 TypeError**
- `qoder-interactions.js` 的 `escape` 快捷键调用 `QI.dialog.closeAll()`，而 `QoderDialog` 只有 `open/close/init` —— 该方法从未存在。
- 复现：按 ESC → `Uncaught TypeError: QI.dialog.closeAll is not a function`。
- 修复：`QoderDialog` 补实现 `closeAll()`（关闭所有可见 overlay + 恢复 body 滚动锁）。
  （注：`<qoder-dialog>` WC 的 overlay 在 shadow 内，由组件自身 ESC 监听负责，不受影响。）

**H2 · 本地终端 echo XSS**
- `_execute()` 本地路径把命令输出经 `innerHTML` 插入：`echo` 分支完全未转义、`command not found` 分支仅转义 `<`。
- 复现：`echo <img src=x onerror=window.__xss=1>` → onerror 实际执行（自 XSS；若任何应用把远程文本回显进 echo 即升级为存储型）。
- 修复：新增 `_printLocal()`（`textContent`），错误行用既有 `qoder-terminal__line--err` 类替代内联 HTML；全部分支迁移。
- 复验：同 payload 以纯文本显示，脚本不执行；`echo hello-world` 正常输出。

**H3 · 单标签分屏右栏空白**
- `toggleSplit()` 在唯一标签时自动新建右栏标签，但 `createTab` 会把 `activeId` 抢走 → `activeId === splitTabId`，两栏同一标签，第二栏空壳。
- 复现：关闭全部标签（自动重建 1 个）→ 点 ⊞ → 分屏类已挂、可见 body 只有 1 个。
- 修复：记住 `prevActive`，右栏就位后恢复 `activeId`。
- 复验：`distinct: true, visibleBodies: 2`。

### 中危（泄漏 / 协议 / 生命周期）

**M1 · `<qoder-slider>` document 监听器 O(帧数²) 累积**
- 拖拽中每帧 `update() → setAttribute → 微任务重渲染 → _bind` 重新向 document 追加 `mousemove/touchmove/mouseup/touchend` 4 个监听，旧闭包永不释放；`disconnectedCallback` 仅清理最后一组。
- 复现：3 帧模拟拖拽后 document 上新增监听持续增长，长拖拽可感知卡顿。
- 修复：document 监听实例级只挂一次（`_docBound` 守卫）+ `disconnectedCallback` 复位可重挂；元素引用与 `min/max` 改为事件触发时动态读取（长驻闭包不再捕获过期状态）。
- 复验：5 帧拖拽 + 多次属性变化，**新增 document 监听 0 个**；拖拽值输出正确（24.35）。

**M2 · `<qoder-select>` 同型泄漏**
- 每次重渲染向 document 追加 click 监听（`_outside` 被覆盖，旧监听泄漏），断开时仅移除最后一个。
- 修复：`if (!this._outside)` 守卫 + 处理器内动态查询当前 wrap + 断开复位。
- 复验：8 次重渲染仅 1 个监听；外部点击关闭功能正常。

**M3 · Rust 参考后端协议字段名不匹配**
- `TermResult` 按默认 serde 蛇形序列化（`exit_code`/`tab_id`），而协议 v1 与前端读取的是驼峰（`exitCode`/`tabId`）→ `exitCode` 恒为 0、多标签路由字段丢失。
- 修复：`#[serde(rename_all = "camelCase")]`。

**M4 · WC 断开重连后 document 监听永久失效**
- `<qoder-dialog>`（ESC 关闭）与 `<qoder-theme-switcher>`（主题联动）用 `_escBound/_themeBound` 守卫一次性绑定，但 `disconnectedCallback` 移除监听后标志未复位 → 元素重新插入后功能静默失效。
- 修复：断开时复位标志。

### 低危（加固）

- **L3 XSS 面收敛**：以下 innerHTML 拼接点全部补 `esc()` 转义 —— toast 消息、通知中心（interactions 基础版 + features 增强版）、上下文菜单（label/icon/shortcut/action）、命令面板（group/icon/shortcut/detail + `_highlight` 改为三段分别转义后拼 `<mark>`）、侧边栏会话（localStorage 来源）、上传文件名（OS 来源）、`<qoder-user-card>`/`<qoder-dialog>` 模板属性值。复验：`notificationCenter.add({title:'<img onerror…>'})` 不执行。
- **L4** 终端已提交输入行仍可编辑：`contenteditable=false` 只设在父级，子级 span 显式 `true` 覆盖之 → 改为父子同时设置。
- **L5 重复初始化**：`features.init()`（`mount()` 路径）重复调用导致 datepicker/upload 的 document click、`initResponsive` 的 `<style>`、`hotkeys.init` 的 keydown、`ctrl+shift+p`/`escape`/`?` 注册全部翻倍 → 全部加防重入守卫。
- **L6 WS 未连接静默丢消息**：`sendRaw` 在 `readyState !== 1` 时静默丢弃，chat 的 `_pending` 条目永久泄漏 → `chat/exec` 增加未连接守卫（onError / stderr + exit 1），并新增运行时测试验证 pending 清零。
- **类型对齐**：`types/index.d.ts` 移除幻影 API（`theme.get()`、`theme.onChange()`、`chat.send()`、`notificationCenter.markAllRead/unreadCount/getAll`），补齐实际 API（`toggle`、`clearAll`、`getUnreadCount`、`sessions.create/delete/select`），`QoderWCRegistry` 键名由类名改为元素名（与 `WC['qoder-button']` 实际结构一致），头注释版本更新。
- **版本一致**：`QoderUI.version` 此前停留在 3.2.0（package.json 已 3.3.0）→ 统一 3.3.1，并由新测试强制「package.json = 运行时 = 构建横幅」。

### 记录在案（未改动，属设计权衡）

- `Core.lcs` 对超长输入（>1200 token）截断为启发式 —— 防爆内存的既定策略，行级/词级场景输入长度可控。
- `transport.use()` 将 `opts` 持久化到 localStorage（已剔除 `headers`/`fetchImpl`/`wsImpl` 敏感项）；若调用方把 token 放自定义字段会落盘 —— README 已有安全提示，调用方应把凭证放 headers。
- palette/contextMenu 的 label 等 HTML 注入点已转义；但 `_highlight` 高亮机制依赖 `<mark>` 拼接，未来如需富文本 item 应改用受控插槽。
- 终端「本地 mock 模式」的 `ls/pwd` 等输出为演示假数据 —— 有真实 transport 时自动切换，属预期。

---

## 三、修复验证矩阵

| 修复点 | 复现方式 | 修复后验证 |
|--------|----------|-----------|
| H1 ESC 报错 | 页面按 ESC × 2 | `window.__errs = []` |
| H2 echo XSS | `_execute(tab,'echo <img onerror…>')` | 纯文本渲染，`__xss` 未置位 |
| H3 单标签分屏 | 全关标签后 `toggleSplit` | 两栏 distinct、2 个 body 可见 |
| M1 slider 泄漏 | 监视 `document.addEventListener` + 模拟拖拽 | 拖拽期间新增 0；首绑 4 个 |
| M2 select 泄漏 | 8 次 setAttribute + 外部点击 | 监听 1 个；开/关行为正常 |
| M3 axum 字段 | 静态审查 serde 序列化 | `rename_all = "camelCase"`（Node 版本对照正确） |
| M4 重连失效 | 静态审查生命周期 | 标志复位由回归测试锁死 |
| L3 转义 | `notificationCenter.add` 注入 payload | 不执行、文本显示 |
| 传输层回归 | REST connect + 远端 `ls` + SSE chat | `readme.txt sub` 回显；「演示后端回声」流式到达 |
| 整体回归 | 主题/聊天/palette/diff/toast | 全部正常，页面零 JS 错误 |

---

## 四、测试与产物

- 测试套件：**52 用例 / 5 套件全部通过**（原 43 + 审计回归 9：H1/H2/M1·M2/M4/L3/L5/L6/版本一致性 + WS 未连接守卫运行时用例）
- 构建产物四格式（min.js / esm / cjs / min.css）全量重建，CJS require 与 ESM import 复验通过
- 版本：**v3.3.1**

## 五、遗留建议（不阻塞发布）

1. `notificationCenter.add` 为公共 API，长期可考虑提供 `render` 钩子让调用方自定义模板（当前已转义，安全）。
2. `RestTransport` 的 SSE 解析仅按 `data:` 行处理；若后端发送多行 event（`data:` 多段）需按 SSE 规范拼接 —— 当前协议约定单行 JSON 信封，两端一致即可。
3. CI 建议：GitHub Actions 跑 `node --test` + `npm run build`，把 52 用例与构建可复现性变成每次推送的门禁。
