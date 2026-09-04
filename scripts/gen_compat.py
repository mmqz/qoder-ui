#!/usr/bin/env python3
"""
qoder-compat.css 生成器
- 从现有 CSS 自动克隆「改名映射」规则（双横线 BEM -> 单横线历史命名）
- 手写完全缺失的实现（skeleton/checkbox/tag/avatar-group/终端增强等）
输出: src/components/qoder-compat.css
"""
import re, sys

ROOT = '/home/z/my-project/qoder-ui'
CSS_FILES = [
    'src/themes/qoder-themes.css', 'src/styles/base.css',
    'src/components/qoder-components.css', 'src/components/qoder-advanced.css',
    'src/components/qoder-icons.css', 'src/components/qoder-markdown.css',
    'src/components/qoder-chat.css', 'src/components/qoder-panels.css',
    'src/components/qoder-extras.css', 'src/components/qoder-viz.css',
    'src/components/qoder-responsive.css',
]

# (新类名, 历史类名) —— 顺序无关（用词边界匹配）
RENAME = [
    # 按钮 / 徽章 / 头像 / 提示 / 进度
    ('qoder-btn--primary', 'qoder-btn-primary'),
    ('qoder-btn--secondary', 'qoder-btn-secondary'),
    ('qoder-btn--ghost', 'qoder-btn-ghost'),
    ('qoder-btn--danger', 'qoder-btn-danger'),
    ('qoder-btn--sm', 'qoder-btn-sm'),
    ('qoder-btn--lg', 'qoder-btn-lg'),
    ('qoder-badge--primary', 'qoder-badge-primary'),
    ('qoder-badge--success', 'qoder-badge-success'),
    ('qoder-badge--warning', 'qoder-badge-warning'),
    ('qoder-badge--error', 'qoder-badge-error'),
    ('qoder-badge--info', 'qoder-badge-info'),
    ('qoder-badge--default', 'qoder-badge-default'),
    ('qoder-avatar--sm', 'qoder-avatar-sm'),
    ('qoder-avatar--md', 'qoder-avatar-md'),
    ('qoder-avatar--lg', 'qoder-avatar-lg'),
    ('qoder-avatar--xl', 'qoder-avatar-xl'),
    ('qoder-alert--info', 'qoder-alert-info'),
    ('qoder-alert--success', 'qoder-alert-success'),
    ('qoder-alert--warning', 'qoder-alert-warning'),
    ('qoder-alert--error', 'qoder-alert-error'),
    ('qoder-progress__bar', 'qoder-progress-bar'),
    ('qoder-tooltip__content', 'qoder-tooltip-content'),
    # 下拉
    ('qoder-dropdown__menu', 'qoder-dropdown-menu'),
    ('qoder-dropdown__item--danger', 'qoder-dropdown-item-danger'),
    ('qoder-dropdown__item', 'qoder-dropdown-item'),
    ('qoder-dropdown__divider', 'qoder-dropdown-divider'),
    ('qoder-dropdown--open', 'qoder-dropdown-open'),
    # 输入
    ('qoder-input-wrap--error', 'qoder-input-error'),
    ('qoder-input-wrap--focus', 'qoder-input-wrapper:focus-within'),
    ('qoder-input-wrap', 'qoder-input-wrapper'),
    # 聊天（msg 系 -> message 系）
    ('qoder-chat__msg--user', 'qoder-message--user'),
    ('qoder-chat__msg--ai', 'qoder-message--assistant'),
    ('qoder-chat__msg--system', 'qoder-message--system'),
    ('qoder-chat__msg-avatar', 'qoder-message__avatar'),
    ('qoder-chat__msg-body', 'qoder-message__body'),
    ('qoder-chat__msg-content', 'qoder-message__content'),
    ('qoder-chat__msg-time', 'qoder-message__time'),
    ('qoder-chat__msg-actions', 'qoder-message__actions'),
    ('qoder-chat__action', 'qoder-message__action'),
    ('qoder-chat__msg', 'qoder-message'),
    # 思考 / 欢迎 / 建议 / 日期 / 输入区
    ('qoder-chat__thinking', 'qoder-thinking'),
    ('qoder-thinking__title', 'qoder-thinking__label'),
    ('qoder-thinking__content', 'qoder-thinking__body'),
    ('qoder-chat__welcome-subtitle', 'qoder-chat__welcome-desc'),
    ('qoder-chat__suggestion-text', 'qoder-chat__suggestion-title'),
    ('qoder-chat__date-sep', 'qoder-chat__date-divider'),
    ('qoder-chat-input__textarea', 'qoder-chat-input__editor'),
    # 取色器
    ('qoder-color-picker__swatch--active', 'qoder-colorpicker__preset--active'),
    ('qoder-color-picker__swatches', 'qoder-colorpicker__presets'),
    ('qoder-color-picker__swatch', 'qoder-colorpicker__swatch'),
    ('qoder-color-picker', 'qoder-colorpicker'),
    # 日期选择
    ('qoder-datepicker__grid', 'qoder-datepicker__days'),
    ('qoder-datepicker__dow', 'qoder-datepicker__weekdays'),
    # 时间线 complete
    ('qoder-timeline__item--complete', 'qoder-timeline__item--success'),
    # 任务规划
    ('qoder-task-planner__title', 'qoder-task-plan__title'),
    ('qoder-task-planner__header', 'qoder-task-plan__header'),
    ('qoder-task-planner', 'qoder-task-plan'),
    ('qoder-task-item__body', 'qoder-task-item__content'),
    ('qoder-task-item__time', 'qoder-task-item__duration'),
    # Agent 卡片状态
    ('qoder-agent-card__status--active', 'qoder-agent-card__status--working'),
    # 数据可视化
    ('qoder-mini-bar__item--active', 'qoder-sparkbar__bar--peak'),
    ('qoder-mini-bar__item', 'qoder-sparkbar__bar'),
    ('qoder-mini-bar', 'qoder-sparkbar'),
    ('qoder-mini-line', 'qoder-sparkline'),
    # 上传文案
    ('qoder-upload__area--dragover', 'qoder-upload--dragover'),
    ('qoder-card__title', 'qoder-card-title'),
    ('qoder-card__header', 'qoder-card-header'),
    ('qoder-card__footer', 'qoder-card-footer'),
    ('qoder-card__body', 'qoder-card-body'),
    ('qoder-upload__text', 'qoder-upload__desc'),
    ('qoder-upload__hint', 'qoder-upload__desc'),
]

