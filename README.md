# Qoder UI
> 原汁原味的 Qoder 前端风格原生组件库，8 个官方主题，400+ 图标，高级视觉组件，Web Components 组件化，零依赖纯 CSS+JS 实现。
从 Qoder v0.1.6 安装包反编译提取设计语言，抛弃原生打包代码，重新实现为干净的原生 CSS/JS 组件。
## 特性
- **8 个官方主题**：Forest Light/Dark、Bee Light/Dark、Mint Light/Dark、Parchment Light/Dark
- **400+ Codicon 图标**：从 Qoder 提取的完整 VS Code 图标字体
- **30+ Seti 文件类型图标**：JS/TS/Python/Go/Rust/Vue/Docker 等
- **全息用户卡片**：4 层光晕 + 全息衍射光谱 + 银箔/标准变体（逆向 qoder-user-card 86 条 CSS 规则）
- **语音胶囊 & 经典涟漪**：Qoder 语音交互的两种可视化样式（多层 blob + 同心圆扩散）
- **窗口 Chrome**：玻璃拟态标题栏 + macOS 红绿灯 + 侧边栏布局
- **变更树**：代码审查面板的多级缩进引导线文件树
- **反馈对话框**：玻璃背景 + 缩放进入动画
- **活动栈**：桌面宠物消息堆叠效果
- **Squircle 超椭圆**：corner-shape: squircle 7 个尺寸
- **滚动渐隐 / 点状纹理 / 细滚动条**：Qoder 特有视觉效果
- **Markdown 渲染样式**：从 WorkspaceMarkdownEditor.css 逆向，支持标题/引用/代码块/表格/任务列表
- **20+ 基础组件**：Button、Input、Card、Badge、Switch、Tabs、Avatar、Alert、Tooltip、Dropdown、Progress、Spinner、Skeleton、Divider、Table、CodeBlock、ChatBubble、Sidebar、ThemeSwitcher 等
- **Web Components 组件化**：`<qoder-user-card>`、`<qoder-dialog>`、`<qoder-theme-switcher>` 原生自定义元素
- **JS 交互 API**：主题管理、Toast 通知、对话框、Tabs/Dropdown/Switch/Tooltip 自动初始化
- **零依赖**：纯 CSS + 原生 JS，无需任何框架
- **完整演示页面**：`examples/index.html` 可直接浏览器打开查看所有组件
## 快速开始
### 安装
```bash
npm install qoder-ui
```
或直接引入：
```html
<link rel="stylesheet" href="qoder-ui/src/index.css">
<script src="qoder-ui/src/qoder-ui.js"></script>
```
### CSS 类名方式使用
```html
<!-- 设置主题 -->
<html data-theme="forest-light">
<!-- 使用组件 -->
<button class="qoder-btn qoder-btn--primary">主要按钮</button>
<div class="qoder-card">卡片内容</div>
<span class="qoder-icon qoder-icon--sparkle"></span>
```
### Web Components 方式使用
```html
<!-- 全息用户卡片（自动 3D 倾斜） -->
<qoder-user-card email="dev@qoder.com" label="PRO MEMBER" time="JOINED 2024"></qoder-user-card>
<!-- 标准变体 -->
<qoder-user-card variant="standard" name="Alex Chen" role="Developer" time="2024.01"></qoder-user-card>
<!-- 主题切换器 -->
<qoder-theme-switcher></qoder-theme-switcher>
<!-- 对话框 -->
<qoder-dialog title="确认操作" id="myDialog">
  <p>确定要执行此操作吗？</p>
  <div slot="footer">
    <button class="qoder-btn qoder-btn--ghost" onclick="document.getElementById('myDialog').close()">取消</button>
    <button class="qoder-btn qoder-btn--primary" onclick="document.getElementById('myDialog').close()">确认</button>
  </div>
</qoder-dialog>
<button onclick="document.getElementById('myDialog').open()">打开对话框</button>
```
### JS API
```js
// 主题管理
QoderUI.theme.set('forest-dark');       // 切换主题
QoderUI.theme.get();                     // 获取当前主题
QoderUI.theme.onChange((theme) => {});   // 监听主题变化
// Toast 通知
QoderUI.toast.show('操作成功', 'success');  // success/info/warning/error
// 对话框
QoderUI.dialog.open('dialogId');
QoderUI.dialog.close('dialogId');
```
### 切换主题
```js
document.documentElement.setAttribute('data-theme', 'forest-dark');
localStorage.setItem('qoder-theme', 'forest-dark');
```
## 项目结构
```
qoder-ui/
├── src/
│   ├── index.css                    # 入口文件（引入所有 CSS）
│   ├── qoder-ui.js                  # JS 交互逻辑 + Web Components
│   ├── themes/
│   │   └── qoder-themes.css         # 8 个主题的 CSS 变量定义
│   ├── styles/
│   │   └── base.css                 # 基础重置 + 工具类
│   ├── components/
│   │   ├── qoder-components.css     # 20+ 基础组件
│   │   ├── qoder-advanced.css       # 高级组件（全息卡片/语音/窗口等）
│   │   ├── qoder-icons.css          # 图标系统（Codicon + Seti）
│   │   └── qoder-markdown.css       # Markdown 编辑器/渲染样式
│   └── fonts/
│       ├── codicon.ttf              # Codicon 图标字体
│       └── qoder-seti.woff          # Seti 文件类型图标字体
├── examples/
│   └── index.html                    # 完整演示页面（13 个区块）
├── package.json
└── README.md
```
## 主题列表
| 主题 ID | 名称 | 主色调 |
|---------|------|--------|
| `forest-light` | Forest Light | #358e62 |
| `forest-dark` | Forest Dark | #62c9a8 |
| `bee-light` | Bee Light | #e0c65c |
| `bee-dark` | Bee Dark | #e0c65c |
| `mint-light` | Mint Light | #4fa98f |
| `mint-dark` | Mint Dark | #62c9a8 |
| `light-parchment` | Parchment Light | #c96442 |
| `parchment-dark` | Parchment Dark | #8ee5a1 |
## Markdown 渲染
```html
<div class="qoder-markdown-render">
  <h1>标题</h1>
  <p>正文，包含 <code>行内代码</code> 和 <a href="#">链接</a>。</p>
  <blockquote>引用文字</blockquote>
  <ul><li>列表项</li></ul>
  <pre><code>代码块</code></pre>
  <table>...</table>
</div>
```
## 设计令牌
- **圆角**：4/6/8/12/16px（Squircle 超椭圆）
- **间距**：4/8/12/16/20/24/32px
- **字体**：Instrument Sans（主）、ui-monospace（等宽）
- **字号**：11/12/13/14/16/20/24px
- **过渡**：150/200/300ms cubic-bezier(0.4,0,0.2,1)
- **阴影**：sm/md/lg/xl 四级
- **玻璃效果**：backdrop-filter: blur(20px) + 半透明背景
## 逆向说明
本组件库从 Qoder v0.1.6 Linux deb 安装包反编译提取：
1. 解压 deb → 提取 app.asar → 分析 439KB 主 CSS + 49KB Markdown CSS
2. 还原 8 个主题的 CSS 变量系统（1345 个变量）
3. 逆向 49 个 qoder-* 原生组件类（重点：qoder-user-card 全息卡片 86 条规则）
4. 逆向 WorkspaceMarkdownEditor（Milkdown/ProseMirror）编辑器样式
5. 提取 codicon.ttf + qoder-seti.woff 图标字体
6. 抛弃原生 React/Tailwind 打包代码，重写为纯原生 CSS + Web Components
**技术栈**：Qoder = VS Code fork + Electron + React + Vite + Tailwind CSS
## 演示
打开 `examples/index.html` 即可查看所有组件和 8 个主题的效果。
## License
MIT

