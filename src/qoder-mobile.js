/* ============================================================
   Qoder Mobile Web Components（v3.6.0 移动端复现组件族·真机对齐版）
   ============================================================
   依据《Qoder Mobile 移动端逆向分析报告》+ 二次深挖复现官方 App
   (com.qoder.mobile.cn v0.2.8) 的移动端界面。

   v3.6.0 修正（相对 v3.5.0）——全部取自反编译实证：
   1. 真实主题调色板：smali const-wide 常量频谱 + jadx M6.b 主题类
      解码出 96 槽 × 双主题（浅/深）token。品牌主色为绿：
      浅 #5CBD61 / 深 #2ADB5C（v3.5.0 误用蓝色，本版纠正）。
      暖灰中性阶：#141414/#636261/#838280/#9F9E9B（浅），
      #EEEEEB/#95958F/#7B7B75/#484743（深）；页面底 #FDFDFD/#161612。
      状态色：error #FF4D4F / warning #FAAD14 / info #0B83F1 /
      success #5BB98B（Ant Design 系）。la_accent_* 保留用于通知态。
   2. 信息架构：顶层深链 qodercn://home | tasks | sessions（实证），
      底部导航 4 tab（首页/任务/工作区/我的）。
   3. 新建任务落地页：云端工作/连接电脑双 tab（new_task_landing_*
       实证），吉祥物小Q 欢迎语、每 tab 4 条真实提示词 chips。
   4. 任务列表：筛选 tab（全部/进行中/待审批/空闲，tasks_tab_*
      实证）+ 时间分组（今天/昨天/近 7 天/更早）+ 远程控制引导卡。
   5. 对话流：工具卡片族（执行命令/读取文件/编辑文件/搜索/网页搜索/
      网页抓取/生成图片/技能/MCP/更新待办/子智能体/请求进入 Plan 模式，
      tool_use_* 实证）+ 分组卡（运行 N 个工具等）+ 待办列表。
   6. 输入区：模式（询问权限/自动审批/自动接受编辑/免审批/计划）与
      模型（自动/高效/轻量/高性能/旗舰 + 描述）选择面板，composer.*。
   组件（10）：qm-app / qm-task-list / qm-new-task / qm-conversation
     qm-composer / qm-approval / qm-sandbox-boot / qm-artifact
     qm-session-detail / qm-settings
   依赖：qoder-core.js → qoder-shadow.js（可独立于桌面端 CSS 使用）
   SSR 安全：Node 下可导入（customElements 缺失时静默跳过注册）
   仅供学习研究；不含官方资产，不得商用。
   ============================================================ */