def parse_blocks(css):
    """返回 [(selector, body, media_or_None)]"""
    out = []
    i, n = 0, len(css)
    media = None
    while i < n:
        m = re.search(r'[^{}]', css[i:])
        if not m:
            break
        j = i + m.start()
        ch = css[j]
        if ch == '}':
            media = None
            i = j + 1
            continue
        # 读取到 { 或 ;
        k = j
        depth = 0
        while k < n:
            if css[k] == '{':
                break
            if css[k] == ';':   # @import 等
                k += 1
                break
            k += 1
        head = css[j:k].strip()
        if k < n and css[k] == '{':
            # 找配对 }
            depth = 1
            k2 = k + 1
            while k2 < n and depth:
                if css[k2] == '{':
                    depth += 1
                elif css[k2] == '}':
                    depth -= 1
                k2 += 1
            body = css[k + 1:k2 - 1]
            if head.startswith('@media'):
                # 递归展开内层规则
                media = head
                inner = parse_blocks.__wrapped__(body) if hasattr(parse_blocks, '__wrapped__') else None
                for sel, b, _ in parse_inner(body):
                    out.append((sel, b, head))
            elif head.startswith('@'):
                pass  # @keyframes 等原样保留由调用方处理
            else:
                out.append((head, body, media))
            i = k2
        else:
            i = k + 1
    return out