## v3.0 完整版更新（2026-09-04）

### 新增 4 个 CSS 模块（约 2000+ 行）

#### 1. qoder-chat.css — 完整聊天界面
- 消息列表（用户/AI/系统三种消息类型）
- 代码块（语言标签 + 复制按钮 + 行号 + 语法着色）
- 流式打字光标
- 消息操作栏（复制/重新生成/点赞/点踩）
- 思考过程折叠面板
- 工具调用卡片（参数 + 结果 + 状态）
- 附件消息
- 聊天输入区（textarea + 工具栏 + 发送按钮）
- 欢迎空状态（标题 + 副标题 + 建议卡片网格）
- 日期分隔线

#### 2. qoder-panels.css — 面板系统
- **命令面板**：Ctrl+Shift+P 风格，搜索输入 + 分组 + 高亮匹配 + 快捷键提示 + 底部导航提示
- **上下文菜单**：右键菜单，禁用项/危险项/分割线/子菜单箭头/快捷键
- **设置面板**：左侧导航 + 右侧内容 + 主题预览网格 + 设置行（标签+描述+控件）
- **侧边栏**：活动栏（48px）+ 可折叠面板 + 会话列表 + 工作区切换器

#### 3. qoder-extras.css — 扩展组件
- **表单组件**：Select 下拉、Radio 单选、DatePicker 日期选择（日历面板）、Slider 滑块、Upload 上传区域、ColorPicker 颜色选择
- **终端面板**：标签页 + 分屏 + 语法着色输出 + 闪烁光标 + 提示符
- **通知中心**：右侧滑出面板 + 全部/未读标签 + 未读标记 + 全部已读 + 空状态
- **代码 Diff 查看器**：行号 gutter + 增删行高亮 + hunk header + 统计信息
- **布局组件**：Breadcrumb 面包屑、Steps 步骤条（水平+垂直）、Timeline 时间线、Pagination 分页、Empty 空状态、Descriptions 描述列表

#### 4. qoder-viz.css — 可视化组件
- **Agent 工作流**：任务规划面板（步骤状态）、多 Agent 协作卡片 + 消息流、运行结果面板（指标统计）
- **数据可视化**：统计卡片（数值+变化率）、进度环（SVG）、迷你柱状图、迷你折线图（SVG）、热力图、仪表盘（SVG）

### 新增 qoder-interactions.js（约 1000+ 行）

#### 交互模块
- `QoderUI.palette` — 命令面板（搜索/过滤/键盘导航/选中回调）
- `QoderUI.contextMenu` — 上下文菜单（定位/防溢出/点击外部关闭）
- `QoderUI.notificationCenter` — 通知中心（添加/打开/关闭/全部已读/未读计数）
- `QoderUI.draggable` — HTML5 拖拽排序（占位符/上下半区判断）
- `QoderUI.hotkeys` — 键盘快捷键系统（注册/冲突检测/组合键解析）
- 表单交互：Select 展开收起、DatePicker 日历、Slider 拖拽（鼠标+触摸）、Collapsible 折叠、Thinking 思考折叠、设置导航、活动栏切换

#### 21 个 Web Components（新增 18 个）
| 标签 | 说明 | 属性 |
|------|------|------|
| `<qoder-button>` | 按钮 | variant, size, disabled |
| `<qoder-input>` | 输入框 | placeholder, type, value, error |
| `<qoder-badge>` | 徽章 | variant |
| `<qoder-avatar>` | 头像 | size, text, src |
| `<qoder-alert>` | 提示框 | type |
| `<qoder-switch>` | 开关 | checked |
| `<qoder-tabs>` | 标签页 | items, active |
| `<qoder-progress>` | 进度条 | value |
| `<qoder-spinner>` | 加载动画 | size |
| `<qoder-select-wc>` | 下拉选择 | placeholder, options |
| `<qoder-slider-wc>` | 滑块 | min, max, value |
| `<qoder-tooltip>` | 工具提示 | text, position |
| `<qoder-card>` | 卡片 | title |
| `<qoder-breadcrumb>` | 面包屑 | items (JSON) |
| `<qoder-steps>` | 步骤条 | steps (JSON), current, vertical |
| `<qoder-timeline>` | 时间线 | items (JSON) |
| `<qoder-empty>` | 空状态 | icon, title, desc |
| `<qoder-pagination>` | 分页 | total, current |
| `<qoder-user-card>`* | 用户卡片 | email, label, time, variant, name, role |
| `<qoder-dialog>`* | 对话框 | title, open |
| `<qoder-theme-switcher>`* | 主题切换 | — |

*v2.1 已有

### 无障碍 a11y
- ARIA 属性（dialog 角色、aria-label）
- 焦点管理（:focus-visible 轮廓）
- 键盘导航（命令面板 ↑↓↵ESC、Tab 顺序）
- 语义化标签（nav、button、label）

### 响应式适配
- 768px 断点：侧边栏布局转为垂直、活动栏转为顶部横栏、设置面板转为垂直、聊天消息内边距调整、命令面板宽度自适应、通知中心全宽、Agent 网格单列
- 480px 断点：欢迎建议单列、描述列表标签缩小
- 触控友好：交互元素最小 44×44px

