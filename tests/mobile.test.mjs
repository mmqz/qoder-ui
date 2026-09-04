/**
 * 移动端复现组件族测试（v3.7.0 真机对齐版）
 * 覆盖：SSR 安全 / 12 组件注册 / 实证文案逐字保真（对照 APK i18n 表）/
 *       真实色板（M6.b 主题类 96 槽解码 + la_accent_*）/ 模板渲染 / 事件契约 /
 *       v3.7.0 composer.plus 面板 + 工作区会话列表 + mermaid 净室渲染器
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

describe('v3.7.0 移动端组件注册', () => {
  const M = loadMobile();

  test('导出公共 API（t/setLocale/STRINGS/statusColor/parseMermaid/renderMermaidSvg/version）', () => {
    assert.ok(M, 'QoderUI.Mobile 应存在');
    assert.equal(typeof M.t, 'function');
    assert.equal(typeof M.setLocale, 'function');
    assert.ok(M.STRINGS.zh && M.STRINGS.en);
    assert.equal(typeof M.statusColor, 'function');
    assert.equal(typeof M.parseMermaid, 'function');
    assert.equal(typeof M.renderMermaidSvg, 'function');
    assert.equal(M.version, '3.9.1');
  });

  test('22 个 qm-* 组件全部注册', () => {
    const names = ['qm-app', 'qm-task-list', 'qm-new-task', 'qm-conversation',
      'qm-composer', 'qm-approval', 'qm-sandbox-boot', 'qm-artifact', 'qm-session-detail',
      'qm-settings', 'qm-task-detail', 'qm-session-list', 'qm-mermaid',
      'qm-login', 'qm-environment', 'qm-account', 'qm-usage', 'qm-feedback',
      'qm-notifications', 'qm-ask', 'qm-plan-review', 'qm-tool-detail'];
    for (const n of names) assert.ok(M.WC[n], '缺少组件 ' + n);
    assert.equal(Object.keys(M.WC).length, 22);
  });

  test('SSR 安全：源码无 document/window 顶层直接调用', () => {
    // 组件模块不允许在 IIFE 顶层触碰 DOM 全局（浏览器守卫除外）
    assert.ok(!/^\s*document\./m.test(src), '顶层 document 调用');
    assert.ok(!/^\s*window\./m.test(src), '顶层 window 调用');
  });
});

describe('v3.6.0 实证文案保真（对照 APK qoder-mobile.zh.json 与 strings.xml）', () => {
  const M = loadMobile();
  const cases = {
    /* 落地页双 tab（new_task_landing_*） */
    'new_task.tab.cloud': '云端工作',
    'new_task.tab.local': '连接电脑',
    'new_task.cloud_hero_title': '想到就说，说干就干',
    'new_task.cloud_hero_subtitle': '我是小Q，你的全能工作搭子～ 在云端听候你的派遣，随时准备开工！',
    'new_task.local_hero_title': '深度思考，匠心创造',
    'new_task.input_placeholder': '描述你的任务...',
    /* 真实提示词 chips（new_task_landing_cloud_prompt_* / local_*） */
    'new_task.prompt.digest': '每周一推送竞品简报',
    'new_task.prompt.feedback': '200条客户反馈按问题与情绪分类',
    'new_task.prompt.monitor': '全网舆情监控，负面立刻通知',
    'new_task.prompt.agent': '部署一个客服 Agent 自动回复咨询',
    'new_task.prompt.video': '把"梯度下降"做成一段动画讲解视频',
    /* 任务列表（tasks_tab_* / tasks_group_* / tasks_phase_* / tasks_rc_*） */
    'tasks.filter.all': '全部', 'tasks.filter.running': '进行中',
    'tasks.filter.pending': '待审批', 'tasks.filter.idle': '空闲',
    'tasks.group.today': '今天', 'tasks.group.week': '近 7 天',
    'tasks.phase.waiting': '等待审批',
    'tasks.rc.title': '远程控制', 'tasks.rc.subtitle': 'Qoder Desktop & CLI',
    /* 工具卡片（tool_use_* / tool_group_*） */
    'tool.bash': '执行命令', 'tool.edit': '编辑', 'tool.read': '读取',
    'tool.web_search': '网页搜索', 'tool.subagent': '子智能体',
    'tool.plan': '请求进入 Plan 模式',
    'tool.status.pending': '等待中',
    'tool.group.tools': '运行 %d 个工具', 'tool.group.ops': '已处理 %d 个操作',
    'todo.title': '待办列表',
    /* 审批（approval.title.* / tasks.approval.*） */
    'approval.title.run_command': 'Qoder 请求执行命令',
    'approval.title.mcp': 'Qoder 请求执行 MCP 工具',
    'tasks.approval.pending': '等待审批',
    'tasks.approval.option.allow_once': '仅本次允许',
    'tasks.approval.enter_plan_mode.generate_spec': '生成 Spec',
    'tasks.approval.enter_plan_mode.description': '你可以选择先生成并审核 Spec，再开始执行；也可以跳过 Spec，直接开始执行任务。Spec 用于明确任务范围和执行规范，帮助确认方向是否正确。',
    /* 输入区（composer.mode.* / composer.model.* 逐字） */
    'composer.mode.ask': '询问权限', 'composer.mode.auto': '自动审批',
    'composer.mode.auto_edits': '自动接受编辑', 'composer.mode.bypass': '免审批模式',
    'composer.mode.plan': '计划模式',
    'composer.model.auto': '自动', 'composer.model.ultimate': '旗舰',
    'composer.model.auto_desc': '智能选择最优模型，平衡性能与成本',
    'composer.model.lite_desc': '基础推理，免费可用（高峰期可能较慢）',
    'composer.model.ultimate_desc': '专家级深度推理与思考，输出质量最高',
    /* 对话/沙箱/详情/设置 */
    'cloud_sandbox_boot.stage.download_install': '创建云端容器',
    'cloud_sandbox_boot.stage.run_install': '启动云端容器',
    'cloud_sandbox_boot.composer_disabled': '等待云端沙箱初始化完成',
    'conversation.thinking.title': '深度思考',
    'conversation.interrupt.stopped': '已被用户停止',
    'workspace.empty_session': '现在可以开始你的任务了！',
    'session.details.general': '常规', 'session.details.metadata': '元数据',
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
    assert.equal(M.t('new_task.tab.local'), 'Local PC');
    M.setLocale('zh');
    assert.equal(M.t('app.tab.tasks'), '任务');
    M.setLocale('xx'); // 非法 locale 被忽略
    assert.equal(M.locale(), 'zh');
  });
});

