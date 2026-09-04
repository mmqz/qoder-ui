/**
 * v3.5.0 移动端复现组件族测试
 * 覆盖：SSR 安全 / 10 组件注册 / 实证文案逐字保真（对照 APK i18n 表）/
 *       实证色板（la_accent_*）/ 模板渲染 / 事件 emit 契约
 */
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'src/qoder-mobile.js'), 'utf8');

/* ---------- 沙箱加载（stub ShadowElement，无 DOM） ---------- */
function loadMobile() {
  const sandbox = {};
  const fn = new Function('globalThis', `
    this.QoderCore = { escapeHtml: (s) => String(s == null ? '' : s) };
    this.QoderUI = { ShadowElement: class ShadowStub {
      constructor() { if (this.initStub) this.initStub(); }
      static get observedAttributes() { return []; }
      emit(type, detail) { this._events = (this._events || []); this._events.push({ type, detail }); }
      $(sel) { return null; }
      $$(sel) { return []; }
    } };
    const g = this;
    ${src}
  `);
  fn.call(sandbox, sandbox);
  return sandbox.QoderUI.Mobile;
}

describe('v3.5.0 移动端组件注册', () => {
  const M = loadMobile();

  test('导出公共 API（t/setLocale/STRINGS/statusColor/version）', () => {
    assert.ok(M, 'QoderUI.Mobile 应存在');
    assert.equal(typeof M.t, 'function');
    assert.equal(typeof M.setLocale, 'function');
    assert.ok(M.STRINGS.zh && M.STRINGS.en);
    assert.equal(typeof M.statusColor, 'function');
    assert.equal(M.version, '3.5.0');
  });

  test('10 个 qm-* 组件全部注册', () => {
    const names = ['qm-app', 'qm-task-list', 'qm-new-task', 'qm-conversation',
      'qm-composer', 'qm-approval', 'qm-sandbox-boot', 'qm-artifact',
      'qm-session-detail', 'qm-settings'];
    for (const n of names) assert.ok(M.WC[n], '缺少组件 ' + n);
    assert.equal(Object.keys(M.WC).length, 10);
  });

  test('SSR 安全：源码无 document/window 顶层直接调用', () => {
    // 组件模块不允许在 IIFE 顶层触碰 DOM 全局（浏览器守卫除外）
    assert.ok(!/^\s*document\./m.test(src), '顶层 document 调用');
    assert.ok(!/^\s*window\./m.test(src), '顶层 window 调用');
  });
});

describe('v3.5.0 实证文案保真（对照 APK qoder-mobile.zh.json）', () => {
  const M = loadMobile();
  const cases = {
    'new_task.cloud_hero_title': '想到就说，说干就干',
    'new_task.cloud_hero_subtitle': '我是小Q，你的全能工作搭子～ 在云端听候你的派遣，随时准备开工！',
    'new_task.choose_repo': '选择 Git 仓库',
    'tasks.approval.enter_plan_mode.generate_spec': '生成 Spec',
    'tasks.approval.enter_plan_mode.run_directly': '直接执行',
    'tasks.approval.option.allow': '允许',
    'tasks.approval.option.allow_once': '仅本次允许',
    'tasks.approval.option.allow_session': '本会话内始终允许',
    'tasks.approval.option.reject': '拒绝',
    'tasks.approval.option.recommended': '推荐',
    'tasks.approval.feedback_reject_and_send': '拒绝并发送',
    'cloud_sandbox_boot.stage.download_install': '创建云端容器',
    'cloud_sandbox_boot.stage.repository_install': '克隆代码仓库',
    'cloud_sandbox_boot.stage.run_install': '启动云端容器',
    'cloud_sandbox_boot.composer_disabled': '等待云端沙箱初始化完成',
    'conversation.thinking.title': '深度思考',
    'conversation.interrupt.stopped': '已被用户停止',
    'workspace.metric.active': '活跃',
    'workspace.metric.closed': '已关闭',
    'workspace.empty_session': '现在可以开始你的任务了！',
    'artifact.section_presented': '最终交付',
    'artifact.section_changed': '中间编辑',
    'artifact.view_preview': '预览',
    'artifact.view_source': '源码',
    'session.details.id_copied': '已复制会话 ID',
    'appearance.dark': '深色',
    'about.privacy_agreement': '隐私协议'
  };
  for (const [key, expected] of Object.entries(cases)) {
    test('zh 文案逐字一致: ' + key, () => {
      assert.equal(M.STRINGS.zh[key], expected);
    });
  }

  test('双语完整性：zh/en 键集合一致', () => {
    const zh = Object.keys(M.STRINGS.zh).sort();
    const en = Object.keys(M.STRINGS.en).sort();
    assert.deepEqual(en, zh);
  });

  test('locale 切换 zh→en→zh', () => {
    assert.equal(M.locale(), 'zh');
    M.setLocale('en');
    assert.equal(M.locale(), 'en');
    assert.equal(M.t('app.tab.tasks'), 'Tasks');
    M.setLocale('zh');
    assert.equal(M.t('app.tab.tasks'), '任务');
    M.setLocale('xx'); // 非法 locale 被忽略
    assert.equal(M.locale(), 'zh');
  });
});