### 文件结构
```
qoder-ui/
├── src/
│   ├── index.css                    # 入口（引入全部 10 个 CSS）
│   ├── qoder-ui.js                  # 基础 JS（主题/Toast/Dialog/3 WC）
│   ├── qoder-interactions.js        # v3.0 交互 JS（面板/表单/拖拽/快捷键/18 WC）
│   ├── themes/
│   │   └── qoder-themes.css         # 8 个官方主题
│   ├── styles/
│   │   └── base.css                 # 基础重置 + 设计令牌
│   ├── components/
│   │   ├── qoder-components.css     # 20 个基础组件
│   │   ├── qoder-advanced.css       # 12 类高级组件
│   │   ├── qoder-icons.css          # 408 codicon + 30 seti
│   │   ├── qoder-markdown.css       # Markdown 渲染样式
│   │   ├── qoder-chat.css           # v3.0 聊天界面
│   │   ├── qoder-panels.css         # v3.0 命令面板+上下文菜单+设置+侧边栏
│   │   ├── qoder-extras.css         # v3.0 表单+终端+通知+Diff+布局
│   │   └── qoder-viz.css            # v3.0 Agent工作流+数据可视化
│   └── fonts/
│       ├── codicon.ttf              # 125KB 图标字体
│       └── qoder-seti.woff          # 32KB 文件类型图标
├── examples/
│   └── index.html                   # 24 区块完整演示
├── package.json                     # v3.0.0
└── README.md
```

### 快速开始
```html
<link rel="stylesheet" href="qoder-ui/src/index.css">
<script src="qoder-ui/src/qoder-ui.js"></script>
<script src="qoder-ui/src/qoder-interactions.js"></script>

<!-- 设置主题 -->
<html data-theme="forest-light">

<!-- 使用 Web Component -->
<qoder-button variant="primary">点击我</qoder-button>
<qoder-alert type="success">操作成功</qoder-alert>

<!-- JS API -->
<script>
  QoderUI.toast.show('Hello!', 'success');
  QoderUI.palette.open([{label:'命令一', group:'分组'}], (item) => {});
  QoderUI.hotkeys.register('ctrl+k', () => alert('Ctrl+K'));
</script>
```

### v3.0 统计
- **CSS 文件**：10 个模块，总计约 6000+ 行
- **JS 文件**：2 个模块，总计约 1600+ 行
- **组件总数**：50+ 个组件类
- **Web Components**：21 个自定义元素
- **主题**：8 个官方主题全覆盖
- **图标**：408 codicon + 30 seti
- **零依赖**：纯原生 CSS + JS，无任何外部库

## v3.1 交互功能补全（2026-09-04）

### 新增 qoder-features.js（完整交互功能）
- **聊天系统**：Enter发送/Shift+Enter换行、消息追加到列表、textarea高度自适应、模拟AI回复、自动滚动到底部
- **代码块复制**：点击复制到剪贴板（含fallback）、复制成功反馈
- **消息操作栏**：复制全文、重新生成、点赞/点踩视觉反馈
- **命令面板模糊搜索**：子序列匹配 + 包含匹配 + 匹配质量排序
- **设置面板**：导航切换内容区、开关/Select持久化到localStorage
- **侧边栏会话管理**：新建/删除/切换会话、hover显示删除按钮、localStorage持久化、拖拽排序自动接入
- **DatePicker完整日历**：月份前后切换、年份显示、今天高亮、选中回填、点击外部关闭
- **Upload文件上传**：点击选择+拖放接收、文件列表展示、上传进度条模拟、删除文件
- **终端**：可输入命令、命令历史(↑↓)、内置命令(help/clear/echo/date/whoami/ls/pwd)、未知命令报错
- **通知中心增强**：全部/未读标签过滤、单条删除、未读计数实时更新
- **ColorPicker取色器**：原生取色器+HEX输入+色板点击同步
- **快捷键帮助面板**：按 `?` 呼出，展示所有已注册快捷键

### Web Components 升级
- **属性响应**：Button/Input/Switch/Progress/Tabs 添加 `attributeChangedCallback`，改属性自动更新DOM
- **命名统一**：`qoder-select-wc` → `qoder-select`，`qoder-slider-wc` → `qoder-slider`
- **a11y增强**：Progress添加 `role="progressbar"` + aria-valuenow，Tabs添加 `role="tablist"` + aria-selected，Input添加 aria-invalid
- **事件统一**：所有交互组件emit标准 `change`/`input`/`click` 事件
- **Setter/Getter**：Switch/Progress/Input 支持 JS 属性赋值

### 新增 qoder-responsive.css（完整响应式）
- 6个断点：1400px / 1024px / 768px / 480px / 360px
- 侧边栏768px转垂直布局、活动栏转顶部横栏
- 聊天/命令面板/通知中心/数据可视化全断点适配
- 触控设备优化：44px最小点击区域、取消hover改用active
- 打印样式、减少动画偏好(prefers-reduced-motion)、高对比度模式(prefers-contrast)

### 主题同步
- 页面顶部主题按钮与 `<qoder-theme-switcher>` 组件联动
- 统一 `applyTheme()` 函数 + `qoder-theme-change` 自定义事件
- localStorage持久化，刷新恢复

### 文件结构（v3.1）
```
src/
├── index.css                    # 入口（11个CSS模块）
├── qoder-ui.js                  # 基础（主题/Toast/Dialog/3 WC）
├── qoder-interactions.js        # 交互（面板/表单/拖拽/快捷键/18 WC）
├── qoder-features.js            # v3.1 功能（聊天/终端/上传/日历等）
├── themes/qoder-themes.css      # 8主题
├── styles/base.css
├── components/
│   ├── qoder-components.css     # 20基础组件
│   ├── qoder-advanced.css       # 12高级组件
│   ├── qoder-icons.css          # 438图标
│   ├── qoder-markdown.css       # Markdown
│   ├── qoder-chat.css           # 聊天界面
│   ├── qoder-panels.css         # 面板系统
│   ├── qoder-extras.css         # 扩展组件
│   ├── qoder-viz.css            # 可视化
│   └── qoder-responsive.css     # v3.1 响应式
└── fonts/                       # 2个图标字体
```

### 快速开始（v3.1）
```html
<link rel="stylesheet" href="qoder-ui/src/index.css">
<script src="qoder-ui/src/qoder-ui.js"></script>
<script src="qoder-ui/src/qoder-interactions.js"></script>
<script src="qoder-ui/src/qoder-features.js"></script>
```

### v3.1 统计
- **CSS**：11个模块，约 6500+ 行
- **JS**：3个模块，约 2500+ 行
- **交互功能完整度**：从 ~30% 提升至 ~85%
- **Web Components**：21个，5个支持属性响应
- **响应式断点**：6个全量适配

## v3.2 完成剩余 15%（2026-09-04）

