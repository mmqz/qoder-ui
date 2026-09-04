/**
 * Qoder UI v3.3 类型声明（手写，覆盖全部公共 API）
 * 零依赖纯 CSS+JS 组件库：8 主题 / 50+ 组件 / 21 Web Components
 * v3.3.1 审计：类型与实现逐一对齐（移除不存在的方法，补齐实际 API）
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

export interface QoderConfig {
  shadow: boolean;
  terminalScrollback?: number;
  /** v3.4：AI 消息 Markdown 渲染，默认开启 */
  chatMarkdown?: boolean;
  /** v3.4：聊天历史持久化（刷新恢复），默认开启 */
  chatHistory?: boolean;
}

/** v3.3.3 i18n（gettext 风格：key 即中文源串） */
export interface QoderI18n {
  locale: string | null;
  locales: Record<string, Record<string, string>>;
  register(name: string, table: Record<string, string>): QoderI18n;
  use(name: string | null): QoderI18n;
  current(): string;
}

export interface QoderThemeApi {
  THEMES: QoderThemeId[];
  STORAGE_KEY: string;
  readonly current: QoderThemeId;
  set(theme: QoderThemeId): void;
  init(): void;
  toggle(): void;
  /** 主题变化通过 document 事件监听：addEventListener('qoder-theme-change', cb) */
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
  toggle(): void;
  add(n: { type?: QoderToastType; title?: string; desc?: string }): void;
  clearAll(): void;
  getUnreadCount(): number;
}

export interface QoderDraggableApi { init(container: string | Element, itemSelector: string): void }
export interface QoderHotkeysApi {
  register(keys: string, callback: (e: KeyboardEvent) => void, description?: string): void;
  init(): void;
  getAll(): QoderHotkeyBinding[];
}
export interface QoderChatApi {
  init(containerSelector: string): void;
}
export interface QoderSessionsApi {
  init(containerSelector: string): void;
  create(panel: Element): void;
  delete(panel: Element, id: string): void;
  select(panel: Element, id: string): void;
}
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

/* ============================================================
   v3.3 Transport — 后端无关数据通道（Rust / TS / 任意后端）
   ============================================================ */
/** 协议 v1 信封：{ v, id, type, channel, payload, ts } */
export interface QoderEnvelope {
  v: number;
  id: string;
  type: string;
  channel: string | null;
  payload: Record<string, any>;
  ts: number;
}

export type QoderTransportStatus = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export interface QoderChatHandlers {
  onStart?(): void;
  onDelta?(delta: string, full: string): void;
  onDone?(content: string, meta?: { done?: boolean }): void;
  onError?(err: { message: string }): void;
}

export interface QoderExecHandlers {
  onOutput?(data: string, stream?: 'stdout' | 'stderr'): void;
  onExit?(code: number): void;
  onCwd?(cwd: string): void;
  onError?(err: { message: string }): void;
}

export interface QoderTransportInstance {
  name: 'mock' | 'rest' | 'ws' | (string & {});
  status: QoderTransportStatus;
  supportsTerminal: boolean;
  connect(): Promise<void>;
  close(): Promise<void>;
  onStatus(cb: (s: QoderTransportStatus) => void): () => void;
  /** 流式对话（AI 回复），返回可 abort 句柄 */
  chat(text: string, handlers: QoderChatHandlers, ctx?: { sessionId?: string }): { abort(): void };
  /** 执行终端命令（rest/一次返回 或 ws/流式） */
  exec(cmd: string, cwd: string, handlers: QoderExecHandlers, ctx?: { tabId?: string }): { abort(): void };
  /** 自定义协议逃生口：监听原始信封 / 发送原始信封 */
  raw?(cb: (env: QoderEnvelope) => void): () => void;
  sendRaw?(env: QoderEnvelope | string): void;
}

export interface QoderRestTransportOptions {
  baseUrl: string;
  chatUrl?: string;
  terminalUrl?: string;
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  /** v3.3.3 建连超时（ms）：仅守护响应头阶段，流式读取不限时；默认 15000，0 关闭 */
  timeout?: number;
}

