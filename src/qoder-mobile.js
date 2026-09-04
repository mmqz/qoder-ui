/* ============================================================
   Qoder Mobile Web Components（v3.5.0 移动端复现组件族）
   ============================================================
   依据《Qoder Mobile 移动端逆向分析报告》复现官方 App
   (com.qoder.mobile.cn v0.2.8) 的移动端界面：
   - 实证层：色板 la_accent_*（apktool res/values/colors.xml）、
     i18n 文案（assets/dynamic-content/qoder-mobile.zh.json 逐字）、
     信息架构与深链语义（AndroidManifest）
   - 推断层：微观间距/圆角集中在本文件 DESIGN_TOKENS，可校准
   组件（10）：
     qm-app / qm-task-list / qm-new-task / qm-conversation
     qm-composer / qm-approval / qm-sandbox-boot / qm-artifact
     qm-session-detail / qm-settings
   依赖：qoder-core.js → qoder-shadow.js（可独立于桌面端 CSS 使用）
   SSR 安全：Node 下可导入（customElements 缺失时静默跳过注册）
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
     qoder-mobile.zh.json / .en.json（报告第五章）
     ============================================================ */
  const STRINGS = {
    zh: {
      'app.tab.tasks': '任务', 'app.tab.sessions': '会话', 'app.tab.me': '我的',
      'new_task.cloud_hero_title': '想到就说，说干就干',
      'new_task.cloud_hero_subtitle': '我是小Q，你的全能工作搭子～ 在云端听候你的派遣，随时准备开工！',
      'new_task.choose_repo': '选择 Git 仓库', 'new_task.choose_branch': '选择分支',
      'new_task.default_branch': '默认分支', 'new_task.attachment.spec': 'Spec',
      'tasks.approval.enter_plan_mode.generate_spec': '生成 Spec',
      'tasks.approval.enter_plan_mode.run_directly': '直接执行',
      'tasks.approval.option.allow': '允许', 'tasks.approval.option.allow_once': '仅本次允许',
      'tasks.approval.option.allow_session': '本会话内始终允许', 'tasks.approval.option.reject': '拒绝',
      'tasks.approval.option.recommended': '推荐',
      'tasks.approval.feedback_placeholder': '告诉 Qoder 要做什么',
      'tasks.approval.feedback_reject_and_send': '拒绝并发送',
      'tasks.approval.approved': '已批准',
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
      'session.details.title': '详情', 'session.details.model': '模型',
      'session.details.running_on': '运行环境', 'session.details.created': '创建时间',
      'session.details.last_updated': '最后更新时间', 'session.details.session_id': '会话 ID',
      'session.details.id_copied': '已复制会话 ID',
      'composer.choose_mode': '选择模式', 'composer.choose_model': '选择模型',
      'composer.code_with_plan': '先规划再编码',
      'composer.attachment.photo': '图片', 'composer.attachment.file': '文件',
      'composer.attachment.camera': '相机',
      'markdown.code.default_title': '代码', 'markdown.mermaid.title': '流程图',
      'mermaid.loading': '正在渲染图表…',
      'appearance.dark': '深色', 'appearance.light': '浅色', 'appearance.system': '跟随系统',
      'settings.appearance': '外观', 'settings.integrations': '集成',
      'account_security.title': '账号与安全', 'account_security.delete_account': '注销账号',
      'usage.title': '用量', 'billing.current_plan': '当前套餐',
      'about.privacy_agreement': '隐私协议', 'about.service_agreement': '服务条款',
      'about.ai_generated_content_notice': '服务生成的所有内容均由人工智能生成，其生成内容的准确性和完整性无法保证，不代表我们的态度或观点。'
    },
    en: {
      'app.tab.tasks': 'Tasks', 'app.tab.sessions': 'Sessions', 'app.tab.me': 'Me',
      'new_task.cloud_hero_title': 'Say it, ship it',
      'new_task.cloud_hero_subtitle': "I'm Xiao Q, your all-purpose work buddy — ready in the cloud whenever you need me!",
      'new_task.choose_repo': 'Choose a Git repository', 'new_task.choose_branch': 'Choose a branch',
      'new_task.default_branch': 'Default branch', 'new_task.attachment.spec': 'Spec',
      'tasks.approval.enter_plan_mode.generate_spec': 'Generate Spec',
      'tasks.approval.enter_plan_mode.run_directly': 'Run directly',
      'tasks.approval.option.allow': 'Allow', 'tasks.approval.option.allow_once': 'Allow once',
      'tasks.approval.option.allow_session': 'Always allow in this session', 'tasks.approval.option.reject': 'Reject',
      'tasks.approval.option.recommended': 'Recommended',
      'tasks.approval.feedback_placeholder': 'Tell Qoder what to do',
      'tasks.approval.feedback_reject_and_send': 'Reject and send',
      'tasks.approval.approved': 'Approved',
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
      'session.details.title': 'Details', 'session.details.model': 'Model',
      'session.details.running_on': 'Running on', 'session.details.created': 'Created',
      'session.details.last_updated': 'Last updated', 'session.details.session_id': 'Session ID',
      'session.details.id_copied': 'Session ID copied',
      'composer.choose_mode': 'Choose mode', 'composer.choose_model': 'Choose model',
      'composer.code_with_plan': 'Plan before coding',
      'composer.attachment.photo': 'Photos', 'composer.attachment.file': 'Files',
      'composer.attachment.camera': 'Camera',
      'markdown.code.default_title': 'Code', 'markdown.mermaid.title': 'Diagram',
      'mermaid.loading': 'Rendering diagram…',
      'appearance.dark': 'Dark', 'appearance.light': 'Light', 'appearance.system': 'System',
      'settings.appearance': 'Appearance', 'settings.integrations': 'Integrations',
      'account_security.title': 'Account & Security', 'account_security.delete_account': 'Delete account',
      'usage.title': 'Usage', 'billing.current_plan': 'Current plan',
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
     Design Tokens
     实证：la_accent_* 四状态色 + 启动图标底色 #111113（报告第六章）
     推断：面层/圆角/字号（移动端通用规格，集中在常量便于校准）
     ============================================================ */
  const TOKENS = [
    '--qm-accent-running:#2FBF71',
    '--qm-accent-completed:#3B82F6',
    '--qm-accent-attention:#F5A623',
    '--qm-accent-error:#EF4444',
    '--qm-brand:#111113',
    '--qm-bg:#F6F7F8', '--qm-surface:#FFFFFF', '--qm-surface-2:#F0F1F2',
    '--qm-text:#17181A', '--qm-text-2:#6B7075', '--qm-line:#E4E6E8',
    '--qm-primary:#1F6C92',
    '--qm-radius:14px', '--qm-radius-sm:10px',
    '--qm-font:-apple-system,BlinkMacSystemFont,"PingFang SC","Noto Sans SC",Roboto,"Segoe UI",sans-serif',
    '--qm-shadow:0 1px 3px rgba(17,17,19,.06),0 4px 16px rgba(17,17,19,.05)'
  ].join(';') + ';';
  const TOKENS_DARK = [
    '--qm-bg:#0E0F10', '--qm-surface:#1A1B1D', '--qm-surface-2:#232527',
    '--qm-text:#F2F3F4', '--qm-text-2:#9A9FA4', '--qm-line:#2C2E31',
    '--qm-primary:#5FA8CC', '--qm-brand:#FFFFFF',
    '--qm-shadow:0 1px 3px rgba(0,0,0,.4),0 4px 16px rgba(0,0,0,.35)'
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
  const statusColor = (s) => ({
    running: 'var(--qm-accent-running)', completed: 'var(--qm-accent-completed)',
    attention: 'var(--qm-accent-attention)', error: 'var(--qm-accent-error)'
  }[s] || 'var(--qm-text-2)');

  /* ============================================================
     <qm-app> — 应用壳：底部三 Tab（任务/会话/我的）
     深链语义对应 qodercn://tasks|sessions（报告 7.1）
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
        'color:var(--qm-text-2);font-size:11px;}' +
        '.qm-tab.on{color:var(--qm-primary);font-weight:600;}' +
        '.qm-tab__icon{width:22px;height:22px;display:block;}');
    }
    template() {
      const page = this.getAttribute('page') || 'tasks';
      const tabs = [['tasks', 'app.tab.tasks'], ['sessions', 'app.tab.sessions'], ['me', 'app.tab.me']];
      const tabbar = tabs.map(([id, key]) => {
        const on = page === id;
        return '<button class="qm-tab' + (on ? ' on' : '') + '" data-page="' + id + '" part="tab">' +
          '<svg class="qm-tab__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
          'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="' +
          ({ tasks: 'M4 5h16M4 12h10M4 19h7', sessions: 'M4 5h16v11H8l-4 4V5z', me: 'M12 4a4 4 0 110 8 4 4 0 010-8zM4 20c1.5-3.5 4.5-5 8-5s6.5 1.5 8 5' }[id]) +
          '"/></svg>' +
          '<span class="qm-tab__label">' + esc(t(key)) + '</span></button>';
      }).join('');
      return '<div class="qm-app" part="app">' +
        '<div class="qm-app__body">' +
        '<slot name="page-tasks" style="display:' + (page === 'tasks' ? 'block' : 'none') + '"></slot>' +
        '<slot name="page-sessions" style="display:' + (page === 'sessions' ? 'block' : 'none') + '"></slot>' +
        '<slot name="page-me" style="display:' + (page === 'me' ? 'block' : 'none') + '"></slot>' +
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
     <qm-task-list> — 任务列表（活跃/已关闭 + 四状态点）
     tasks = [{id,title,status,repo,updated}]
     ============================================================ */
  class QmTaskList extends Base {
    static get observedAttributes() { return ['tasks', 'title']; }
    static get hostCss() {
      return baseCss(
        '.qm-hd{padding:14px 16px 6px;}' +
        '.qm-hd__t{font-size:24px;font-weight:700;letter-spacing:.2px;}' +
        '.qm-metrics{display:flex;gap:14px;padding:2px 16px 10px;font-size:12.5px;color:var(--qm-text-2);}' +
        '.qm-metrics b{color:var(--qm-text);font-weight:600;}' +
        '.qm-list{padding:0 12px 16px;display:flex;flex-direction:column;gap:10px;}' +
        '.qm-card{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:13px 14px;box-shadow:var(--qm-shadow);text-align:left;width:100%;}' +
        '.qm-card__top{display:flex;align-items:center;gap:8px;}' +
        '.qm-dot{width:8px;height:8px;border-radius:50%;flex:none;}' +
        '.qm-card__title{font-weight:600;font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-card__meta{margin-top:5px;font-size:12.5px;color:var(--qm-text-2);display:flex;gap:10px;}' +
        '.qm-empty{padding:44px 0;text-align:center;color:var(--qm-text-2);font-size:13.5px;}');
    }
    template() {
      const tasks = json(this.getAttribute('tasks'), []) || [];
      const active = tasks.filter((x) => x.status === 'running' || x.status === 'attention').length;
      const closed = tasks.length - active;
      const cards = tasks.map((task) => {
        const st = esc(task.status || 'running');
        return '<button class="qm-card" data-id="' + esc(task.id != null ? task.id : '') + '" part="card">' +
          '<div class="qm-card__top"><span class="qm-dot" style="background:' + statusColor(st) + '"></span>' +
          '<span class="qm-card__title">' + esc(task.title || '') + '</span></div>' +
          '<div class="qm-card__meta">' +
          (task.repo ? '<span>' + esc(task.repo) + (task.branch ? ' · ' + esc(task.branch) : '') + '</span>' : '') +
          (task.updated ? '<span>' + esc(task.updated) + '</span>' : '') + '</div></button>';
      }).join('');
      return '<div class="qm-hd"><div class="qm-hd__t">' + esc(this.getAttribute('title') || t('app.tab.tasks')) + '</div></div>' +
        '<div class="qm-metrics"><span>' + esc(t('workspace.metric.active')) + ' <b>' + active + '</b></span>' +
        '<span>' + esc(t('workspace.metric.closed')) + ' <b>' + closed + '</b></span></div>' +
        '<div class="qm-list">' + (cards || '<div class="qm-empty">' + esc(t('artifact.empty')) + '</div>') + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-card').forEach((c) => {
        c.addEventListener('click', () => this.emit('task-open', { id: c.dataset.id }));
      });
    }
    get tasks() { return json(this.getAttribute('tasks'), []); }
    set tasks(v) { this.setAttribute('tasks', JSON.stringify(v || [])); }
  }

  /* ============================================================
     <qm-new-task> — 新建任务（hero + 描述 + 仓库/分支 + 模式）
     实证文案：cloud_hero_title / cloud_hero_subtitle（new_task.*）
     ============================================================ */
  class QmNewTask extends Base {
    static get observedAttributes() { return ['repos', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-new{padding:10px 16px 20px;}' +
        '.qm-hero__t{font-size:22px;font-weight:800;letter-spacing:.3px;}' +
        '.qm-hero__s{margin-top:6px;font-size:13px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-input{margin-top:16px;background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:12px 14px;min-height:110px;display:block;width:100%;font-size:15px;line-height:1.6;color:var(--qm-text);' +
        'resize:none;outline:none;}' +
        '.qm-input:focus{border-color:var(--qm-primary);}' +
        '.qm-pick{display:flex;gap:10px;margin-top:10px;}' +
        '.qm-pick__item{flex:1;background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius-sm);' +
        'padding:10px 12px;font-size:13px;color:var(--qm-text-2);display:flex;justify-content:space-between;align-items:center;}' +
        '.qm-pick__item b{color:var(--qm-text);font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%;}' +
        '.qm-modes{display:flex;gap:10px;margin-top:12px;}' +
        '.qm-mode{flex:1;border:1px solid var(--qm-line);border-radius:var(--qm-radius-sm);padding:11px 10px;' +
        'text-align:center;font-size:14px;color:var(--qm-text-2);background:var(--qm-surface);}' +
        '.qm-mode.on{border-color:var(--qm-primary);color:var(--qm-primary);font-weight:600;background:color-mix(in srgb,var(--qm-primary) 8%,transparent);}' +
        '.qm-submit{margin-top:14px;width:100%;background:var(--qm-brand);color:var(--qm-bg);border-radius:var(--qm-radius);' +
        'padding:14px;font-size:16px;font-weight:700;}' +
        ':host([theme="dark"]) .qm-submit{background:var(--qm-primary);color:#fff;}');
    }
    template() {
      const repos = json(this.getAttribute('repos'), []) || [];
      return '<div class="qm-new">' +
        '<div class="qm-hero__t">' + esc(t('new_task.cloud_hero_title')) + '</div>' +
        '<div class="qm-hero__s">' + esc(t('new_task.cloud_hero_subtitle')) + '</div>' +
        '<textarea class="qm-input" part="input" placeholder="' + esc(t('workspace.feedback')) + '"></textarea>' +
        '<div class="qm-pick">' +
        '<button class="qm-pick__item" data-pick="repo"><b>' + esc(t('new_task.choose_repo')) + '</b><span>›</span></button>' +
        '<button class="qm-pick__item" data-pick="branch"><b>' + esc(t('new_task.default_branch')) + '</b><span>›</span></button></div>' +
        '<div class="qm-modes">' +
        '<button class="qm-mode on" data-mode="spec">' + esc(t('tasks.approval.enter_plan_mode.generate_spec')) + '</button>' +
        '<button class="qm-mode" data-mode="direct">' + esc(t('tasks.approval.enter_plan_mode.run_directly')) + '</button></div>' +
        '<button class="qm-submit" part="submit">' + esc(t('new_task.cloud_hero_title')) + '</button></div>';
    }
    _bind(root) {
      let mode = 'spec';
      root.querySelectorAll('.qm-mode').forEach((m) => {
        m.addEventListener('click', () => {
          root.querySelectorAll('.qm-mode').forEach((x) => x.classList.remove('on'));
          m.classList.add('on');
          mode = m.dataset.mode;
          this.emit('mode-change', { mode });
        });
      });
      root.querySelectorAll('.qm-pick__item').forEach((p) => {
        p.addEventListener('click', () => {
          const repo = repos[0] || {};
          this.emit('pick', { kind: p.dataset.pick, repos });
          if (p.dataset.pick === 'repo' && repo.name) {
            p.querySelector('b').textContent = repo.name;
            this._repo = repo.name;
          } else if (p.dataset.pick === 'branch' && (repo.branch || repo.defaultBranch)) {
            p.querySelector('b').textContent = repo.branch || repo.defaultBranch;
            this._branch = repo.branch || repo.defaultBranch;
          }
        });
      });
      const ta = root.querySelector('.qm-input');
      root.querySelector('.qm-submit').addEventListener('click', () => {
        this.emit('submit', { text: ta.value, mode, repo: this._repo || null, branch: this._branch || null });
      });
    }
  }

  /* ============================================================
     <qm-conversation> — 会话对话流
     messages = [{role:'user'|'assistant', text, thinking, sources,
                  agents, experts, todoDone, todoTotal, stopped}]
     实证组件：深度思考 / 来源 / turn_activity / 已复制（conversation.*）
     ============================================================ */
  class QmConversation extends Base {
    static get observedAttributes() { return ['messages', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-conv{padding:12px 14px 8px;display:flex;flex-direction:column;gap:12px;}' +
        '.qm-msg{display:flex;gap:8px;max-width:100%;}' +
        '.qm-msg__avatar{width:30px;height:30px;border-radius:9px;background:var(--qm-brand);color:var(--qm-bg);' +
        'display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:800;flex:none;}' +
        ':host([theme="dark"]) .qm-msg__avatar{background:var(--qm-primary);color:#fff;}' +
        '.qm-bubble{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:10px 13px;font-size:14.5px;line-height:1.65;min-width:0;}' +
        '.qm-msg--user{flex-direction:row-reverse;}' +
        '.qm-msg--user .qm-bubble{background:var(--qm-primary);border-color:var(--qm-primary);color:#fff;}' +
        '.qm-think{margin-top:8px;border-left:3px solid var(--qm-line);padding:4px 0 4px 10px;}' +
        '.qm-think__hd{font-size:12px;color:var(--qm-text-2);cursor:pointer;}' +
        '.qm-think__bd{margin-top:4px;font-size:12.5px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-think[data-open] .qm-think__bd{display:block;} .qm-think__bd{display:none;}' +
        '.qm-pills{display:flex;flex-wrap:wrap;gap:6px;margin-top:8px;}' +
        '.qm-pill{font-size:11.5px;color:var(--qm-text-2);background:var(--qm-surface-2);border-radius:999px;padding:3px 9px;}' +
        '.qm-copy{margin-top:8px;font-size:12px;color:var(--qm-text-2);}' +
        '.qm-stopped{font-size:12px;color:var(--qm-text-2);padding:2px 13px;}' +
        '.qm-ready{padding:34px 0;text-align:center;color:var(--qm-text-2);font-size:13.5px;}');
    }
    template() {
      const msgs = json(this.getAttribute('messages'), []) || [];
      if (!msgs.length) {
        return '<div class="qm-conv"><div class="qm-ready">' + esc(t('workspace.empty_session')) + '</div></div>';
      }
      const body = msgs.map((m, i) => {
        const user = m.role === 'user';
        let inner = esc(m.text || '');
        inner += '<div class="qm-pills">' +
          (m.thinking ? '<button class="qm-pill qm-pill--think" data-i="' + i + '">◈ ' + esc(t('conversation.thinking.title')) + '</button>' : '') +
          (m.sources ? '<span class="qm-pill">' + esc(t('conversation.sources.title')) + ' · ' + esc(m.sources) + '</span>' : '') +
          (m.agents ? '<span class="qm-pill">' + fmt(t('conversation.turn_activity.agents_count'), [m.agents]) + '</span>' : '') +
          (m.experts ? '<span class="qm-pill">' + fmt(t('conversation.turn_activity.experts_count'), [m.experts]) + '</span>' : '') +
          (m.todoTotal ? '<span class="qm-pill">☑ ' + fmt(t('conversation.turn_activity.todo_progress'), [m.todoDone || 0, m.todoTotal]) + '</span>' : '') +
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
     <qm-composer> — 输入区（附件/模式/模型/语音）
     disabled 态复现 cloud_sandbox_boot.composer_disabled 文案
     ============================================================ */
  class QmComposer extends Base {
    static get observedAttributes() { return ['disabled', 'mode', 'model', 'placeholder', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-comp{border-top:1px solid var(--qm-line);background:var(--qm-surface);padding:8px 12px calc(10px + env(safe-area-inset-bottom,0));}' +
        '.qm-comp__pre{font-size:11.5px;color:var(--qm-accent-attention);padding:0 2px 6px;}' +
        '.qm-comp__box{display:flex;gap:8px;align-items:flex-end;background:var(--qm-surface-2);' +
        'border-radius:var(--qm-radius);padding:9px 10px;}' +
        '.qm-comp__ta{flex:1;border:none;background:none;outline:none;resize:none;font-size:15px;line-height:1.5;' +
        'color:var(--qm-text);min-height:22px;max-height:110px;}' +
        '.qm-comp__send{width:32px;height:32px;border-radius:10px;background:var(--qm-brand);color:var(--qm-bg);' +
        'display:flex;align-items:center;justify-content:center;font-size:15px;flex:none;}' +
        ':host([theme="dark"]) .qm-comp__send{background:var(--qm-primary);color:#fff;}' +
        '.qm-comp__send[disabled]{opacity:.4;cursor:default;}' +
        '.qm-comp__row{display:flex;gap:4px;margin-top:7px;}' +
        '.qm-act{font-size:12px;color:var(--qm-text-2);padding:5px 9px;border-radius:8px;white-space:nowrap;flex:none;}' +
        '.qm-act:hover{background:var(--qm-surface-2);color:var(--qm-text);}');
    }
    template() {
      const disabled = this.hasAttribute('disabled');
      const mode = this.getAttribute('mode') || '';
      const model = this.getAttribute('model') || '';
      const ph = this.getAttribute('placeholder') ||
        (disabled ? t('cloud_sandbox_boot.composer_disabled') : t('workspace.feedback'));
      return '<div class="qm-comp" part="composer">' +
        (disabled ? '<div class="qm-comp__pre">◌ ' + esc(t('cloud_sandbox_boot.composer_disabled')) + '</div>' : '') +
        '<div class="qm-comp__box"><textarea class="qm-comp__ta" rows="1" part="textarea"' +
        (disabled ? ' disabled' : '') + ' placeholder="' + esc(ph) + '"></textarea>' +
        '<button class="qm-comp__send" part="send"' + (disabled ? ' disabled' : '') + '>↑</button></div>' +
        '<div class="qm-comp__row">' +
        '<button class="qm-act" data-act="photo">🖼 ' + esc(t('composer.attachment.photo')) + '</button>' +
        '<button class="qm-act" data-act="camera">📷 ' + esc(t('composer.attachment.camera')) + '</button>' +
        '<button class="qm-act" data-act="file">📎 ' + esc(t('composer.attachment.file')) + '</button>' +
        '<button class="qm-act" data-act="voice">🎙</button>' +
        (mode ? '<button class="qm-act" data-act="mode">' + esc(mode) + '</button>' : '') +
        (model ? '<button class="qm-act" data-act="model">' + esc(model) + '</button>' : '') +
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
        a.addEventListener('click', () => this.emit('act', { kind: a.dataset.act }));
      });
    }
  }

  /* ============================================================
     <qm-approval> — 审批面板（Spec 双按钮 / 四级操作审批）
     实证文案：tasks.approval.option.*（报告 5.2）
     kind="spec": 生成 Spec / 直接执行
     kind="action": 允许(推荐) / 仅本次允许 / 本会话内始终允许 / 拒绝
     ============================================================ */
  class QmApproval extends Base {
    static get observedAttributes() { return ['kind', 'open', 'title', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-appr{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'box-shadow:var(--qm-shadow);overflow:hidden;}' +
        '.qm-appr__hd{padding:13px 15px 4px;font-weight:700;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;}' +
        '.qm-appr__bd{padding:8px 15px 14px;font-size:13px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-appr__btns{display:flex;gap:9px;padding:0 15px 14px;}' +
        '.qm-appr__b{flex:1;padding:11px 0;border-radius:var(--qm-radius-sm);font-size:14px;font-weight:600;}' +
        '.qm-appr__b--primary{background:var(--qm-brand);color:var(--qm-bg);}' +
        ':host([theme="dark"]) .qm-appr__b--primary{background:var(--qm-primary);color:#fff;}' +
        '.qm-appr__b--ghost{background:var(--qm-surface-2);color:var(--qm-text);}' +
        '.qm-opt{display:flex;align-items:center;gap:9px;width:100%;padding:12px 15px;font-size:14.5px;text-align:left;' +
        'border-top:1px solid var(--qm-line);}' +
        '.qm-opt:hover{background:var(--qm-surface-2);}' +
        '.qm-opt__rec{font-size:10.5px;color:var(--qm-accent-completed);border:1px solid currentColor;border-radius:999px;padding:0 6px;}' +
        '.qm-fb{padding:0 15px 6px;}' +
        '.qm-fb__ta{width:100%;background:var(--qm-surface-2);border:1px solid var(--qm-line);border-radius:var(--qm-radius-sm);' +
        'padding:9px 11px;font-size:13.5px;color:var(--qm-text);outline:none;resize:none;}' +
        '.qm-fb__send{margin-top:7px;width:100%;padding:10px;border-radius:var(--qm-radius-sm);font-size:13.5px;font-weight:600;' +
        'background:var(--qm-accent-error);color:#fff;}' +
        '.qm-appr--hidden{display:none;}');
    }
    template() {
      const kind = this.getAttribute('kind') || 'action';
      const open = this.getAttribute('open') !== 'false';
      const title = this.getAttribute('title') || (kind === 'spec' ? t('new_task.attachment.spec') : t('tasks.approval.option.allow'));
      const rec = '<span class="qm-opt__rec">' + esc(t('tasks.approval.option.recommended')) + '</span>';
      const opts = [
        ['allow', t('tasks.approval.option.allow'), rec],
        ['allow_once', t('tasks.approval.option.allow_once'), ''],
        ['allow_session', t('tasks.approval.option.allow_session'), '']
      ].map(([v, label, badge]) =>
        '<button class="qm-opt" data-opt="' + v + '">' + esc(label) + badge + '</button>').join('');
      return '<div class="qm-appr' + (open ? '' : ' qm-appr--hidden') + '" part="panel">' +
        '<div class="qm-appr__hd"><span>' + esc(title) + '</span></div>' +
        (kind === 'spec'
          ? '<div class="qm-appr__btns">' +
            '<button class="qm-appr__b qm-appr__b--primary" data-spec="generate">' + esc(t('tasks.approval.enter_plan_mode.generate_spec')) + '</button>' +
            '<button class="qm-appr__b qm-appr__b--ghost" data-spec="direct">' + esc(t('tasks.approval.enter_plan_mode.run_directly')) + '</button></div>'
          : '<div class="qm-appr__bd">' + esc(t('tasks.approval.feedback_placeholder')) + '</div>' +
            opts +
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
        '.qm-stage--done .qm-stage__ic{background:var(--qm-accent-running);border-color:var(--qm-accent-running);color:#fff;}' +
        '.qm-stage--run .qm-stage__ic{border-color:var(--qm-accent-running);color:var(--qm-accent-running);}' +
        '.qm-stage--fail .qm-stage__ic{background:var(--qm-accent-error);border-color:var(--qm-accent-error);color:#fff;}' +
        '.qm-stage__tx{font-size:14px;}' +
        '.qm-stage--run .qm-stage__tx{color:var(--qm-accent-running);font-weight:600;}' +
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
     <qm-artifact> — 产物页（预览/源码切换 + 最终交付/中间编辑）
     files = [{name,kind,section:'presented'|'changed',size}]
     ============================================================ */
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
        '.qm-file{display:flex;align-items:center;gap:9px;width:100%;padding:11px 16px;text-align:left;' +
        'border-bottom:1px solid var(--qm-line);}' +
        '.qm-file__ic{width:30px;height:30px;border-radius:8px;background:var(--qm-surface-2);display:flex;' +
        'align-items:center;justify-content:center;font-size:12px;color:var(--qm-text-2);flex:none;}' +
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
          return '<div class="qm-sec">' + esc(t(key)) + '</div>' + list.map((f) =>
            '<button class="qm-file" data-name="' + esc(f.name || '') + '">' +
            '<span class="qm-file__ic">' + esc((f.kind || f.name || '?').slice(0, 3).toUpperCase()) + '</span>' +
            '<span style="min-width:0"><span class="qm-file__nm">' + esc(f.name || '') + '</span><br>' +
            '<span class="qm-file__meta">' + esc(f.size || '') + '</span></span></button>').join('');
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
     <qm-session-detail> — 会话详情（session.details.* 实证文案）
     session = {id, model, env, created, updated}
     ============================================================ */
  class QmSessionDetail extends Base {
    static get observedAttributes() { return ['session', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-det{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);overflow:hidden;}' +
        '.qm-det__hd{padding:12px 15px 6px;font-weight:700;font-size:15px;}' +
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
        row(t('session.details.session_id'), s.id, true) +
        row(t('session.details.model'), s.model) +
        row(t('session.details.running_on'), s.env) +
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
     <qm-settings> — 设置页（外观三选项 / 账号安全 / 用量订阅 /
     隐私协议 / 服务条款，全部实证文案）
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
        row(t('about.service_agreement'), '', 'terms') + '</div>' +
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
    version: '3.5.0'
  };
  register();

})();