### 1. Diff 行内 word-level 高亮
- **`src/qoder-core.js`**（新增）：零 DOM 纯逻辑模块 —— LCS word-diff 引擎（`diffWords`/`wordChanges`）、行级 diff（`diffLines`）、命令面板模糊匹配（`fuzzyMatch`）、快捷键解析（`comboFromEvent`/`matchKeys`），可在 Node 中直接测试
- **`src/qoder-diff.js`**（新增）：`QoderUI.diff.enhance(root)` 扫描现有 `.qoder-diff`，相邻增删行自动 1:1 配对做词级高亮（绿底新增 / 红底删除线）；`QoderUI.diff.render({old, new, filename})` 由两段文本动态渲染完整 diff；幂等可重复调用
- **修复存量 bug**：示例页使用的 `.qoder-diff__line--added/--removed/--context` 与 `.qoder-diff__stat--added/--removed` 在 CSS 中从未定义（只有 `__row` 系），本次补齐行式布局样式

### 2. 终端标签页功能化（完整终端管理器）
- 标签切换 / 关闭（×）/ 新建（+，bash→zsh→sh→fish→pwsh 轮转）/ 分屏（⊞ 双栏并排，点击分栏聚焦）/ 清屏（🗑）
- 每个标签**独立**的输出 body、命令历史（↑↓）、工作目录（`cd`/`cd ..`/`cd ~`）
- 新增命令：`cd`、`exit`（关闭当前标签）、`Ctrl+L` 清屏；关闭最后一个标签自动重建 bash
- API：`QoderUI.terminal.activateTab/createTab/closeTab/toggleSplit/clearActive`
- **修复存量 bug**：新建标签的 body 此前未挂载 DOM（detached 节点）

### 3. 剩余 13 个 Web Components 属性响应
badge / avatar / alert / spinner / select / slider / tooltip / card / breadcrumb / steps / timeline / empty / pagination 全部支持 `observedAttributes` + `attributeChangedCallback`，改属性自动更新 DOM；关键组件提供 getter/setter（`value`/`checked`/`current`/`active`/`disabled`）；select/slider 行为自包含（不再依赖全局 init）

### 4. Shadow DOM 样式隔离
- **`src/qoder-shadow.js`**（新增）：全库 CSS 只 fetch/解析一次，构建**单个共享 CSSStyleSheet**，经 `adoptedStyleSheets` 被全部 21 个组件的 shadow root 复用（零重复解析）；相对 `url(...)` 自动重写为绝对地址；自动向 document 注入样式链接保障图标字体；fetch 不可用（file://）时自动降级为 shadow 内 `@import`
- 内容型组件经 `<slot>` 投影光内容；事件统一 `bubbles + composed` 穿透边界
- **退回 light DOM**（三选一）：`window.QoderUIConfig = { shadow: false }`、`<html data-qoder-shadow="false">`、单元素 `no-shadow` 属性
- **修复存量 bug**：原 `qoder-ui.js` 存在 `QoderDialog` 重复声明的**致命语法错误**（整个文件解析失败），以及 `connectedCallback` 过早读取子节点的问题

### 5. 构建产物（esbuild）
```
dist/qoder-ui.min.css   全部 CSS 打包压缩（@font 字体资产重写）  168KB
dist/qoder-ui.min.js    IIFE 压缩包，<script> 直接引入           81KB
dist/qoder-ui.esm.js    ESM（bundler 用）                        82KB
dist/qoder-ui.cjs.js    CJS（SSR 安全，Node require 不崩溃）     82KB
types/index.d.ts        手写 TS 类型声明（全 API 覆盖）
```
```bash
npm run build   # esbuild 构建
```
```html
<!-- 构建产物用法：一个 CSS + 一个 JS -->
<link rel="stylesheet" href="qoder-ui/dist/qoder-ui.min.css">
<script src="qoder-ui/dist/qoder-ui.min.js"></script>
```

### 6. 单元测试（零依赖，Node 内置 test runner）
```bash
npm test        # 31 个用例全通过
```
- `tests/core.test.mjs`：word-diff/行级 diff/LCS/模糊匹配/快捷键解析/工具函数（20 用例）
- `tests/integrity.test.mjs`：CSS @import 完整性、示例页类名 100% 覆盖、21 个 WC 属性响应静态检查、构建产物、类型声明（11 用例）

### 7. 命名兼容层（修复 96 个无样式类）
**`src/components/qoder-compat.css`**（由 `scripts/gen_compat.py` 自动生成）：修复 v1/v3.0 期间 CSS 单横线命名（`qoder-btn-primary`）与示例页双横线 BEM（`qoder-btn--primary`）的漂移 —— 96 个类此前完全无样式（含按钮变体/徽章/消息气泡/任务规划/迷你图表等）。现在示例页类名 100% 有定义，并被完整性测试锁定。

### 加载顺序（源码方式）
```html
<script src="qoder-ui/src/qoder-core.js"></script>
<script src="qoder-ui/src/qoder-shadow.js"></script>
<script src="qoder-ui/src/qoder-ui.js"></script>
<script src="qoder-ui/src/qoder-interactions.js"></script>
<script src="qoder-ui/src/qoder-wc.js"></script>
<script src="qoder-ui/src/qoder-features.js"></script>
<script src="qoder-ui/src/qoder-diff.js"></script>
```

### 文件结构（v3.2）
```
qoder-ui/
├── src/
│   ├── index.css                    # 入口（12 个 CSS 模块）
│   ├── qoder-core.js                # v3.2 纯逻辑（diff 引擎/模糊匹配，可 Node 测试）
│   ├── qoder-shadow.js              # v3.2 Shadow DOM 隔离引擎 + 组件基类
│   ├── qoder-ui.js                  # 基础（主题/Toast/Dialog/3 WC）[修复语法错误]
│   ├── qoder-interactions.js        # 交互（面板/表单/拖拽/快捷键）
│   ├── qoder-wc.js                  # v3.2 全部 18 个 WC（属性响应 + slot）
│   ├── qoder-features.js            # 功能（聊天/终端管理器/上传/日历）[终端重写]
│   ├── qoder-diff.js                # v3.2 Diff 增强器 + 动态渲染
│   ├── esm-entry.js                 # v3.2 ESM/CJS 构建入口
│   ├── themes/ styles/ components/  # CSS（含 v3.2 qoder-compat.css）
│   └── fonts/                       # 图标字体
├── examples/index.html              # 24 区块完整演示（真实可操作）
├── build/build.mjs                  # v3.2 esbuild 构建脚本
├── tests/                           # v3.2 单元测试（31 用例）
├── types/index.d.ts                 # v3.2 TS 类型声明
└── dist/                            # v3.2 构建产物
```

### v3.2 统计
- **交互功能完整度**：~85% → **100%**（诚实清单 6 项全部完成）
- **Web Components**：21 个，**21/21** 属性响应 + Shadow DOM 隔离
- **测试**：31 用例全通过（零测试依赖）
- **修复存量 bug**：7 个（语法错误/detached 节点/96 无样式类/draggable 崩溃/热键 shift 容错等）

## v3.3 后端无关 Transport 层（2026-09-04）

