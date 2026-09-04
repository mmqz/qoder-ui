/**
 * v3.6.0 移动端复现组件族测试（真机对齐版）
 * 覆盖：SSR 安全 / 10 组件注册 / 实证文案逐字保真（对照 APK i18n 表）/
 *       真实色板（M6.b 主题类 96 槽解码 + la_accent_*）/ 模板渲染 / 事件契约
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

describe('v3.6.0 移动端组件注册', () => {
  const M = loadMobile();

  test('导出公共 API（t/setLocale/STRINGS/statusColor/version）', () => {
    assert.ok(M, 'QoderUI.Mobile 应存在');
    assert.equal(typeof M.t, 'function');
    assert.equal(typeof M.setLocale, 'function');
    assert.ok(M.STRINGS.zh && M.STRINGS.en);
    assert.equal(typeof M.statusColor, 'function');
    assert.equal(M.version, '3.6.0');
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
    'new_task.prompt.video': '把“梯度下降”做成一段动画讲解视频',
    /* 任务列表（tasks_tab_* / tasks_group_* / tasks_phase_* / tasks_rc_*） */
    'tasks.filter.all': '全部', 'tasks.filter.running': '进行中',
    'tasks.filter.pending': '待审批', 'tasks.filter.idle': '空闲',
    'tasks.group.today': '今天', 'tasks.group.week': '近 7 天',
    'tasks.phase.waiting': '等待审批',
    'tasks.rc.title': '远程控制', 'tasks.rc.subtitle': 'Qoder Desktop & CLI',
    /* 工具卡片（tool_use_* / tool_group_*） */
    'tool.bash': '执行命令', 'tool.edit': '编辑文件', 'tool.read': '读取文件',
    'tool.web_search': '网页搜索', 'tool.subagent': '子智能体',
    'tool.plan': '请求进入 Plan 模式',
    'tool.status.pending': '等待中',
    'tool.group.tools': '运行 %d 个工具', 'tool.group.ops': '已处理 %d 个操作',
    'todo.title': '待办列表',
    /* 审批（approval.title.* / tasks.approval.*） */
    'approval.title.run_command': 'Qoder 请求执行命令',
    'approval.title.mcp': 'Qoder 请求执行 MCP 工具',
    'tasks.approval.pending': '需要授权',
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

  test('qm-approval(kind=action): 标题/命令回显/需授权徽标/四级选项', () => {
    const El = M.WC['qm-approval'];
    const el = fakeEl(El, { kind: 'action', command: 'pnpm test' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('Qoder 请求执行命令'));
    assert.ok(html.includes('pnpm test'));
    assert.ok(html.includes('需要授权'));
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
    assert.ok(html.includes('读取文件') && html.includes('运行中'));
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

  test('qm-session-detail: 常规/元数据分组 + 空值占位', () => {
    const El = M.WC['qm-session-detail'];
    const el = fakeEl(El, { session: JSON.stringify({ id: 'sess_9f2', model: 'qwen-max' }) });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('常规') && html.includes('元数据'));
    assert.ok(html.includes('sess_9f2'));
    assert.ok(html.includes('模型'));
    assert.ok(html.includes('—')); // 运行环境为空 → 占位
  });

  test('qm-settings: 外观三选项 + 注销账号 + 版本行 + AI 声明', () => {
    const El = M.WC['qm-settings'];
    const el = fakeEl(El, { appearance: 'dark' });
    const html = El.prototype.template.call(el);
    assert.ok(html.includes('深色') && html.includes('浅色') && html.includes('跟随系统'));
    assert.ok(html.includes('注销账号'));
    assert.ok(html.includes('Version: 0.2.8'));
    assert.ok(html.includes('服务生成的所有内容均由人工智能生成'));
  });
});
