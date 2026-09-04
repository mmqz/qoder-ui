/**
 * Qoder UI v3.2 类型声明（手写，覆盖全部公共 API）
 * 零依赖纯 CSS+JS 组件库：8 主题 / 50+ 组件 / 21 Web Components
 */

/** 主题 ID：forest-light | forest-dark | bee-light | bee-dark | mint-light | mint-dark | light-parchment | parchment-dark */
export type QoderThemeId =
  | 'forest-light' | 'forest-dark'
  | 'bee-light' | 'bee-dark'
  | 'mint-light' | 'mint-dark'
  | 'light-parchment' | 'parchment-dark';

export type QoderToastType = 'info' | 'success' | 'warning' | 'error';
export type QoderDiffSegmentType = 'equal' | 'add' | 'del';

export interface QoderDiffSegment { type: QoderDiffSegmentType; value: string }
export interface QoderDiffRow { type: QoderDiffSegmentType; text: string; oldNo: number | null; newNo: number | null }
export interface QoderWordChanges { removed: string[]; added: string[]; hasChanges: boolean }
export interface QoderFuzzyResult { score: number; contains: boolean; subsequence: boolean }

export interface QoderPaletteItem {
  icon?: string;
  label: string;
  group?: string;
  shortcut?: string;
  action?: string;
}

export interface QoderContextMenuItem {
  label?: string;
  icon?: string;
  shortcut?: string;
  action?: string;
  disabled?: boolean;
  danger?: boolean;
  divider?: boolean;
}

export interface QoderNotification {
  id: number;
  type: QoderToastType;
  title: string;
  desc?: string;
  time?: string;
  unread?: boolean;
}

export interface QoderHotkeyBinding { keys: string; callback: (e: KeyboardEvent) => void; description?: string }

export interface QoderRenderDiffOptions {
  old: string;
  /** 新文本（ES 保留字可用引号属性或 newText） */
  new?: string;
  newText?: string;
  filename?: string;
}

/** 纯逻辑核心（无 DOM，可在 Node 使用） */
export interface QoderCoreApi {
  clamp(val: number, min: number, max: number): number;
  debounce<T extends (...args: any[]) => any>(fn: T, ms: number): (...args: Parameters<T>) => void;
  escapeHtml(str: unknown): string;
  uid(prefix?: string): string;
  lcs<T>(a: T[], b: T[], equalsFn?: (x: T, y: T) => boolean): T[];
  tokenizeLine(line: string): string[];
  diffWords(oldLine: string, newLine: string): QoderDiffSegment[];
  wordChanges(oldLine: string, newLine: string): QoderWordChanges;
  diffLines(oldText: string, newText: string): QoderDiffRow[];
  fuzzyMatch(text: string, query: string): QoderFuzzyResult | null;
  normalizeKeys(keys: string): string;
  parseCombo(normalized: string): string[];
  comboFromEvent(e: Partial<KeyboardEvent>): string;
  matchKeys(event: Partial<KeyboardEvent>, normalizedKeys: string): boolean;
  MODIFIER_KEYS: string[];
}

/** Shadow DOM 样式隔离引擎 */
export interface QoderShadowApi {
  prepare(): Promise<{ mode: 'sheet' | 'import' | 'none'; sheet?: CSSStyleSheet; url?: string }>;
  applyStyles(root: ShadowRoot): void;
  resolveEntryCSS(): Promise<string>;
}

export interface QoderConfig { shadow: boolean }

export interface QoderThemeApi {
  THEMES: QoderThemeId[];
  STORAGE_KEY: string;
  readonly current: QoderThemeId;
  set(theme: QoderThemeId): void;
  get(): QoderThemeId;
  init(): void;
  toggle(): void;
  onChange(cb: (theme: QoderThemeId) => void): void;
}

export interface QoderToastApi {
  show(message: string, type?: QoderToastType, duration?: number): void;
}

export interface QoderDialogApi {
  open(id: string): void;
  close(id: string): void;
  closeAll(): void;
  init(): void;
}

export interface QoderPaletteApi {
  open(items: QoderPaletteItem[], onSelect?: (item: QoderPaletteItem) => void): void;
  close(): void;
}

export interface QoderContextMenuApi {
  show(x: number, y: number, items: QoderContextMenuItem[]): void;
  hide(): void;
}

export interface QoderNotificationCenterApi {
  open(): void;
  close(): void;
  add(n: Omit<QoderNotification, 'id'>): void;
  markAllRead(): void;
  unreadCount(): number;
  getAll(): QoderNotification[];
}