> **目标：把这套 Qoder 风格前端当作通用 UI 层，接到任何项目的后端上 —— Rust、TS、Node、Python 均可，前端零改动。**

### 架构总览
```
┌─────────────────────────── 你的项目 ───────────────────────────┐
│  前端（本库，框架无关）              后端（任选语言）              │
│  ┌──────────────────────┐   Transport 协议 v1   ┌─────────────┐ │
│  │ Chat / Terminal / …  │ ←──────────────────→  │ Rust (axum) │ │
│  │ 50+ 组件 / 21 WC     │   REST+SSE / WS       │ TS (Hono)   │ │
│  │ 8 主题 / Shadow DOM  │   ─── 三选一 ───      │ Node / …    │ │
│  └──────────────────────┘                       └─────────────┘ │
└────────────────────────────────────────────────────────────────┘
```
- UI 只依赖 `QoderUI.transport` 的高层接口，不关心后端是什么
- 未配置 transport 时自动回落本地 Mock（v3.2 离线行为），渐进式接入
- 协议是纯 JSON 信封，任何语言 30 分钟可实现对端

### 协议 v1（信封 Envelope）
```json
{ "v": 1, "id": "e_1a2b3", "type": "chat.send", "channel": "chat", "payload": { }, "ts": 1788490000000 }
```
| 方向 | type | payload | 说明 |
|------|------|---------|------|
| C→S | `chat.send` | `{ id, text, sessionId? }` | 发消息（`payload.id` 必须在回复中原样回传） |
| C→S | `chat.abort` | `{ id }` | 中止一次流式回复 |
| C→S | `terminal.input` | `{ tabId, cmd, cwd }` | 执行终端命令 |
| S→C | `chat.delta` | `{ id, delta }` | 流式增量 |
| S→C | `chat.done` | `{ id, content?, finishReason? }` | 流结束 |
| S→C | `chat.error` | `{ id, message }` | 出错 |
| S→C | `terminal.output` | `{ tabId, data, stream? }` | 命令输出（stdout/stderr） |
| S→C | `terminal.exit` | `{ tabId, code }` | 命令结束 |
| S→C | `terminal.cwd` | `{ tabId, cwd }` | 目录变化（cd） |

### 传输方式三选一
| 类型 | 适用 | 说明 |
|------|------|------|
| `'rest'` | 最简单 | chat 走 `POST /api/chat`（SSE 流式或一次性 JSON），terminal 走 `POST /api/terminal` |
| `'ws'` | 全双工 | 单一 WebSocket，双向信封，自动重连（终端长驻会话推荐） |
| 自定义实例 | 任意 | 实现 `chat()/exec()/onStatus()` 三方法即可注入（gRPC、SSE-only、IPC…） |

### 一行接入：QoderUI.mount()
```js
// 任意页面/框架中（也支持 <script src="qoder-ui.min.js"> 后直接调用）
const app = QoderUI.mount('#app', {
  cssUrl: '/vendor/qoder-ui.min.css',          // 省略则自动探测同目录
  theme: 'dark',
  transport: 'rest',                            // 'mock' | 'rest' | 'ws' | 自定义实例
  transportOpts: { baseUrl: 'http://localhost:8787/api' },
});
await app.ready();       // transport 就绪
app.setTheme('forest-dark');
app.useTransport('ws', { url: 'ws://localhost:8787/ws' });  // 运行时切换
app.destroy();
```
也可以只配 transport、不动其它：`await QoderUI.transport.use('rest', { baseUrl: '…/api' })`。

### 接入方式 A：原生 `<script>`（最适合给其它项目挂壳）
```html
<link rel="stylesheet" href="qoder-ui.min.css">
<script src="qoder-ui.min.js"></script>
<script>
  QoderUI.mount('#app', { transport: 'rest', transportOpts: { baseUrl: '/api' } });
</script>
```

### 接入方式 B：npm + 打包器（React / Vue / Svelte 通用）
```bash
npm install qoder-ui
```
```js
// main.ts —— 任何框架的入口都一样
import QoderUI from 'qoder-ui';
import 'qoder-ui/css';                       // 或自行 <link> 引入
await QoderUI.transport.use('rest', { baseUrl: import.meta.env.VITE_API + '/api' });
QoderUI.features.init();                     // 激活页面里所有 .qoder-* 组件
```
```jsx
// React 例子（Vue 同理：onMounted 中调用即可）
function AgentConsole() {
  const ref = useRef(null);
  useEffect(() => { QoderUI.chat.init('.qoder-chat'); }, []);
  return <div ref={ref} className="qoder-chat">…模板照抄 examples/index.html…</div>;
}
```
WC 事件与主题均为全局标准事件/属性，框架无需适配层。

### 接入方式 C：TS 后端（Hono 示例，30 行实现协议）
```ts
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
const app = new Hono();

app.post('/api/chat', (c) => streamSSE(c, async (sse) => {
  const { payload } = await c.req.json();          // 协议信封
  const reply = `收到: ${payload.text}`;            // TODO: 换成你的 LLM
  for (let i = 0; i < reply.length; i += 3) {
    await sse.writeSSE({ data: JSON.stringify({
      v: 1, id: 'e' + i, type: 'chat.delta', channel: 'chat',
      payload: { id: payload.id, delta: reply.slice(i, i + 3) }, ts: Date.now(),
    })});
    await new Promise(r => setTimeout(r, 20));
  }
  await sse.writeSSE({ data: JSON.stringify({
    v: 1, id: 'done', type: 'chat.done', channel: 'chat',
    payload: { id: payload.id }, ts: Date.now() }) });
}));
app.post('/api/terminal', async (c) => { /* 白名单 spawn，返回 {stdout, stderr, exitCode, cwd} */ });
export default app;
```
完整可运行版本见 `examples/backend-demo.mjs`（零依赖 Node ≥18，`node examples/backend-demo.mjs` 直接跑）。

### 接入方式 D：Rust 后端（axum 参考实现）
完整可编译参考：`examples/backend-axum.rs` —— SSE 流式 chat + 沙箱 terminal，依赖仅 axum/tokio/serde/tower-http。
```rust
// 核心：一个 SSE handler 把你的 LLM 输出逐段包成协议信封
Event::default().data(json!({
    "v": 1, "id": "e1", "type": "chat.delta", "channel": "chat",
    "payload": { "id": msg_id, "delta": chunk }, "ts": now_ms()
}).to_string())
```
全双工终端用 axum 的 `WebSocketUpgrade`，把 `terminal.output/exit/cwd` 信封推给客户端即可（文件尾部有模板）。