export interface QoderWSTransportOptions {
  url: string;
  reconnect?: boolean;
  reconnectDelay?: number;
  maxRetries?: number;
  wsImpl?: any;
  /** v3.3.3 心跳：默认 { interval: 30000, timeout: 10000 }；false 关闭 */
  heartbeat?: false | { interval?: number; timeout?: number };
}

export interface QoderTransportApi {
  PROTOCOL_VERSION: number;
  MockTransport: typeof MockTransport;
  RestTransport: typeof RestTransport;
  WSTransport: typeof WSTransport;
  active: QoderTransportInstance | null;
  create(type: 'mock' | 'rest' | 'ws' | QoderTransportInstance, opts?: any): QoderTransportInstance;
  use(type: 'mock' | 'rest' | 'ws' | QoderTransportInstance, opts?: any): Promise<QoderTransportInstance>;
  get(): QoderTransportInstance | null;
  clear(): void;
  restore(): Promise<QoderTransportInstance | null>;
}

declare class MockTransport { constructor(opts?: any); name: 'mock'; }
declare class RestTransport { constructor(opts: QoderRestTransportOptions); name: 'rest'; }
declare class WSTransport { constructor(opts: QoderWSTransportOptions); name: 'ws'; }

/* ============================================================
   v3.4 markdown — 聊天消息轻量 Markdown 渲染
   ============================================================ */
export interface QoderMarkdownApi {
  /** 渲染 markdown 源文本为 HTML 字符串（安全：先整体转义，再白名单语法替换） */
  render(src: string | null | undefined): string;
  /** 行内语法解析（链接仅 http/https/mailto/#/相对路径） */
  inline(raw: string): string;
  escapeHtml(s: unknown): string;
  version: string;
}

/* ============================================================
   v3.3 mount — 一行接入任意项目
   ============================================================ */
export interface QoderMountOptions {
  cssUrl?: string;
  theme?: QoderThemeId;
  transport?: 'mock' | 'rest' | 'ws' | QoderTransportInstance;
  transportOpts?: QoderRestTransportOptions | QoderWSTransportOptions | Record<string, any>;
  features?: boolean;
}

export interface QoderMountHandle {
  el: HTMLElement;
  cssLink: HTMLLinkElement | null;
  ready(): Promise<QoderTransportInstance | null>;
  setTheme(theme: QoderThemeId): void;
  useTransport(type: 'mock' | 'rest' | 'ws' | QoderTransportInstance, opts?: any): Promise<QoderTransportInstance>;
  destroy(): void;
}

export interface QoderDiffApi {
  /** 增强现有 .qoder-diff：相邻增删行配对做行内 word-level 高亮 */
  enhance(root?: ParentNode): void;
  /** 由两段文本动态渲染完整 diff（行级 + 词级） */
  render(options: QoderRenderDiffOptions): HTMLDivElement;
  refresh(root?: ParentNode): void;
  diffWords(oldLine: string, newLine: string): QoderDiffSegment[];
  diffLines(oldText: string, newText: string): QoderDiffRow[];
}

/** Web Components 注册表（v3.2 全部支持属性响应 + Shadow DOM）
 *  键为自定义元素名（customElements.define 使用的名称） */
export interface QoderWCRegistry {
  register(): void;
  'qoder-button': typeof HTMLElement;
  'qoder-input': typeof HTMLElement;
  'qoder-badge': typeof HTMLElement;
  'qoder-avatar': typeof HTMLElement;
  'qoder-alert': typeof HTMLElement;
  'qoder-switch': typeof HTMLElement;
  'qoder-tabs': typeof HTMLElement;
  'qoder-progress': typeof HTMLElement;
  'qoder-spinner': typeof HTMLElement;
  'qoder-select': typeof HTMLElement;
  'qoder-slider': typeof HTMLElement;
  'qoder-tooltip': typeof HTMLElement;
  'qoder-card': typeof HTMLElement;
  'qoder-breadcrumb': typeof HTMLElement;
  'qoder-steps': typeof HTMLElement;
  'qoder-timeline': typeof HTMLElement;
  'qoder-empty': typeof HTMLElement;
  'qoder-pagination': typeof HTMLElement;
  [name: string]: typeof HTMLElement | (() => void);
}

