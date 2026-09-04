/**
 * Qoder UI - ESM / CJS 构建入口
 * 按依赖顺序引入全部模块（副作用注册），并导出公共 API
 */
import './qoder-core.js';
import './qoder-shadow.js';
import './qoder-ui.js';
import './qoder-interactions.js';
import './qoder-wc.js';
import './qoder-features.js';
import './qoder-markdown.js';
import './qoder-diff.js';
import './qoder-transport.js';

const _g = typeof globalThis !== 'undefined' ? globalThis : {};
const QoderUI = ((typeof window !== 'undefined' ? window : _g).QoderUI) || {};

export default QoderUI;

// 按模块分组的命名导出
export const {
  theme,
  dialog,
  toast,
  palette,
  contextMenu,
  notificationCenter,
  draggable,
  hotkeys,
  chat,
  settings,
  sessions,
  datepicker,
  upload,
  terminal,
  colorpicker,
  shortcutsPanel,
  diff,
  WC,
  shadow,
  config,
  transport,
  createTransport,
  mount,
  ShadowElement,
  core,
  markdown,
  t,
  i18n,
  setLocale
} = QoderUI;