describe('v3.6.0 真实色板（M6.b 主题类 96 槽解码 + la_accent_*）', () => {
  const M = loadMobile();

  test('四通知状态色与 APK res/values/colors.xml 一致（la_accent_*）', () => {
    assert.equal(M.statusColor('running'), 'var(--qm-accent-running)');
    assert.ok(src.includes('--qm-accent-running:#2FBF71'), 'la_accent_running');
    assert.ok(src.includes('--qm-accent-completed:#3B82F6'), 'la_accent_completed (Tailwind blue-500)');
    assert.ok(src.includes('--qm-accent-attention:#F5A623'), 'la_accent_attention');
    assert.ok(src.includes('--qm-accent-error:#EF4444'), 'la_accent_error (Tailwind red-500)');
  });

  test('品牌主色为绿（浅 #5CBD61 / 深 #2ADB5C，v3.6.0 纠正）', () => {
    assert.ok(src.includes('--qm-primary:#5CBD61'), '浅色主题 primary（主题类槽 e）');
    assert.ok(src.includes('--qm-primary-bright:#2ADB5C'), '深色主题 primary（槽 f 暗色取值）');
    assert.equal(M.statusColor('failed'), 'var(--qm-accent-error)');
    assert.equal(M.statusColor('waiting'), 'var(--qm-accent-attention)');
    assert.equal(M.statusColor('idle'), 'var(--qm-text-3)');
  });

  test('暖灰中性阶 + 状态色（浅 #141414 系 / 深 #EEEEEB 系）', () => {
    assert.ok(src.includes('--qm-text:#141414'), 'numauth_text（浅）');
    assert.ok(src.includes('--qm-text-2:#636261'), 'numauth_text_secondary（浅）');
    assert.ok(src.includes('--qm-bg:#FDFDFD'), 'launch_brand_cn_background（浅）');
    assert.ok(src.includes('--qm-surface-2:#F0F0F0'), 'numauth_fill_tertiary（浅）');
    assert.ok(src.includes('--qm-text:#EEEEEB'), 'numauth_text（深）');
    assert.ok(src.includes('--qm-bg:#161612'), 'launch_brand_cn_background（深）');
    assert.ok(src.includes('--qm-surface:#171716'), '容器底（深）');
    assert.ok(src.includes('--qm-error:#FF4D4F'), 'Ant red（浅）');
    assert.ok(src.includes('--qm-warning:#FAAD14'), 'Ant gold（浅）');
    assert.ok(src.includes('--qm-info:#0B83F1'), 'info（浅）');
    assert.ok(src.includes('--qm-success:#5BB98B'), 'success（浅）');
  });

  test('暗色主题变量覆盖存在（values-night 对应）', () => {
    assert.ok(src.includes('TOKENS_DARK'));
    assert.ok(src.includes(':host([theme="dark"])'));
  });
});

