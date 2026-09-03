# Qoder UI

> 原汁原味的 Qoder 前端风格原生组件库，8 个官方主题，400+ 图标，高级视觉组件，零依赖纯 CSS 实现。

从 Qoder v0.1.6 安装包反编译提取设计语言，抛弃原生打包代码，重新实现为干净的原生 CSS 组件。

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
- **20+ 基础组件**：Button、Input、Card、Badge、Switch、Tabs、Avatar、Alert、Tooltip、Dropdown、Progress、Spinner、Skeleton、Divider、Table、CodeBlock、ChatBubble、Sidebar、ThemeSwitcher 等
- **零依赖**：纯 CSS + HTML，无需任何框架
- **完整演示页面**：`examples/index.html` 可直接浏览器打开查看所有组件

## 快速开始

### 安装

```bash
npm install qoder-ui
```

或直接引入 CSS：

```html
<link rel="stylesheet" href="qoder-ui/src/index.css">
```

### 使用

```html
<!-- 设置主题 -->
<html data-theme="forest-light">

<!-- 使用组件 -->
<button class="qoder-btn qoder-btn--primary">主要按钮</button>
<div class="qoder-card">卡片内容</div>
<span class="qoder-icon qoder-icon--sparkle"></span>
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
│   ├── index.css                    # 入口文件
│   ├── themes/
│   │   └── qoder-themes.css         # 8 个主题的 CSS 变量定义
│   ├── styles/
│   │   └── base.css                 # 基础重置 + 工具类
│   ├── components/
│   │   ├── qoder-components.css     # 20+ 基础组件
│   │   ├── qoder-advanced.css       # 高级组件（全息卡片/语音/窗口等）
│   │   └── qoder-icons.css          # 图标系统（Codicon + Seti）
│   └── fonts/
│       ├── codicon.ttf              # Codicon 图标字体
│       └── qoder-seti.woff          # Seti 文件类型图标字体
├── examples/
│   └── index.html                    # 完整演示页面
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

## 高级组件用法

### 全息用户卡片

```html
<div class="qoder-user-card">
  <div class="qoder-user-card__frame"></div>
  <div class="qoder-user-card__surface">
    <div class="qoder-user-card__glow qoder-user-card__glow--soft"></div>
    <div class="qoder-user-card__glow qoder-user-card__glow--medium"></div>
    <div class="qoder-user-card__glow qoder-user-card__glow--strong"></div>
    <div class="qoder-user-card__glow qoder-user-card__glow--deep"></div>
  </div>
  <div class="qoder-user-card__holographic">
    <div class="qoder-user-card__holographic-spectrum"></div>
    <div class="qoder-user-card__holographic-glare"></div>
  </div>
  <div class="qoder-user-card__text-layer">
    <div class="qoder-user-card__identity">
      <p class="qoder-user-card__email">user@example.com</p>
      <p class="qoder-user-card__label">PRO MEMBER</p>
    </div>
  </div>
</div>
```

### 语音胶囊

```html
<div class="qoder-capsule qoder-capsule--active">
  <div class="qoder-capsule-blobs">
    <div class="qoder-capsule-blob qoder-capsule-blob--primary"></div>
  </div>
  <div class="qoder-capsule-core">
    <span class="qoder-icon qoder-icon--mic"></span>
  </div>
</div>
```

### 窗口 Chrome

```html
<div class="qoder-chrome-window">
  <div class="qoder-chrome-titlebar">
    <div class="qoder-chrome-traffic-lights">
      <div class="qoder-chrome-traffic-light close"></div>
      <div class="qoder-chrome-traffic-light minimize"></div>
      <div class="qoder-chrome-traffic-light maximize"></div>
    </div>
    <div class="qoder-chrome-title">窗口标题</div>
  </div>
  <div class="qoder-chrome-body">
    <div class="qoder-chrome-sidebar">侧边栏</div>
    <div class="qoder-chrome-content">内容</div>
  </div>
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

1. 解压 deb → 提取 app.asar → 分析 439KB 主 CSS
2. 还原 8 个主题的 CSS 变量系统（1345 个变量）
3. 逆向 49 个 qoder-* 原生组件类（重点：qoder-user-card 全息卡片 86 条规则）
4. 提取 codicon.ttf + qoder-seti.woff 图标字体
5. 抛弃原生 React/Tailwind 打包代码，重写为纯原生 CSS

**技术栈**：Qoder = VS Code fork + Electron + React + Vite + Tailwind CSS

## 演示

打开 `examples/index.html` 即可查看所有组件和 8 个主题的效果。

## License

MIT