### 本地端到端验证（2 分钟）
```bash
node examples/backend-demo.mjs          # 启动演示后端 :8787
# 打开 examples/index.html → 右下角「后端连接器」
#   类型选 REST，地址 http://localhost:8787/api → 连接
# 之后：聊天回复来自后端 SSE；终端执行的是后端白名单沙箱命令（ls/cat/node -v…）
```
浏览器事件 `qoder-transport-change` 可监听连接切换；连接信息持久化在 `localStorage('qoder-ui:transport')`，刷新自动恢复。

### Transport API 速查
```js
QoderUI.transport.use(type, opts)    // 创建+激活+连接（Promise）
QoderUI.transport.get()              // 当前实例或 null（null → UI 本地 Mock）
QoderUI.transport.clear()            // 断开并清除
QoderUI.transport.restore()          // 从 localStorage 恢复

// 直接使用（UI 内部就是这么用的）
const t = QoderUI.transport.get();
t.chat(text, { onStart, onDelta(d, full), onDone(content), onError }, { sessionId });
t.exec(cmd, cwd, { onOutput(d, stream), onExit(code), onCwd(cwd), onError }, { tabId });
t.onStatus(s => {});                 // 'idle'|'connecting'|'open'|'closed'|'error'
t.raw(cb) / t.sendRaw(env)           // 自定义协议逃生口
```
类型全部收录在 `types/index.d.ts`（`QoderTransportApi / QoderTransportInstance / QoderEnvelope / QoderMountHandle`…）。

### v3.3 文件结构（新增部分）
```
qoder-ui/
├── src/qoder-transport.js        # ★ v3.3 Transport 层（Mock/REST+SSE/WS + mount）
├── examples/backend-demo.mjs     # ★ v3.3 零依赖演示后端（Node ≥18）
├── examples/backend-axum.rs      # ★ v3.3 Rust axum 参考后端
├── tests/transport.test.mjs      # ★ v3.3 transport 单测（12 用例）
└── dist/                         # 4 格式产物全部包含 transport
```

## v3.3.1 代码审计与加固（2026-09-04）

> 对全部源码（9 个 JS 模块 + 构建 + 类型 + 双参考后端）做逐行审计，**先在无头浏览器实测复现、再修复、再以测试锁死**。
> 新增 9 条审计回归用例，套件 43 → **52 用例**。

### 高危（实测复现的运行时 Bug / 安全）
| # | 问题 | 修复 |
|---|------|------|
| H1 | **每次按 ESC 抛 TypeError** —— ESC 快捷键调用 `QoderDialog.closeAll()`，该方法从未实现 | 补实现 `closeAll()`（含 body 滚动锁恢复） |
| H2 | **本地终端 echo XSS** —— `echo <img onerror=…>` 经 innerHTML 注入可执行脚本（已实测弹出） | 本地输出统一走 `_printLocal`（textContent），错误行用 `--err` 类 |
| H3 | **单标签分屏右栏空白** —— `toggleSplit` 自动新建的标签抢走 activeId，左右栏同一标签 | 记住/恢复激活标签，左右栏必然不同 |

### 中危（泄漏 / 协议 / 重连）
| # | 问题 | 修复 |
|---|------|------|
| M1 | `<qoder-slider>` 每次重渲染向 document 追加 4 个监听器且永不清理（拖拽中每帧 setAttribute → O(帧数²) 累积） | document 监听实例级只挂一次 + disconnected 可重挂；min/max 事件时动态读取 |
| M2 | `<qoder-select>` 同型泄漏（每次重渲染追加 document click 监听） | 同型修复；外部点击关闭功能回归验证通过 |
| M3 | `examples/backend-axum.rs` 按默认蛇形序列化（`exit_code`/`tab_id`），前端读驼峰 → exitCode 恒 0、tabId 路由失效 | `#[serde(rename_all = "camelCase")]` |
| M4 | `<qoder-dialog>` / `<qoder-theme-switcher>` 断开重连后 ESC / 主题同步永久失效 | disconnectedCallback 复位绑定标志 |

### 低危（加固）
- **L3 XSS 面收敛**：toast、通知中心（基础+增强双实现）、上下文菜单、命令面板（含 `_highlight` 三段转义）、会话列表、上传文件名、`<qoder-user-card>` / `<qoder-dialog>` WC 模板 —— 所有 innerHTML 拼接点全部经 `esc()` 转义
- **L4** 终端已提交输入行彻底冻结（父级 `contenteditable=false` 会被子级显式 `true` 覆盖）
- **L5** `features.init()` / `interactions.init()` 重复调用不再叠加 document 监听 / 重复 `<style>` / 重复快捷键注册（`initResponsive`、`hotkeys.init`、`ctrl+shift+p`、`escape`、`?` 全部防重入）
- **L6** WS 未连接时 `chat/exec` 立即报错（onError / stderr+exit 1），不再静默丢消息，`_pending` 不再泄漏
- **类型对齐** `types/index.d.ts` 移除幻影 API（`theme.get()`/`onChange()`/`chat.send`/`markAllRead`…），补齐实际 API（`clearAll`/`getUnreadCount`/`sessions.create…`），WC 注册表键名改为元素名
- **版本一致** `package.json` = 运行时 `QoderUI.version` = 构建横幅 = **3.3.1**（由新增测试强制）

### 审计统计
- **发现 14 项问题：3 高危（含 1 个 XSS）、4 中危、7 低危 —— 全部修复**
- 全部修复先在无头浏览器复现 → 修复 → 复验（ESC 零报错、XSS payload 以纯文本渲染、分屏双栏可见、拖拽 5 帧新增监听器 0）
- 测试套件 43 → **52 用例**（新增 9 条审计回归，锁死每个修复点）；构建四格式全量重建

## v3.3.2 SSR 导出修复（2026-09-04）

> 测试驱动修复：产物导入验证发现 **ESM/CJS 在 Node 下 26 个导出中 21 个为 `undefined`**——
> 此前的完整性测试只断言了"键的数量"，未断言"取值"。与"通用库 / 后端无关"目标直接冲突
> （Next.js SSR、Vitest、构建工具链 import 即得空壳）。

### 根因与修复
| 问题 | 修复 |
|------|------|
| 6 个模块把**整个 API 注册**包进 `if (typeof window === 'undefined') return`，Node 下零注册 | 注册逻辑移至 `globalThis.QoderUI`（总是执行）；DOM 副作用单独护栏 |
| `qoder-shadow.js` 顶层 `class extends HTMLElement` 在 Node 直接 ReferenceError | `HTMLElementBase = typeof HTMLElement !== 'undefined' ? HTMLElement :惰性 stub` |
| `window.QoderUIConfig`（shadow）、`localStorage`（sessions/transport）、`window.dispatchEvent`（transport use/clear）等 5 处加载期/调用期全局访问 | 全部 `typeof` 护栏，Node 下安全降级（空配置/空会话/无事件派发） |
| `customElements.define` 在 Node 无 registry | `register()` 内护栏，`WC.register` API 保持可调用 |