export interface QoderUIApi {
  version: string;
  config: QoderConfig;
  core: QoderCoreApi;
  markdown: QoderMarkdownApi;
  shadow: QoderShadowApi;
  ShadowElement: typeof HTMLElement;
  /** v3.10.0 移动端组件族（qm-*）与安卓端契约 API 客户端 */
  Mobile: QoderMobileNamespace;
  MobileApi: QoderMobileApiApi;
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
  transport: QoderTransportApi;
  createTransport: QoderTransportApi['create'];
  mount(target: string | HTMLElement, options?: QoderMountOptions): QoderMountHandle;
  /** v3.3.3 i18n：翻译用户可见文案（默认回退源串） */
  t(s: string): string;
  i18n: QoderI18n;
  setLocale(name: string | null): void;
  WC: QoderWCRegistry;
  shadowEnabled(el?: HTMLElement): boolean;
  escapeHtml(s: unknown): string;
  init(): void;
}

/** v3.10.0 安卓端契约 API 客户端（依据 docs/android-api-contract.json 逆向契约） */
export interface QoderMobileApiApi {
  version: string;
  /** 45 条端点目录（与契约 JSON 逐字一致） */
  ENDPOINTS: ReadonlyArray<{ method: string; path: string; domain: string }>;
  DEFAULT_BASE_URLS: { api: string; inference: string; web: string };
  REGION: Record<string, string>;
  APP_ID: string;
  HEADER: Record<string, string>;
  ENUMS: Record<string, readonly string[]>;
  /** 精选 13 个 DTO 线格式字段序（snake 线名） */
  WIRE: Record<string, readonly string[]>;
  fromWire(dtoName: string, obj: Record<string, unknown>): Record<string, unknown>;
  toWire(dtoName: string, obj: Record<string, unknown>): Record<string, unknown>;
  deepCamel(obj: unknown): unknown;
  uuid(): string;
  deriveRole(source: string): 'user' | 'assistant' | 'system';
  normalizeToolStatus(s: string): 'running' | 'pending' | 'completed' | 'failed' | '';
  extractText(payload: Record<string, unknown> | null | undefined): string;
  extractCommand(payload: Record<string, unknown> | null | undefined): string;
  riskGroup(toolType: string): 'WRITE' | 'EDIT' | 'READ' | 'RAN';
  isEndTurn(payload: unknown): boolean;
  isInterrupt(payload: unknown): boolean;
  isAskUser(payload: unknown): boolean;
  approvalKind(payload: unknown): string | null;
  normalizeOutcome(raw: string): string;
  parseSseChunk(buf: string): { events: Array<{ id: string | null; event: string | null; data: unknown }>; rest: string };
  sseFrame(evt: unknown): string;
  control: {
    interrupt(): QoderControlEvent;
    endSession(reason?: string): QoderControlEvent;
    setModel(model: string): QoderControlEvent;
    setPermissionMode(mode: string): QoderControlEvent;
    rename(title: string): QoderControlEvent;
    prepareArtifact(path: string): QoderControlEvent;
    cancelRequest(targetRequestId: string): QoderControlEvent;
    respondToolApproval(requestId: string, opts?: { outcome?: string; allowed?: boolean; feedback?: string }): QoderControlEvent;
    respondPlanReview(requestId: string, opts?: { approved?: boolean; permissionMode?: string; feedback?: string }): QoderControlEvent;
    respondAskUser(requestId: string, answers: Record<string, string>): QoderControlEvent;
  };
  mapVpcEndpoints(resp: Record<string, unknown>, fallbackBase?: string): Record<string, string>;
  SyncStore: { new (): QoderMobileSyncStore };
  SYNC_SOURCES: readonly string[];
  HmacSigner: {
    sign(opts: { method?: string; path?: string; body?: string | object; version: string; contentLength?: number; timestamp?: number }): Promise<{ timestamp: string; signature: string }>;
    headers(opts: { method?: string; path?: string; body?: string | object; version: string; contentLength?: number; timestamp?: number }): Promise<Record<string, string>>;
  };
  MockMobileServer: { new (opts?: { botDelay?: number; behavior?: (server: unknown, ctx: { sessionId: string; text: string }) => Promise<void> }): QoderMockMobileServer };
  createClient(opts: QoderMobileClientOptions): QoderMobileClient;
  createMobileClient(opts: QoderMobileClientOptions): QoderMobileClient;
}