def parse_inner(css):
    out = []
    i, n = 0, len(css)
    while i < n:
        m = re.search(r'[^{}]', css[i:])
        if not m:
            break
        j = i + m.start()
        k = j
        while k < n and css[k] != '{':
            k += 1
        if k >= n:
            break
        depth = 1
        k2 = k + 1
        while k2 < n and depth:
            if css[k2] == '{':
                depth += 1
            elif css[k2] == '}':
                depth -= 1
            k2 += 1
        out.append((css[j:k].strip(), css[k + 1:k2 - 1], None))
        i = k2
    return out

def clone_aliases():
    all_css = ''
    for f in CSS_FILES:
        all_css += open(f'{ROOT}/{f}', encoding='utf-8').read() + '\n'
    blocks = parse_blocks(all_css)
    sections = {}
    for new, old in RENAME:
        pat = re.compile(r'\.' + re.escape(old) + r'(?![\w-])')
        rules = []
        seen = set()
        for sel, body, media in blocks:
            if pat.search(sel):
                new_sel = pat.sub('.' + new, sel)
                # 跳过涉及旧 token 后代链中的父级重复克隆（如 .qoder-tooltip:hover .qoder-tooltip-content 中父级不变）
                key = (new_sel, re.sub(r'\s+', ' ', body.strip()))
                if key in seen:
                    continue
                seen.add(key)
                text = f'{new_sel} {{\n{body.strip()}\n}}'
                if media:
                    text = f'{media} {{\n{text}\n}}'
                rules.append(text)
        sections[new] = rules
    return sections