### 修复后语义（由新增测试锁死）
- **Node/SSR**：26 个导出全部有值；`core`/`diff`/`transport`/`createTransport` 等**纯逻辑 API 完全可用**（含 Mock 流式 chat 全链路）；DOM 类 API 可导入、调用时安全降级
- **浏览器**：行为零变化（全部 52 条既有用例 + 无头浏览器端到端回归通过：主题/聊天/终端/词级 Diff/ESC/REST 连接）
- 测试套件 52 → **57 用例**（新增 `tests/exports.test.mjs` 5 条，含"干净子进程 SSR 导入"语义验证）
- 版本统一 **3.3.2**（package.json = 运行时 = 构建横幅）

## v3.3.3 通用性加固（2026-09-04）

> 针对"给其他项目用"目标的遗留问题清单：A 类（工程化缺项）与 B 类（协议健壮性）全部补齐。

### 新增能力
| 项 | 说明 |
|----|------|
| **LICENSE（MIT）** | 补齐授权文件（package.json files 已引用） |
| **GitHub Actions CI** | Node 18/20/22 矩阵：`npm ci → npm test → npm run build` + 产物完整性抽检（CJS 导出 / ESM SSR 导入冒烟） |
| **i18n（gettext 风格）** | `QoderUI.t('已复制')` — key 即中文源串，无语言表时原样返回；内置 `en` 表；`QoderUI.setLocale('en')` 切换；`QoderUI.i18n.register('xx', {...})` 扩展任意语言；模板插值由调用方处理（`t('共 {n} 页').replace('{n}', n)`）。**仅接管界面文案，console 日志与 throw 错误保持中文原文** |
| **WS 心跳（死链检测）** | 应用层 ping/pong，默认 `{ interval: 30000, timeout: 10000 }`；**任意入站消息均视为活性信号**（兼容不实现 pong 的服务端）；超时无响应 → 主动断开触发既有重连；`opts.heartbeat: false` 关闭；客户端自动应答服务端 ping（协议 v1 对等，axum 模板已同步） |
| **REST 建连超时** | 默认 15000ms，仅守护响应头阶段（SSE 流式读取不限时）；超时 → `onError { message: 'timeout' }`（与用户 abort 的 `'aborted'` 区分）；`opts.timeout: 0` 关闭 |
| **终端 scrollback 上限** | 默认 500 行，超出裁剪最老输出行（绝不动活动输入行）；`QoderUI.config.terminalScrollback` 可调，0 = 不限 |

### 验证
- 测试套件 57 → **69 用例**（新增 12 条：i18n ×3 / WS 心跳 ×4 / REST 超时 ×3 / scrollback ×2），并行模式全绿
- 浏览器端到端：`setLocale('en')` 实时切换（终端 help 输出英文）→ 切回中文；scrollback 设 10 跑 20 条命令 DOM 稳定 10 行；REST 远程 pwd 往返正常；全程零 JS 错误
- 导出面 26 → **29**（新增 `t` / `i18n` / `setLocale`），ESM/CJS 双格式键值断言通过

## v3.4.0 内容渲染与验证闭环（2026-09-04）

> 质量纵深 + 聊天内容增强：AI 消息支持 Markdown、聊天历史刷新恢复，并补齐两项验证闭环。

### 新增能力
| 项 | 说明 |
|----|------|
| **Markdown 渲染** | `QoderUI.markdown.render()` — 零依赖轻量解析器（约 250 行）。支持标题/粗体/斜体/删除线/行内码/围栏代码块（语言标注）/链接/任务列表/无序有序列表（一级嵌套）/表格（对齐）/引用/水平线。**安全模型：先整体 HTML 转义再白名单语法替换**，链接仅允许 http/https/mailto/#/相对路径（`javascript:` 等不产出 `<a>`）；AI 消息默认开启，`QoderUIConfig.chatMarkdown = false` 关闭；流式期间实时渲染（>100KB 防御性退化为纯文本） |
| **聊天历史持久化** | 刷新页面自动恢复最近 200 条消息（单条 8000 字符上限，防 localStorage 膨胀）；损坏数据容错（坏 JSON → 空列表不崩溃）；`QoderUI.chat.clearHistory()` 清空；`QoderUIConfig.chatHistory = false` 关闭 |

### 验证闭环
| 项 | 结果 |
|----|------|
| **Rust 参考后端编译验证** | 本地安装 Rust 1.98 工具链，`cargo check` 通过 + 运行时冒烟（health/help/echo/cd 越界拦截/cd 目录切换/rm 白名单拦截）。**发现并修复 4 个真实缺陷**：`PathBuf` 与 `Arc<PathBuf>` 类型不匹配、`Output` 无 `Default`（`unwrap_or_default` 误用）、`cd` 特判被白名单顺序误拦（与 Node 版行为不一致）、help 文案与白名单不同步 |
| **TypeScript 严格校验** | `npm run typecheck`（tsc --strict，357+ 行手写 d.ts 零错误），并作为独立步骤挂进 CI（Node 18/20/22 矩阵） |

### 导出面与测试
- 导出面 29 → **30**（新增 `markdown`），ESM/CJS 双格式键值断言通过
- 测试套件 69 → **86 用例**（markdown ×12 / 历史持久化 ×5）
- 浏览器端到端：markdown 全语法渲染 + XSS 注入拦截 + 刷新恢复（含 md 结构）+ mock 流式实时渲染 + REST 往返，零 JS 错误

## v3.5.0 移动端复现组件族（2026-09-04）

> 移动端专项落地：反编译 Qoder 官方 Android 包 → 逆向分析报告 → 依实证复现移动端 UI 为 Web Components。

### 移动端专项流程
1. **反编译反混淆**：下载官方 APK（com.qoder.mobile.cn v0.2.8, versionCode 46）→ apktool 2.10.0 解资源 + jadx 1.5.1 反编译 9,761 类；R8 单字母混淆，经主包原名 / Kotlin Metadata / 第三方库原名三支点完成语义还原
2. **分析报告**：《Qoder Mobile 移动端逆向分析报告》九章 —— 技术栈判定（原生 Kotlin + Jetpack Compose，非 RN/Flutter）、功能面（i18n 1,372 键全景测绘）、业务流（云端任务四阶段 / Spec 审批 / 四级操作审批）、设计体系（la_accent_* 与 Tailwind 同源）、深链/权限/后端接口（gateway.qoder.com.cn + WebSocket）
3. **前端复现**：`src/qoder-mobile.js` 组件族 + `examples/mobile.html` 演示页

