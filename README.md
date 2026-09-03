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