describe('v3.5.0 实证设计规范', () => {
  const M = loadMobile();

  test('四状态色与 APK res/values/colors.xml 一致', () => {
    assert.equal(M.statusColor('running'), 'var(--qm-accent-running)');
    const srcUp = src;
    assert.ok(srcUp.includes('--qm-accent-running:#2FBF71'), 'la_accent_running');
    assert.ok(srcUp.includes('--qm-accent-completed:#3B82F6'), 'la_accent_completed (Tailwind blue-500)');
    assert.ok(srcUp.includes('--qm-accent-attention:#F5A623'), 'la_accent_attention');
    assert.ok(srcUp.includes('--qm-accent-error:#EF4444'), 'la_accent_error (Tailwind red-500)');
  });

  test('暗色主题变量覆盖存在（values-night 对应）', () => {
    assert.ok(src.includes('TOKENS_DARK'));
    assert.ok(src.includes(':host([theme="dark"])'));
  });
});

describe('v3.5.0 组件模板渲染', () => {
  const M = loadMobile();

  function fakeEl(Cls, attrs) {
    const inst = Object.create(Cls.prototype);
    inst.getAttribute = (k) => (k in attrs ? attrs[k] : null);
    inst.hasAttribute = (k) => k in attrs;
    inst.setAttribute = (k, v) => { attrs[k] = v; };
    return inst;
  }

  test('qm-task-list: 活跃/已关闭统计 + 状态点着色', () => {
    const El = M.WC['qm-task-list'];
    const el = fakeEl(El, {
      tasks: JSON.stringify([
        { id: '1', title: '周报生成', status: 'running' },
        { id: '2', title: '竞品简报', status: 'completed' },
        { id: '3', title: '舆情监控', status: 'attention' },
        { id: '4', title: '数据清洗', status: 'error' }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('周报生成'));
    assert.ok(html.includes('<b>2</b>')); // 活跃 = running + attention
    assert.ok(html.includes('--qm-accent-completed'));
  });

  test('qm-approval(kind=action): 四级审批选项 + 推荐徽标', () => {
    const El = M.WC['qm-approval'];
    const el = fakeEl(El, { kind: 'action' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('仅本次允许'));
    assert.ok(html.includes('本会话内始终允许'));
    assert.ok(html.includes('拒绝并发送'));
    assert.ok(html.includes('推荐'));
  });

  test('qm-approval(kind=spec): 生成 Spec / 直接执行 双按钮', () => {
    const El = M.WC['qm-approval'];
    const el = fakeEl(El, { kind: 'spec' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('生成 Spec'));
    assert.ok(html.includes('直接执行'));
  });

  test('qm-sandbox-boot: 四阶段与当前进度提示', () => {
    const El = M.WC['qm-sandbox-boot'];
    const el = fakeEl(El, { stage: '2' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('创建云端容器'));
    assert.ok(html.includes('克隆代码仓库'));
    assert.ok(html.includes('正在等待初始化进度…'));
    assert.ok(html.includes('qm-stage--done'));
  });

  test('qm-composer(disabled): 沙箱启动锁定文案', () => {
    const El = M.WC['qm-composer'];
    const el = fakeEl(El, { disabled: '' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('等待云端沙箱初始化完成'));
    assert.ok(html.includes('disabled'));
  });

  test('qm-conversation: 深度思考/来源/智能体 pill', () => {
    const El = M.WC['qm-conversation'];
    const el = fakeEl(El, {
      messages: JSON.stringify([
        { role: 'user', text: '整理反馈' },
        { role: 'assistant', text: '已完成分类', thinking: '先聚类再打标', sources: 3, agents: 2, todoTotal: 4, todoDone: 2 }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('深度思考'));
    assert.ok(html.includes('来源 · 3'));
    assert.ok(html.includes('2 个智能体'));
    assert.ok(html.includes('2/4'));
  });

  test('qm-new-task: hero 实证文案 + 模式双选', () => {
    const El = M.WC['qm-new-task'];
    const el = fakeEl(El, {});
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('想到就说，说干就干'));
    assert.ok(html.includes('我是小Q，你的全能工作搭子～'));
  });

  test('qm-artifact: 最终交付/中间编辑分组 + 空态', () => {
    const El = M.WC['qm-artifact'];
    const el1 = fakeEl(El, { files: JSON.stringify([
      { name: 'report.pdf', section: 'presented', size: '2.1 MB' },
      { name: 'draft.md', section: 'changed', size: '4 KB' }
    ]) });
    const h1 = El.prototype.template.call(el1);
    assert.ok(h1.includes('最终交付') && h1.includes('中间编辑') && h1.includes('report.pdf'));
    const el2 = fakeEl(El, {});
    assert.ok(El.prototype.template.call(el2).includes('生成的文件将在这里展示'));
  });

  test('qm-session-detail: 元数据行 + 空值占位', () => {
    const El = M.WC['qm-session-detail'];
    const el = fakeEl(El, { session: JSON.stringify({ id: 'sess_9f2', model: 'qwen-max' }) });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('sess_9f2'));
    assert.ok(html.includes('模型'));
    assert.ok(html.includes('—')); // 运行环境为空 → 占位
  });

  test('qm-app: 三 Tab 与高亮态', () => {
    const El = M.WC['qm-app'];
    const el = fakeEl(El, { page: 'sessions' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('任务') && html.includes('会话') && html.includes('我的'));
    assert.ok(html.includes('class="qm-tab on" data-page="sessions"'));
    assert.ok(html.includes('display:none')); // 非活动插槽隐藏
  });

  test('qm-settings: 外观三选项 + 注销账号 + AI 声明', () => {
    const El = M.WC['qm-settings'];
    const el = fakeEl(El, { appearance: 'dark' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('深色') && html.includes('浅色') && html.includes('跟随系统'));
    assert.ok(html.includes('注销账号'));
    assert.ok(html.includes('服务生成的所有内容均由人工智能生成'));
  });
});