### qm-* 组件（10 个）
| 组件 | 复现对象 | 实证要点 |
|------|---------|---------|
| `<qm-app>` | 底部三 Tab 壳 | 任务/会话/我的，深链语义 qodercn://tasks\|sessions |
| `<qm-task-list>` | 任务列表 | 活跃/已关闭统计、四状态点（实证色） |
| `<qm-new-task>` | 新建任务 | hero 文案逐字（"想到就说，说干就干"/"我是小Q…"）、仓库/分支、Spec 模式 |
| `<qm-conversation>` | 会话对话流 | 深度思考折叠、来源、N 个智能体/N名专家/待办 d/d、已复制 |
| `<qm-composer>` | 输入区 | 图片/相机/文件/语音、模式与模型、沙箱锁定禁用态 |
| `<qm-approval>` | 审批面板 | Spec 双按钮（生成 Spec/直接执行）+ 四级选项（允许[推荐]/仅本次/本会话内/拒绝+拒绝并发送） |
| `<qm-sandbox-boot>` | 云沙箱启动 | 四阶段实证文案 + 失败态 |
| `<qm-artifact>` | 产物页 | 预览/源码切换、最终交付/中间编辑分组 |
| `<qm-session-detail>` | 会话详情 | 会话 ID/模型/运行环境/创建与更新时间 |
| `<qm-settings>` | 设置页 | 外观三选项、账号安全（注销账号）、隐私协议/服务条款、AI 生成内容声明 |

### 复现口径
- **文案**：逐字取自安装包 `assets/dynamic-content/qoder-mobile.zh.json`（45 项断言测试逐字校验），zh/en 双语键集合一致
- **色板**：`la_accent_running #2FBF71 / completed #3B82F6 / attention #F5A623 / error #EF4444`（res/values/colors.xml 实证），明暗双主题（对应 values-night）
- **事件**：全部组件 `bubbles+composed` 标准事件（navigate/task-open/submit/send/approve/copy/item…）
- **测试**：45 新用例（SSR 安全/注册/文案保真/色板/模板渲染/事件契约），全套 86 → **131 全绿**；浏览器 E2E 真机框渲染 + 深浅主题 + 交互冒烟零报错

### 逆向合规声明
分析仅用于学习研究；复现为基于可观察行为与资源事实的重新实现（clean-room），不含官方代码/图片/品牌资产，不得商用。

## v3.6.0 移动端真机对齐（2026-09-04）

> 用户实测反馈"预览与真机 App 不一样"→ 二次深挖反编译产物，从**混淆代码内**提取真实设计系统，纠正 v3.5.0 的推断偏差。

### 二次逆向新证据
1. **真实主题调色板（96 槽 × 双主题）**：定位混淆主题类 `M6.b`（jadx AbstractC0654b），解码全部 96 个色槽的浅/深两套取值，并与 smali `const-wide` 色值常量频谱交叉验证：
   - 品牌主色为**绿色**：浅色 `#5CBD61` / 深色 `#2ADB5C`（**纠正 v3.5.0 误用蓝色 #1F6C92**）
   - 暖灰文字阶：浅 `#141414 / #636261 / #838280 / #9F9E9B`，深 `#EEEEEB / #95958F / #7B7B75 / #484743`
   - 页面底色：浅 `#FDFDFD` / 深 `#161612`；容器 `#FFFFFF / #171716`；填充 `#F0F0F0 / #1D1D1A`（res/values-night 语义实证）
   - 状态色：`error #FF4D4F / warning #FAAD14 / info #0B83F1 / success #5BB98B`（Ant Design 系），`la_accent_*` 四色保留用于通知态
2. **信息架构实证**：深链 `qodercn://home | tasks | sessions`；任务页筛选 tab（全部/进行中/待审批/空闲，tasks_tab_*）+ 时间分组（今天/昨天/近 7 天/更早）+ 远程控制引导卡（远程控制 · Qoder Desktop & CLI）
3. **新建任务落地页**：云端工作/连接电脑双 tab（new_task_landing_*），小Q 吉祥物欢迎语，两 tab 各 4 条真实提示词 chips 逐字
4. **对话工具卡片族**（tool_use_*）：执行命令/读取文件/编辑文件/搜索/网页搜索/网页抓取/生成图片/技能/MCP/更新待办/子智能体/请求进入 Plan 模式 × 四状态（运行中/已完成/失败/等待中）+ 分组卡（运行 N 个工具/读取 N 个文件/写入 N 个文件/已处理 N 个操作）+ 待办列表
5. **输入区选择面板**（composer.*）：五模式（询问权限/自动审批/自动接受编辑/免审批模式/计划模式）× 五模型（自动/高效/轻量/高性能/旗舰 + 描述逐字）
6. **产物 12 类图标**（ic_artifact_*）：pdf/word/excel/ppt/markdown/code/image/audio/video/webpage/archive/folder/general

### 组件修正（qm-* 10 个，API 向后兼容）
| 组件 | v3.6.0 变化 |
|------|------------|
| `qm-app` | 三 Tab → 四 Tab（首页/任务/工作区/我的，深链实证 + workspace.title） |
| `qm-task-list` | 活跃/已关闭统计 → 实证筛选 chips + 时间分组 + 阶段标签（含旧状态名兼容映射）+ 远程控制卡 + 任务计数 |
| `qm-new-task` | 仓库/分支选择器 → 实证双 tab 落地页（小Q hero + 真实提示词 chips + 描述你的任务...） |
| `qm-conversation` | 新增工具卡片族/分组卡/待办列表渲染 |
| `qm-composer` | 新增模式/模型底部选择面板（逐字文案）+ 打开输入选项按钮 |
| `qm-approval` | 新增 kind=edit/mcp + 审批标题逐字 + 需要授权徽标 + 命令回显 |
| `qm-artifact` | 类型缩写块 → 12 类类型着色图标（主题辅色槽取值） |
| `qm-session-detail` | 新增 常规/元数据 分组 |
| `qm-settings` | 新增版本行（Version: 0.2.8） |
| `qm-sandbox-boot` | 主题色对齐（绿色系） |

### 质量门
- 测试 131 → **164 用例全绿**（新增色板断言/工具卡/筛选分组/面板交互等 33 项）
- E2E（真实 Chromium）：四 Tab/筛选/远程控制卡/工具卡片 5 枚/分组卡/待办 4 项/模型面板选择闭环（旗舰→写入属性→面板关闭）/审批命令回显/沙箱四阶段/深色切换/任务卡事件，零 console 错误
- 导出面不变（31）；npm pack 36 文件；构建四产物字节可复现

### 逆向合规声明
分析仅用于学习研究；复现为基于可观察行为与资源事实的重新实现（clean-room），不含官方代码/图片/品牌资产，不得商用。