HAND = '''
/* ============================================================
   以下为完全缺失实现的手写补齐（v3.2）
   ============================================================ */

/* ---------- Input wrap 聚焦态 ---------- */
.qoder-input-wrap--focus {
  border-color: var(--accent);
  box-shadow: 0 0 0 3px var(--accent-bg);
}

/* ---------- Switch 滑块（slider 元素自绘轨道+旋钮） ---------- */
.qoder-switch__slider {
  position: relative;
  display: inline-block;
  width: 36px;
  height: 20px;
  background: var(--border-strong, #999);
  border-radius: 999px;
  transition: background 0.15s;
  flex-shrink: 0;
}
.qoder-switch__slider::after {
  content: '';
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  background: #fff;
  border-radius: 50%;
  transition: transform 0.15s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.2);
}
.qoder-switch input:checked + .qoder-switch__slider {
  background: var(--accent);
}
.qoder-switch input:checked + .qoder-switch__slider::after {
  transform: translateX(16px);
}
.qoder-switch input:focus-visible + .qoder-switch__slider {
  outline: 2px solid var(--border-focus, var(--accent));
  outline-offset: 2px;
}

/* ---------- Checkbox 复选框 ---------- */
.qoder-checkbox {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--text-primary);
  cursor: pointer;
  user-select: none;
}
.qoder-checkbox input {
  position: absolute;
  opacity: 0;
  width: 0;
  height: 0;
}
.qoder-checkbox__box {
  width: 16px;
  height: 16px;
  border: 1.5px solid var(--border-strong, #999);
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  color: transparent;
  background: var(--bg-surface);
  transition: all 0.15s;
  flex-shrink: 0;
}
.qoder-checkbox input:checked + .qoder-checkbox__box {
  background: var(--accent);
  border-color: var(--accent);
  color: #fff;
}
.qoder-checkbox input:focus-visible + .qoder-checkbox__box {
  outline: 2px solid var(--border-focus, var(--accent));
  outline-offset: 2px;
}

/* ---------- Tag 标签 ---------- */
.qoder-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 12px;
  background: var(--accent-bg);
  color: var(--accent);
  border: 1px solid transparent;
  cursor: default;
}
.qoder-tag--closable {
  cursor: pointer;
}

/* ---------- Avatar Group 头像组 ---------- */
.qoder-avatar-group {
  display: flex;
  align-items: center;
}
.qoder-avatar-group .qoder-avatar,
.qoder-avatar-group .qoder-avatar--sm {
  border: 2px solid var(--bg-page, #fff);
}
.qoder-avatar-group > * + * {
  margin-left: -8px;
}

/* ---------- Skeleton 骨架屏 ---------- */
.qoder-skeleton {
  display: inline-block;
  border-radius: 6px;
  background: linear-gradient(90deg,
    var(--bg-tertiary, #eee) 25%,
    var(--bg-surface, #f5f5f5) 50%,
    var(--bg-tertiary, #eee) 75%);
  background-size: 200% 100%;
  animation: qoder-skeleton-wave 1.4s ease infinite;
}
@keyframes qoder-skeleton-wave {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.qoder-skeleton--circle {
  border-radius: 50%;
}

/* ---------- 终端增强（v3.2） ---------- */
.qoder-terminal__tab--add {
  justify-content: center;
  min-width: 28px;
  padding: 0 8px;
  color: rgba(255,255,255,0.4);
  border-right: none;
}
.qoder-terminal__tab--add:hover {
  color: rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.06);
}
.qoder-terminal__line--dim {
  opacity: 0.55;
}
.qoder-terminal__success {
  color: #b5cea8;
}
.qoder-terminal__link {
  color: #569cd6;
  text-decoration: underline;
  cursor: pointer;
}
.qoder-terminal__input-line {
  white-space: pre-wrap;
}

/* ---------- Diff stat 基类 ---------- */
.qoder-diff__stat {
  font-weight: 600;
}

/* ---------- 设置行（setting-row 简写族） ---------- */
.qoder-setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 0;
  gap: 16px;
}
.qoder-setting-row + .qoder-setting-row {
  border-top: 1px solid var(--border-subtle, #e4e3dd);
}
.qoder-setting-row__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}
.qoder-setting-row__desc {
  font-size: 12px;
  color: var(--text-tertiary);
  margin-top: 2px;
}

/* ---------- 会话时间 / 主题预览激活 ---------- */
.qoder-session-item__time {
  font-size: 10px;
  color: var(--text-tertiary);
  white-space: nowrap;
  margin-left: auto;
}
.qoder-theme-preview--active {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
  border-radius: 6px;
}
.qoder-theme-preview--active span {
  color: var(--text-primary);
}

/* ---------- 全息卡片标准变体元信息行 ---------- */
.qoder-user-card__standard-joined-time {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.qoder-user-card__standard-joined-time span:first-child {
  color: var(--text-tertiary);
}

/* ---------- 代码行（聊天代码块行号） ---------- */
.qoder-code-line {
  display: block;
  padding-left: 34px;
  position: relative;
  min-height: 1.5em;
}
.qoder-code-line-num {
  position: absolute;
  left: 0;
  width: 26px;
  text-align: right;
  color: var(--text-tertiary);
  opacity: 0.6;
  user-select: none;
  font-size: 11px;
  line-height: 1.7;
}

/* ---------- Agent 消息流 ---------- */
.qoder-agent-message {
  max-width: 82%;
  padding: 6px 12px;
  border-radius: 10px;
  font-size: 12.5px;
  line-height: 1.55;
  margin: 4px 0;
}
.qoder-agent-message--out {
  margin-left: auto;
  background: var(--accent-bg);
  color: var(--text-primary);
  border-bottom-right-radius: 3px;
}
.qoder-agent-message--in {
  margin-right: auto;
  background: var(--bg-tertiary);
  color: var(--text-primary);
  border-bottom-left-radius: 3px;
}

/* ---------- 运行结果标题 ---------- */
.qoder-run-result__title {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

/* ---------- 热力图行 / 标签 ---------- */
.qoder-heatmap__row {
  display: flex;
  align-items: center;
  gap: 4px;
}
.qoder-heatmap__label {
  width: 34px;
  flex-shrink: 0;
  font-size: 10px;
  color: var(--text-tertiary);
  text-align: right;
  padding-right: 4px;
}

/* ---------- 思考折叠切换箭头 ---------- */
.qoder-thinking__toggle {
  font-size: 10px;
  color: var(--text-tertiary);
  transition: transform 0.15s;
}
.qoder-thinking--open .qoder-thinking__toggle {
  transform: rotate(180deg);
}

/* ---------- 图标：麦克风（codicon 无此映射，emoji 兜底） ---------- */
.qoder-icon--mic::before {
  content: '\\1F3A4';
  font-family: 'Segoe UI Emoji', 'Noto Color Emoji', 'Apple Color Emoji', sans-serif;
}

/* ---------- Tooltip 位置修饰（v3.2 WC 使用） ---------- */
.qoder-tooltip__content--top {
  bottom: calc(100% + 8px);
  top: auto;
}
.qoder-tooltip__content--bottom {
  top: calc(100% + 8px);
  bottom: auto;
}

/* ---------- 折叠面板标题 ---------- */
.qoder-collapsible__title {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-primary);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.qoder-setting-row__label {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

/* ---------- Toast 容器兜底 ---------- */
.qoder-toast-container {
  font-family: var(--qoder-font, inherit);
}

/* ---------- 会话删除按钮 ---------- */
.qoder-session-item__delete {
  font-size: 14px;
  line-height: 1;
}
.qoder-session-item:hover .qoder-session-item__delete,
.qoder-session-item--active .qoder-session-item__delete {
  display: inline-block !important;
}

/* ---------- 上传动态 UI ---------- */
.qoder-upload__list {
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.qoder-upload__area--dragover {
  border-color: var(--accent) !important;
  background: var(--accent-bg) !important;
}
.qoder-upload__item {
  transition: opacity 0.2s;
}
.qoder-upload__remove:hover {
  color: var(--error) !important;
}

/* ---------- 终端可编辑输入 ---------- */
.qoder-terminal__input-text {
  color: #e8e8e8;
  caret-color: transparent;
  min-height: 1.5em;
}

/* ---------- 通知单条关闭 ---------- */
.qoder-notification-item__close:hover {
  color: var(--text-primary) !important;
}

/* ---------- 设置内容区（JS 导航创建） ---------- */
.qoder-settings__content-area {
  display: none;
  flex: 1;
  overflow-y: auto;
  padding: 20px 24px;
}
.qoder-settings__content-area--active {
  display: block;
}

/* ---------- Select 禁用态（v3.2 WC） ---------- */
.qoder-select--disabled {
  opacity: 0.5;
  pointer-events: none;
}
.qoder-select--disabled .qoder-select__trigger {
  cursor: not-allowed;
}
'''