export interface QoderControlEvent {
  event_type: 'control_request' | 'control_response';
  payload: Record<string, unknown>;
}

export interface QoderMobileSyncStore {
  SOURCES: readonly string[];
  reset(events?: unknown[]): QoderMobileSyncStore;
  ingestPage(events: unknown[], mode?: string): QoderMobileSyncStore;
  ingestSse(evt: unknown): QoderMobileSyncStore;
  optimisticUser(text: string, clientId?: string): string;
  state(): { items: Array<{ key: string; source: string; event: Record<string, unknown>; seq: number; optimistic?: boolean }>; pendingApprovals: Array<Record<string, unknown>>; lastSequence: number; sources: readonly string[] };
}

export interface QoderMockMobileServer {
  botDelay: number;
  lastRequest: { url: string; path: string; method: string; headers: Record<string, string> } | null;
  handle(): typeof fetch;
  appendEvent(sessionId: string, partial: Record<string, unknown>, source?: string): Record<string, unknown>;
  createSession(req?: Record<string, unknown>): Record<string, unknown>;
  emitSystem(type: string, payload?: Record<string, unknown>): Record<string, unknown>;
}

export interface QoderMobileClientOptions {
  baseUrl?: string;
  token?: string;
  deviceId?: string;
  routeToken?: string;
  routeUser?: string;
  appId?: string | false;
  fetchImpl?: typeof fetch;
  sseRetryBaseMs?: number;
  sseRetryMaxMs?: number;
}