export interface QoderDraggableApi { init(container: string | Element, itemSelector: string): void }
export interface QoderHotkeysApi {
  register(keys: string, callback: (e: KeyboardEvent) => void, description?: string): void;
  init(): void;
  getAll(): QoderHotkeyBinding[];
}
export interface QoderChatApi { init(containerSelector: string): void; send(container: Element, text: string): void }
export interface QoderSessionsApi { init(containerSelector: string): void }
export interface QoderDatepickerApi { init(): void }
export interface QoderUploadApi { init(): void }

export interface QoderTerminalTab { id: string; name: string; body: HTMLElement; history: string[]; historyIdx: number; cwd: string }

export interface QoderTerminalApi {
  init(): void;
  /** 激活指定标签 */
  activateTab(terminalEl: HTMLElement, tabId: string): void;
  /** 新建标签，返回标签状态 */
  createTab(terminalEl: HTMLElement, name?: string): QoderTerminalTab | null;
  /** 关闭标签（最后一个关闭时自动重建 bash） */
  closeTab(terminalEl: HTMLElement, tabId: string): void;
  /** 分屏开关（双栏并排） */
  toggleSplit(terminalEl: HTMLElement): void;
  /** 清空当前标签输出 */
  clearActive(terminalEl: HTMLElement): void;
}

export interface QoderColorpickerApi { init(): void }
export interface QoderShortcutsPanelApi { open(): void; close(): void }

export interface QoderDiffApi {
  /** 增强现有 .qoder-diff：相邻增删行配对做行内 word-level 高亮 */
  enhance(root?: ParentNode): void;
  /** 由两段文本动态渲染完整 diff（行级 + 词级） */
  render(options: QoderRenderDiffOptions): HTMLDivElement;
  refresh(root?: ParentNode): void;
  diffWords(oldLine: string, newLine: string): QoderDiffSegment[];
  diffLines(oldText: string, newText: string): QoderDiffRow[];
}

/** Web Components 注册表（v3.2 全部支持属性响应 + Shadow DOM） */
export interface QoderWCRegistry {
  register(): void;
  QoderButton: typeof HTMLElement;
  QoderInput: typeof HTMLElement;
  QoderBadge: typeof HTMLElement;
  QoderAvatar: typeof HTMLElement;
  QoderAlert: typeof HTMLElement;
  QoderSwitch: typeof HTMLElement;
  QoderTabs: typeof HTMLElement;
  QoderProgress: typeof HTMLElement;
  QoderSpinner: typeof HTMLElement;
  QoderSelect: typeof HTMLElement;
  QoderSlider: typeof HTMLElement;
  QoderTooltip: typeof HTMLElement;
  QoderCard: typeof HTMLElement;
  QoderBreadcrumb: typeof HTMLElement;
  QoderSteps: typeof HTMLElement;
  QoderTimeline: typeof HTMLElement;
  QoderEmpty: typeof HTMLElement;
  QoderPagination: typeof HTMLElement;
}

export interface QoderUIApi {
  version: string;
  config: QoderConfig;
  core: QoderCoreApi;
  shadow: QoderShadowApi;
  ShadowElement: typeof HTMLElement;
  theme: QoderThemeApi;
  dialog: QoderDialogApi;
  toast: QoderToastApi;
  palette: QoderPaletteApi;
  contextMenu: QoderContextMenuApi;
  notificationCenter: QoderNotificationCenterApi;
  draggable: QoderDraggableApi;
  hotkeys: QoderHotkeysApi;
  chat: QoderChatApi;
  settings: { init(containerSelector: string): void };
  sessions: QoderSessionsApi;
  datepicker: QoderDatepickerApi;
  upload: QoderUploadApi;
  terminal: QoderTerminalApi;
  colorpicker: QoderColorpickerApi;
  shortcutsPanel: QoderShortcutsPanelApi;
  diff: QoderDiffApi;
  WC: QoderWCRegistry;
  shadowEnabled(el?: HTMLElement): boolean;
  escapeHtml(s: unknown): string;
  init(): void;
}

/** 默认导出（浏览器环境为 window.QoderUI） */
declare const QoderUI: QoderUIApi;
export default QoderUI;

/** 全局命名空间（IIFE 构建产物挂载点） */
declare global {
  interface Window {
    QoderUI: QoderUIApi;
    QoderCore: QoderCoreApi;
    QoderUIConfig?: Partial<QoderConfig>;
  }
}