(function() {
  'use strict';

  const _g = typeof globalThis !== 'undefined' ? globalThis : {};
  const QI = _g.QoderUI = _g.QoderUI || {};
  const Base = QI.ShadowElement;
  if (!Base) {
    console.error('[QoderUI.mobile] 缺少依赖 qoder-shadow.js，移动端组件未注册');
    return;
  }
  const Core = _g.QoderCore || {};
  const esc = Core.escapeHtml || function(s) { return String(s == null ? '' : s); };
  const json = (attr, fallback) => {
    try { return JSON.parse(attr); } catch (e) { return fallback; }
  };
  const fmt = (s, args) => String(s == null ? '' : s).replace(/%@|%d|%s/g, () => {
    const v = args.shift();
    return String(v != null ? v : '');
  });

  const WC = QI.Mobile && QI.Mobile.WC ? QI.Mobile.WC : (QI.WC || {});
  const components = [];

  /** 声明辅助：注册组件类并记录到表（与 qoder-wc.js 同模式） */
  function def(name, cls) {
    WC[name] = cls;
    components.push([name, cls]);
  }

  /* ============================================================
     i18n — 文案逐字摘自安装包 assets/dynamic-content/
     qoder-mobile.zh.json / .en.json 与 res/values 目录 strings.xml
     （报告第五章 + v3.6.0 二次提取）
     ============================================================ */
  const STRINGS = {
    zh: {
      'app.tab.home': '首页', 'app.tab.tasks': '任务',
      'app.tab.sessions': '工作区', 'app.tab.me': '我的',
      'new_task.tab.cloud': '云端工作', 'new_task.tab.local': '连接电脑',
      'new_task.cloud_hero_title': '想到就说，说干就干',
      'new_task.cloud_hero_subtitle': '我是小Q，你的全能工作搭子～ 在云端听候你的派遣，随时准备开工！',
      'new_task.local_hero_title': '深度思考，匠心创造',
      'new_task.local_hero_subtitle': '用手机轻松掌控电脑，你在电脑上的任务、文件、技能等环境都已准备就绪。',
      'new_task.input_placeholder': '描述你的任务...',
      'new_task.prompt.digest': '每周一推送竞品简报',
      'new_task.prompt.feedback': '200条客户反馈按问题与情绪分类',
      'new_task.prompt.monitor': '全网舆情监控，负面立刻通知',
      'new_task.prompt.agent': '部署一个客服 Agent 自动回复咨询',
      'new_task.prompt.categories': '找出Q3增长最快的三个品类',
      'new_task.prompt.poster': '设计一张产品发布会的主视觉海报',
      'new_task.prompt.report': '把本周 tasks 整理成周报，遗留问题列为待办',
      'new_task.prompt.video': '把“梯度下降”做成一段动画讲解视频',
      'new_task.choose_repo': '选择 Git 仓库', 'new_task.choose_branch': '选择分支',
      'new_task.default_branch': '默认分支', 'new_task.attachment.spec': 'Spec',
      'tasks.filter.all': '全部', 'tasks.filter.running': '进行中',
      'tasks.filter.pending': '待审批', 'tasks.filter.idle': '空闲',
      'tasks.group.today': '今天', 'tasks.group.yesterday': '昨天',
      'tasks.group.week': '近 7 天', 'tasks.group.earlier': '更早',
      'tasks.phase.running': '运行中', 'tasks.phase.completed': '已完成',
      'tasks.phase.failed': '失败', 'tasks.phase.idle': '空闲',
      'tasks.phase.waiting': '等待审批',
      'tasks.rc.title': '远程控制', 'tasks.rc.subtitle': 'Qoder Desktop & CLI',
      'tasks.count': '%d 个任务',
      'tasks.empty.title': '准备开始',
      'tasks.empty.description': '点击 + 开始任务，或开启 Remote Control 同步任务',
      'tasks.approval.enter_plan_mode.description': '你可以选择先生成并审核 Spec，再开始执行；也可以跳过 Spec，直接开始执行任务。Spec 用于明确任务范围和执行规范，帮助确认方向是否正确。',
      'tasks.approval.enter_plan_mode.generate_spec': '生成 Spec',
      'tasks.approval.enter_plan_mode.run_directly': '直接执行',
      'tasks.approval.option.allow': '允许', 'tasks.approval.option.allow_once': '仅本次允许',
      'tasks.approval.option.allow_session': '本会话内始终允许', 'tasks.approval.option.reject': '拒绝',
      'tasks.approval.option.recommended': '推荐',
      'tasks.approval.feedback_placeholder': '告诉 Qoder 要做什么',
      'tasks.approval.feedback_reject_and_send': '拒绝并发送',
      'tasks.approval.approved': '已批准',
      'tasks.approval.pending': '需要授权',
      'approval.title.run_command': 'Qoder 请求执行命令',
      'approval.title.edit': 'Qoder 请求编辑文件',
      'approval.title.mcp': 'Qoder 请求执行 MCP 工具',
      'approval.title.enter_plan_mode': '执行方式选择',
      'tool.bash': '执行命令', 'tool.read': '读取文件', 'tool.edit': '编辑文件',
      'tool.search': '搜索', 'tool.web_search': '网页搜索', 'tool.web_fetch': '网页抓取',
      'tool.image': '生成图片', 'tool.skill': '技能', 'tool.mcp': 'MCP',
      'tool.todo': '更新待办', 'tool.subagent': '子智能体', 'tool.plan': '请求进入 Plan 模式',
      'tool.status.running': '运行中', 'tool.status.completed': '已完成',
      'tool.status.failed': '失败', 'tool.status.pending': '等待中',
      'tool.group.tools': '运行 %d 个工具', 'tool.group.files': '读取 %d 个文件',
      'tool.group.writes': '写入 %d 个文件', 'tool.group.ops': '已处理 %d 个操作',
      'todo.title': '待办列表', 'todo.empty': '暂无待办项。',
      'workspace.metric.active': '活跃', 'workspace.metric.closed': '已关闭',
      'workspace.feedback': '描述你的任务…', 'workspace.interrupt_session': '终止回复',
      'workspace.empty_session': '现在可以开始你的任务了！',
      'conversation.thinking.title': '深度思考',
      'conversation.sources.title': '来源',
      'conversation.turn_activity.agents_count': '%d 个智能体',
      'conversation.turn_activity.experts_count': '%d名专家',
      'conversation.turn_activity.todo_progress': '%d/%d',
      'conversation.remote_control_ready': '可以开始你的任务了！',
      'conversation.turn.copy_success': '已复制',
      'conversation.interrupt.stopped': '已被用户停止',
      'conversation.disconnected_composer_placeholder': '已断开连接',
      'cloud_sandbox_boot.stage.download_install': '创建云端容器',
      'cloud_sandbox_boot.stage.repository_install': '克隆代码仓库',
      'cloud_sandbox_boot.stage.run_install': '启动云端容器',
      'cloud_sandbox_boot.setup_hint': '添加 setup 脚本来安装依赖并配置环境。',
      'cloud_sandbox_boot.preparing': '正在等待初始化进度…',
      'cloud_sandbox_boot.composer_disabled': '等待云端沙箱初始化完成',
      'artifact.title': '产物', 'artifact.empty': '生成的文件将在这里展示',
      'artifact.section_presented': '最终交付', 'artifact.section_changed': '中间编辑',
      'artifact.view_preview': '预览', 'artifact.view_source': '源码',
      'artifact.open_external': '用其他应用打开',
      'diff.summary': '%d 处新增，%d 处删除',
      'session.details.title': '详情', 'session.details.general': '常规',
      'session.details.metadata': '元数据', 'session.details.model': '模型',
      'session.details.running_on': '运行环境', 'session.details.created': '创建时间',
      'session.details.last_updated': '最后更新时间', 'session.details.session_id': '会话 ID',
      'session.details.id_copied': '已复制会话 ID',
      'composer.choose_mode': '选择模式', 'composer.choose_model': '选择模型',
      'composer.code_with_plan': '先规划再编码',
      'composer.mode.ask': '询问权限', 'composer.mode.auto': '自动审批',
      'composer.mode.auto_edits': '自动接受编辑', 'composer.mode.bypass': '免审批模式',
      'composer.mode.plan': '计划模式',
      'composer.model.auto': '自动', 'composer.model.efficient': '高效',
      'composer.model.lite': '轻量', 'composer.model.performance': '高性能',
      'composer.model.ultimate': '旗舰',
      'composer.model.auto_desc': '智能选择最优模型，平衡性能与成本',
      'composer.model.efficient_desc': '标准推理，成本较低',
      'composer.model.lite_desc': '基础推理，免费可用（高峰期可能较慢）',
      'composer.model.performance_desc': '高级推理，输出质量优秀',
      'composer.model.ultimate_desc': '专家级深度推理与思考，输出质量最高',
      'composer.options.open': '打开输入选项', 'composer.options.connectors': '连接器',
      'composer.options.skills': '技能', 'composer.options.plugins': '插件',
      'composer.options.mode': '模式', 'composer.options.model': '模型',
      'composer.attachment.photo': '图片', 'composer.attachment.file': '文件',
      'composer.attachment.camera': '相机',
      'markdown.code.default_title': '代码', 'markdown.mermaid.title': '流程图',
      'mermaid.loading': '正在渲染图表…',
      'appearance.dark': '深色', 'appearance.light': '浅色', 'appearance.system': '跟随系统',
      'settings.appearance': '外观', 'settings.integrations': '集成',
      'account_security.title': '账号与安全', 'account_security.delete_account': '注销账号',
      'usage.title': '用量', 'billing.current_plan': '当前套餐',
      'about.version': 'Version: %@',
      'about.privacy_agreement': '隐私协议', 'about.service_agreement': '服务条款',
      'about.ai_generated_content_notice': '服务生成的所有内容均由人工智能生成，其生成内容的准确性和完整性无法保证，不代表我们的态度或观点。'
    },
    en: {
      'app.tab.home': 'Home', 'app.tab.tasks': 'Tasks',
      'app.tab.sessions': 'Workspace', 'app.tab.me': 'Me',
      'new_task.tab.cloud': 'Cloud', 'new_task.tab.local': 'Local PC',
      'new_task.cloud_hero_title': 'Say it, ship it',
      'new_task.cloud_hero_subtitle': "I'm Xiao Q, your all-purpose work buddy — ready in the cloud whenever you need me!",
      'new_task.local_hero_title': 'Deep thinking, craftsman creation',
      'new_task.local_hero_subtitle': 'Control your PC from your phone — your tasks, files and skills on the computer are all set.',
      'new_task.input_placeholder': 'Describe your task...',
      'new_task.prompt.digest': 'Push a competitor briefing every Monday',
      'new_task.prompt.feedback': 'Classify 200 customer feedback items by issue and sentiment',
      'new_task.prompt.monitor': 'Monitor public opinion; notify on negativity',
      'new_task.prompt.agent': 'Deploy a support agent to answer inquiries',
      'new_task.prompt.categories': 'Find the three fastest-growing categories in Q3',
      'new_task.prompt.poster': 'Design a key visual poster for the launch event',
      'new_task.prompt.report': 'Turn this week\'s tasks into a report with open issues as todos',
      'new_task.prompt.video': 'Turn "gradient descent" into an animated explainer',
      'new_task.choose_repo': 'Choose a Git repository', 'new_task.choose_branch': 'Choose a branch',
      'new_task.default_branch': 'Default branch', 'new_task.attachment.spec': 'Spec',
      'tasks.filter.all': 'All', 'tasks.filter.running': 'Running',
      'tasks.filter.pending': 'Pending', 'tasks.filter.idle': 'Idle',
      'tasks.group.today': 'Today', 'tasks.group.yesterday': 'Yesterday',
      'tasks.group.week': 'Last 7 days', 'tasks.group.earlier': 'Earlier',
      'tasks.phase.running': 'Running', 'tasks.phase.completed': 'Completed',
      'tasks.phase.failed': 'Failed', 'tasks.phase.idle': 'Idle',
      'tasks.phase.waiting': 'Awaiting approval',
      'tasks.rc.title': 'Remote Control', 'tasks.rc.subtitle': 'Qoder Desktop & CLI',
      'tasks.count': '%d tasks',
      'tasks.empty.title': 'Ready to start',
      'tasks.empty.description': 'Tap + to start a task, or enable Remote Control to sync tasks',
      'tasks.approval.enter_plan_mode.description': 'Generate and review a Spec first, or skip it and run directly. The Spec clarifies scope and conventions so you can confirm the direction.',
      'tasks.approval.enter_plan_mode.generate_spec': 'Generate Spec',
      'tasks.approval.enter_plan_mode.run_directly': 'Run directly',
      'tasks.approval.option.allow': 'Allow', 'tasks.approval.option.allow_once': 'Allow once',
      'tasks.approval.option.allow_session': 'Always allow in this session', 'tasks.approval.option.reject': 'Reject',
      'tasks.approval.option.recommended': 'Recommended',
      'tasks.approval.feedback_placeholder': 'Tell Qoder what to do',
      'tasks.approval.feedback_reject_and_send': 'Reject and send',
      'tasks.approval.approved': 'Approved',
      'tasks.approval.pending': 'Approval required',
      'approval.title.run_command': 'Qoder wants to run a command',
      'approval.title.edit': 'Qoder wants to edit a file',
      'approval.title.mcp': 'Qoder wants to run an MCP tool',
      'approval.title.enter_plan_mode': 'Choose how to run',
      'tool.bash': 'Run command', 'tool.read': 'Read file', 'tool.edit': 'Edit file',
      'tool.search': 'Search', 'tool.web_search': 'Web search', 'tool.web_fetch': 'Web fetch',
      'tool.image': 'Generate image', 'tool.skill': 'Skill', 'tool.mcp': 'MCP',
      'tool.todo': 'Update todos', 'tool.subagent': 'Sub-agent', 'tool.plan': 'Request Plan mode',
      'tool.status.running': 'Running', 'tool.status.completed': 'Completed',
      'tool.status.failed': 'Failed', 'tool.status.pending': 'Waiting',
      'tool.group.tools': 'Ran %d tools', 'tool.group.files': 'Read %d files',
      'tool.group.writes': 'Wrote %d files', 'tool.group.ops': 'Processed %d operations',
      'todo.title': 'Todo list', 'todo.empty': 'No todos yet.',
      'workspace.metric.active': 'Active', 'workspace.metric.closed': 'Closed',
      'workspace.feedback': 'Describe your task…', 'workspace.interrupt_session': 'Stop reply',
      'workspace.empty_session': "You're all set — start your task now!",
      'conversation.thinking.title': 'Deep thinking',
      'conversation.sources.title': 'Sources',
      'conversation.turn_activity.agents_count': '%d agents',
      'conversation.turn_activity.experts_count': '%d experts',
      'conversation.turn_activity.todo_progress': '%d/%d',
      'conversation.remote_control_ready': "You're all set — start your task now!",
      'conversation.turn.copy_success': 'Copied',
      'conversation.interrupt.stopped': 'Stopped by user',
      'conversation.disconnected_composer_placeholder': 'Disconnected',
      'cloud_sandbox_boot.stage.download_install': 'Creating cloud container',
      'cloud_sandbox_boot.stage.repository_install': 'Cloning repository',
      'cloud_sandbox_boot.stage.run_install': 'Starting cloud container',
      'cloud_sandbox_boot.setup_hint': 'Add a setup script to install dependencies and configure the environment.',
      'cloud_sandbox_boot.preparing': 'Waiting for initialization progress…',
      'cloud_sandbox_boot.composer_disabled': 'Waiting for cloud sandbox initialization',
      'artifact.title': 'Artifacts', 'artifact.empty': 'Generated files will appear here',
      'artifact.section_presented': 'Final delivery', 'artifact.section_changed': 'Intermediate edits',
      'artifact.view_preview': 'Preview', 'artifact.view_source': 'Source',
      'artifact.open_external': 'Open with another app',
      'diff.summary': '%d additions, %d deletions',
      'session.details.title': 'Details', 'session.details.general': 'General',
      'session.details.metadata': 'Metadata', 'session.details.model': 'Model',
      'session.details.running_on': 'Running on', 'session.details.created': 'Created',
      'session.details.last_updated': 'Last updated', 'session.details.session_id': 'Session ID',
      'session.details.id_copied': 'Session ID copied',
      'composer.choose_mode': 'Choose mode', 'composer.choose_model': 'Choose model',
      'composer.code_with_plan': 'Plan before coding',
      'composer.mode.ask': 'Ask permissions', 'composer.mode.auto': 'Auto-approve',
      'composer.mode.auto_edits': 'Auto-accept edits', 'composer.mode.bypass': 'Bypass permissions',
      'composer.mode.plan': 'Plan mode',
      'composer.model.auto': 'Auto', 'composer.model.efficient': 'Efficient',
      'composer.model.lite': 'Lite', 'composer.model.performance': 'Performance',
      'composer.model.ultimate': 'Ultimate',
      'composer.model.auto_desc': 'Picks the best model, balancing performance and cost',
      'composer.model.efficient_desc': 'Standard reasoning, lower cost',
      'composer.model.lite_desc': 'Basic reasoning, free (may be slower at peak)',
      'composer.model.performance_desc': 'Advanced reasoning, excellent quality',
      'composer.model.ultimate_desc': 'Expert-level deep reasoning, highest quality',
      'composer.options.open': 'Open input options', 'composer.options.connectors': 'Connectors',
      'composer.options.skills': 'Skills', 'composer.options.plugins': 'Plugins',
      'composer.options.mode': 'Mode', 'composer.options.model': 'Model',
      'composer.attachment.photo': 'Photos', 'composer.attachment.file': 'Files',
      'composer.attachment.camera': 'Camera',
      'markdown.code.default_title': 'Code', 'markdown.mermaid.title': 'Diagram',
      'mermaid.loading': 'Rendering diagram…',
      'appearance.dark': 'Dark', 'appearance.light': 'Light', 'appearance.system': 'System',
      'settings.appearance': 'Appearance', 'settings.integrations': 'Integrations',
      'account_security.title': 'Account & Security', 'account_security.delete_account': 'Delete account',
      'usage.title': 'Usage', 'billing.current_plan': 'Current plan',
      'about.version': 'Version: %@',
      'about.privacy_agreement': 'Privacy Policy', 'about.service_agreement': 'Terms of Service',
      'about.ai_generated_content_notice': 'All content generated by the service is AI-generated. Its accuracy and completeness cannot be guaranteed and does not represent our attitudes or opinions.'
    }
  };
  let _locale = 'zh';
  function t(key) {
    const tab = STRINGS[_locale] || STRINGS.zh;
    return tab[key] != null ? tab[key] : (STRINGS.zh[key] != null ? STRINGS.zh[key] : key);
  }
  function setLocale(l) { if (STRINGS[l]) _locale = l; return _locale; }

  /* ============================================================
     Design Tokens — v3.6.0 真实色板
     来源 1：jadx sources/M6/AbstractC0654b.java（主题类，96 槽 × 2 主题，
       与 scripts/decode_palette.py 解码一一对应）
     来源 2：apktool res/values/colors.xml + values-night（语义实证：
       numauth_text #141414/#EEEEEB、fill_tertiary #F0F0F0/#1D1D1A、
       link_divider #DDDDDD/#3A3A35、launch_bg #FDFDFD/#161612、
       splash #FDFDFD/#080807）
     来源 3：res/values/colors.xml la_accent_*（通知状态色，原样保留）
     ============================================================ */
  const TOKENS = [
    '--qm-primary:#5CBD61',
    '--qm-primary-bright:#2ADB5C',
    '--qm-primary-weak:#E7F8E6',
    '--qm-on-primary:#FFFFFF',
    '--qm-accent-running:#2FBF71',
    '--qm-accent-completed:#3B82F6',
    '--qm-accent-attention:#F5A623',
    '--qm-accent-error:#EF4444',
    '--qm-success:#5BB98B', '--qm-error:#FF4D4F',
    '--qm-warning:#FAAD14', '--qm-info:#0B83F1',
    '--qm-bg:#FDFDFD', '--qm-surface:#FFFFFF', '--qm-surface-2:#F0F0F0',
    '--qm-text:#141414', '--qm-text-2:#636261', '--qm-text-3:#838280',
    '--qm-text-4:#9F9E9B', '--qm-line:#E5E5E5', '--qm-line-strong:#DDDDDD',
    '--qm-radius:14px', '--qm-radius-sm:10px',
    '--qm-font:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",Roboto,"Segoe UI",sans-serif',
    '--qm-shadow:0 1px 3px rgba(20,20,20,.05),0 4px 16px rgba(20,20,20,.04)',
    '--qm-mask:rgba(8,8,7,.4)'
  ].join(';') + ';';
  const TOKENS_DARK = [
    '--qm-primary:#2ADB5C',
    '--qm-primary-bright:#2ADB5C',
    '--qm-primary-weak:#16391C',
    '--qm-accent-running:#2FBF71',
    '--qm-accent-completed:#3B82F6',
    '--qm-accent-attention:#F5A623',
    '--qm-accent-error:#EF4444',
    '--qm-success:#73B78E', '--qm-error:#EC5B56',
    '--qm-warning:#EFB041', '--qm-info:#3B81E9',
    '--qm-bg:#161612', '--qm-surface:#171716', '--qm-surface-2:#1D1D1A',
    '--qm-text:#EEEEEB', '--qm-text-2:#95958F', '--qm-text-3:#7B7B75',
    '--qm-text-4:#484743', '--qm-line:#2A2926', '--qm-line-strong:#3A3A35',
    '--qm-shadow:0 1px 3px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.35)',
    '--qm-mask:rgba(8,8,7,.7)'
  ].join(';') + ';';

  /* 共享基础样式：每个组件 host 都带（theme=dark 覆盖变量） */
  function baseCss(extra) {
    return ':host{' + TOKENS + 'all:initial;display:block;font-family:var(--qm-font);' +
      'color:var(--qm-text);font-size:15px;line-height:1.5;-webkit-font-smoothing:antialiased;}' +
      ':host([theme="dark"]){' + TOKENS_DARK + '}' +
      '*{box-sizing:border-box;margin:0;padding:0;font-family:inherit;}' +
      'button{cursor:pointer;border:none;background:none;color:inherit;font-size:inherit;}' +
      (extra || '');
  }
  /* 四状态色：la_accent_*（通知实证）；
     v3.6.0 追加 tasks.phase.* 五阶段与工具卡四状态映射 */
  const statusColor = (s) => ({
    running: 'var(--qm-accent-running)', completed: 'var(--qm-accent-completed)',
    attention: 'var(--qm-accent-attention)', error: 'var(--qm-accent-error)',
    failed: 'var(--qm-accent-error)', waiting: 'var(--qm-accent-attention)',
    pending: 'var(--qm-accent-attention)', idle: 'var(--qm-text-3)'
  }[s] || 'var(--qm-text-2)');

  /* 通用小图标（24dp 网格描边风格，对应 APK ic_*_line 矢量重绘） */
  const ICONS = {
    plus: 'M12 5v14M5 12h14',
    send: 'M12 19V6M6 11l6-6 6 6',
    chat: 'M4 5h16v11H8.4L4 19.6V5z',
    tasks: 'M4 5h16M4 12h10M4 19h7',
    home: 'M4 11l8-7 8 7M6 10v9h12v-9',
    grid: 'M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z',
    user: 'M12 4a4 4 0 110 8 4 4 0 010-8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5',
    monitor: 'M3 5h18v11H3zM8 20h8M12 16v4',
    phone: 'M7 3h10a1 1 0 011 1v16a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1zM10.5 17.5h3',
    terminal: 'M5 5h14v14H5zM8 10l2.2 2L8 14M12.5 14H16',
    smile: 'M12 3a9 9 0 100 18 9 9 0 000-18zM9 10h.01M15 10h.01M8.5 14a4.5 4.5 0 007 0'
  };
  const svg = (p, cls) =>
    '<svg' + (cls ? ' class="' + cls + '"' : '') + ' viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' + p + '"/></svg>';

  /* ============================================================
     <qm-app> — 应用壳：底部四 Tab（首页/任务/工作区/我的）
     实证：深链 qodercn://home|tasks|sessions；工作区=workspace.title
     ============================================================ */
  class QmApp extends Base {
    static get observedAttributes() { return ['page', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-app{display:flex;flex-direction:column;min-height:100%;}' +
        '.qm-app__body{flex:1;min-height:0;}' +
        '.qm-tabbar{display:flex;border-top:1px solid var(--qm-line);background:var(--qm-surface);' +
        'padding:6px 10px calc(8px + env(safe-area-inset-bottom,0));}' +
        '.qm-tab{flex:1;display:flex;flex-direction:column;align-items:center;gap:3px;padding:5px 0 2px;' +
        'color:var(--qm-text-3);font-size:11px;}' +
        '.qm-tab.on{color:var(--qm-primary);font-weight:600;}' +
        '.qm-tab__icon{width:22px;height:22px;display:block;}');
    }
    template() {
      const page = this.getAttribute('page') || 'tasks';
      const tabs = [
        ['home', 'app.tab.home', ICONS.home],
        ['tasks', 'app.tab.tasks', ICONS.tasks],
        ['sessions', 'app.tab.sessions', ICONS.grid],
        ['me', 'app.tab.me', ICONS.user]
      ];
      const tabbar = tabs.map(([id, key, icon]) => {
        const on = page === id;
        return '<button class="qm-tab' + (on ? ' on' : '') + '" data-page="' + id + '" part="tab">' +
          svg(icon, 'qm-tab__icon') +
          '<span class="qm-tab__label">' + esc(t(key)) + '</span></button>';
      }).join('');
      const slot = (n) => '<slot name="page-' + n + '" style="display:' + (page === n ? 'block' : 'none') + '"></slot>';
      return '<div class="qm-app" part="app">' +
        '<div class="qm-app__body">' +
        slot('home') + slot('tasks') + slot('sessions') + slot('me') +
        '</div>' +
        '<nav class="qm-tabbar" part="tabbar">' + tabbar + '</nav></div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-tab').forEach((b) => {
        b.addEventListener('click', () => {
          this.setAttribute('page', b.dataset.page);
          this.emit('navigate', { page: b.dataset.page });
        });
      });
    }
    get page() { return this.getAttribute('page') || 'tasks'; }
    set page(v) { this.setAttribute('page', v); }
  }

  /* ============================================================
     <qm-task-list> — 任务列表
     实证：筛选 tab tasks_tab_*（全部/进行中/待审批/空闲）、
       分组 tasks_group_*（今天/昨天/近 7 天/更早）、
       阶段 tasks_phase_*（运行中/已完成/失败/空闲/等待审批）、
       远程控制卡 tasks_rc_*（远程控制 · Qoder Desktop & CLI）
     tasks = [{id,title,status,repo,branch,updated,group}]
     group: 'today'|'yesterday'|'week'|'earlier'
     ============================================================ */
  class QmTaskList extends Base {
    static get observedAttributes() { return ['tasks', 'filter', 'title']; }
    static get hostCss() {
      return baseCss(
        '.qm-hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px;}' +
        '.qm-hd__t{font-size:24px;font-weight:700;letter-spacing:.2px;}' +
        '.qm-hd__count{font-size:12.5px;color:var(--qm-text-3);}' +
        '.qm-filters{display:flex;gap:8px;padding:0 16px 10px;overflow-x:auto;}' +
        '.qm-filters::-webkit-scrollbar{width:0;height:0;}' +
        '.qm-chip{flex:none;font-size:13px;padding:6px 14px;border-radius:999px;' +
        'background:var(--qm-surface-2);color:var(--qm-text-2);}' +
        '.qm-chip.on{background:var(--qm-primary-weak);color:var(--qm-primary);font-weight:600;}' +
        ':host([theme="dark"]) .qm-chip.on{background:var(--qm-primary-weak);}' +
        '.qm-rc{margin:2px 16px 10px;display:flex;align-items:center;gap:11px;width:calc(100% - 32px);' +
        'background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);padding:12px 14px;text-align:left;}' +
        '.qm-rc__ic{width:38px;height:38px;border-radius:11px;background:var(--qm-primary-weak);' +
        'color:var(--qm-primary);display:flex;align-items:center;justify-content:center;flex:none;}' +
        '.qm-rc__ic svg{width:20px;height:20px;}' +
        '.qm-rc__t{font-size:14.5px;font-weight:600;}' +
        '.qm-rc__s{font-size:12px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-rc__arr{margin-left:auto;color:var(--qm-text-4);}' +
        '.qm-sec{padding:10px 18px 4px;font-size:12.5px;color:var(--qm-text-3);}' +
        '.qm-list{padding:0 12px 16px;display:flex;flex-direction:column;gap:10px;}' +
        '.qm-card{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:13px 14px;box-shadow:var(--qm-shadow);text-align:left;width:100%;}' +
        '.qm-card__top{display:flex;align-items:center;gap:8px;}' +
        '.qm-dot{width:8px;height:8px;border-radius:50%;flex:none;}' +
        '.qm-card__title{font-weight:600;font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-card__tag{flex:none;font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600;}' +
        '.qm-card__meta{margin-top:5px;font-size:12.5px;color:var(--qm-text-2);display:flex;gap:10px;}' +
        '.qm-empty{padding:40px 0 46px;text-align:center;}' +
        '.qm-empty__t{font-size:15px;font-weight:600;margin-top:10px;}' +
        '.qm-empty__s{font-size:12.5px;color:var(--qm-text-3);margin-top:4px;}');
    }
    template() {
      const tasks = json(this.getAttribute('tasks'), []) || [];
      const filter = this.getAttribute('filter') || 'all';
      const FILTERS = [
        ['all', 'tasks.filter.all'], ['running', 'tasks.filter.running'],
        ['waiting', 'tasks.filter.pending'], ['idle', 'tasks.filter.idle']
      ];
      const chips = FILTERS.map(([id, key]) =>
        '<button class="qm-chip' + (filter === id ? ' on' : '') + '" data-filter="' + id + '">' +
        esc(t(key)) + '</button>').join('');
      const shown = tasks.filter((x) => filter === 'all' ? true : x.status === filter || (filter === 'running' && x.status === 'attention'));
      const GROUPS = [['today', 'tasks.group.today'], ['yesterday', 'tasks.group.yesterday'],
        ['week', 'tasks.group.week'], ['earlier', 'tasks.group.earlier']];
      let cards = '';
      GROUPS.forEach(([gid, gkey]) => {
        const list = shown.filter((x) => (x.group || 'today') === gid);
        if (!list.length) return;
        cards += '<div class="qm-sec">' + esc(t(gkey)) + '</div>' +
          '<div class="qm-list">' + list.map((task) => {
            const st = esc(task.status || 'running');
            /* 兼容 v3.5.0 旧状态名 → 实证阶段枚举（tasks_phase_*） */
            const phase = { attention: 'waiting', error: 'failed' }[task.status] || task.status || 'running';
            return '<button class="qm-card" data-id="' + esc(task.id != null ? task.id : '') + '" part="card">' +
              '<div class="qm-card__top"><span class="qm-dot" style="background:' + statusColor(st) + '"></span>' +
              '<span class="qm-card__title">' + esc(task.title || '') + '</span>' +
              '<span class="qm-card__tag" style="color:' + statusColor(st) + ';background:color-mix(in srgb,' + statusColor(st) + ' 12%,transparent)">' +
              esc(t('tasks.phase.' + phase)) + '</span></div>' +
              '<div class="qm-card__meta">' +
              (task.repo ? '<span>' + esc(task.repo) + (task.branch ? ' · ' + esc(task.branch) : '') + '</span>' : '') +
              (task.updated ? '<span>' + esc(task.updated) + '</span>' : '') + '</div></button>';
          }).join('') + '</div>';
      });
      const rc = '<button class="qm-rc" data-rc="1" part="rc">' +
        '<span class="qm-rc__ic">' + svg(ICONS.monitor) + '</span>' +
        '<span><span class="qm-rc__t">' + esc(t('tasks.rc.title')) + '</span><br>' +
        '<span class="qm-rc__s">' + esc(t('tasks.rc.subtitle')) + '</span></span>' +
        '<span class="qm-rc__arr">›</span></button>';
      return '<div class="qm-hd"><span class="qm-hd__t">' + esc(this.getAttribute('title') || t('app.tab.tasks')) + '</span>' +
        '<span class="qm-hd__count">' + esc(fmt(t('tasks.count'), [tasks.length])) + '</span></div>' +
        '<div class="qm-filters">' + chips + '</div>' + rc +
        (cards || '<div class="qm-empty">' + svg(ICONS.plus, '') +
          '<div class="qm-empty__t">' + esc(t('tasks.empty.title')) + '</div>' +
          '<div class="qm-empty__s">' + esc(t('tasks.empty.description')) + '</div></div>');
    }
    _bind(root) {
      root.querySelectorAll('.qm-chip').forEach((c) => {
        c.addEventListener('click', () => {
          this.setAttribute('filter', c.dataset.filter);
          this.emit('filter-change', { filter: c.dataset.filter });
        });
      });
      root.querySelectorAll('.qm-rc').forEach((r) => {
        r.addEventListener('click', () => this.emit('rc-open', {}));
      });
      root.querySelectorAll('.qm-card').forEach((c) => {
        c.addEventListener('click', () => this.emit('task-open', { id: c.dataset.id }));
      });
    }
    get tasks() { return json(this.getAttribute('tasks'), []); }
    set tasks(v) { this.setAttribute('tasks', JSON.stringify(v || [])); }
  }

  /* ============================================================
     <qm-new-task> — 新建任务落地页（实证双 tab）
     new_task_landing_cloud_tab 云端工作 / local_tab 连接电脑；
     hero 标题/副标题逐字；每 tab 4 条提示词 chips 逐字；
     输入占位 new_task_landing_input_placeholder 描述你的任务...
     tab="cloud"|"local"；事件：submit / prompt-pick / tab-change
     ============================================================ */
  class QmNewTask extends Base {
    static get observedAttributes() { return ['tab', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-new{padding:6px 16px 20px;}' +
        '.qm-tabs{display:flex;background:var(--qm-surface-2);border-radius:12px;padding:3px;margin:4px 0 18px;}' +
        '.qm-tabs button{flex:1;padding:9px 0;border-radius:9px;font-size:14px;color:var(--qm-text-2);}' +
        '.qm-tabs button.on{background:var(--qm-surface);color:var(--qm-text);font-weight:700;box-shadow:var(--qm-shadow);}' +
        '.qm-hero{display:flex;gap:12px;align-items:center;}' +
        '.qm-hero__av{width:46px;height:46px;border-radius:15px;background:var(--qm-primary);color:var(--qm-on-primary);' +
        'display:flex;align-items:center;justify-content:center;flex:none;box-shadow:0 4px 12px color-mix(in srgb,var(--qm-primary) 35%,transparent);}' +
        '.qm-hero__av svg{width:26px;height:26px;}' +
        '.qm-hero__t{font-size:20px;font-weight:800;letter-spacing:.3px;}' +
        '.qm-hero__s{margin-top:3px;font-size:12.5px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-prompts{display:flex;flex-direction:column;gap:8px;margin-top:16px;}' +
        '.qm-prompt{display:flex;align-items:center;gap:9px;width:100%;text-align:left;' +
        'background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:11px 14px;font-size:13.5px;color:var(--qm-text);}' +
        '.qm-prompt:hover{border-color:var(--qm-primary);}' +
        '.qm-prompt__ic{width:26px;height:26px;border-radius:8px;background:var(--qm-primary-weak);color:var(--qm-primary);' +
        'display:flex;align-items:center;justify-content:center;font-size:12px;flex:none;}' +
        '.qm-prompt__ic svg{width:15px;height:15px;}' +
        '.qm-input{margin-top:14px;background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:12px 14px;min-height:88px;display:block;width:100%;font-size:15px;line-height:1.6;color:var(--qm-text);' +
        'resize:none;outline:none;}' +
        '.qm-input:focus{border-color:var(--qm-primary);}' +
        '.qm-input::placeholder{color:var(--qm-text-4);}' +
        '.qm-tools{display:flex;gap:2px;margin-top:10px;align-items:center;}' +
        '.qm-tool{font-size:12px;color:var(--qm-text-2);padding:6px 9px;border-radius:9px;display:flex;' +
        'align-items:center;gap:4px;white-space:nowrap;}' +
        '.qm-tool:hover{background:var(--qm-surface-2);color:var(--qm-text);}' +
        '.qm-tool svg{width:15px;height:15px;}' +
        '.qm-send{margin-left:auto;width:34px;height:34px;border-radius:11px;background:var(--qm-primary);' +
        'color:var(--qm-on-primary);display:flex;align-items:center;justify-content:center;flex:none;}' +
        '.qm-send svg{width:17px;height:17px;}');
    }
    template() {
      const tab = this.getAttribute('tab') || 'cloud';
      const cloud = tab !== 'local';
      const title = cloud ? t('new_task.cloud_hero_title') : t('new_task.local_hero_title');
      const sub = cloud ? t('new_task.cloud_hero_subtitle') : t('new_task.local_hero_subtitle');
      const prompts = cloud
        ? ['new_task.prompt.digest', 'new_task.prompt.feedback', 'new_task.prompt.monitor', 'new_task.prompt.agent']
        : ['new_task.prompt.categories', 'new_task.prompt.poster', 'new_task.prompt.report', 'new_task.prompt.video'];
      const tabBtn = (id, key) =>
        '<button class="' + ((id === 'cloud') === cloud ? 'on' : '') + '" data-tab="' + id + '">' + esc(t(key)) + '</button>';
      const promptRow = (key, i) =>
        '<button class="qm-prompt" data-prompt="' + i + '">' +
        '<span class="qm-prompt__ic">' + svg(ICONS.send) + '</span>' + esc(t(key)) + '</button>';
      return '<div class="qm-new" part="new-task">' +
        '<div class="qm-tabs">' + tabBtn('cloud', 'new_task.tab.cloud') + tabBtn('local', 'new_task.tab.local') + '</div>' +
        '<div class="qm-hero"><span class="qm-hero__av">' + svg(ICONS.smile) + '</span>' +
        '<span><span class="qm-hero__t">' + esc(title) + '</span><br>' +
        '<span class="qm-hero__s">' + esc(sub) + '</span></span></div>' +
        '<div class="qm-prompts">' + prompts.map(promptRow).join('') + '</div>' +
        '<textarea class="qm-input" part="input" placeholder="' + esc(t('new_task.input_placeholder')) + '"></textarea>' +
        '<div class="qm-tools">' +
        '<button class="qm-tool" data-act="photo">' + esc(t('composer.attachment.photo')) + '</button>' +
        '<button class="qm-tool" data-act="file">' + esc(t('composer.attachment.file')) + '</button>' +
        '<button class="qm-tool" data-act="camera">' + esc(t('composer.attachment.camera')) + '</button>' +
        '<button class="qm-tool" data-act="mode">' + esc(t('composer.choose_mode')) + '</button>' +
        '<button class="qm-tool" data-act="model">' + esc(t('composer.choose_model')) + '</button>' +
        '<button class="qm-send" part="send">' + svg(ICONS.send) + '</button>' +
        '</div></div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-tab]').forEach((b) => {
        b.addEventListener('click', () => {
          this.setAttribute('tab', b.dataset.tab);
          this.emit('tab-change', { tab: b.dataset.tab });
        });
      });
      root.querySelectorAll('.qm-prompt').forEach((p) => {
        p.addEventListener('click', () => {
          const key = (this.getAttribute('tab') || 'cloud') === 'cloud'
            ? ['new_task.prompt.digest', 'new_task.prompt.feedback', 'new_task.prompt.monitor', 'new_task.prompt.agent']
            : ['new_task.prompt.categories', 'new_task.prompt.poster', 'new_task.prompt.report', 'new_task.prompt.video'];
          const ta = root.querySelector('.qm-input');
          if (ta) ta.value = t(key[parseInt(p.dataset.prompt, 10) || 0]);
          this.emit('prompt-pick', { index: parseInt(p.dataset.prompt, 10) || 0 });
        });
      });
      root.querySelectorAll('.qm-tool').forEach((b) => {
        b.addEventListener('click', () => this.emit('act', { kind: b.dataset.act }));
      });
      const ta = root.querySelector('.qm-input');
      root.querySelector('.qm-send').addEventListener('click', () => {
        this.emit('submit', { text: ta.value, tab: this.getAttribute('tab') || 'cloud' });
      });
    }
  }

  /* ============================================================
     <qm-conversation> — 会话对话流（v3.6.0 增工具卡片族）
     messages = [{role:'user'|'assistant', text, thinking, sources,
                  agents, experts, todoDone, todoTotal, stopped,
                  tools:[{kind,status,detail}],      工具卡片
                  groupTools|groupFiles|groupWrites|groupOps,  分组卡
                  todo:[{text,done}]}]               待办列表
     kind: bash|read|edit|search|web_search|web_fetch|image|skill|mcp|todo|subagent|plan
     status: running|completed|failed|pending
     ============================================================ */
  const TOOL_KEYS = {
    bash: 'tool.bash', read: 'tool.read', edit: 'tool.edit', search: 'tool.search',
    web_search: 'tool.web_search', web_fetch: 'tool.web_fetch', image: 'tool.image',
    skill: 'tool.skill', mcp: 'tool.mcp', todo: 'tool.todo', subagent: 'tool.subagent',
    plan: 'tool.plan'
  };
  class QmConversation extends Base {
    static get observedAttributes() { return ['messages', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-conv{padding:12px 14px 8px;display:flex;flex-direction:column;gap:12px;}' +
        '.qm-msg{display:flex;gap:8px;max-width:100%;}' +
        '.qm-msg__avatar{width:30px;height:30px;border-radius:10px;background:var(--qm-primary);color:var(--qm-on-primary);' +
        'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex:none;}' +
        '.qm-bubble{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:10px 13px;font-size:14.5px;line-height:1.65;min-width:0;flex:1;}' +
        '.qm-msg--user{flex-direction:row-reverse;}' +
        '.qm-msg--user .qm-bubble{background:var(--qm-primary-weak);border-color:transparent;color:var(--qm-text);flex:none;max-width:85%;}' +
        '.qm-think{margin-top:8px;border-left:3px solid var(--qm-line);padding:4px 0 4px 10px;}' +
        '.qm-think__hd{font-size:12px;color:var(--qm-text-2);cursor:pointer;}' +
        '.qm-think__bd{margin-top:4px;font-size:12.5px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-think[data-open] .qm-think__bd{display:block;} .qm-think__bd{display:none;}' +
        '.qm-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}' +
        '.qm-pill{font-size:11.5px;color:var(--qm-text-2);background:var(--qm-surface-2);border-radius:999px;padding:3px 9px;}' +
        'button.qm-pill{cursor:pointer;}' +
        '.qm-copy{margin-top:8px;font-size:12px;color:var(--qm-text-3);}' +
        '.qm-toolcard{display:flex;align-items:center;gap:8px;margin-top:8px;background:var(--qm-surface-2);' +
        'border-radius:var(--qm-radius-sm);padding:8px 11px;font-size:12.5px;}' +
        '.qm-toolcard__ic{width:22px;height:22px;border-radius:7px;background:var(--qm-surface);' +
        'display:flex;align-items:center;justify-content:center;flex:none;color:var(--qm-text-2);font-size:11px;}' +
        '.qm-toolcard__ic svg{width:13px;height:13px;}' +
        '.qm-toolcard__t{font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:52%;}' +
        '.qm-toolcard__d{color:var(--qm-text-3);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}' +
        '.qm-toolcard__s{flex:none;font-size:11px;}' +
        '.qm-todocard{margin-top:8px;background:var(--qm-surface-2);border-radius:var(--qm-radius-sm);padding:9px 11px;}' +
        '.qm-todocard__t{font-size:12px;font-weight:700;color:var(--qm-text-2);margin-bottom:5px;}' +
        '.qm-todocard__i{display:flex;gap:7px;font-size:12.5px;padding:2.5px 0;align-items:baseline;}' +
        '.qm-todocard__i b{flex:none;width:14px;height:14px;border-radius:50%;border:1.5px solid var(--qm-text-4);' +
        'font-size:9px;display:inline-flex;align-items:center;justify-content:center;color:var(--qm-on-primary);position:relative;top:2px;}' +
        '.qm-todocard__i.done b{background:var(--qm-primary);border-color:var(--qm-primary);}' +
        '.qm-todocard__i.done span{color:var(--qm-text-3);text-decoration:line-through;}' +
        '.qm-groupcard{margin-top:8px;font-size:12px;color:var(--qm-text-3);display:flex;align-items:center;gap:8px;}' +
        '.qm-groupcard::before,.qm-groupcard::after{content:"";flex:1;height:1px;background:var(--qm-line);}' +
        '.qm-stopped{font-size:12px;color:var(--qm-text-2);padding:2px 13px;}' +
        '.qm-ready{padding:34px 0;text-align:center;color:var(--qm-text-2);font-size:13.5px;}');
    }
    template() {
      const msgs = json(this.getAttribute('messages'), []) || [];
      if (!msgs.length) {
        return '<div class="qm-conv"><div class="qm-ready">' + esc(t('workspace.empty_session')) + '</div></div>';
      }
      const toolCard = (tl) => {
        const kind = TOOL_KEYS[tl.kind] ? tl.kind : 'bash';
        const status = ['running', 'completed', 'failed', 'pending'].includes(tl.status) ? tl.status : 'running';
        const dot = statusColor(status);
        return '<div class="qm-toolcard">' +
          '<span class="qm-toolcard__ic">' + svg(ICONS.terminal) + '</span>' +
          '<span class="qm-toolcard__t">' + esc(t(TOOL_KEYS[kind])) + '</span>' +
          (tl.detail ? '<span class="qm-toolcard__d">' + esc(tl.detail) + '</span>' : '') +
          '<span class="qm-toolcard__s" style="color:' + dot + '">' + esc(t('tool.status.' + status)) + '</span></div>';
      };
      const body = msgs.map((m, i) => {
        const user = m.role === 'user';
        let inner = esc(m.text || '');
        /* 分组卡：运行 N 个工具 / 读取 N 个文件 / 写入 N 个文件 / 已处理 N 个操作 */
        if (m.groupTools) inner += '<div class="qm-groupcard">' + esc(fmt(t('tool.group.tools'), [m.groupTools])) + '</div>';
        if (m.groupFiles) inner += '<div class="qm-groupcard">' + esc(fmt(t('tool.group.files'), [m.groupFiles])) + '</div>';
        if (m.groupWrites) inner += '<div class="qm-groupcard">' + esc(fmt(t('tool.group.writes'), [m.groupWrites])) + '</div>';
        if (m.groupOps) inner += '<div class="qm-groupcard">' + esc(fmt(t('tool.group.ops'), [m.groupOps])) + '</div>';
        /* 工具卡片族 */
        if (Array.isArray(m.tools) && m.tools.length) inner += m.tools.map(toolCard).join('');
        /* 待办列表 */
        if (Array.isArray(m.todo) && m.todo.length) {
          inner += '<div class="qm-todocard"><div class="qm-todocard__t">' + esc(t('todo.title')) + '</div>' +
            m.todo.map((td) =>
              '<div class="qm-todocard__i' + (td.done ? ' done' : '') + '"><b>' + (td.done ? '✓' : '') + '</b>' +
              '<span>' + esc(td.text || '') + '</span></div>').join('') + '</div>';
        }
        inner += '<div class="qm-pills">' +
          (m.thinking ? '<button class="qm-pill qm-pill--think" data-i="' + i + '">◈ ' + esc(t('conversation.thinking.title')) + '</button>' : '') +
          (m.sources ? '<span class="qm-pill">' + esc(t('conversation.sources.title')) + ' · ' + esc(m.sources) + '</span>' : '') +
          (m.agents ? '<span class="qm-pill">' + esc(fmt(t('conversation.turn_activity.agents_count'), [m.agents])) + '</span>' : '') +
          (m.experts ? '<span class="qm-pill">' + esc(fmt(t('conversation.turn_activity.experts_count'), [m.experts])) + '</span>' : '') +
          (m.todoTotal ? '<span class="qm-pill">☑ ' + esc(fmt(t('conversation.turn_activity.todo_progress'), [m.todoDone || 0, m.todoTotal])) + '</span>' : '') +
          '</div>' +
          (m.thinking ? '<div class="qm-think" data-think="' + i + '"><div class="qm-think__hd">' +
            esc(t('conversation.thinking.title')) + ' ▾</div><div class="qm-think__bd">' + esc(m.thinking) + '</div></div>' : '') +
          '<div class="qm-pills"><button class="qm-copy" data-copy="' + i + '">' + esc(t('conversation.turn.copy_success')) + '</button></div>';
        return '<div class="qm-msg' + (user ? ' qm-msg--user' : '') + '">' +
          (user ? '' : '<div class="qm-msg__avatar">Q</div>') +
          '<div class="qm-bubble" part="bubble">' + inner + '</div></div>' +
          (m.stopped ? '<div class="qm-stopped">' + esc(t('conversation.interrupt.stopped')) + '</div>' : '');
      }).join('');
      return '<div class="qm-conv">' + body + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-pill--think').forEach((p) => {
        p.addEventListener('click', () => {
          const block = root.querySelector('[data-think="' + p.dataset.i + '"]');
          if (block) block.toggleAttribute('data-open');
        });
      });
      root.querySelectorAll('.qm-copy').forEach((c) => {
        c.addEventListener('click', () => {
          const m = (this.messages || [])[parseInt(c.dataset.copy, 10)] || {};
          if (typeof navigator !== 'undefined' && navigator.clipboard && m.text) {
            navigator.clipboard.writeText(m.text).catch(() => {});
          }
          this.emit('copy', { index: parseInt(c.dataset.copy, 10) });
        });
      });
    }
    get messages() { return json(this.getAttribute('messages'), []); }
    set messages(v) { this.setAttribute('messages', JSON.stringify(v || [])); }
  }

  /* ============================================================
     <qm-composer> — 输入区（v3.6.0 增模式/模型选择面板）
     实证：composer.mode.*（询问权限/自动审批/自动接受编辑/
       免审批模式/计划模式）、composer.model.*（自动/高效/轻量/
       高性能/旗舰 + 描述逐字）、composer.options.open 打开输入选项
     disabled 态复现 cloud_sandbox_boot.composer_disabled 文案
     ============================================================ */
  const MODES = ['ask', 'auto', 'auto_edits', 'bypass', 'plan'];
  const MODELS = ['auto', 'efficient', 'lite', 'performance', 'ultimate'];
  class QmComposer extends Base {
    static get observedAttributes() { return ['disabled', 'mode', 'model', 'panel', 'placeholder', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-comp{border-top:1px solid var(--qm-line);background:var(--qm-surface);padding:8px 12px calc(10px + env(safe-area-inset-bottom,0));}' +
        '.qm-comp__pre{font-size:11.5px;color:var(--qm-accent-attention);padding:0 2px 6px;}' +
        '.qm-comp__box{display:flex;gap:8px;align-items:flex-end;background:var(--qm-surface-2);' +
        'border-radius:var(--qm-radius);padding:9px 10px;}' +
        '.qm-comp__ta{flex:1;border:none;background:none;outline:none;resize:none;font-size:15px;line-height:1.5;' +
        'color:var(--qm-text);min-height:22px;max-height:110px;}' +
        '.qm-comp__ta::placeholder{color:var(--qm-text-4);}' +
        '.qm-comp__send{width:32px;height:32px;border-radius:11px;background:var(--qm-primary);' +
        'color:var(--qm-on-primary);display:flex;align-items:center;justify-content:center;flex:none;}' +
        '.qm-comp__send svg{width:16px;height:16px;}' +
        '.qm-comp__send[disabled]{opacity:.4;cursor:default;}' +
        '.qm-comp__row{display:flex;gap:2px;margin-top:7px;align-items:center;}' +
        '.qm-act{font-size:12px;color:var(--qm-text-2);padding:5px 8px;border-radius:8px;white-space:nowrap;flex:none;}' +
        '.qm-act:hover{background:var(--qm-surface-2);color:var(--qm-text);}' +
        '.qm-act--plus{width:26px;height:26px;border-radius:9px;background:var(--qm-surface-2);display:flex;' +
        'align-items:center;justify-content:center;margin-right:2px;}' +
        '.qm-act--plus svg{width:14px;height:14px;}' +
        '.qm-sheet{margin:0 -12px;background:var(--qm-surface);border-top:1px solid var(--qm-line);}' +
        '.qm-sheet__hd{display:flex;justify-content:space-between;align-items:center;padding:11px 16px 4px;' +
        'font-size:13px;font-weight:700;}' +
        '.qm-sheet__x{font-size:16px;color:var(--qm-text-3);padding:0 4px;}' +
        '.qm-opt{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;' +
        'padding:10px 16px;text-align:left;border-top:1px solid var(--qm-line);}' +
        '.qm-opt__t{font-size:14px;font-weight:600;}' +
        '.qm-opt__d{font-size:11.5px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-opt.on .qm-opt__t{color:var(--qm-primary);}' +
        '.qm-opt__ck{color:var(--qm-primary);font-weight:700;flex:none;}');
    }
    template() {
      const disabled = this.hasAttribute('disabled');
      const panel = this.getAttribute('panel') || '';
      const mode = this.getAttribute('mode') || 'ask';
      const model = this.getAttribute('model') || 'auto';
      const ph = this.getAttribute('placeholder') ||
        (disabled ? t('cloud_sandbox_boot.composer_disabled') : t('workspace.feedback'));
      const rows = (items, cur, key) => items.map((v) =>
        '<button class="qm-opt' + (cur === v ? ' on' : '') + '" data-pick="' + v + '">' +
        '<span><span class="qm-opt__t">' + esc(t(key + '.' + v)) + '</span><br>' +
        '<span class="qm-opt__d">' + esc(t(key + '.' + v + '_desc')) + '</span></span>' +
        (cur === v ? '<span class="qm-opt__ck">✓</span>' : '') + '</button>').join('');
      let sheet = '';
      if (!disabled && panel === 'mode') {
        sheet = '<div class="qm-sheet"><div class="qm-sheet__hd"><span>' + esc(t('composer.choose_mode')) + '</span>' +
          '<button class="qm-sheet__x" data-close="1">✕</button></div>' + rows(MODES, mode, 'composer.mode') + '</div>';
      } else if (!disabled && panel === 'model') {
        sheet = '<div class="qm-sheet"><div class="qm-sheet__hd"><span>' + esc(t('composer.choose_model')) + '</span>' +
          '<button class="qm-sheet__x" data-close="1">✕</button></div>' + rows(MODELS, model, 'composer.model') + '</div>';
      }
      return '<div class="qm-comp" part="composer">' + sheet +
        (disabled ? '<div class="qm-comp__pre">◌ ' + esc(t('cloud_sandbox_boot.composer_disabled')) + '</div>' : '') +
        '<div class="qm-comp__box"><textarea class="qm-comp__ta" rows="1" part="textarea"' +
        (disabled ? ' disabled' : '') + ' placeholder="' + esc(ph) + '"></textarea>' +
        '<button class="qm-comp__send" part="send"' + (disabled ? ' disabled' : '') + '>' + svg(ICONS.send) + '</button></div>' +
        '<div class="qm-comp__row">' +
        '<button class="qm-act qm-act--plus" data-act="options">' + svg(ICONS.plus) + '</button>' +
        '<button class="qm-act" data-act="mode">' + esc(t('composer.mode.' + (MODES.includes(mode) ? mode : 'ask'))) + '</button>' +
        '<button class="qm-act" data-act="model">' + esc(t('composer.model.' + (MODELS.includes(model) ? model : 'auto'))) + '</button>' +
        '<span style="flex:1"></span>' +
        '<button class="qm-act" data-act="voice">🎙</button>' +
        '<button class="qm-act" data-act="camera">' + esc(t('composer.attachment.camera')) + '</button>' +
        '<button class="qm-act" data-act="file">' + esc(t('composer.attachment.file')) + '</button>' +
        '</div></div>';
    }
    _bind(root) {
      const ta = root.querySelector('.qm-comp__ta');
      const send = root.querySelector('.qm-comp__send');
      const doSend = () => {
        if (!ta.value.trim()) return;
        this.emit('send', { text: ta.value });
        ta.value = '';
      };
      if (send) send.addEventListener('click', doSend);
      if (ta) ta.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
      });
      root.querySelectorAll('.qm-act').forEach((a) => {
        a.addEventListener('click', () => {
          const kind = a.dataset.act;
          if (kind === 'mode' || kind === 'model') {
            this.setAttribute('panel', this.getAttribute('panel') === kind ? '' : kind);
          } else {
            this.emit('act', { kind });
          }
        });
      });
      root.querySelectorAll('[data-close]').forEach((b) => {
        b.addEventListener('click', () => this.setAttribute('panel', ''));
      });
      root.querySelectorAll('[data-pick]').forEach((b) => {
        b.addEventListener('click', () => {
          const panel = this.getAttribute('panel');
          this.setAttribute(panel, b.dataset.pick);
          this.setAttribute('panel', '');
          this.emit(panel === 'mode' ? 'mode-change' : 'model-change', { [panel]: b.dataset.pick });
        });
      });
    }
  }

  /* ============================================================
     <qm-approval> — 审批面板
     实证：approval.title.*（Qoder 请求执行命令/编辑文件/执行 MCP 工具/
       执行方式选择）、tasks.approval.option.* 四级 + 推荐、
       enter_plan_mode.description 逐字
     kind="action"(命令) | "edit" | "mcp" | "plan"|"spec"(Spec 双按钮)
     ============================================================ */
  class QmApproval extends Base {
    static get observedAttributes() { return ['kind', 'open', 'title', 'command', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-appr{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'box-shadow:var(--qm-shadow);overflow:hidden;}' +
        '.qm-appr__hd{padding:13px 15px 4px;font-weight:700;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;gap:8px;}' +
        '.qm-appr__badge{flex:none;font-size:10.5px;color:var(--qm-accent-attention);border:1px solid currentColor;' +
        'border-radius:999px;padding:0 7px;font-weight:600;}' +
        '.qm-appr__cmd{margin:8px 15px 0;background:var(--qm-surface-2);border-radius:var(--qm-radius-sm);' +
        'padding:9px 11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12px;color:var(--qm-text);' +
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-appr__bd{padding:8px 15px 14px;font-size:13px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-appr__btns{display:flex;gap:9px;padding:12px 15px 14px;}' +
        '.qm-appr__b{flex:1;padding:11px 0;border-radius:var(--qm-radius-sm);font-size:14px;font-weight:600;}' +
        '.qm-appr__b--primary{background:var(--qm-primary);color:var(--qm-on-primary);}' +
        '.qm-appr__b--ghost{background:var(--qm-surface-2);color:var(--qm-text);}' +
        '.qm-opt{display:flex;align-items:center;gap:9px;width:100%;padding:12px 15px;font-size:14.5px;text-align:left;' +
        'border-top:1px solid var(--qm-line);}' +
        '.qm-opt:hover{background:var(--qm-surface-2);}' +
        '.qm-opt__rec{font-size:10.5px;color:var(--qm-accent-completed);border:1px solid currentColor;border-radius:999px;padding:0 6px;}' +
        '.qm-fb{padding:0 15px 6px;}' +
        '.qm-fb__ta{width:100%;background:var(--qm-surface-2);border:1px solid var(--qm-line);border-radius:var(--qm-radius-sm);' +
        'padding:9px 11px;font-size:13.5px;color:var(--qm-text);outline:none;resize:none;}' +
        '.qm-fb__send{margin:7px 0 8px;width:100%;padding:10px;border-radius:var(--qm-radius-sm);font-size:13.5px;font-weight:600;' +
        'background:var(--qm-surface-2);color:var(--qm-error);}' +
        '.qm-appr--hidden{display:none;}');
    }
    template() {
      const kind = this.getAttribute('kind') || 'action';
      const open = this.getAttribute('open') !== 'false';
      const planLike = kind === 'plan' || kind === 'spec';
      const TITLES = { action: 'approval.title.run_command', edit: 'approval.title.edit', mcp: 'approval.title.mcp', plan: 'approval.title.enter_plan_mode', spec: 'approval.title.enter_plan_mode' };
      const title = this.getAttribute('title') || t(TITLES[kind] || TITLES.action);
      const rec = '<span class="qm-opt__rec">' + esc(t('tasks.approval.option.recommended')) + '</span>';
      const opts = [
        ['allow', t('tasks.approval.option.allow'), rec],
        ['allow_once', t('tasks.approval.option.allow_once'), ''],
        ['allow_session', t('tasks.approval.option.allow_session'), '']
      ].map(([v, label, badge]) =>
        '<button class="qm-opt" data-opt="' + v + '">' + esc(label) + badge + '</button>').join('');
      const cmd = this.getAttribute('command');
      return '<div class="qm-appr' + (open ? '' : ' qm-appr--hidden') + '" part="panel">' +
        '<div class="qm-appr__hd"><span>' + esc(title) + '</span>' +
        '<span class="qm-appr__badge">' + esc(t('tasks.approval.pending')) + '</span></div>' +
        (!planLike && cmd ? '<div class="qm-appr__cmd">' + esc(cmd) + '</div>' : '') +
        (planLike
          ? '<div class="qm-appr__bd">' + esc(t('tasks.approval.enter_plan_mode.description')) + '</div>' +
            '<div class="qm-appr__btns">' +
            '<button class="qm-appr__b qm-appr__b--primary" data-spec="generate">' + esc(t('tasks.approval.enter_plan_mode.generate_spec')) + '</button>' +
            '<button class="qm-appr__b qm-appr__b--ghost" data-spec="direct">' + esc(t('tasks.approval.enter_plan_mode.run_directly')) + '</button></div>'
          : opts +
            '<div class="qm-fb"><textarea class="qm-fb__ta" rows="2" placeholder="' + esc(t('tasks.approval.feedback_placeholder')) + '"></textarea>' +
            '<button class="qm-fb__send">' + esc(t('tasks.approval.feedback_reject_and_send')) + '</button></div>') +
        '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-opt').forEach((b) => {
        b.addEventListener('click', () => this.emit('approve', { option: b.dataset.opt }));
      });
      root.querySelectorAll('[data-spec]').forEach((b) => {
        b.addEventListener('click', () => this.emit('approve', { option: b.dataset.spec === 'generate' ? 'spec' : 'direct' }));
      });
      const fb = root.querySelector('.qm-fb__ta');
      const fbSend = root.querySelector('.qm-fb__send');
      if (fbSend) fbSend.addEventListener('click', () => {
        this.emit('approve', { option: 'reject', feedback: fb ? fb.value : '' });
      });
    }
  }

  /* ============================================================
     <qm-sandbox-boot> — 云沙箱启动进度（四阶段，实证 stage.* 文案）
     stage: 0 容器创建 → 1 仓库克隆 → 2 setup 脚本 → 3 启动容器
     ============================================================ */
  class QmSandboxBoot extends Base {
    static get observedAttributes() { return ['stage', 'failed', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-boot{padding:14px 16px;}' +
        '.qm-boot__tip{font-size:12.5px;color:var(--qm-text-2);margin-bottom:12px;}' +
        '.qm-stage{display:flex;gap:10px;padding:7px 0;align-items:flex-start;}' +
        '.qm-stage__ic{width:20px;height:20px;border-radius:50%;flex:none;display:flex;align-items:center;' +
        'justify-content:center;font-size:11px;margin-top:1px;border:1.5px solid var(--qm-line);color:var(--qm-text-2);}' +
        '.qm-stage--done .qm-stage__ic{background:var(--qm-primary);border-color:var(--qm-primary);color:var(--qm-on-primary);}' +
        '.qm-stage--run .qm-stage__ic{border-color:var(--qm-primary);color:var(--qm-primary);}' +
        '.qm-stage--fail .qm-stage__ic{background:var(--qm-error);border-color:var(--qm-error);color:#fff;}' +
        '.qm-stage__tx{font-size:14px;}' +
        '.qm-stage--run .qm-stage__tx{color:var(--qm-primary);font-weight:600;}' +
        '.qm-stage--todo .qm-stage__tx{color:var(--qm-text-2);}' +
        '.qm-stage__hint{font-size:12px;color:var(--qm-text-2);margin-top:2px;}');
    }
    template() {
      const stage = Math.max(0, Math.min(4, parseInt(this.getAttribute('stage') || '0', 10) || 0));
      const failed = this.hasAttribute('failed');
      const stages = [
        t('cloud_sandbox_boot.stage.download_install'),
        t('cloud_sandbox_boot.stage.repository_install'),
        t('cloud_sandbox_boot.setup_hint'),
        t('cloud_sandbox_boot.stage.run_install')
      ];
      const rows = stages.map((label, i) => {
        const cls = failed && i === stage ? 'fail' : i < stage ? 'done' : i === stage ? 'run' : 'todo';
        const ic = cls === 'done' ? '✓' : cls === 'fail' ? '!' : cls === 'run' ? '◌' : i + 1;
        return '<div class="qm-stage qm-stage--' + cls + '"><div class="qm-stage__ic">' + ic + '</div>' +
          '<div><div class="qm-stage__tx">' + esc(label) + '</div>' +
          (cls === 'run' ? '<div class="qm-stage__hint">' + esc(t('cloud_sandbox_boot.preparing')) + '</div>' : '') +
          '</div></div>';
      }).join('');
      return '<div class="qm-boot" part="boot">' + rows + '</div>';
    }
    get stage() { return parseInt(this.getAttribute('stage') || '0', 10) || 0; }
    set stage(v) { this.setAttribute('stage', String(v)); }
  }

  /* ============================================================
     <qm-artifact> — 产物页
     实证：ic_artifact_* 12 类图标（pdf/word/excel/ppt/markdown/code/
       image/audio/video/webpage/archive/folder/general，apktool 实证
       图标清单）；类型着色为推断（从主题辅色槽 61-89 取值）
     files = [{name,kind,section:'presented'|'changed',size}]
     ============================================================ */
  const ART_KIND = {
    pdf: { c: '#EC5B56', l: 'PDF' }, word: { c: '#0B83F1', l: 'W' },
    excel: { c: '#5BB98B', l: 'X' }, ppt: { c: '#FA8125', l: 'P' },
    markdown: { c: '#1E293B', l: 'MD' }, code: { c: '#615CED', l: '<>' },
    image: { c: '#EC4899', l: 'IMG' }, audio: { c: '#B99DFF', l: 'AU' },
    video: { c: '#0090FF', l: 'VID' }, webpage: { c: '#14B8A6', l: 'WEB' },
    archive: { c: '#FAAD14', l: 'ZIP' }, folder: { c: '#FAC414', l: 'DIR' },
    general: { c: '#8E8C99', l: 'F' }
  };
  class QmArtifact extends Base {
    static get observedAttributes() { return ['files', 'view', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-art__hd{display:flex;justify-content:space-between;align-items:center;padding:12px 16px 8px;}' +
        '.qm-art__t{font-size:17px;font-weight:700;}' +
        '.qm-art__seg{display:flex;background:var(--qm-surface-2);border-radius:9px;padding:2px;}' +
        '.qm-art__seg button{font-size:12px;padding:5px 12px;border-radius:7px;color:var(--qm-text-2);}' +
        '.qm-art__seg button.on{background:var(--qm-surface);color:var(--qm-text);font-weight:600;box-shadow:var(--qm-shadow);}' +
        '.qm-sec{padding:10px 16px 2px;font-size:12px;color:var(--qm-text-2);}' +
        '.qm-file{display:flex;align-items:center;gap:10px;width:100%;padding:11px 16px;text-align:left;' +
        'border-bottom:1px solid var(--qm-line);}' +
        '.qm-file__ic{width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;' +
        'font-size:10px;font-weight:800;color:#fff;flex:none;letter-spacing:.3px;}' +
        '.qm-file__nm{font-size:13.5px;font-weight:500;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-file__meta{font-size:11.5px;color:var(--qm-text-2);}' +
        '.qm-empty{padding:44px 0;text-align:center;color:var(--qm-text-2);font-size:13.5px;}');
    }
    template() {
      const files = json(this.getAttribute('files'), []) || [];
      const view = this.getAttribute('view') || 'preview';
      const seg = ['preview', 'source'].map((v) =>
        '<button class="' + (view === v ? 'on' : '') + '" data-view="' + v + '">' +
        esc(v === 'preview' ? t('artifact.view_preview') : t('artifact.view_source')) + '</button>').join('');
      const groups = [['presented', 'artifact.section_presented'], ['changed', 'artifact.section_changed']]
        .map(([sec, key]) => {
          const list = files.filter((f) => (f.section || 'presented') === sec);
          if (!list.length) return '';
          return '<div class="qm-sec">' + esc(t(key)) + '</div>' + list.map((f) => {
            const meta = ART_KIND[f.kind] || ART_KIND.general;
            return '<button class="qm-file" data-name="' + esc(f.name || '') + '">' +
              '<span class="qm-file__ic" style="background:' + meta.c + '">' + meta.l + '</span>' +
              '<span style="min-width:0"><span class="qm-file__nm">' + esc(f.name || '') + '</span><br>' +
              '<span class="qm-file__meta">' + esc(f.size || '') + '</span></span></button>';
          }).join('');
        }).join('');
      return '<div class="qm-art__hd"><span class="qm-art__t">' + esc(t('artifact.title')) + '</span>' +
        '<div class="qm-art__seg">' + seg + '</div></div>' +
        (groups || '<div class="qm-empty">' + esc(t('artifact.empty')) + '</div>');
    }
    _bind(root) {
      root.querySelectorAll('[data-view]').forEach((b) => {
        b.addEventListener('click', () => {
          this.setAttribute('view', b.dataset.view);
          this.emit('view-change', { view: b.dataset.view });
        });
      });
      root.querySelectorAll('.qm-file').forEach((f) => {
        f.addEventListener('click', () => this.emit('file-open', { name: f.dataset.name }));
      });
    }
    get files() { return json(this.getAttribute('files'), []); }
    set files(v) { this.setAttribute('files', JSON.stringify(v || [])); }
  }

  /* ============================================================
     <qm-session-detail> — 会话详情（session.details.* 实证，
       v3.6.0 分 常规/元数据 两组）
     session = {id, model, env, created, updated}
     ============================================================ */
  class QmSessionDetail extends Base {
    static get observedAttributes() { return ['session', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-det{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);overflow:hidden;}' +
        '.qm-det__hd{padding:12px 15px 6px;font-weight:700;font-size:15px;}' +
        '.qm-det__sec{padding:8px 15px 2px;font-size:11.5px;color:var(--qm-text-3);}' +
        '.qm-det__row{display:flex;justify-content:space-between;gap:14px;padding:10px 15px;border-top:1px solid var(--qm-line);font-size:13.5px;}' +
        '.qm-det__k{color:var(--qm-text-2);flex:none;}' +
        '.qm-det__v{text-align:right;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-det__v--mono{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:12.5px;}');
    }
    template() {
      const s = json(this.getAttribute('session'), {}) || {};
      const row = (k, v, mono) => '<div class="qm-det__row"><span class="qm-det__k">' + esc(k) + '</span>' +
        '<span class="qm-det__v' + (mono ? ' qm-det__v--mono' : '') + '">' + esc(v != null && v !== '' ? v : '—') + '</span></div>';
      return '<div class="qm-det" part="detail"><div class="qm-det__hd">' + esc(t('session.details.title')) + '</div>' +
        '<div class="qm-det__sec">' + esc(t('session.details.general')) + '</div>' +
        row(t('session.details.model'), s.model) +
        row(t('session.details.running_on'), s.env) +
        '<div class="qm-det__sec">' + esc(t('session.details.metadata')) + '</div>' +
        row(t('session.details.session_id'), s.id, true) +
        row(t('session.details.created'), s.created) +
        row(t('session.details.last_updated'), s.updated) +
        '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-det__row').forEach((r) => {
        r.addEventListener('click', () => {
          const v = r.querySelector('.qm-det__v');
          if (typeof navigator !== 'undefined' && navigator.clipboard && v) {
            navigator.clipboard.writeText(v.textContent || '').catch(() => {});
          }
          this.emit('copy', { value: v ? v.textContent : '' });
        });
      });
    }
    get session() { return json(this.getAttribute('session'), {}); }
    set session(v) { this.setAttribute('session', JSON.stringify(v || {})); }
  }

  /* ============================================================
     <qm-settings> — 设置页（外观三选项 / 用量订阅 / 集成 / 账号安全 /
     注销账号 / 隐私协议 / 服务条款 / 版本，全部实证文案）
     ============================================================ */
  class QmSettings extends Base {
    static get observedAttributes() { return ['appearance', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-set__hd{padding:14px 16px 6px;font-size:24px;font-weight:700;}' +
        '.qm-set__grp{margin:8px 12px;background:var(--qm-surface);border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);overflow:hidden;}' +
        '.qm-set__row{display:flex;justify-content:space-between;align-items:center;width:100%;padding:13px 15px;' +
        'font-size:14.5px;text-align:left;border-top:1px solid var(--qm-line);}' +
        '.qm-set__grp .qm-set__row:first-child{border-top:none;}' +
        '.qm-set__v{color:var(--qm-text-2);font-size:13px;}' +
        '.qm-seg{display:flex;background:var(--qm-surface-2);border-radius:8px;padding:2px;gap:2px;}' +
        '.qm-seg button{font-size:12px;padding:4px 10px;border-radius:6px;color:var(--qm-text-2);}' +
        '.qm-seg button.on{background:var(--qm-surface);color:var(--qm-text);font-weight:600;box-shadow:var(--qm-shadow);}' +
        '.qm-set__note{padding:12px 18px;font-size:11.5px;color:var(--qm-text-2);line-height:1.6;}');
    }
    template() {
      const cur = this.getAttribute('appearance') || 'system';
      const seg = ['dark', 'light', 'system'].map((v) =>
        '<button class="' + (cur === v ? 'on' : '') + '" data-appearance="' + v + '">' +
        esc(t('appearance.' + v)) + '</button>').join('');
      const row = (label, value, act) =>
        '<button class="qm-set__row" data-act="' + act + '"><span>' + esc(label) + '</span>' +
        '<span class="qm-set__v">' + esc(value || '') + ' ›</span></button>';
      return '<div class="qm-set__hd">' + esc(t('app.tab.me')) + '</div>' +
        '<div class="qm-set__grp"><div class="qm-set__row"><span>' + esc(t('settings.appearance')) + '</span>' +
        '<div class="qm-seg">' + seg + '</div></div></div>' +
        '<div class="qm-set__grp">' +
        row(t('usage.title') + ' · ' + t('billing.current_plan'), '', 'usage') +
        row(t('settings.integrations'), 'GitHub', 'integrations') +
        row(t('account_security.title'), '', 'account') +
        row(t('account_security.delete_account'), '', 'delete-account') + '</div>' +
        '<div class="qm-set__grp">' +
        row(t('about.privacy_agreement'), '', 'privacy') +
        row(t('about.service_agreement'), '', 'terms') +
        row(fmt(t('about.version'), ['0.2.8']), '', 'version') + '</div>' +
        '<div class="qm-set__note">' + esc(t('about.ai_generated_content_notice')) + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-appearance]').forEach((b) => {
        b.addEventListener('click', () => {
          this.setAttribute('appearance', b.dataset.appearance);
          this.emit('appearance-change', { appearance: b.dataset.appearance });
        });
      });
      root.querySelectorAll('[data-act]').forEach((b) => {
        b.addEventListener('click', () => this.emit('item', { action: b.dataset.act }));
      });
    }
  }

  /* ============================================================
     注册（Node/SSR：无 registry，静默跳过）
     ============================================================ */
  function register() {
    if (typeof customElements === 'undefined') return;
    components.forEach(([name, cls]) => {
      if (!customElements.get(name)) customElements.define(name, cls);
    });
  }

  def('qm-app', QmApp);
  def('qm-task-list', QmTaskList);
  def('qm-new-task', QmNewTask);
  def('qm-conversation', QmConversation);
  def('qm-composer', QmComposer);
  def('qm-approval', QmApproval);
  def('qm-sandbox-boot', QmSandboxBoot);
  def('qm-artifact', QmArtifact);
  def('qm-session-detail', QmSessionDetail);
  def('qm-settings', QmSettings);

  QI.Mobile = {
    WC,
    register,
    t, setLocale, STRINGS,
    locale: () => _locale,
    statusColor,
    version: '3.6.0'
  };
  register();

})();