export interface QoderMobileClient {
  config: Required<Omit<QoderMobileClientOptions, 'appId' | 'fetchImpl'>> & { appId: string | false; fetchImpl?: typeof fetch };
  setToken(t: string): QoderMobileClient;
  setRoute(routeToken: string, routeUser: string): QoderMobileClient;
  setBaseUrl(u: string): QoderMobileClient;
  sessions: {
    list(): Promise<{ data: Record<string, unknown>[]; has_more: boolean; next_after_sequence_num: number }>;
    create(req: Record<string, unknown>): Promise<Record<string, unknown>>;
    remove(id: string): Promise<unknown>;
    markRead(id: string): Promise<unknown>;
    markUnread(id: string): Promise<unknown>;
    archive(id: string): Promise<unknown>;
    generateTitleAndBranch(id: string, body?: Record<string, unknown>): Promise<unknown>;
    toCard(w: Record<string, unknown>): { id: string; title: string; status: string; updated: string; unread: boolean; machineName: string; connectionStatus: string };
  };
  events: {
    list(id: string, q?: { after?: number; limit?: number; order?: string }): Promise<{ data: Record<string, unknown>[]; has_more: boolean; next_after_sequence_num: number }>;
    send(id: string, events: unknown[]): Promise<unknown>;
    sendUserMessage(id: string, text: string): Promise<unknown>;
    sendControl(id: string, eventObj: unknown): Promise<unknown>;
    stream(id: string, opts?: { signal?: AbortSignal; fromSequenceNum?: number; lastEventId?: string | null; onEvent?: (evt: Record<string, unknown>) => boolean | void }): Promise<{ lastSequence: number; lastEventId: string | null; reason: string }>;
  };
  system: {
    stream(opts?: { signal?: AbortSignal; lastEventId?: string | null; onEvent?: (evt: Record<string, unknown>) => boolean | void }): Promise<{ lastSequence: number; lastEventId: string | null; reason: string }>;
  };
  environments: { list(): Promise<Record<string, unknown>[]> };
  artifacts: {
    list(id: string): Promise<unknown>;
    downloadUrl(id: string, req?: Record<string, unknown>): Promise<Record<string, unknown>>;
  };
  sandbox: { grant(id: string, req?: Record<string, unknown>): Promise<Record<string, unknown>> };
  auth: {
    token(body?: Record<string, unknown>): Promise<unknown>;
    logout(): Promise<unknown>;
    aliyunRamInit(body?: Record<string, unknown>): Promise<unknown>;
    aliyunCallback(body?: Record<string, unknown>): Promise<unknown>;
    verificationCodes(body?: Record<string, unknown>): Promise<unknown>;
  };
  user: { info(): Promise<unknown>; usage(): Promise<unknown>; plan(): Promise<unknown> };
  devices: {
    register(body?: Record<string, unknown>): Promise<Record<string, unknown>>;
    bind(id: string, body?: Record<string, unknown>): Promise<unknown>;
    registerLegacy(body?: Record<string, unknown>): Promise<unknown>;
  };
  pushTokens: {
    set(mobileDeviceId: string, body?: Record<string, unknown>): Promise<Record<string, unknown>>;
    remove(mobileDeviceId: string, pushTokenId: string): Promise<unknown>;
  };
  notificationConfigs: {
    get(deviceId: string): Promise<Record<string, unknown>>;
    put(deviceId: string, cfg: Record<string, unknown>): Promise<unknown>;
  };
  update: { check(q?: Record<string, unknown>): Promise<Record<string, unknown>> };
  github: {
    authorizationUrl(body?: Record<string, unknown>): Promise<unknown>;
    installUrl(body?: Record<string, unknown>): Promise<unknown>;
    connected(body?: Record<string, unknown>): Promise<unknown>;
    disconnect(body?: Record<string, unknown>): Promise<unknown>;
  };
  glasses: {
    createPairing(body?: Record<string, unknown>): Promise<unknown>;
    approve(id: string, body?: Record<string, unknown>): Promise<unknown>;
    cancel(id: string, body?: Record<string, unknown>): Promise<unknown>;
  };
  upload: { raw(fd: FormData): Promise<unknown>; mix(fd: FormData): Promise<unknown> };
  feedback: {
    policy(): Promise<unknown>;
    imageUpload(fd: FormData): Promise<unknown>;
    diagnoseUpload(fd: FormData): Promise<unknown>;
  };
  telemetry: { crashValidate(body?: Record<string, unknown>): Promise<unknown>; crashUpload(body?: Record<string, unknown>): Promise<unknown> };
  vpc: {
    discover(discoveryUrl: string, fallbackBase?: string): Promise<Record<string, string>>;
    map: QoderMobileApiApi['mapVpcEndpoints'];
  };
  control: {
    interrupt(id: string): Promise<unknown>;
    endSession(id: string, reason?: string): Promise<unknown>;
    setModel(id: string, model: string): Promise<unknown>;
    setPermissionMode(id: string, mode: string): Promise<unknown>;
    rename(id: string, title: string): Promise<unknown>;
    prepareArtifact(id: string, path: string): Promise<unknown>;
    cancelRequest(id: string, targetRequestId: string): Promise<unknown>;
    respondToolApproval(id: string, requestId: string, opts?: { outcome?: string; allowed?: boolean; feedback?: string }): Promise<unknown>;
    respondPlanReview(id: string, requestId: string, opts?: { approved?: boolean; permissionMode?: string; feedback?: string }): Promise<unknown>;
    respondAskUser(id: string, requestId: string, answers: Record<string, string>): Promise<unknown>;
  };
  signFeedback: QoderMobileApiApi['HmacSigner'];
}

/** v3.5.0+ 移动端组件族命名空间 */
export interface QoderMobileNamespace {
  WC: Record<string, typeof HTMLElement>;
  register(): void;
  t(s: string): string;
  setLocale(name: string | null): void;
  STRINGS: Record<string, Record<string, string>>;
  locale(): string;
  statusColor(s: string): string;
  parseMermaid(src: string): unknown;
  renderMermaidSvg(src: string): string;
  version: string;
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