def main():
    sections = clone_aliases()
    out = ['''/* ============================================================
   Qoder UI Compat - 命名兼容层（v3.2 自动生成 + 手写补齐）
   ------------------------------------------------------------
   背景：v1/v3.0 期间 CSS 使用单横线命名（qoder-btn-primary），
   而示例页与部分组件使用双横线 BEM（qoder-btn--primary），
   导致 80+ 类无样式。本文件由 scripts/gen_compat.py 生成：
     1) 改名映射：从现有规则自动克隆（含 hover/伪类/media）
     2) 手写补齐：v3.0 从未实现的结构性组件
   生成命令：python3 scripts/gen_compat.py
   ============================================================ */''']

    # 按分组输出克隆规则
    groups = {}
    for new, old in RENAME:
        groups.setdefault(old, []).append(new)
    out.append('\n/* ===== 1. 自动克隆：改名映射（旧规则 -> 双横线别名） ===== */\n')
    for old, news in groups.items():
        for new in news:
            rules = sections.get(new, [])
            if rules:
                out.append(f'/* {new}  <-  {old} */')
                out.extend(rules)
                out.append('')
            else:
                out.append(f'/* !! 未找到旧规则: {old} (为 {new} 生成别名失败) */')
                out.append('')

    out.append(HAND)
    path = f'{ROOT}/src/components/qoder-compat.css'
    open(path, 'w', encoding='utf-8').write('\n'.join(out))
    total = sum(len(v) for v in sections.values())
    print(f'compat.css written: {total} cloned rules + hand-written blocks')

if __name__ == '__main__':
    sys.exit(main())