describe('v3.6.0 组件模板渲染', () => {
  const M = loadMobile();

  function fakeEl(Cls, attrs) {
    const inst = Object.create(Cls.prototype);
    inst.getAttribute = (k) => (k in attrs ? attrs[k] : null);
    inst.hasAttribute = (k) => k in attrs;
    inst.setAttribute = (k, v) => { attrs[k] = v; };
    return inst;
  }

  test('qm-task-list: 筛选 tab + 时间分组 + 阶段标签 + 任务计数', () => {
    const El = M.WC['qm-task-list'];
    const el = fakeEl(El, {
      tasks: JSON.stringify([
        { id: '1', title: '周报生成', status: 'running', group: 'today' },
        { id: '2', title: '竞品简报', status: 'completed', group: 'yesterday' },
        { id: '3', title: '舆情监控', status: 'waiting', group: 'week' }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('全部') && html.includes('进行中') && html.includes('待审批') && html.includes('空闲'));
    assert.ok(html.includes('今天') && html.includes('昨天') && html.includes('近 7 天'));
    assert.ok(html.includes('周报生成') && html.includes('运行中'));
    assert.ok(html.includes('等待审批'));
    assert.ok(html.includes('3 个任务'));
    assert.ok(html.includes('远程控制') && html.includes('Qoder Desktop') && html.includes('CLI'));
  });

  test('qm-task-list: filter=running 只保留进行中/需关注', () => {
    const El = M.WC['qm-task-list'];
    const el = fakeEl(El, {
      filter: 'running',
      tasks: JSON.stringify([
        { id: '1', title: '运行任务', status: 'running' },
        { id: '2', title: '完成', status: 'completed' },
        { id: '3', title: '需关注', status: 'attention' }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('运行任务') && html.includes('需关注'));
    assert.ok(!html.includes('完成<'));
  });

  test('qm-app: 四 Tab（首页/任务/工作区/我的）与高亮态', () => {
    const El = M.WC['qm-app'];
    const el = fakeEl(El, { page: 'sessions' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('首页') && html.includes('任务') && html.includes('工作区') && html.includes('我的'));
    assert.ok(html.includes('class="qm-tab on" data-page="sessions"'));
    assert.ok(html.includes('display:none')); // 非活动插槽隐藏
  });

  test('qm-approval(kind=action): 标题/命令回显/等待审批徽标/四级选项', () => {
    const El = M.WC['qm-approval'];
    const el = fakeEl(El, { kind: 'action', command: 'pnpm test' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('Qoder 请求执行命令'));
    assert.ok(html.includes('pnpm test'));
    assert.ok(html.includes('等待审批'));
    assert.ok(html.includes('允许执行'));
    assert.ok(html.includes('仅本次允许'));
    assert.ok(html.includes('本会话内始终允许'));
    assert.ok(html.includes('拒绝并发送'));
    assert.ok(html.includes('推荐'));
  });

  test('qm-approval(kind=spec): 生成 Spec / 直接执行 双按钮 + 描述逐字', () => {
    const El = M.WC['qm-approval'];
    const el = fakeEl(El, { kind: 'spec' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('生成 Spec'));
    assert.ok(html.includes('直接执行'));
    assert.ok(html.includes('Spec 用于明确任务范围和执行规范'));
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

  test('qm-composer(panel=mode/model): 五模式与五模型（逐字）', () => {
    const El = M.WC['qm-composer'];
    const hm = El.prototype.template.call(fakeEl(El, { panel: 'mode', mode: 'bypass' }));
    assert.ok(hm.includes('选择模式') && hm.includes('询问权限') && hm.includes('免审批模式') && hm.includes('计划模式'));
    assert.ok(hm.includes('class="qm-opt on" data-pick="bypass"'));
    const hl = El.prototype.template.call(fakeEl(El, { panel: 'model', model: 'ultimate' }));
    assert.ok(hl.includes('选择模型') && hl.includes('自动') && hl.includes('高效') && hl.includes('轻量'));
    assert.ok(hl.includes('高性能') && hl.includes('旗舰'));
    assert.ok(hl.includes('专家级深度推理与思考，输出质量最高'));
  });

  test('qm-conversation: 深度思考/来源/智能体 pill + 工具卡片族 + 待办', () => {
    const El = M.WC['qm-conversation'];
    const el = fakeEl(El, {
      messages: JSON.stringify([
        { role: 'user', text: '整理反馈' },
        {
          role: 'assistant', text: '已完成分类', thinking: '先聚类再打标', sources: 3, agents: 2,
          todoTotal: 4, todoDone: 2,
          groupTools: 3,
          tools: [
            { kind: 'bash', status: 'completed', detail: 'pnpm test' },
            { kind: 'read', status: 'running' },
            { kind: 'plan', status: 'pending' }
          ],
          todo: [{ text: '聚类', done: true }, { text: '打标', done: false }]
        }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('深度思考'));
    assert.ok(html.includes('来源 · 3'));
    assert.ok(html.includes('2 个智能体'));
    assert.ok(html.includes('2/4'));
    assert.ok(html.includes('运行 3 个工具'));
    assert.ok(html.includes('执行命令') && html.includes('已完成'));
    assert.ok(html.includes('读取') && html.includes('运行中'));
    assert.ok(html.includes('请求进入 Plan 模式') && html.includes('等待中'));
    assert.ok(html.includes('待办列表') && html.includes('聚类'));
    assert.ok(html.includes('qm-todocard__i done'));
  });

  test('qm-new-task: 双 tab + 小Q hero + 真实提示词 chips + 占位符', () => {
    const El = M.WC['qm-new-task'];
    const cloud = El.prototype.template.call(fakeEl(El, { tab: 'cloud' }));
    assert.ok(cloud.includes('云端工作') && cloud.includes('连接电脑'));
    assert.ok(cloud.includes('想到就说，说干就干'));
    assert.ok(cloud.includes('我是小Q，你的全能工作搭子～'));
    assert.ok(cloud.includes('每周一推送竞品简报'));
    assert.ok(cloud.includes('部署一个客服 Agent 自动回复咨询'));
    assert.ok(cloud.includes('描述你的任务...'));
    const local = El.prototype.template.call(fakeEl(El, { tab: 'local' }));
    assert.ok(local.includes('深度思考，匠心创造'));
    assert.ok(local.includes('设计一张产品发布会的主视觉海报'));
  });

  test('qm-artifact: 类型着色 + 最终交付/中间编辑分组 + 空态', () => {
    const El = M.WC['qm-artifact'];
    const el1 = fakeEl(El, { files: JSON.stringify([
      { name: 'report.pdf', kind: 'pdf', section: 'presented', size: '2.1 MB' },
      { name: 'draft.md', kind: 'markdown', section: 'changed', size: '4 KB' }
    ]) });
    const h1 = El.prototype.template.call(el1);
    assert.ok(h1.includes('最终交付') && h1.includes('中间编辑') && h1.includes('report.pdf'));
    assert.ok(h1.includes('#EC5B56')); // pdf → 主题辅色（槽 35 系）
    assert.ok(h1.includes('#1E293B')); // markdown → slate
    const el2 = fakeEl(El, {});
    assert.ok(El.prototype.template.call(el2).includes('生成的文件将在这里展示'));
  });

  test('qm-artifact v3.8.0 异常态: loading/error 重试/not_found/unavailable 全屏态', () => {
    const El = M.WC['qm-artifact'];
    const s = (st) => El.prototype.template.call(fakeEl(El, { state: st }));
    assert.ok(s('loading').includes('加载中…'));
    const err = s('error');
    assert.ok(err.includes('加载失败') && err.includes('重试') && err.includes('data-act="retry"'));
    assert.ok(s('not_found').includes('产物不存在或已过期'));
    assert.ok(s('unavailable').includes('该产物暂无法在手机端查看，请在任务运行设备上打开。'));
  });

  test('qm-artifact v3.8.0 横幅态: restricted/stale/too_large/low_memory 与正常列表共存', () => {
    const El = M.WC['qm-artifact'];
    const attrs = { files: JSON.stringify([{ name: 'a.pdf', kind: 'pdf', section: 'presented' }]) };
    for (const [st, txt] of [
      ['restricted', '受企业安全策略限制，无法分享或下载'],
      ['stale', '已显示最近可用版本'],
      ['too_large', '请下载后查看此文件'],
      ['low_memory', '当前内存不足，请下载后查看此文件']
    ]) {
      const html = El.prototype.template.call(fakeEl(El, { ...attrs, state: st }));
      assert.ok(html.includes(txt), 'banner ' + st);
      assert.ok(html.includes('a.pdf')); // 横幅不吞列表
      assert.ok(html.includes('qm-art__banner'));
    }
  });

  test('qm-approval v3.8.0 状态机: submitted/approved/rejected 徽标 + 允许执行导语 + permission/request kind', () => {
    const El = M.WC['qm-approval'];
    const html = (attrs) => El.prototype.template.call(fakeEl(El, attrs));
    const done = html({ kind: 'action', state: 'approved', command: 'pnpm test' });
    assert.ok(done.includes('已批准') && done.includes('qm-appr__badge--done'));
    assert.ok(done.includes('允许执行'));
    assert.ok(html({ kind: 'action', state: 'rejected' }).includes('已拒绝'));
    assert.ok(html({ kind: 'action', state: 'rejected' }).includes('qm-appr__badge--err'));
    assert.ok(html({ kind: 'action', state: 'submitted' }).includes('已提交'));
    assert.ok(html({ kind: 'action', state: 'submitting' }).includes('提交中…'));
    assert.ok(html({ kind: 'permission' }).includes('需要权限'));
    assert.ok(html({ kind: 'request' }).includes('请求审批'));
  });

  test('qm-session-detail: 常规/元数据分组 + 空值占位', () => {
    const El = M.WC['qm-session-detail'];
    const el = fakeEl(El, { session: JSON.stringify({ id: 'sess_9f2', model: 'qwen-max' }) });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('常规') && html.includes('元数据'));
    assert.ok(html.includes('sess_9f2'));
    assert.ok(html.includes('模型'));
    assert.ok(html.includes('—')); // 运行环境为空 → 占位
  });

  test('qm-settings v3.8.0: 标题/资料卡/通用组/集成/设备/关于/退出登录', () => {
    const El = M.WC['qm-settings'];
    const el = fakeEl(El, { appearance: 'dark' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('设置') && html.includes('访客') && html.includes('社区版'));
    assert.ok(html.includes('编辑资料') && html.includes('语言') && html.includes('用量') && html.includes('清理缓存'));
    assert.ok(html.includes('集成') && html.includes('GitHub') && html.includes('未连接'));
    assert.ok(html.includes('配对 Qoder 眼镜') && html.includes('支持与智能眼镜配对'));
    assert.ok(html.includes('检查更新') && html.includes('退出登录'));
    assert.ok(html.includes('Version: 0.2.8'));
    assert.ok(html.includes('服务生成的所有内容均由人工智能生成'));
  });
});

/* ==================== v3.7.0 新增 ==================== */
describe('v3.7.0 实证文案保真（composer_plus_* / workspace_* / mermaid_*）', () => {
  const M = loadMobile();

  test('plus 面板四组标题与空态（zh 逐字，strings.xml composer_plus_*）', () => {
    assert.equal(M.t('composer.plus.connectors'), '连接器');
    assert.equal(M.t('composer.plus.skills'), '技能');
    assert.equal(M.t('composer.plus.plugins'), '插件');
    assert.equal(M.t('composer.plus.files'), '文件');
    assert.equal(M.t('composer.plus.connectors_empty'), '暂无连接器。请在 QoderWork 桌面端 App 中添加。');
    assert.equal(M.t('composer.plus.skills_empty'), '暂无技能。请在 QoderWork 桌面端 App 中添加。');
    assert.equal(M.t('composer.plus.plugins_empty'), '暂无插件。请在 QoderWork 桌面端 App 中添加。');
    assert.equal(M.t('composer.plus.files_empty'), '暂无文件。请在 QoderWork 桌面端 App 中添加。');
    assert.equal(M.t('composer.plus.mode'), '模式');
    assert.equal(M.t('composer.plus.model'), '模型');
    assert.equal(M.t('composer.plus.spec'), 'Spec');
  });

  test('连接器/技能/插件/文件内置条目（zh 逐字）', () => {
    assert.equal(M.t('composer.plus.connector.computer_use'), '电脑操作');
    assert.equal(M.t('composer.plus.connector.qoderwork'), 'QoderWork 连接器');
    assert.equal(M.t('composer.plus.connector.market'), '企业技能市场助手');
    assert.equal(M.t('composer.plus.skill.docx'), 'DOCX');
    assert.equal(M.t('composer.plus.skill.docx_subtitle'), '当用户需要创建、读取、编辑或处理 Word 文件时使用此技能');
    assert.equal(M.t('composer.plus.skill.pdf_subtitle'), '当用户需要处理 PDF 时使用此技能');
    assert.equal(M.t('composer.plus.skill.xlsx_subtitle'), '当电子表格文件是主要输入和输出时使用此技能');
    assert.equal(M.t('composer.plus.plugin.consulting'), '咨询交付');
    assert.equal(M.t('composer.plus.plugin.consulting_subtitle'), '覆盖七个核心场景的全流程管理咨询工具包');
    assert.equal(M.t('composer.plus.plugin.equity'), '股票研究');
    assert.equal(M.t('composer.plus.plugin.marketing'), '市场营销');
    assert.equal(M.t('composer.plus.plugin.pe'), '私募股权');
    assert.equal(M.t('composer.plus.plugin.pm'), '产品管理');
    assert.equal(M.t('composer.plus.file.ai_analysis'), '~/文档/AIproduct_analysis');
    assert.equal(M.t('composer.plus.file.logo_design'), '~/图片/logo_design');
  });

  test('工作区会话列表（workspace_* zh 逐字）', () => {
    assert.equal(M.t('workspace.title'), '工作区');
    assert.equal(M.t('workspace.section.active'), '活跃');
    assert.equal(M.t('workspace.section.closed'), '已关闭');
    assert.equal(M.t('workspace.metric.devices'), '设备');
    assert.equal(M.t('workspace.loading'), '正在加载会话…');
    assert.equal(M.t('workspace.preparing'), '正在准备工作区…');
    assert.equal(M.t('workspace.rename_title'), '任务名称');
    assert.equal(M.t('workspace.rename_agree'), '确定');
    assert.equal(M.t('workspace.open_settings'), '打开设置');
    assert.equal(M.t('workspace.read_files'), '读取 %d 个文件');
  });

  test('mermaid 卡四键（zh 逐字，conversation_mermaid_* / cd_mermaid_render）', () => {
    assert.equal(M.t('markdown.mermaid.title'), '流程图');
    assert.equal(M.t('mermaid.render'), '渲染图表');
    assert.equal(M.t('mermaid.loading'), '正在渲染图表…');
    assert.equal(M.t('mermaid.unavailable'), '该图已失效，请返回后重新打开。');
  });

  test('en 镜像逐字（strings.xml en）', () => {
    M.setLocale('en');
    assert.equal(M.t('composer.plus.connectors_empty'), 'No connectors yet. Add them in QoderWork Desktop App.');
    assert.equal(M.t('composer.plus.skills_empty'), 'No skills yet. Add them in QoderWork Desktop App.');
    assert.equal(M.t('composer.plus.plugins_empty'), 'No plugins yet. Add them in QoderWork Desktop App.');
    assert.equal(M.t('composer.plus.files_empty'), 'No files yet. Add them in QoderWork Desktop App.');
    assert.equal(M.t('composer.plus.connector.computer_use'), 'Computer Use');
    assert.equal(M.t('composer.plus.connector.qoderwork'), 'QoderWork');
    assert.equal(M.t('composer.plus.connector.market'), 'Enterprise Skill Market Assistant');
    assert.equal(M.t('composer.plus.skill.docx_subtitle'), 'Use this skill whenever the user wants to create, read, edit, or manipulate word files');
    assert.equal(M.t('composer.plus.plugin.pm'), 'Product Management');
    assert.equal(M.t('composer.plus.file.ai_analysis'), '~/Documents/AIproduct_analysis');
    assert.equal(M.t('workspace.title'), 'Workspace');
    assert.equal(M.t('workspace.section.active'), 'Active');
    assert.equal(M.t('workspace.loading'), 'Loading conversations…');
    assert.equal(M.t('workspace.rename_title'), 'Task Name');
    assert.equal(M.t('workspace.rename_agree'), 'Agree');
    assert.equal(M.t('workspace.read_files'), 'Read %d files');
    assert.equal(M.t('mermaid.render'), 'Render diagram');
    assert.equal(M.t('mermaid.unavailable'), 'This diagram is no longer available. Go back and open it again.');
    M.setLocale('zh');
  });
});

describe('v3.7.0 组件模板渲染（plus 面板 / 会话列表 / mermaid 卡）', () => {
  const M = loadMobile();

  function fakeEl(Cls, attrs) {
    const inst = Object.create(Cls.prototype);
    inst.getAttribute = (k) => (k in attrs ? attrs[k] : null);
    inst.hasAttribute = (k) => k in attrs;
    inst.setAttribute = (k, v) => { attrs[k] = v; };
    return inst;
  }

  test('qm-composer(panel=options): 入口行 + 连接器/技能/插件/文件四组内置条目', () => {
    const El = M.WC['qm-composer'];
    const html = El.prototype.template.call(fakeEl(El, { panel: 'options' }));
    /* 入口行 */
    assert.ok(html.includes('data-entry="mode"') && html.includes('data-entry="model"') && html.includes('data-entry="spec"'));
    assert.ok(html.includes('打开输入选项'));
    /* 四组标题 */
    assert.ok(html.includes('连接器') && html.includes('技能') && html.includes('插件') && html.includes('文件'));
    /* 内置条目（实证） */
    assert.ok(html.includes('电脑操作') && html.includes('QoderWork 连接器') && html.includes('企业技能市场助手'));
    assert.ok(html.includes('DOCX') && html.includes('PDF') && html.includes('XLSX'));
    assert.ok(html.includes('当电子表格文件是主要输入和输出时使用此技能'));
    assert.ok(html.includes('咨询交付') && html.includes('股票研究') && html.includes('市场营销'));
    assert.ok(html.includes('私募股权') && html.includes('产品管理'));
    assert.ok(html.includes('~/文档/AIproduct_analysis') && html.includes('~/图片/logo_design'));
    /* 事件钩子存在 */
    assert.ok(html.includes('data-plus="plugins" data-plus-id="pm"'));
    /* 插件项带副标题；文件项不带副标题（plain） */
    assert.ok(html.includes('覆盖八个核心工作流的端到端产品管理工具包'));
    /* 不变量：任何缺失 i18n 键都不允许以原始键名泄漏进模板 */
    assert.ok(!html.includes('composer.plus.'), '原始键名泄漏');
  });

  test('qm-composer(panel=options): 空数组 → 实证空态文案；自定义条目覆盖', () => {
    const El = M.WC['qm-composer'];
    const html = El.prototype.template.call(fakeEl(El, {
      panel: 'options',
      plugins: '[]',
      connectors: JSON.stringify([{ name: '自研连接器', desc: '内网' }])
    }));
    assert.ok(html.includes('暂无插件。请在 QoderWork 桌面端 App 中添加。'));
    assert.ok(html.includes('自研连接器') && html.includes('内网'));
    assert.ok(!html.includes('data-plus-id="pm"'));
  });

  test('qm-composer: 点 + 不再无响应（options 为合法 panel）', () => {
    const El = M.WC['qm-composer'];
    assert.ok(El.observedAttributes.includes('panel'));
  });

  test('qm-session-list: 标题/三指标/活跃已关闭分组/阶段标签/读取文件数', () => {
    const El = M.WC['qm-session-list'];
    const el = fakeEl(El, {
      devices: '2',
      sessions: JSON.stringify([
        { id: 's1', title: '竞品简报', status: 'running', updated: '2 分钟前', files: 3 },
        { id: 's2', title: '舆情监控', status: 'waiting', updated: '今天 14:20' },
        { id: 's3', title: '海报设计', status: 'closed', updated: '昨天 18:02', files: 2 }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('工作区') && html.includes('打开设置'));
    assert.ok(html.includes('活跃') && html.includes('已关闭') && html.includes('设备'));
    assert.ok(html.includes('竞品简报') && html.includes('运行中'));
    assert.ok(html.includes('舆情监控') && html.includes('等待审批'));
    assert.ok(html.includes('海报设计') && html.includes('已关闭'));
    assert.ok(html.includes('读取 3 个文件'));
    /* 三个指标卡：活跃 2 / 已关闭 1 / 设备 2 */
    const nums = html.match(/qm-ws__num">(\d+)</g) || [];
    assert.deepEqual(nums.map((s) => s.replace(/\D/g, '')), ['2', '1', '2']);
  });

  test('qm-session-list: loading 态与重命名对话框（任务名称/确定）', () => {
    const El = M.WC['qm-session-list'];
    const loading = El.prototype.template.call(fakeEl(El, { loading: '' }));
    assert.ok(loading.includes('正在加载会话…'));
    assert.ok(!loading.includes('qm-card__title'));
    const el = fakeEl(El, {
      renaming: 's1',
      sessions: JSON.stringify([{ id: 's1', title: '旧任务名', status: 'idle' }])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('任务名称'));
    assert.ok(html.includes('value="旧任务名"'));
    assert.ok(html.includes('确定'));
    assert.ok(html.includes('data-rename-ok'));
  });

  test('qm-mermaid: idle 态（源码 + 渲染图表按钮）→ done 态（SVG）→ 失效态', () => {
    const El = M.WC['qm-mermaid'];
    const src = 'graph TD\nA[开始] --> B[结束]';
    const idle = El.prototype.template.call(fakeEl(El, { source: src }));
    assert.ok(idle.includes('流程图') && idle.includes('渲染图表'));
    assert.ok(idle.includes('qm-mm__src') && idle.includes('data-render'));
    const done = El.prototype.template.call(fakeEl(El, { source: src, state: 'done' }));
    assert.ok(done.includes('<svg') && done.includes('开始') && done.includes('结束'));
    assert.ok(!done.includes('data-render'));
    const dead = El.prototype.template.call(fakeEl(El, { state: 'unavailable' }));
    assert.ok(dead.includes('该图已失效，请返回后重新打开。'));
    const busy = El.prototype.template.call(fakeEl(El, { state: 'rendering' }));
    assert.ok(busy.includes('正在渲染图表…'));
  });

  test('qm-conversation: 消息带 mermaid 字段 → 内嵌 qm-mermaid 卡', () => {
    const El = M.WC['qm-conversation'];
    const el = fakeEl(El, {
      theme: 'dark',
      messages: JSON.stringify([
        { role: 'assistant', text: '流程如下', mermaid: 'graph TD\nA[1] --> B[2]' }
      ])
    });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('<qm-mermaid source="graph TD&#10;A[1] --> B[2]"'));
    assert.ok(html.includes('theme="dark"'));
  });
});

describe('v3.7.0 mermaid 净室渲染器（parseMermaid / renderMermaidSvg）', () => {
  const M = loadMobile();

  test('解析：节点三形 / 四种边 / 边标签 / 注释与方向', () => {
    const p = M.parseMermaid(
      'graph TD\n' +
      '  %% 注释行\n' +
      '  A[开始] --> B{是否需要审批?}\n' +
      '  B -->|是| C[等待授权]\n' +
      '  B -->|否| D[直接执行]\n' +
      '  C -.-> E(继续任务)\n' +
      '  D ==> E\n' +
      '  F --- A');
    assert.equal(p.dir, 'TD');
    assert.equal(p.nodes.length, 6);
    const byId = Object.fromEntries(p.nodes.map((n) => [n.id, n]));
    assert.equal(byId.A.label, '开始'); assert.equal(byId.A.shape, 'rect');
    assert.equal(byId.B.shape, 'diamond');
    assert.equal(byId.E.shape, 'round'); assert.equal(byId.E.label, '继续任务');
    assert.equal(p.edges.length, 6);
    assert.deepEqual(p.edges[1], { from: 'B', to: 'C', label: '是' });
    assert.ok(p.edges.some((e) => e.from === 'D' && e.to === 'E' && e.label === ''));
  });

  test('A -- 文本 --> B 形式与 LR 方向', () => {
    const p = M.parseMermaid('flowchart LR\n  A -- 通过 --> B\n  B --> C');
    assert.equal(p.dir, 'LR');
    assert.deepEqual(p.edges[0], { from: 'A', to: 'B', label: '通过' });
  });

  test('环安全：A→B→A 不死循环，节点全部落位', () => {
    const svg = M.renderMermaidSvg('graph TD\n  A --> B\n  B --> A');
    assert.ok(svg && svg.includes('<svg'));
    assert.equal((svg.match(/<rect/g) || []).length, 2);
  });

  test('garbage 输入 → null（调用方进入失效态）', () => {
    assert.equal(M.renderMermaidSvg('hello world'), null);
    assert.equal(M.renderMermaidSvg(''), null);
    assert.equal(M.renderMermaidSvg(null), null);
  });

  test('SVG 输出安全：文本经 esc（含 escapeHtml 的沙箱）', () => {
    const sandbox = {};
    const fn = new Function('globalThis', `
      this.QoderCore = { escapeHtml: (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') };
      this.QoderUI = { ShadowElement: class {
        constructor() {} static get observedAttributes() { return []; }
        emit() {} $(sel) { return null; } $$(sel) { return []; }
      } };
      const g = this;
      ${src}
    `);
    fn.call(sandbox, sandbox);
    const svg = sandbox.QoderUI.Mobile.renderMermaidSvg('graph TD\nA[<b>x</b>&y] --> B[ok]');
    assert.ok(svg.includes('&lt;b&gt;x&lt;/b&gt;&amp;y'), '节点文本被转义');
    assert.ok(!svg.includes('<b>'), '无原始 HTML 注入');
  });

  test('TD 布局：层级深度决定 y 坐标（父在上子在下）', () => {
    const svg = M.renderMermaidSvg('graph TD\nA[开始] --> B[结束]');
    const yA = Number(svg.match(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>开始/)[2]);
    const yB = Number(svg.match(/<text x="([\d.]+)" y="([\d.]+)"[^>]*>结束/)[2]);
    assert.ok(yB > yA, 'TD 子节点 y 应大于父节点');
  });
});

/* ==================== v3.8.0 新增（设置屏完整版 + 任务详情·远程控制） ==================== */
describe('v3.8.0 设置屏完整版（官方 T6/F.java IA + settings_integrations/cache_cleanup/update 状态机）', () => {
  const M = loadMobile();
  const fake = (attrs) => {
    const Cls = M.WC['qm-settings'];
    return { getAttribute: (k) => (k in attrs ? attrs[k] : null), hasAttribute: (k) => k in attrs, emit: () => {} };
  };
  const htmlOf = (attrs) => M.WC['qm-settings'].prototype.template.call(fake(attrs));

  test('逐字保真：settings_integrations.github_* 状态机五态', () => {
    assert.equal(M.t('settings_integrations.github_loading'), '正在检查连接…');
    assert.equal(M.t('settings_integrations.github_connecting'), '连接中…');
    assert.equal(M.t('settings_integrations.github_connected'), '已连接');
    assert.equal(M.t('settings_integrations.github_disconnecting'), '断开连接中…');
    assert.equal(M.t('settings_integrations.github_disconnected'), '未连接');
    assert.equal(M.t('settings_integrations.github_configure'), '在 GitHub 上配置');
    assert.equal(M.t('settings_integrations.disconnect_confirm_message'), '要从当前 Qoder 账号断开 GitHub 连接吗？');
  });

  test('逐字保真：cache_cleanup 14 键官方值', () => {
    assert.equal(M.t('settings.cache_cleanup.app_title'), '应用缓存');
    assert.equal(M.t('settings.cache_cleanup.app_description'), '会话与消息的本地缓存');
    assert.equal(M.t('settings.cache_cleanup.artifact_title'), '产物缓存');
    assert.equal(M.t('settings.cache_cleanup.artifact_description'), '已下载的产物文件与图片');
    assert.equal(M.t('settings.cache_cleanup.all_title'), '全部清理');
    assert.equal(M.t('settings.cache_cleanup.all_description'), '清理此设备上的全部本地缓存');
    assert.equal(M.t('settings.cache_cleanup.calculating'), '计算中…');
    assert.equal(M.t('settings.cache_cleanup.clear'), '清理');
    assert.equal(M.t('settings.cache_cleanup.cleared'), '已清理');
    assert.equal(M.t('settings.cache_cleanup.failed'), '清理失败，请重试');
    assert.equal(M.t('settings.cache_cleanup.confirm_app_message'), '将清除本地会话与消息缓存，不影响云端数据。');
  });

  test('逐字保真：cache_cleanup en 权威值（v3.8.1 复跑裁决修正）', () => {
    M.setLocale('en');
    assert.equal(M.t('settings.cache_cleanup.all_title'), 'Clear All');
    assert.equal(M.t('settings.cache_cleanup.all_description'), 'All local cache on this device');
    assert.equal(M.t('settings.cache_cleanup.app_title'), 'App Cache');
    assert.equal(M.t('settings.cache_cleanup.artifact_title'), 'Artifact Cache');
    assert.equal(M.t('settings.cache_cleanup.artifact_description'), 'Downloaded artifacts and images');
    assert.equal(M.t('settings.cache_cleanup.cleared'), 'Cache cleared');
    assert.equal(M.t('settings.cache_cleanup.failed'), 'Failed to clear cache, please try again');
    assert.equal(M.t('settings.cache_cleanup.confirm_app_message'), 'This clears the local cache of sessions and messages. Your cloud data is not affected.');
    assert.equal(M.t('settings.cache_cleanup.confirm_artifact_message'), 'This clears downloaded artifacts and images. They will be downloaded again when needed.');
    assert.equal(M.t('settings.cache_cleanup.confirm_all_message'), 'This clears the current account’s local sessions and messages, plus downloaded artifacts and temporary files on this device. Your cloud data is not affected.');
    M.setLocale('zh');
  });

  test('逐字保真：附件单复数与空态引号（APK 字面值）', () => {
    assert.equal(M.t('tasks.empty.description'), '"点击 + 启动任务，或在 Qoder CLI 中开启 Remote Control 同步任务"');
    assert.equal(M.t('tool.group.files'), '读取 %d 个文件');
    M.setLocale('en');
    assert.equal(M.t('composer.attachment.file'), 'File');
    assert.equal(M.t('composer.attachment.photo'), 'Photo');
    assert.equal(M.t('tool.group.files'), 'Read %d Files');
    assert.equal(M.t('tasks.empty.description'), '"Tap + to launch a task, or turn on Remote Control in Qoder CLI to sync tasks"');
    M.setLocale('zh');
  });


  test('v3.9.0 逐字保真：登录域（auth/sms/numberauth/password 官方键名）', () => {
    assert.equal(M.t('auth.cn.phone_login'), '手机号登录');
    assert.equal(M.t('sms.code_sent'), '验证码已发送');
    assert.equal(M.t('sms.error.code_required'), '请输入6位验证码');
    assert.equal(M.t('numberauth.one_click_login'), '一键登录');
    assert.equal(M.t('password_login.title'), '阿里云账号登录');
    assert.equal(M.t('auth.vpc_login_title'), 'VPC 登录');
    assert.equal(M.t('auth.enterprise_entry.selection.title'), '选择企业账号类型');
    M.setLocale('en');
    assert.equal(M.t('auth.continue.github'), 'Sign in with Github');
    assert.equal(M.t('sms.resend_countdown'), 'Resend (%1$ds)');
    assert.equal(M.t('startup_authorization.title'), 'Welcome to Qoder');
    M.setLocale('zh');
  });

  test('v3.9.0 逐字保真：环境/用量/反馈/通知/问答域', () => {
    assert.equal(M.t('choose_environment.title'), '选择环境');
    assert.equal(M.t('choose_environment.connect_computer'), '连接到你的电脑');
    assert.equal(M.t('usage.plan_credits'), '套餐内 Credits');
    assert.equal(M.t('feedback.source.record_screen'), '录制屏幕');
    assert.equal(M.t('notification.channel.task_updates'), '任务更新');
    assert.equal(M.t('tasks.question.panel_title'), '请回答以下问题');
    assert.equal(M.t('tasks.plan_review.prompt'), '已写好计划，可以开始执行。');
    assert.equal(M.t('account_security.verify_and_delete'), '验证并注销');
    assert.equal(M.t('update.title'), '新版本 %s 可用');
    M.setLocale('en');
    assert.equal(M.t('choose_environment.offline'), 'Offline');
    assert.equal(M.t('usage.used_summary'), '%1$s / %2$s (%3$d%% used)');
    M.setLocale('zh');
  });

  test('逐字保真：update.install/action 失败态 + settings.usage', () => {
    assert.equal(M.t('update.install.permission_required'), '尚未允许 Qoder 安装应用。请在系统设置中开启“允许来自此来源的应用”，返回后将继续安装。');
    assert.equal(M.t('update.action.download_again'), '重新下载');
    assert.equal(M.t('update.action.open_settings'), '去设置');
    assert.equal(M.t('update.action.try_again'), '重试');
    assert.equal(M.t('settings.usage'), '用量');
  });

  test('GitHub 状态机渲染：connected → 徽标变绿 + configure 副行', () => {
    const h = htmlOf({ 'github-state': 'connected' });
    assert.ok(h.includes('已连接') && h.includes('在 GitHub 上配置'));
    assert.ok(h.includes('--qm-accent-completed'));
  });

  test('更新失败横幅：update-state=permission_required 渲染错误文案 + 三动作', () => {
    const h = htmlOf({ 'update-state': 'permission_required' });
    assert.ok(h.includes('尚未允许 Qoder 安装应用'));
    assert.ok(h.includes('重新下载') && h.includes('去设置') && h.includes('data-update="try-again"'));
  });

  test('清理缓存子面板：panel=cache 渲染三缓存项 + 清理按钮', () => {
    const h = htmlOf({ panel: 'cache' });
    assert.ok(h.includes('应用缓存') && h.includes('产物缓存') && h.includes('全部清理'));
    assert.ok(h.includes('已下载的产物文件与图片') && h.includes('清理'));
    assert.ok(h.includes('data-cache="all"'));
  });

  test('退出登录确认对话框：confirm=sign-out 渲染标题/正文/取消/确认', () => {
    const h = htmlOf({ confirm: 'sign-out' });
    assert.ok(h.includes('退出登录') && h.includes('确定要退出登录吗？'));
    assert.ok(h.includes('data-dlg-ok="sign-out-confirm"') && h.includes('取消'));
  });

  test('设备配对态：device-paired 显示已配对 ✓', () => {
    const h = htmlOf({ 'device-paired': '' });
    assert.ok(h.includes('眼镜已配对'));
    assert.ok(!h.includes('支持与智能眼镜配对'));
  });
});

describe('v3.8.0 任务详情 + 远程控制引导（tasks_rc_* 官方键序）', () => {
  const M = loadMobile();
  const fake = (attrs) => {
    const Cls = M.WC['qm-task-detail'];
    return { getAttribute: (k) => (k in attrs ? attrs[k] : null), hasAttribute: (k) => k in attrs, emit: () => {} };
  };
  const htmlOf = (attrs) => M.WC['qm-task-detail'].prototype.template.call(fake(attrs));

  test('逐字保真：tasks_rc_* 17 键官方值', () => {
    assert.equal(M.t('tasks.rc.title'), '远程控制');
    assert.equal(M.t('tasks.rc.subtitle'), 'Qoder Desktop & CLI');
    assert.equal(M.t('tasks.rc.guidance_cli_intro'), '在终端中选择一种方式，启用远程控制：');
    assert.equal(M.t('tasks.rc.guidance_cli_command'), '在终端运行命令「%@」');
    assert.equal(M.t('tasks.rc.guidance_cli_connect_current'), '连接当前会话');
    assert.equal(M.t('tasks.rc.guidance_cli_new_sessions'), '手机端新建最多 32 个会话');
    assert.equal(M.t('tasks.rc.guidance_coming_soon'), '即将上线');
    assert.equal(M.t('tasks.rc.guidance_download'), '在电脑上下载 Qoder 应用');
    assert.equal(M.t('tasks.rc.guidance_history_sync'), '历史会话同步');
    assert.equal(M.t('tasks.rc.guidance_login'), '使用同一账号登录');
    assert.equal(M.t('tasks.rc.cli_device'), 'CLI');
    assert.equal(M.t('tasks.rc.desktop_device'), '桌面端');
    assert.equal(M.t('tasks.action.archive'), '归档');
    assert.equal(M.t('tasks.action.delete'), '删除');
  });

  test('rc=off 渲染引导序列：Desktop 5 步 + CLI 3 步 + 即将上线徽标 + 命令回显', () => {
    const h = htmlOf({ title: '重构登录模块', phase: 'running', env: 'desktop' });
    assert.ok(h.includes('远程控制') && h.includes('即将上线'));
    assert.ok(h.includes('在电脑上下载 Qoder 应用'));
    assert.ok(h.includes('在电脑上安装 Qoder Desktop 并使用同一账号登录'));
    assert.ok(h.includes('在 Qoder Desktop 设置中开启「Qoder Mobile」/ 远程控制'));
    assert.ok(h.includes('打开 Quest – ⚙ 设置 – 📱 Mobile – 开启'));
    assert.ok(h.includes('Qoder CLI') && h.includes('qoder connect'));
    assert.ok(h.includes('连接当前会话') && h.includes('历史会话同步'));
  });

  test('rc=on 渲染已连接卡（connected_to 设备名）且不渲染引导', () => {
    const h = htmlOf({ title: 'T', phase: 'running', rc: 'on', 'rc-device': 'MacBook Pro' });
    assert.ok(h.includes('已连接至 MacBook Pro'));
    assert.ok(!h.includes('在电脑上下载 Qoder 应用'));
  });

  test('元信息与操作行：运行环境/最后更新时间/四操作 + 产物槽', () => {
    const h = htmlOf({ title: 'T', phase: 'completed', env: 'cli', updated: '5 分钟前' });
    assert.ok(h.includes('运行环境 · CLI'));
    assert.ok(h.includes('最后更新时间 5 分钟前'));
    assert.ok(h.includes('标记为已读') && h.includes('标记为未读') && h.includes('归档') && h.includes('删除'));
    assert.ok(h.includes('<slot name="artifacts">'));
    assert.ok(h.includes('已完成'));
  });

  test('XSS 安全：标题/设备名经 esc 转义（带真实 escapeHtml 的沙箱）', () => {
    const sandbox = {};
    const fn = new Function('globalThis', `
      this.QoderCore = { escapeHtml: (s) => String(s == null ? '' : s)
        .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;') };
      this.QoderUI = { ShadowElement: class {
        constructor() {} static get observedAttributes() { return []; }
        emit() {} $(sel) { return null; } $$(sel) { return []; }
      } };
      const g = this;
      ${src}
    `);
    fn.call(sandbox, sandbox);
    const M2 = sandbox.QoderUI.Mobile;
    const el = { getAttribute: (k) => ({ title: '<img src=x onerror=alert(1)>', 'rc-device': '<b>x</b>', rc: 'on', phase: 'idle' })[k] || null, hasAttribute: (k) => k in { rc: 'on' }, emit: () => {} };
    const h = M2.WC['qm-task-detail'].prototype.template.call(el);
    assert.ok(!h.includes('<img src=x'), '标题被转义');
    assert.ok(h.includes('&lt;img'), '标题已转义输出');
    assert.ok(!h.includes('<b>x</b>'), '设备名被转义');
  });
});
