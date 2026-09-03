# Qoder UI

> 原汁原味的 Qoder 前端风格原生组件库，8 个官方主题，零依赖纯 CSS 实现。

从 Qoder v0.1.6 安装包反编译提取设计语言，抛弃原生打包代码，重新实现为干净的原生 CSS 组件。

## ✨ 特性

- **8 个官方主题**：Forest Light/Dark、Bee Light/Dark、Mint Light/Dark、Parchment Light/Dark
- **20+ 原生组件**：Button、Input、Card、Badge、Switch、Tabs、Avatar、Alert、Chat Bubble、Sidebar、Table、Code Block、Dropdown、Tooltip、Progress、Divider 等
- **零依赖**：纯 CSS + 原生 HTML，无需任何框架
- **设计令牌系统**：完整的 CSS 变量体系，颜色、间距、圆角、字体、阴影全部可定制
- **主题切换**：通过 `data-theme` 属性一键切换，支持 localStorage 持久化
- **响应式**：移动端友好

## 📦 安装

### 方式一：直接引入 CSS

```html
<link rel="stylesheet" href="src/index.css">
```

### 方式二：npm 包（待发布）

```bash
npm install qoder-ui
```

```js
import 'qoder-ui';
```

## 🚀 快速开始

### 1. 设置主题

在 `<html>` 标签上设置 `data-theme` 属性：

```html
<html data-theme="forest-light">
```

可用主题：
- `forest-light` - 森林绿（浅色，默认）
- `forest-dark` - 森林绿（深色）
- `bee-light` - 蜜蜂黄（浅色）
- `bee-dark` - 蜜蜂黄（深色）
- `mint-light` - 薄荷绿（浅色）
- `mint-dark` - 薄荷绿（深色）
- `light-parchment` - 羊皮纸（浅色）
- `parchment-dark` - 羊皮纸（深色）

### 2. 使用组件

```html
<!-- 按钮 -->
<button class="qoder-btn qoder-btn-primary">主要按钮</button>
<button class="qoder-btn qoder-btn-secondary">次要按钮</button>
<button class="qoder-btn qoder-btn-ghost">幽灵按钮</button>

<!-- 输入框 -->
<input class="qoder-input" placeholder="请输入...">

<!-- 卡片 -->
<div class="qoder-card">
  <div class="qoder-card-header">
    <h3 class="qoder-card-title">卡片标题</h3>
  </div>
  <div class="qoder-card-body">卡片内容</div>
</div>

<!-- 徽章 -->
<span class="qoder-badge qoder-badge-success">成功</span>
<span class="qoder-badge qoder-badge-warning">警告</span>
<span class="qoder-badge qoder-badge-error">错误</span>
```

### 3. 动态切换主题

```js
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('qoder-theme', theme);
}

// 恢复保存的主题
const saved = localStorage.getItem('qoder-theme');
if (saved) setTheme(saved);
```

## 🎨 设计令牌

所有样式通过 CSS 变量驱动，可自由覆盖：

```css
:root {
  /* 颜色 */
  --bg-page: #f7faf8;
  --bg-card: #ffffff;
  --text-primary: #1c4432;
  --text-secondary: #316e50;
  --accent: #358e62;
  --border: #cfe4dc;

  /* 间距 */
  --qoder-space-1: 4px;
  --qoder-space-2: 8px;
  --qoder-space-3: 12px;
  --qoder-space-4: 16px;

  /* 圆角 */
  --qoder-radius-sm: 6px;
  --qoder-radius-md: 8px;
  --qoder-radius-lg: 12px;

  /* 字体 */
  --qoder-font-sans: 'Instrument Sans', -apple-system, sans-serif;
  --qoder-font-mono: ui-monospace, SFMono-Regular, monospace;

  /* 阴影 */
  --qoder-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --qoder-shadow-md: 0 4px 12px rgba(0,0,0,0.08);
}
```

## 📁 项目结构

```
qoder-ui/
├── src/
│   ├── index.css                    # 入口文件
│   ├── themes/
│   │   └── qoder-themes.css         # 8 个主题定义
│   ├── styles/
│   │   └── base.css                 # 基础重置 + 工具类
│   └── components/
│       └── qoder-components.css     # 组件样式
├── examples/
│   └── index.html                   # 完整演示页面
├── package.json
└── README.md
```

## 🧩 组件清单

| 组件 | 类名前缀 | 说明 |
|------|---------|------|
| Button | `qoder-btn` | 4 变体 × 3 尺寸 |
| Input | `qoder-input` | 图标、错误、多行 |
| Card | `qoder-card` | 头部/内容/底部 |
| Badge | `qoder-badge` | 6 种语义色 |
| Switch | `qoder-switch` | 平滑过渡开关 |
| Tabs | `qoder-tabs` | 底部指示线 |
| Avatar | `qoder-avatar` | 4 尺寸 + 状态点 |
| Alert | `qoder-alert` | 4 种语义类型 |
| Chat Bubble | `qoder-chat` | AI/用户双气泡 |
| Sidebar | `qoder-sidebar` | 导航侧边栏 |
| Table | `qoder-table` | 行悬停表格 |
| Code Block | `qoder-code` | 带头部代码块 |
| Dropdown | `qoder-dropdown` | 下拉菜单 |
| Tooltip | `qoder-tooltip` | 悬停提示 |
| Progress | `qoder-progress` | 进度条 |
| Divider | `qoder-divider` | 分割线 |

## 🖥️ 本地预览

```bash
# 方式一：直接打开
open examples/index.html

# 方式二：本地服务器
npx serve examples
```

## 📝 说明

本项目从 Qoder v0.1.6 Linux 安装包（deb）中反编译提取设计语言，包括：
- 8 个官方主题的完整配色系统（从混淆后的 `--q*` CSS 变量还原为语义化变量）
- 组件设计规范（圆角、间距、字体、阴影、过渡动画）
- 主题切换机制（`data-theme` 属性 + CSS 变量覆盖）

所有代码均为重新实现，不包含 Qoder 的原始打包代码。

## 📄 License

MIT
