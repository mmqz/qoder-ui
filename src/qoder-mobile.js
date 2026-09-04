/* ============================================================
   Qoder Mobile Web Components（v3.7.0 移动端复现组件族·真机对齐版）
   ============================================================
   v3.7.0 新增（strings.xml 逐字实证）：
   1. qm-session-list 工作区会话列表（第三 tab）：活跃/已关闭分组、
      三指标卡（活跃/已关闭/设备）、重命名对话框（任务名称/确定）、
      加载态（正在加载会话…）。
   2. composer plus 扩展面板（panel="options"）：入口行 模式/模型/Spec
      + 四组内置条目 — 连接器 3（电脑操作/QoderWork 连接器/
      企业技能市场助手）、技能 3（DOCX/PDF/XLSX + 副标题）、
      插件 5（咨询交付/股票研究/市场营销/私募股权/产品管理）、
      文件 2（~/文档/AIproduct_analysis 等）+ 四组空态文案。
   3. qm-mermaid 流程图卡：实证文案（流程图/渲染图表/正在渲染图表…/
      该图已失效，请返回后重新打开。）+ 净室迷你渲染器
      （graph TD/LR 子集：[]/()/{} 三种节点、四种边、边标签，
      Kahn 分层防环，SVG 输出全部经 esc()，零依赖）。
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
   组件（12）：qm-app / qm-task-list / qm-new-task / qm-conversation
     qm-composer / qm-approval / qm-sandbox-boot / qm-artifact
     qm-session-detail / qm-settings / qm-session-list / qm-mermaid
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
      'new_task.prompt.video': '把"梯度下降"做成一段动画讲解视频',
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
      'tasks.empty.description': '"点击 + 启动任务，或在 Qoder CLI 中开启 Remote Control 同步任务"',
      'tasks.approval.enter_plan_mode.description': '你可以选择先生成并审核 Spec，再开始执行；也可以跳过 Spec，直接开始执行任务。Spec 用于明确任务范围和执行规范，帮助确认方向是否正确。',
      'tasks.approval.enter_plan_mode.generate_spec': '生成 Spec',
      'tasks.approval.enter_plan_mode.run_directly': '直接执行',
      'tasks.approval.option.allow': '允许', 'tasks.approval.option.allow_once': '仅本次允许',
      'tasks.approval.option.allow_session': '本会话内始终允许', 'tasks.approval.option.reject': '拒绝',
      'tasks.approval.option.recommended': '推荐',
      'tasks.approval.feedback_placeholder': '告诉 Qoder 要做什么',
      'tasks.approval.feedback_reject_and_send': '拒绝并发送',
      'tasks.approval.approved': '已批准',
      'tasks.approval.pending': '等待审批',
      'approval.title.run_command': 'Qoder 请求执行命令',
      'approval.title.edit': 'Qoder 请求编辑文件',
      'approval.title.mcp': 'Qoder 请求执行 MCP 工具',
      'approval.title.enter_plan_mode': '执行方式选择',
      'tool.bash': '执行命令', 'tool.read': '读取', 'tool.edit': '编辑',
      'tool.search': '搜索', 'tool.web_search': '网页搜索', 'tool.web_fetch': '网页抓取',
      'tool.image': '生成图片', 'tool.skill': '技能', 'tool.mcp': 'MCP',
      'tool.todo': '更新待办', 'tool.subagent': '子智能体', 'tool.plan': '请求进入 Plan 模式',
      'tool.status.running': '运行中', 'tool.status.completed': '已完成',
      'tool.status.failed': '失败', 'tool.status.pending': '等待中',
      'tool.group.tools': '运行 %d 个工具', 'tool.group.files': '读取 %d 个文件',
      'tool.group.writes': '写入 %d 个文件', 'tool.group.ops': '已处理 %d 个操作',
      'todo.title': '待办列表', 'todo.empty': '暂无待办项。',
      'workspace.metric.active': '活跃', 'workspace.metric.closed': '已关闭',
      'workspace.feedback': '输入消息或按住说话…', 'workspace.interrupt_session': '终止回复',
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
      'about.ai_generated_content_notice': '服务生成的所有内容均由人工智能生成，其生成内容的准确性和完整性无法保证，不代表我们的态度或观点。',
      /* ---- v3.7.0 composer.plus 扩展面板（composer_plus_* 逐字） ---- */
      'composer.plus.mode': '模式', 'composer.plus.model': '模型',
      'composer.plus.spec': 'Spec',
      'composer.plus.connectors': '连接器', 'composer.plus.skills': '技能',
      'composer.plus.plugins': '插件', 'composer.plus.files': '文件',
      'composer.plus.connectors_empty': '暂无连接器。请在 QoderWork 桌面端 App 中添加。',
      'composer.plus.skills_empty': '暂无技能。请在 QoderWork 桌面端 App 中添加。',
      'composer.plus.plugins_empty': '暂无插件。请在 QoderWork 桌面端 App 中添加。',
      'composer.plus.files_empty': '暂无文件。请在 QoderWork 桌面端 App 中添加。',
      'composer.plus.connector.computer_use': '电脑操作',
      'composer.plus.connector.qoderwork': 'QoderWork 连接器',
      'composer.plus.connector.market': '企业技能市场助手',
      'composer.plus.skill.docx': 'DOCX',
      'composer.plus.skill.docx_subtitle': '当用户需要创建、读取、编辑或处理 Word 文件时使用此技能',
      'composer.plus.skill.pdf': 'PDF',
      'composer.plus.skill.pdf_subtitle': '当用户需要处理 PDF 时使用此技能',
      'composer.plus.skill.xlsx': 'XLSX',
      'composer.plus.skill.xlsx_subtitle': '当电子表格文件是主要输入和输出时使用此技能',
      'composer.plus.plugin.consulting': '咨询交付',
      'composer.plus.plugin.consulting_subtitle': '覆盖七个核心场景的全流程管理咨询工具包',
      'composer.plus.plugin.equity': '股票研究',
      'composer.plus.plugin.equity_subtitle': '面向卖方和买方分析师的端到端股票研究工具包',
      'composer.plus.plugin.marketing': '市场营销',
      'composer.plus.plugin.marketing_subtitle': '覆盖文案写作和广告合规的全链路营销工具包',
      'composer.plus.plugin.pe': '私募股权',
      'composer.plus.plugin.pe_subtitle': '覆盖项目筛选和尽调清单的 PE/VC 端到端工具包',
      'composer.plus.plugin.pm': '产品管理',
      'composer.plus.plugin.pm_subtitle': '覆盖八个核心工作流的端到端产品管理工具包',
      'composer.plus.file.ai_analysis': '~/文档/AIproduct_analysis',
      'composer.plus.file.logo_design': '~/图片/logo_design',
      /* ---- v3.7.0 工作区会话列表（workspace_* 逐字） ---- */
      'workspace.title': '工作区',
      'workspace.section.active': '活跃', 'workspace.section.closed': '已关闭',
      'workspace.metric.devices': '设备',
      'workspace.loading': '正在加载会话…',
      'workspace.preparing': '正在准备工作区…',
      'workspace.rename': '重命名', 'workspace.rename_title': '任务名称',
      'workspace.rename_agree': '确定',
      'workspace.open_settings': '打开设置',
      'workspace.read_file': '读取 %d 个文件',
      'workspace.read_files': '读取 %d 个文件',
      /* ---- v3.7.0 mermaid 流程图卡（conversation_mermaid_* / cd_mermaid_*） ---- */
      'mermaid.render': '渲染图表',
      'mermaid.unavailable': '该图已失效，请返回后重新打开。',
      /* ---- v3.8.0 审批状态机逐字（approval_*） ---- */
      'approval.pending': '等待审批', 'approval.approved': '已批准',
      'approval.rejected': '已拒绝', 'approval.submitted': '已提交',
      'approval.submitting': '提交中…',
      'approval.execution_lead': '允许执行',
      'approval.feedback.reject': '拒绝',
      'approval.title.permission_required': '需要权限',
      'approval.title.request': '请求审批',
      /* ---- v3.8.0 产物异常/回退态逐字（artifact_*） ---- */
      'artifact.loading': '加载中…', 'artifact.load_failed': '加载失败',
      'artifact.list_load_failed': '产物列表加载失败',
      'artifact.download_failed': '产物下载失败',
      'artifact.retry': '重试', 'artifact.not_found': '产物不存在或已过期',
      'artifact.preview_unavailable': '暂不支持预览',
      'artifact.open_external_unavailable': '没有可用于打开此文件的兼容应用。',
      'artifact.remote_local_resource_unavailable': '该产物暂无法在手机端查看，请在任务运行设备上打开。',
      'artifact.share_failed': '无法分享文件',
      'artifact.share_restricted': '受企业安全策略限制，无法分享或下载',
      'artifact.stale_fallback': '已显示最近可用版本',
      'artifact.too_large_download_to_view': '请下载后查看此文件',
      'artifact.low_memory_download_to_view': '当前内存不足，请下载后查看此文件',
      'artifact.pdf_page_description': '%@，第 %@ 页，共 %@ 页',
      /* ---- v3.8.0 通用按钮与错误文案（common_* / error_* 逐字） ---- */
      'common.cancel': '取消', 'common.confirm': '确认', 'common.close': '关闭',
      'common.ok': '好', 'common.retry': '重试', 'common.clear_all': '清空',
      'common.open_on_phone': '在手机上打开', 'common.error': '错误',
      'error.account_banned': '账户已被禁用，请联系客服',
      'error.captcha_failed': '验证失败，请重试',
      'error.device_not_registered': '设备未注册',
      'error.device_offline_message_not_sent': '设备已离线。消息未发送。',
      'error.environment_offline': '所选环境已离线，请重新连接或选择其他环境。',
      'error.environment_session_limit_reached': '已达到环境会话数量上限，请删除旧会话后重试',
      'error.feedback_failed': '提交失败，请重试',
      'error.generic': '出了点问题，请重试',
      'error.google_no_credential': '当前设备没有可用的 Google 账号。',
      'error.google_sign_in_failed': 'Google 登录失败，请重试。',
      'error.google_sign_in_interrupted': 'Google 登录被中断，请重试。',
      'error.google_sign_in_unavailable': '当前设备无法使用 Google 登录。',
      'error.network_unavailable': '网络连接失败，请检查网络后重试',
      'error.no_permission': '无权访问此会话',
      'error.page_not_found': '页面不存在',
      'error.page_not_found_with_path': '页面不存在：%@',
      'error.service_unavailable': '服务暂时不可用，请稍后重试',
      'error.session_busy': '会话正在忙碌，请稍后重试',
      'error.session_expired': '登录已过期，请重新登录',
      'error.session_not_found': '会话已不存在',
      'error.sign_in_failed': '登录失败，请重试',
      'error.sign_in_timeout': '登录超时，请重试',
      'error.something_went_wrong': '出了点问题',
      'error.try_again': '请重试。',
      /* ---- v3.8.0 设置屏逐字（settings_*） ---- */
      'settings.title': '设置', 'settings.language': '语言',
      'settings.notification': '通知', 'settings.privacy': '隐私',
      'settings.billing': '账单', 'settings.machine': '设备', 'settings.usage': '用量',
      'settings.edit_profile': '编辑资料', 'settings.feedback': '反馈',
      'settings.check_update': '检查更新', 'settings.cache_cleanup': '清理缓存',
      'settings.sign_out': '退出登录',
      'settings.sign_out_confirm_title': '退出登录',
      'settings.sign_out_confirm_message': '确定要退出登录吗？',
      'settings.guest': '访客', 'settings.plan_community': '社区版',
      'settings.placeholder': '此功能在初始框架中仍为占位项。',
      'settings.about': '关于 Qoder', 'settings.about_cn': '关于 Qoder CN',
      'settings.device_qr.accessibility': '配对 Qoder 眼镜',
      'settings.device_qr.caption': '支持与智能眼镜配对',
      'settings.device_qr.confirmed': '眼镜已配对',
      'settings_integrations.title': '集成',
      'settings_integrations.github_title': 'GitHub',
      'settings_integrations.github_connect': '连接 GitHub', 'settings_integrations.github_connected': '已连接',
      'settings_integrations.github_connecting': '连接中…',
      'settings_integrations.github_disconnect': '断开 GitHub 连接',
      'settings_integrations.github_disconnecting': '断开连接中…',
      'settings_integrations.github_disconnected': '未连接',
      'settings_integrations.github_loading': '正在检查连接…',
      'settings_integrations.github_configure': '在 GitHub 上配置',
      'settings_integrations.disconnect_confirm_title': '断开 GitHub 连接',
      'settings_integrations.disconnect_confirm_message': '要从当前 Qoder 账号断开 GitHub 连接吗？',
      'update.install.installer_unavailable': '系统安装器暂时不可用，请重试；若持续失败，请提交反馈。',
      'update.install.package_access_failed': '无法访问安装包，请重新下载；若仍失败，请提交反馈。',
      'update.install.package_unavailable': '安装包已失效或被清理，请重新下载后安装。',
      'update.install.permission_required': '尚未允许 Qoder 安装应用。请在系统设置中开启“允许来自此来源的应用”，返回后将继续安装。',
      'update.install.system_blocked': '系统暂时阻止打开安装程序，请重试；若持续失败，请提交反馈。',
      'update.action.download_again': '重新下载',
      'update.action.open_settings': '去设置', 'update.action.try_again': '重试',
      /* ---- v3.8.0 清理缓存子页（settings.cache_cleanup.* 官方键名） ---- */
      'settings.cache_cleanup.app_title': '应用缓存', 'settings.cache_cleanup.app_description': '会话与消息的本地缓存',
      'settings.cache_cleanup.artifact_title': '产物缓存', 'settings.cache_cleanup.artifact_description': '已下载的产物文件与图片',
      'settings.cache_cleanup.all_title': '全部清理', 'settings.cache_cleanup.all_description': '清理此设备上的全部本地缓存',
      'settings.cache_cleanup.calculating': '计算中…', 'settings.cache_cleanup.clear': '清理',
      'settings.cache_cleanup.confirm_title': '清理缓存',
      'settings.cache_cleanup.confirm_app_message': '将清除本地会话与消息缓存，不影响云端数据。',
      'settings.cache_cleanup.confirm_artifact_message': '将清除已下载的产物与图片缓存，需要时会重新下载。',
      'settings.cache_cleanup.confirm_all_message': '将清除当前账号的本地会话与消息缓存，以及此设备上的已下载产物和临时文件，不影响云端数据。',
      'settings.cache_cleanup.cleared': '已清理', 'settings.cache_cleanup.failed': '清理失败，请重试',
      /* ---- v3.8.0 任务详情·远程控制逐字（tasks_rc_*，官方键名） ---- */
      'tasks.rc.cli': 'Qoder CLI', 'tasks.rc.cli_device': 'CLI',
      'tasks.rc.desktop': 'Qoder Desktop', 'tasks.rc.desktop_device': '桌面端',
      'tasks.rc.guidance_cli_intro': '在终端中选择一种方式，启用远程控制：',
      'tasks.rc.guidance_cli_command': '在终端运行命令「%@」',
      'tasks.rc.guidance_cli_connect_current': '连接当前会话',
      'tasks.rc.guidance_cli_new_sessions': '手机端新建最多 32 个会话',
      'tasks.rc.guidance_coming_soon': '即将上线',
      'tasks.rc.guidance_download': '在电脑上下载 Qoder 应用',
      'tasks.rc.guidance_enable': '在 %@ 设置中开启「Qoder Mobile」/ 远程控制',
      'tasks.rc.guidance_history_sync': '历史会话同步',
      'tasks.rc.guidance_install': '在电脑上安装 %@ 并使用同一账号登录',
      'tasks.rc.guidance_login': '使用同一账号登录',
      'tasks.rc.guidance_open_settings': '打开 Quest – {settings} 设置 – {smartphone} Mobile – 开启',
      'tasks.action.archive': '归档', 'tasks.action.delete': '删除',
      'tasks.action.mark_read': '标记为已读', 'tasks.action.mark_unread': '标记为未读',
      'tasks.detail.env': '运行环境', 'tasks.detail.remote_control': '远程控制',
      'tasks.detail.connected_to': '已连接至 %@',
      /* ---- v3.9.0 补覆盖（登录/环境/用量/反馈/通知/问答等 15 域，官方键名） ---- */
      'feedback.title': '反馈', 'notification.title': '通知',
      'about.icp_record': '浙ICP备2023034206号-56A',
      'about.permission_usage': '应用权限申请与使用情况说明',
      'about.personal_info_collection_list': '个人信息收集清单',
      'about.personal_info_sharing_list': '第三方SDK收集使用信息说明',
      'about.subscription_agreement': '个人版订阅协议',
      'account_security.account': '账号',
      'account_security.delete_confirm_action': '注销',
      'account_security.delete_confirm_message.v2': '确定要注销你的账号吗？此操作不可撤销，并会同步删除该账号在本设备上的本地数据。',
      'account_security.delete_error_active_paid_plan': '当前账号仍有生效中的付费套餐，请先取消或处理套餐后再注销账号。',
      'account_security.delete_error_delete_failed': '注销账号失败，请重试。',
      'account_security.delete_error_generic': '验证码发送失败，请重试。',
      'account_security.delete_error_invalid_code': '验证码错误或已过期，请重试。',
      'account_security.delete_error_network': '网络错误，请检查网络连接后重试。',
      'account_security.delete_error_no_email': '此账号未绑定邮箱地址。',
      'account_security.delete_error_organization_member': '企业成员不能自助注销账号，请联系企业管理员处理。',
      'account_security.delete_error_server': '服务器出错，请稍后重试。',
      'account_security.delete_error_unauthorized': '登录已过期，请重新登录。',
      'account_security.delete_error_verification_code_failed': '验证码错误，请重新输入。',
      'account_security.deleting_account': '正在注销账号…',
      'account_security.resend_code': '重新发送验证码',
      'account_security.sending_code': '正在发送验证码…',
      'account_security.verification_code_placeholder': '请输入验证码',
      'account_security.verification_subtitle': '我们已向 %1$s 发送了验证码，请在下方输入以确认注销账号。',
      'account_security.verification_title': '验证身份',
      'account_security.verify_and_delete': '验证并注销',
      'app.name': 'Qoder',
      'app.name_domestic': 'Qoder CN',
      'auth.account_password_title.v2': '邮箱登录',
      'auth.agree_prefix': '我同意 Qoder 的',
      'auth.and': '和',
      'auth.application_not_found': '未注册移动端登录应用。',
      'auth.brand': 'Qoder CN',
      'auth.captcha_failed': '验证码验证失败。',
      'auth.cn.agree_prefix': '我已阅读并同意',
      'auth.cn.enterprise_login': '企业邮箱账号登录',
      'auth.cn.enterprise_title': '企业邮箱账号登录',
      'auth.cn.login_agree_prefix': '未注册手机号验证通过后将自动注册，已阅读并同意',
      'auth.cn.password_login': '阿里云账号登录',
      'auth.cn.password_login_short': '阿里云账号登录',
      'auth.cn.phone_login': '手机号登录',
      'auth.cn.phone_unavailable': '手机号登录暂未开放',
      'auth.cn.terms': '服务协议',
      'auth.continue': '继续',
      'auth.continue.account_password': '使用邮箱继续',
      'auth.continue.aliyun_phone': '手机号登录',
      'auth.continue.apple': '使用 Apple 继续',
      'auth.continue.github': '使用 GitHub 继续',
      'auth.continue.google': '使用 Google 继续',
      'auth.continue.qoder': '继续',
      'auth.continue.vpc': 'VPC 登录',
      'auth.continue_agreement_template': '继续即表示你同意我们的%1$s和%2$s',
      'auth.email_invalid': '请输入有效的邮箱地址',
      'auth.email_placeholder': '邮箱',
      'auth.email_required': '请输入邮箱',
      'auth.enterprise_entry.email.subtitle': '使用企业邮箱地址登录，例如 name@company.com',
      'auth.enterprise_entry.email.title': '企业邮箱账号',
      'auth.enterprise_entry.ram.subtitle': '由企业分配的 RAM 子账号',
      'auth.enterprise_entry.ram.title': '阿里云RAM账号',
      'auth.enterprise_entry.selection.help': '不确定账号类型？请联系企业管理员确认',
      'auth.enterprise_entry.selection.subtitle': '按企业分发的账号类型选择登录方式',
      'auth.enterprise_entry.selection.title': '选择企业账号类型',
      'auth.enterprise_entry.title': '企业账号登录',
      'auth.enterprise_entry.vpc.subtitle': '使用企业分配的专属域账号登录（VPC）',
      'auth.enterprise_entry.vpc.title': '专属域账号',
      'auth.enterprise_saml_required': '此入口仅支持企业账号登录',
      'auth.forgot_password': '忘记密码？',
      'auth.get_started': '开始使用',
      'auth.invalid_credentials': '用户名或密码错误。',
      'auth.log_in': '登录',
      'auth.no_account': '还没有账号？',
      'auth.or': '或',
      'auth.passport_account.mobile_login_disabled': '已关闭手机登录',
      'auth.passport_account.title': '选择阿里云账号',
      'auth.password_hide': '隐藏密码',
      'auth.password_placeholder': '密码',
      'auth.password_required': '请输入密码。',
      'auth.password_show': '显示密码',
      'auth.privacy': '隐私政策',
      'auth.sign_in': '登录',
      'auth.sign_up': '注册',
      'auth.signing_in': '正在登录…',
      'auth.terms_alert_agree': '同意',
      'auth.terms_alert_description': '我已阅读并同意 Qoder 的服务条款和隐私政策',
      'auth.terms_alert_title': '条款与隐私',
      'auth.terms_sheet_agree_button': '同意并继续',
      'auth.terms_sheet_description': '请在继续之前查阅并同意我们的条款。',
      'auth.terms_sheet_title': '条款与条件',
      'auth.username_placeholder': '请输入邮箱地址',
      'auth.username_required': '请输入用户名。',
      'auth.vpc_account_placeholder': '账号',
      'auth.vpc_account_required': '请输入账号',
      'auth.vpc_address_host_required': 'VPC 访问地址必须包含域名或主机',
      'auth.vpc_address_invalid': '请输入有效的 VPC 访问地址',
      'auth.vpc_address_placeholder': '例如：https://vpc.example.com',
      'auth.vpc_address_required': '请输入 VPC 访问地址',
      'auth.vpc_address_scheme_required': 'VPC 访问地址必须使用 https:// 协议',
      'auth.vpc_address_unsupported': '请移除 VPC 地址中的用户名、密码、查询参数或片段',
      'auth.vpc_endpoints_unavailable': '无法获取 VPC 服务地址，请检查地址后重试',
      'auth.vpc_login_title': 'VPC 登录',
      'choose_environment.activate_device_offline_line': '设备 %1$s 当前离线',
      'choose_environment.activate_device_reconnect_line': '请打开设备并确保 Qoder Desktop 已连接',
      'choose_environment.activate_device_title': '激活你的设备',
      'choose_environment.active_sessions_title': '活跃会话',
      'choose_environment.chats': '聊天',
      'choose_environment.choose_project': '选择项目',
      'choose_environment.connect_computer': '连接到你的电脑',
      'choose_environment.connect_computer_cli_heading': '使用 Qoder CLI 连接',
      'choose_environment.connect_computer_desktop_enable': '打开 Quest，并在 Quest 设置中开启‘Qoder Mobile’',
      'choose_environment.connect_computer_desktop_enable_inline_bold': '打开 Quest，并在 <b>Quest 设置</b>中开启‘Qoder Mobile’',
      'choose_environment.connect_computer_desktop_heading': '使用 Qoder Desktop（Quest）连接',
      'choose_environment.connect_computer_desktop_install': '在电脑上安装 Qoder Desktop，并登录同一个账号',
      'choose_environment.connect_computer_desktop_tab': 'Desktop',
      'choose_environment.connect_computer_guide_message': '在 Qoder CLI 中开启远程控制以同步任务',
      'choose_environment.connect_computer_guide_prefix': '在终端运行命令 ’',
      'choose_environment.connect_computer_guide_suffix': '’。',
      'choose_environment.connect_computer_instruction': '在 Qoder CLI 中开启 Remote Control 以同步任务',
      'choose_environment.connect_device_connecting': '正在连接 %1$s',
      'choose_environment.end_session_action': '结束',
      'choose_environment.end_session_confirm_message': '“%1$s” 将在此环境中结束。',
      'choose_environment.end_session_confirm_title': '结束会话？',
      'choose_environment.end_session_success': '会话已结束',
      'choose_environment.ide_agent': '智能体',
      'choose_environment.ide_experts': '专家团',
      'choose_environment.ide_projects_empty': '请先在 Qoder IDE 中打开项目。',
      'choose_environment.local': '本地',
      'choose_environment.offline': '离线',
      'choose_environment.title': '选择环境',
      'choose_github.bind_failed': '无法打开 GitHub 连接页面。',
      'choose_github.bind_message': '请先连接 GitHub 账号，再选择仓库。',
      'choose_github.branch_empty': '暂无可用分支',
      'choose_github.connect_dialog_message': '您可以随时撤销访问授权。来自 GitHub 的数据仅用于为您提供相关且有用的信息。',
      'choose_github.install_button': '在 GitHub 上安装 Qoder',
      'choose_github.install_failed': '无法打开 GitHub 安装页面。',
      'choose_github.install_hint': '找不到仓库？请在仓库中安装 Qoder AI 应用以在此处访问。',
      'choose_github.install_message': '仓库缺失。请在仓库中安装 Qoder AI 应用以在此处访问。',
      'choose_github.refresh_connection': '刷新',
      'choose_github.repository_empty': '暂无可用仓库',
      'choose_github.repository_title': '选择仓库',
      'close.drawer': '关闭导航菜单',
      'close.sheet': '关闭工作表',
      'cloud_sandbox.create_failed_toast': '创建沙箱失败，请重试',
      'cloud_sandbox_boot.stage.download_resume': '恢复云端容器',
      'cloud_sandbox_boot.stage.repository_resume': '恢复代码仓库',
      'cloud_sandbox_boot.stage.setup_install': '运行 setup 脚本',
      'cloud_sandbox_boot.status.skipped': '已跳过',
      'cloud_sandbox_boot.timeout_message': '4 分钟内未收到初始化进度。',
      'cloud_sandbox_boot.title_completed': '会话已初始化',
      'cloud_sandbox_boot.title_failed': '会话初始化失败',
      'cloud_sandbox_boot.title_install': '正在初始化会话',
      'cloud_sandbox_boot.title_resume': '正在恢复会话',
      'cloud_sandbox_boot.title_resume_completed': '会话已恢复',
      'cloud_sandbox_boot.title_resume_failed': '会话恢复失败',
      'cloud_sandbox_boot.title_resume_timeout': '会话恢复超时',
      'cloud_sandbox_boot.title_timeout': '会话初始化超时',
      'composer.attachment.camera_failed': '拍照失败，请重试',
      'composer.attachment.camera_permission_denied': '需要相机权限才能拍照',
      'composer.attachment.file_limit': '最多可添加 %1$d 个文件',
      'composer.attachment.file_read_failed': '文件读取失败，请换一个重试',
      'composer.attachment.file_unsupported': '当前场景不支持文件附件',
      'composer.attachment.file_upload_failed': '文件上传失败，请重试',
      'composer.attachment.image_limit': '最多可添加 10 张图片',
      'composer.attachment.image_read_failed': '图片读取失败，请换一张重试',
      'composer.camera.back': '返回',
      'composer.camera.collapse_controls': '收起控制项',
      'composer.camera.expand_controls': '展开控制项',
      'composer.camera.flash_auto': '自动闪光',
      'composer.camera.flash_off': '闪光灯关闭',
      'composer.camera.flash_on': '闪光灯开启',
      'composer.camera.flash_unavailable': '闪光灯不可用',
      'composer.camera.switch_cameras': '切换相机',
      'composer.camera.take_photo': '拍照',
      'composer.full_access': '完全访问',
      'composer.generated_by_ai': '内容由 AI 生成',
      'composer.model_promotion.ends': '错峰折扣将在 %1$s 后结束！',
      'composer.model_promotion.starts': '错峰折扣将在 %1$s 后开始！',
      'composer.model_selector.advanced': '高级',
      'composer.model_selector.pitaya': 'Pitaya-03-20',
      'composer.model_selector.safety': '企业专属',
      'composer.model_selector.standard': '标准',
      'composer.new_models': '新模型',
      'composer.permission.section_qoder_cli': '在 Qoder CLI 中启用',
      'composer.plan': '规划',
      'composer.premium_badge': '高级',
      'composer.thinking_status': '思考中',
      'composer.toggle_on': '开启',
      'composer.voice_input.duration_limit_reached': '语音输入已达到 3 分钟上限，正在转录...',
      'composer.voice_input.duration_warning': '语音输入快结束了，将在 10 秒后自动停止。',
      'composer.voice_input.empty_transcript': '未识别到语音内容，请重试。',
      'composer.voice_input.permission_denied': '需要麦克风权限才能使用语音输入。',
      'composer.voice_input.recording_failed': '语音录制失败，请重试。',
      'composer.voice_input.transcribing': '思考中',
      'composer.voice_polish.failed': '润色失败，已使用原始文本。',
      'composer.voice_polish.in_progress': '润色中…',
      'composer.yolo': 'YOLO',
      'content_description.avatar': '头像',
      'content_description.back': '返回',
      'content_description.conversation_turn.copy': '复制回复',
      'content_description.conversation_turn.dislike': '点踩回复',
      'content_description.conversation_turn.like': '点赞回复',
      'content_description.google': 'Google',
      'content_description.logo': 'Qoder 标识',
      'content_description.markdown_code.expand': '展开代码块',
      'content_description.qoder': 'Qoder',
      'conversation.empty.no_content': '暂无内容',
      'conversation.sources.count': '%1$d 个来源',
      'conversation.sources.item_accessibility': '%1$s，%2$s',
      'conversation.turn.feedback_thanks': '感谢你提供反馈',
      'conversation.uploaded_file_missing': '文件不存在',
      'conversation.uploaded_file_open_failed': '无法打开该文件',
      'copy.toast_msg': '链接已复制到剪贴板',
      'default.error_message': '输入无效',
      'default.popup_window_title': '弹出式窗口',
      'diff.expand': '点击展开完整补丁',
      'diff.lines': '%d 行',
      'diff.preview': '差异预览',
      'diff.title': '差异',
      'dropdown.menu': '下拉菜单',
      'fallback.menu_item.copy_link': '复制链接',
      'fallback.menu_item.open_in_browser': '在浏览器中打开',
      'fallback.menu_item.share_link': '分享链接',
      'feedback.copy_id': '复制反馈 ID',
      'feedback.description_required': '请填写反馈内容',
      'feedback.email_invalid': '请输入有效的邮箱地址',
      'feedback.email_placeholder': '邮箱',
      'feedback.email_required': '请填写邮箱地址',
      'feedback.id_copy_failed': '反馈 ID 复制失败',
      'feedback.placeholder': '请描述你的问题或对 Qoder 的改进建议',
      'feedback.placeholder_cn': '请描述你遇到的问题和给 Qoder CN 的建议',
      'feedback.recording.attachment': '屏幕录制',
      'feedback.recording.countdown': '剩余 %1$d 秒',
      'feedback.recording.failed': '录制失败，请重试',
      'feedback.recording.preparing': '正在准备录制…',
      'feedback.recording.preview_failed': '录屏播放失败，请重试',
      'feedback.recording.stop': '停止录制',
      'feedback.recording.title': '屏幕录制',
      'feedback.session_id_copied': '已复制 Session ID',
      'feedback.session_id_label': '会话ID',
      'feedback.source.choose_file': '选择文件',
      'feedback.source.photo_library': '照片图库',
      'feedback.source.record_screen': '录制屏幕',
      'feedback.source_take_photo': '拍摄照片',
      'feedback.submit': '提交',
      'feedback.success': '反馈提交成功',
      'feedback.success_dialog_title': '反馈提交成功',
      'indeterminate': '部分选中',
      'markdown.code.source_unavailable': '代码内容已失效，请返回后重新打开。',
      'markdown.details.default_summary': '详细内容',
      'navigation.menu': '导航菜单',
      'new_task.credits_banner_subtitle': '快开始一个任务体验一下吧！',
      'new_task.credits_banner_title': '300 积分已到账。',
      'new_task.default_env': '默认',
      'new_task.greeting_subtitle': 'Qoder 可以帮你做什么？',
      'new_task.greeting_subtitle_cn': '我可以帮你做点啥?',
      'new_task.greeting_title': '你好，%1$s',
      'new_task.greeting_title_guest': '你好',
      'new_task.landing.cloud_operation_credit': '新人大礼包 300 额度已到账，立即体验',
      'new_task.landing.local_operation_pro_trial': '下载桌面端应用，解锁首月 Pro 免费权益',
      'new_task.landing.prompt_pending': 'Trend analysis needs data source confirmation',
      'new_task.landing.prompt_pending_text': 'Trend analysis needs data source confirmation',
      'new_task.landing.prompt_unread': 'Survey report generated 12 insights',
      'new_task.landing.prompt_unread_text': 'Survey report generated 12 insights',
      'new_task.landing.task_message_label': '%1$s：%2$s',
      'new_task.landing.task_status.action_required': '待处理',
      'new_task.landing.task_status.error': '出错',
      'new_task.no_connection_subtitle': '"在 Qoder 中启用远程控制 例如在终端运行 \'qodercli remote-control\'"',
      'new_task.no_connection_subtitle_cn': '"在 Qoder 中启用远程控制 例如在终端运行 \'qoderclicn remote-control\'"',
      'new_task.no_connection_title': '尚未连接',
      'new_task.prompt.build_app': '搭建新应用',
      'new_task.prompt.build_app_text': '帮我搭建一个简洁的待办事项应用，包含任务新增、完成、删除和列表展示功能。请优先实现一个可以直接运行的基础版本。',
      'new_task.prompt.fix_bug': '修复缺陷',
      'new_task.prompt.fix_bug_text': '排查一下这个项目是否存在明显的报错、异常逻辑或性能问题。如果发现问题，请用尽量小的改动帮我修复。',
      'new_task.prompt.generate_ui': '从截图做界面',
      'new_task.prompt.generate_ui_text': '请根据我上传的截图，实现一个尽量还原的界面。优先复用当前项目已有的技术栈和组件风格，代码保持简洁。',
      'new_task.prompt.understand_project': '快速看懂项目',
      'new_task.prompt.understand_project_text': '请帮我快速了解这个项目的结构和主要功能，并告诉我如果要继续开发，应该从哪些文件或模块开始看。',
      'new_task.rc.cli_landing_title': '"终端里的工程 今天我们来做点什么？"',
      'new_task.rc.landing_title': '"Quest on, hands off 今天我们来做点什么？"',
      'new_task.rc.prompt_compare': '对比这两家供应商，选一个',
      'new_task.rc.prompt_plan': '拆解 Q4 计划，并行派发多个 agent',
      'new_task.select_env': '选择一个环境以开始',
      'new_task.title': '新建任务',
      'new_task.unavailable_device_banner': '哎呀～你的设备当前不可用',
      'new_task.unavailable_device_placeholder': '在 Qoder CLI 中开启远程控制',
      'new_task.unavailable_device_placeholder_desktop': '在 Qoder Desktop 中开启远程控制',
      'not_selected': '未选择',
      'notification.action_review': 'Review',
      'notification.action_view': '查看',
      'notification.approval_description': '在代理执行操作前进行授权',
      'notification.approval_title': '审批',
      'notification.ask_permission_description': 'Agent 执行操作前需要你授权',
      'notification.ask_permission_title': '操作授权',
      'notification.channel.task_updates': '任务更新',
      'notification.channel.task_updates_description': '来自任务的审批请求和问题',
      'notification.default_body': '有一个会话需要你处理',
      'notification.la.more_format': '另有 %1$d 项',
      'notification.la.state_awaiting': '待批准',
      'notification.la.state_error': '出错',
      'notification.la.state_needs_input': '需输入',
      'notification.new_session_title': '新会话',
      'notification.plan_review_description': '在执行前审核方案',
      'notification.plan_review_title': '方案审核',
      'notification.qa_description': '推送 Agent 的实时提问',
      'notification.qa_title': '问答',
      'notification.session_created': '会话已创建',
      'notification.system_description': '当有新消息到达时，您将在主屏幕收到通知',
      'notification.system_status_on': '已开启',
      'notification.system_title': '系统通知',
      'notification.task_completed_description': '任务完成时通知你',
      'notification.task_completed_title': '运行完成',
      'notification.title.task_failed': '任务出错',
      'numberauth.carrier_desc': '认证服务由中国移动提供',
      'numberauth.change_phone_short': '更换',
      'numberauth.error.business_failure_default': '一键登录失败，请重试',
      'numberauth.error.carrier_unavailable': '运营商认证服务暂不可用，请改用其他登录方式',
      'numberauth.error.config_invalid': '一键登录配置异常，请联系客服',
      'numberauth.error.device_unsupported': '手机终端环境不支持一键登录，请改用其他登录方式',
      'numberauth.error.enable_mobile_network': '请开启移动网络后重试',
      'numberauth.error.fallback': '一键登录失败，请改用其他登录方式',
      'numberauth.error.network_timeout': '网络超时，请稍后重试',
      'numberauth.error.no_sim': '未检测到 SIM 卡，请改用其他登录方式',
      'numberauth.error.retry_or_other_method': '一键登录失败，请稍后重试或改用其他登录方式',
      'numberauth.error.risk_control_pending': '风控未完成，请重试或换号登录',
      'numberauth.label': '本机号码',
      'numberauth.one_click_login': '一键登录',
      'password_login.account_placeholder': '阿里云账号（手机号/邮箱/ID）',
      'password_login.aliyun_privacy': '隐私政策',
      'password_login.aliyun_user_agreement': '阿里云用户协议',
      'password_login.mfa_cancelled': '验证未完成，请重试',
      'password_login.password_placeholder.v2': '密码',
      'password_login.qoder_privacy': '隐私政策',
      'password_login.qoder_user_agreement': 'Qoder CN 用户协议',
      'password_login.terms_prefix': '已阅读并同意',
      'password_login.title': '阿里云账号登录',
      'permission_purpose.conversation_camera_message': '需要访问您的相机，用于拍摄图片并添加到对话消息，帮助 Qoder 理解图片内容并完成任务。',
      'permission_purpose.conversation_camera_title': '“%1$s”想访问相机用于对话',
      'permission_purpose.deny': '不允许',
      'permission_purpose.feedback_camera_message': '需要访问您的相机，用于在反馈中拍摄并上传图片，帮助我们定位问题并改进服务。',
      'permission_purpose.feedback_camera_title': '“%1$s”想访问相机用于反馈',
      'permission_purpose.feedback_screen_recording_message': '需要录制您的屏幕，用于捕捉 Qoder 中发生的问题并作为视频附件随反馈提交，帮助我们定位问题。',
      'permission_purpose.feedback_screen_recording_title': '“%1$s”想录制屏幕用于反馈',
      'permission_purpose.feedback_screenshot_deny': '不添加',
      'permission_purpose.feedback_screenshot_message': '允许 Qoder 从图库中查找刚才的截图，并添加到本次反馈吗？',
      'permission_purpose.feedback_screenshot_title': '添加截图到反馈',
      'permission_purpose.microphone_message': '需要访问您的麦克风，用于录制语音并转写为消息内容。',
      'permission_purpose.microphone_title': '“%1$s”想访问麦克风',
      'preview.tool.failed': '无法打开预览，请重试。',
      'preview.tool.opening': '正在打开预览…',
      'preview.tool.port': '端口 %d',
      'preview.tool.title': '打开预览',
      'preview.unavailable.restart_prompt': '帮我重新启动预览',
      'range.end': '范围终点',
      'range.start': '范围起点',
      'screenshot_quick_action.feedback': '发送反馈',
      'screenshot_quick_action.title': '已捕获截图',
      'security_policy.message': '企业安全策略限制，暂无法使用 Qoder Mobile',
      'security_policy.title': '安全策略限制',
      'selected': '已选择',
      'session.details.close': '关闭会话详情',
      'session.details.copy_id_accessibility': '会话 ID %1$s，轻点两下复制。',
      'session.details.open_accessibility': '显示会话详情',
      'session.details.unavailable': '暂无',
      'sidebar.code': '编码',
      'sidebar.work': '工作',
      'sms.account_id': '账号ID: %1$s',
      'sms.code_sent': '验证码已发送',
      'sms.code_sent_to': '至 +86%1$s',
      'sms.confirm_login': '立即登录',
      'sms.enter_phone': '输入手机号',
      'sms.error.account_banned': '账号已被封禁',
      'sms.error.account_not_found': '该手机号未注册账号',
      'sms.error.challenge_missing': '请先获取验证码',
      'sms.error.code_expired': '验证码已过期，请重新获取',
      'sms.error.code_invalid': '验证码错误或已过期',
      'sms.error.code_required': '请输入6位验证码',
      'sms.error.generic': '操作失败，请重试',
      'sms.error.invalid_phone': '请输入正确的手机号',
      'sms.error.network': '网络连接失败，请检查网络设置',
      'sms.error.phone_login_unavailable': '手机号登录暂未开放',
      'sms.error.too_many_requests': '操作过于频繁，请稍后再试',
      'sms.last_active': '最近活跃：%1$s',
      'sms.phone_placeholder': '请输入手机号',
      'sms.recent_login': '最近登录',
      'sms.resend': '重新获取',
      'sms.resend_countdown': '重新获取（%1$ds）',
      'sms.select_account': '选择阿里云账号',
      'sms.select_account_hint': '该手机号关联了多个账号，请选择要登录的账号',
      'sms.terms_agreed': '我已阅读并同意 服务协议 和 隐私政策',
      'startup_authorization.agree': '同意',
      'startup_authorization.aliyun_privacy_policy_label': '《隐私政策》',
      'startup_authorization.aliyun_user_agreement_label': '《用户协议》',
      'startup_authorization.disagree': '不同意',
      'startup_authorization.message': '"欢迎使用本应用，在你使用本应用之前，请仔细阅读阿里云《用户协议》、《隐私政策》、Qoder 《隐私政策》、《用户协议》。 你在使用本应用的过程中需要联网，可能会产生流量费用。为了保障本应用的正常运行及安全风控所需，我们会根据你使用的具体功能，向系统申请包括但不限于下列权限：麦克风（开启麦克风）、相机、位置（用于收集位置信息）、存储权限，读取本机电话号码、读取和写入媒体影音数据（如照片、视频和音频）、屏幕截屏，这些权限将用于为你提供语音、图片和文本指令输入等服务。点击“同意”，即表示你同意接受协议中的条款约束。"',
      'startup_authorization.qoder_privacy_policy_label': '《隐私政策》',
      'startup_authorization.qoder_user_agreement_label': '《用户协议》',
      'startup_authorization.title': '欢迎使用 Qoder',
      'state.empty': '空白',
      'state.on': '已开启',
      'switch.role': '开关',
      'system.default_channel': '系统默认通道',
      'tab': '标签页',
      'tasks.archive.empty': '暂无归档任务',
      'tasks.debug.raw_data_empty': '无源数据',
      'tasks.debug.view_raw_data': '查看源数据',
      'tasks.delete.confirm_message': '“%1$s” 将被永久删除。',
      'tasks.delete.confirm_title': '删除任务？',
      'tasks.empty.short_description': '点击 + 开始一个任务',
      'tasks.empty.short_title': '暂无任务',
      'tasks.group.other': '其他',
      'tasks.load_more': '加载更多',
      'tasks.pin.action': '置顶',
      'tasks.plan_review.allow_once': '执行',
      'tasks.plan_review.back': '返回',
      'tasks.plan_review.feedback_placeholder': '计划中有哪些需要调整？',
      'tasks.plan_review.feedback_submit': '提交反馈',
      'tasks.plan_review.prompt': '已写好计划，可以开始执行。',
      'tasks.plan_review.title': '方案',
      'tasks.question.answer_input_placeholder': '输入您的答案...',
      'tasks.question.answer_no': '否',
      'tasks.question.answer_yes': '是',
      'tasks.question.answered': '已回答',
      'tasks.question.answers_title': '问题回答',
      'tasks.question.custom_answer_label': '或输入自定义答案',
      'tasks.question.custom_value': '或输入自定义答案',
      'tasks.question.multi_choice_title_suffix': '(可多选)',
      'tasks.question.pagination': '%1$d / %2$d',
      'tasks.question.panel_title': '请回答以下问题',
      'tasks.question.please_specify': '或输入自定义答案',
      'tasks.question.previous_question': '上一个问题',
      'tasks.question.primary_action': '继续',
      'tasks.question.primary_action_submitting': '提交中...',
      'tasks.restore.action': '恢复',
      'tasks.restore.failed': '恢复失败，请稍后重试',
      'tasks.restore.unsupported': '暂不支持',
      'tasks.section.action_required': '待处理',
      'tasks.section.archived': '已归档任务',
      'tasks.section.pinned': '置顶',
      'tasks.show_more': '查看更多',
      'tasks.sort.by': '分组方式',
      'tasks.sort.date': '日期',
      'tasks.sort.project': '项目',
      'tasks.sort.status': '状态',
      'tasks.source.remote': '远端',
      'tasks.switcher.all_tasks': '全部任务',
      'tasks.tab.archived': '已归档',
      'tasks.time.days_ago': '%d天前',
      'tasks.time.hours_ago': '%d小时前',
      'tasks.time.minutes_ago': '%d分钟前',
      'tasks.time.now': '刚刚',
      'tasks.title': '编码',
      'tasks.tool_group.edit_files': '编辑 %d 个文件',
      'tasks.tool_group.edited_files': '已编辑 %d 个文件',
      'tasks.tool_group.files_count': '%d 个文件',
      'tasks.tool_group.read_files_completed': '已读取 %d 个文件',
      'tasks.tool_group.read_images': '读取 %d 张图片',
      'tasks.tool_group.view_steps': '查看 %d 个步骤',
      'tasks.tool_use.action.edited': '已编辑',
      'tasks.tool_use.action.write': '写入',
      'tasks.tool_use.action.wrote': '已写入',
      'tasks.tool_use.default_tail': '等待响应...',
      'tasks.tool_use.detail.command': '命令',
      'tasks.tool_use.detail.content': '内容',
      'tasks.tool_use.detail.file_path': '文件路径',
      'tasks.tool_use.detail.output': '输出',
      'tasks.tool_use.detail.prompt': '提示词',
      'tasks.tool_use.detail.query': '查询',
      'tasks.tool_use.edit_file': '编辑文件',
      'tasks.tool_use.read_file': '读取文件',
      'tasks.tool_use.running_tail': '等待响应...',
      'tasks.tool_use.tool': '工具',
      'tasks.tool_use.web_fetch.completed': '抓取完成',
      'tasks.tool_use.web_fetch.failed': '抓取失败',
      'tasks.tool_use.web_fetch.running': '正在抓取',
      'tasks.tool_use.web_fetch.target.v2': '抓取 %1$s',
      'tasks.tool_use.web_search.completed': '搜索完成',
      'tasks.tool_use.web_search.failed': '搜索失败',
      'tasks.tool_use.web_search.query.v2': '搜索 %1$s',
      'tasks.tool_use.web_search.running': '正在搜索',
      'tasks.tool_use.write_file': '编辑文件',
      'tasks.unpin.action': '取消置顶',
      'tasks.view_archived': '查看已归档任务',
      'template.percent': '百分之 %1$d。',
      'tooltip.description': '提示',
      'tooltip.label': '显示提示',
      'update.action': '立即更新',
      'update.checking': '检查中…',
      'update.download_start_failed': '无法启动下载，请稍后重试',
      'update.installing': '安装中…',
      'update.later': '稍后',
      'update.no_update': '已是最新版本',
      'update.title': '新版本 %s 可用',
      'usage.activity.expires_at': '限时活动将于%1$s结束',
      'usage.activity.open_details': '打开活动详情',
      'usage.activity.quota.daily': '%1$s / %2$s 次/天',
      'usage.activity.quota.generic': '%1$s / %2$s 次',
      'usage.activity.quota.monthly': '%1$s / %2$s 次/月',
      'usage.activity.remaining': '剩余 %1$s 次',
      'usage.activity.remaining_today': '今日剩余 %1$s 次',
      'usage.activity.show_description': '查看活动说明',
      'usage.add_on_credits': '资源包',
      'usage.error.empty_response': '无法加载用量数据，请重试',
      'usage.plan_credits': '套餐内 Credits',
      'usage.remaining_left': '剩余 %s',
      'usage.renews_on': '续期于 %s',
      'usage.shared_add_on_credits': '共享附加额度',
      'usage.unit_credits': '额度',
      'usage.used': '已使用',
      'usage.used_summary': '%1$s / %2$s（已使用 %3$d%%）',
      'usage.view_details': '查看详情',
      'usage.your_cap': '你的额度',
      'workspace.sso_redirect': '正在跳转至 %s SSO…',
    },
    en: {
      'app.tab.home': 'Home', 'app.tab.tasks': 'Tasks',
      'app.tab.sessions': 'Workspace', 'app.tab.me': 'Me',
      'new_task.tab.cloud': 'Cloud', 'new_task.tab.local': 'Local PC',
      'new_task.cloud_hero_title': 'Chat, or send a task',
      'new_task.cloud_hero_subtitle': "I'm Little Q, your go-to work partner. Always in the cloud, ready to hit the ground running!",
      'new_task.local_hero_title': 'Think deeper, Build better',
      'new_task.local_hero_subtitle': 'Start on phone. Your computer is ready when you are — with tasks, files, and skills all set.',
      'new_task.input_placeholder': 'Describe your task...',
      'new_task.prompt.digest': 'Push a competition digest every Monday',
      'new_task.prompt.feedback': 'Sort 200 feedbacks by issue and sentiment',
      'new_task.prompt.monitor': 'Watch brand mentions, ping me on negatives',
      'new_task.prompt.agent': 'Deploy a support agent to handle FAQs',
      'new_task.prompt.categories': '"Find Q3\'s top 3 fastest-growing categories"',
      'new_task.prompt.poster': 'Design a product launch hero poster',
      'new_task.prompt.report': 'Compile tasks into a weekly report, flag leftovers as to-dos',
      'new_task.prompt.video': 'Animate gradient descent step by step',
      'new_task.choose_repo': 'Choose git repository', 'new_task.choose_branch': 'Choose branch',
      'new_task.default_branch': 'Default branch', 'new_task.attachment.spec': 'Spec',
      'tasks.filter.all': 'All', 'tasks.filter.running': 'Running',
      'tasks.filter.pending': 'Pending', 'tasks.filter.idle': 'Idle',
      'tasks.group.today': 'Today', 'tasks.group.yesterday': 'Yesterday',
      'tasks.group.week': 'Previous 7 Days', 'tasks.group.earlier': 'Earlier',
      'tasks.phase.running': 'running', 'tasks.phase.completed': 'completed',
      'tasks.phase.failed': 'failed', 'tasks.phase.idle': 'idle',
      'tasks.phase.waiting': 'waiting for approval',
      'tasks.rc.title': 'Remote Control', 'tasks.rc.subtitle': 'Qoder Desktop & CLI',
      'tasks.count': '%d tasks',
      'tasks.empty.title': 'Ready to start',
      'tasks.empty.description': '"Tap + to launch a task, or turn on Remote Control in Qoder CLI to sync tasks"',
      'tasks.approval.enter_plan_mode.description': 'Choose how Quest should proceed: create a Spec before execution, or start running the task directly. A Spec helps clarify scope and implementation approaches, quickly confirming the direction before execution.',
      'tasks.approval.enter_plan_mode.generate_spec': 'Spec first',
      'tasks.approval.enter_plan_mode.run_directly': 'Run directly',
      'tasks.approval.option.allow': 'Allow', 'tasks.approval.option.allow_once': 'Allow once',
      'tasks.approval.option.allow_session': 'Always allow in this session', 'tasks.approval.option.reject': 'Reject',
      'tasks.approval.option.recommended': 'Recommended',
      'tasks.approval.feedback_placeholder': 'Type feedback',
      'tasks.approval.feedback_reject_and_send': 'Reject and send',
      'tasks.approval.approved': 'Approved',
      'tasks.approval.pending': 'Waiting for approval',
      'approval.title.run_command': 'Qoder wants to run command',
      'approval.title.edit': 'Qoder wants to edit',
      'approval.title.mcp': 'Qoder wants to execute MCP tool',
      'approval.title.enter_plan_mode': 'Execution Suggestion',
      'tool.bash': 'Bash', 'tool.read': 'Read', 'tool.edit': 'Edit',
      'tool.search': 'Search', 'tool.web_search': 'Web Search', 'tool.web_fetch': 'Web Fetch',
      'tool.image': 'Generate image', 'tool.skill': 'Skill', 'tool.mcp': 'MCP',
      'tool.todo': 'Update todos', 'tool.subagent': 'Sub-agent', 'tool.plan': 'Request Plan mode',
      'tool.status.running': 'Running', 'tool.status.completed': 'Completed',
      'tool.status.failed': 'Failed', 'tool.status.pending': 'Pending',
      'tool.group.tools': 'Ran %d tools', 'tool.group.files': 'Read %d Files',
      'tool.group.writes': 'Wrote %d files', 'tool.group.ops': 'Processed %d operations',
      'todo.title': 'Todo List', 'todo.empty': 'No todo items found.',
      'workspace.metric.active': 'Active', 'workspace.metric.closed': 'Closed',
      'workspace.feedback': 'Type a message or hold to talk …', 'workspace.interrupt_session': 'Stop reply',
      'workspace.empty_session': "You're all set — start your task now!",
      'conversation.thinking.title': 'Deep Thinking',
      'conversation.sources.title': 'Sources',
      'conversation.turn_activity.agents_count': '%d agents',
      'conversation.turn_activity.experts_count': '%d Experts',
      'conversation.turn_activity.todo_progress': '%d/%d',
      'conversation.remote_control_ready': 'Ready for your task now!',
      'conversation.turn.copy_success': 'Copied',
      'conversation.interrupt.stopped': 'Stopped by user.',
      'conversation.disconnected_composer_placeholder': 'Disconnected',
      'cloud_sandbox_boot.stage.download_install': 'Set up a cloud container',
      'cloud_sandbox_boot.stage.repository_install': 'Cloned repository',
      'cloud_sandbox_boot.stage.run_install': 'Started cloud container',
      'cloud_sandbox_boot.setup_hint': 'Add a setup script to install dependencies and configure your environment.',
      'cloud_sandbox_boot.preparing': 'Waiting for setup progress…',
      'cloud_sandbox_boot.composer_disabled': 'Waiting for cloud sandbox setup',
      'artifact.title': 'Artifacts', 'artifact.empty': 'Files generated will appear here',
      'artifact.section_presented': 'Deliverables', 'artifact.section_changed': 'Changes',
      'artifact.view_preview': 'Preview', 'artifact.view_source': 'Source',
      'artifact.open_external': 'Open with another app',
      'diff.summary': '%d additions, %d deletions',
      'session.details.title': 'Details', 'session.details.general': 'General',
      'session.details.metadata': 'Metadata', 'session.details.model': 'Model',
      'session.details.running_on': 'Running On', 'session.details.created': 'Created',
      'session.details.last_updated': 'Last Updated', 'session.details.session_id': 'Session ID',
      'session.details.id_copied': 'Session ID copied',
      'composer.choose_mode': 'Choose Mode', 'composer.choose_model': 'Choose Model',
      'composer.code_with_plan': 'Code with Plan',
      'composer.mode.ask': 'Ask permissions', 'composer.mode.auto': 'Auto',
      'composer.mode.auto_edits': 'Auto accept edits', 'composer.mode.bypass': 'Bypass permissions',
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
      'composer.attachment.photo': 'Photo', 'composer.attachment.file': 'File',
      'composer.attachment.camera': 'Camera',
      'markdown.code.default_title': 'Code', 'markdown.mermaid.title': 'Diagram',
      'mermaid.loading': 'Rendering diagram…',
      'appearance.dark': 'Dark', 'appearance.light': 'Light', 'appearance.system': 'System',
      'settings.appearance': 'Appearance', 'settings.integrations': 'Integrations',
      'account_security.title': 'Account & Security', 'account_security.delete_account': 'Delete account',
      'usage.title': 'Usage', 'billing.current_plan': 'Current plan',
      'about.version': 'Version: %@',
      'about.privacy_agreement': 'Privacy Policy', 'about.service_agreement': 'Terms of Service',
      'about.ai_generated_content_notice': 'All content generated by the service is AI-generated. Its accuracy and completeness cannot be guaranteed and does not represent our attitudes or opinions.',
      /* ---- v3.7.0 composer.plus（strings.xml en 逐字） ---- */
      'composer.plus.mode': 'Mode', 'composer.plus.model': 'Model',
      'composer.plus.spec': 'Spec',
      'composer.plus.connectors': 'Connectors', 'composer.plus.skills': 'Skills',
      'composer.plus.plugins': 'Plugins', 'composer.plus.files': 'Files',
      'composer.plus.connectors_empty': 'No connectors yet. Add them in QoderWork Desktop App.',
      'composer.plus.skills_empty': 'No skills yet. Add them in QoderWork Desktop App.',
      'composer.plus.plugins_empty': 'No plugins yet. Add them in QoderWork Desktop App.',
      'composer.plus.files_empty': 'No files yet. Add them in QoderWork Desktop App.',
      'composer.plus.connector.computer_use': 'Computer Use',
      'composer.plus.connector.qoderwork': 'QoderWork',
      'composer.plus.connector.market': 'Enterprise Skill Market Assistant',
      'composer.plus.skill.docx': 'DOCX',
      'composer.plus.skill.docx_subtitle': 'Use this skill whenever the user wants to create, read, edit, or manipulate word files',
      'composer.plus.skill.pdf': 'PDF',
      'composer.plus.skill.pdf_subtitle': 'Use this skill whenever the user wants to do anything with pdf',
      'composer.plus.skill.xlsx': 'XLSX',
      'composer.plus.skill.xlsx_subtitle': 'Use this skill any time a spreadsheet file is the primary input and output',
      'composer.plus.plugin.consulting': 'Consulting Delivery',
      'composer.plus.plugin.consulting_subtitle': 'Full-cycle management consulting toolkit covering seven core scenarios',
      'composer.plus.plugin.equity': 'Equity Research',
      'composer.plus.plugin.equity_subtitle': 'End-to-end equity research toolkit for sell-side and buy-side analysts',
      'composer.plus.plugin.marketing': 'Marketing',
      'composer.plus.plugin.marketing_subtitle': 'Full-spectrum marketing toolkit covering copywriting, ad compliance',
      'composer.plus.plugin.pe': 'Private Equity',
      'composer.plus.plugin.pe_subtitle': 'End-to-end PE/VC toolkit covering deal screening, due diligence checklists',
      'composer.plus.plugin.pm': 'Product Management',
      'composer.plus.plugin.pm_subtitle': 'An end-to-end product management toolkit covering eight core workflows',
      'composer.plus.file.ai_analysis': '~/Documents/AIproduct_analysis',
      'composer.plus.file.logo_design': '~/Pictures/logo_design',
      /* ---- v3.7.0 workspace（strings.xml en 逐字） ---- */
      'workspace.title': 'Workspace',
      'workspace.section.active': 'Active', 'workspace.section.closed': 'Closed',
      'workspace.metric.devices': 'Devices',
      'workspace.loading': 'Loading conversations…',
      'workspace.preparing': 'Preparing the workspace…',
      'workspace.rename': 'Rename', 'workspace.rename_title': 'Task Name',
      'workspace.rename_agree': 'Agree',
      'workspace.open_settings': 'Open settings',
      'workspace.read_file': 'Read %d file',
      'workspace.read_files': 'Read %d files',
      /* ---- v3.7.0 mermaid ---- */
      'mermaid.render': 'Render diagram',
      'mermaid.unavailable': 'This diagram is no longer available. Go back and open it again.',
      /* ---- v3.8.0 approval（strings.xml en verbatim） ---- */
      'approval.pending': 'Waiting for approval', 'approval.approved': 'Approved',
      'approval.rejected': 'Rejected', 'approval.submitted': 'Submitted',
      'approval.submitting': 'Submitting…',
      'approval.execution_lead': 'Allow execution of',
      'approval.feedback.reject': 'Reject',
      'approval.title.permission_required': 'Permission required',
      'approval.title.request': 'Approval request',
      /* ---- v3.8.0 artifact（en verbatim） ---- */
      'artifact.loading': 'Loading…', 'artifact.load_failed': 'Load Failed',
      'artifact.list_load_failed': 'Failed to load artifacts',
      'artifact.download_failed': 'Download failed',
      'artifact.retry': 'Retry', 'artifact.not_found': 'This artifact no longer exists or has expired',
      'artifact.preview_unavailable': 'Preview not supported',
      'artifact.open_external_unavailable': 'No compatible app is available for this file.',
      'artifact.remote_local_resource_unavailable': 'This artifact is currently unavailable on mobile. Please open it on the device running the task.',
      'artifact.share_failed': 'Unable to share file',
      'artifact.share_restricted': 'Your organization’s security policy prevents sharing or downloading',
      'artifact.stale_fallback': 'Showing the last available version',
      'artifact.too_large_download_to_view': 'Please download to view this file',
      'artifact.low_memory_download_to_view': 'Low memory — please download to view this file',
      'artifact.pdf_page_description': '%@ page %@ of %@',
      /* ---- v3.8.0 common / error（en verbatim） ---- */
      'common.cancel': 'Cancel', 'common.confirm': 'Confirm', 'common.close': 'Close',
      'common.ok': 'OK', 'common.retry': 'Retry', 'common.clear_all': 'Clear all',
      'common.open_on_phone': 'Open on phone', 'common.error': 'Error',
      'error.account_banned': 'Your account has been disabled. Please contact support.',
      'error.captcha_failed': 'Verification failed. Please try again.',
      'error.device_not_registered': 'Device not registered',
      'error.device_offline_message_not_sent': 'Device is offline. Message not sent.',
      'error.environment_offline': 'The selected environment is offline. Reconnect it or choose another environment.',
      'error.environment_session_limit_reached': 'You have reached the maximum number of environment sessions. Delete old sessions and try again.',
      'error.feedback_failed': 'Failed to submit feedback. Please try again.',
      'error.generic': 'Something went wrong. Please try again.',
      'error.google_no_credential': 'No Google account is available on this device.',
      'error.google_sign_in_failed': 'Google Sign-In failed. Please try again.',
      'error.google_sign_in_interrupted': 'Google Sign-In was interrupted. Please try again.',
      'error.google_sign_in_unavailable': 'Google Sign-In is not available on this device.',
      'error.network_unavailable': 'Network connection failed. Please check your network and try again.',
      'error.no_permission': 'You do not have permission to access this session.',
      'error.page_not_found': 'Page not found',
      'error.page_not_found_with_path': 'Page not found: %@',
      'error.service_unavailable': 'Service temporarily unavailable. Please try again later.',
      'error.session_busy': 'Session is busy. Please wait and try again.',
      'error.session_expired': 'Your session has expired. Please sign in again.',
      'error.session_not_found': 'This session no longer exists.',
      'error.sign_in_failed': 'Sign in failed. Please try again.',
      'error.sign_in_timeout': 'Sign in timed out. Please try again.',
      'error.something_went_wrong': 'Something went wrong',
      'error.try_again': 'Please try again.',
      /* ---- v3.8.0 settings（en verbatim） ---- */
      'settings.title': 'Settings', 'settings.language': 'Language',
      'settings.notification': 'Notification', 'settings.privacy': 'Privacy',
      'settings.billing': 'Billing', 'settings.machine': 'Machine', 'settings.usage': 'Usage',
      'settings.edit_profile': 'Edit profile', 'settings.feedback': 'Feedback',
      'settings.check_update': 'Check Update', 'settings.cache_cleanup': 'Clear Cache',
      'settings.sign_out': 'Sign out',
      'settings.sign_out_confirm_title': 'Sign out',
      'settings.sign_out_confirm_message': 'Are you sure you want to sign out?',
      'settings.guest': 'Guest', 'settings.plan_community': 'Community',
      'settings.placeholder': 'This destination is still a placeholder in the starter shell.',
      'settings.about': 'About Qoder', 'settings.about_cn': 'About Qoder CN',
      'settings.device_qr.accessibility': 'Pair Qoder Glasses',
      'settings.device_qr.caption': 'Supports pairing with smart glasses',
      'settings.device_qr.confirmed': 'Glasses paired',
      'settings_integrations.title': 'Integrations',
      'settings_integrations.github_title': 'GitHub',
      'settings_integrations.github_connect': 'Connect GitHub', 'settings_integrations.github_connected': 'Connected',
      'settings_integrations.github_connecting': 'Connecting…',
      'settings_integrations.github_disconnect': 'Disconnect GitHub',
      'settings_integrations.github_disconnecting': 'Disconnecting…',
      'settings_integrations.github_disconnected': 'Not connected',
      'settings_integrations.github_loading': 'Checking connection…',
      'settings_integrations.github_configure': 'Configure on GitHub',
      'settings_integrations.disconnect_confirm_title': 'Disconnect GitHub',
      'settings_integrations.disconnect_confirm_message': 'Disconnect GitHub from this Qoder account?',
      'update.install.installer_unavailable': 'The system installer is currently unavailable. Try again; if this keeps happening, send feedback.',
      'update.install.package_access_failed': 'Qoder can’t access the installation package. Download it again; if this keeps happening, send feedback.',
      'update.install.package_unavailable': 'The installation package is no longer available. Download it again to continue.',
      'update.install.permission_required': 'Qoder isn’t allowed to install apps yet. In system settings, turn on “Allow from this source.” Installation will continue when you return.',
      'update.install.system_blocked': 'The system blocked the installer from opening. Try again; if this keeps happening, send feedback.',
      'update.action.download_again': 'Download again',
      'update.action.open_settings': 'Settings', 'update.action.try_again': 'Try again',
      /* ---- v3.8.0 cache cleanup（en verbatim） ---- */
      'settings.cache_cleanup.app_title': 'App Cache', 'settings.cache_cleanup.app_description': 'Local cache of sessions and messages',
      'settings.cache_cleanup.artifact_title': 'Artifact Cache', 'settings.cache_cleanup.artifact_description': 'Downloaded artifacts and images',
      'settings.cache_cleanup.all_title': 'Clear All', 'settings.cache_cleanup.all_description': 'All local cache on this device',
      'settings.cache_cleanup.calculating': 'Calculating…', 'settings.cache_cleanup.clear': 'Clear',
      'settings.cache_cleanup.confirm_title': 'Clear Cache',
      'settings.cache_cleanup.confirm_app_message': 'This clears the local cache of sessions and messages. Your cloud data is not affected.',
      'settings.cache_cleanup.confirm_artifact_message': 'This clears downloaded artifacts and images. They will be downloaded again when needed.',
      'settings.cache_cleanup.confirm_all_message': 'This clears the current account’s local sessions and messages, plus downloaded artifacts and temporary files on this device. Your cloud data is not affected.',
      'settings.cache_cleanup.cleared': 'Cache cleared', 'settings.cache_cleanup.failed': 'Failed to clear cache, please try again',
      /* ---- v3.8.0 tasks_rc（en verbatim，官方键名） ---- */
      'tasks.rc.cli': 'Qoder CLI', 'tasks.rc.cli_device': 'CLI',
      'tasks.rc.desktop': 'Qoder Desktop', 'tasks.rc.desktop_device': 'Desktop',
      'tasks.rc.guidance_cli_intro': 'In the terminal, pick one way to enable remote control:',
      'tasks.rc.guidance_cli_command': 'Run command ‘%@’ in the terminal.',
      'tasks.rc.guidance_cli_connect_current': 'Connect the current session',
      'tasks.rc.guidance_cli_new_sessions': 'Create up to 32 sessions from your phone',
      'tasks.rc.guidance_coming_soon': 'Coming soon',
      'tasks.rc.guidance_download': 'Download Qoder app on your computer',
      'tasks.rc.guidance_enable': "\"Enable 'Qoder Mobile' / Remote Control in %@ settings\"",
      'tasks.rc.guidance_history_sync': 'Session history sync',
      'tasks.rc.guidance_install': 'Install %@ on your computer and log in with the same account',
      'tasks.rc.guidance_login': 'Log in with the same account',
      'tasks.rc.guidance_open_settings': 'Open Quest – {settings} Settings – {smartphone} Mobile – Switch on',
      'tasks.action.archive': 'Archive', 'tasks.action.delete': 'Delete',
      'tasks.action.mark_read': 'Mark as Read', 'tasks.action.mark_unread': 'Mark as Unread',
      'tasks.detail.env': 'Running On', 'tasks.detail.remote_control': 'Remote Control',
      'tasks.detail.connected_to': 'Connected to %@',
      /* ---- v3.9.0 coverage completion (15 domains, official key names) ---- */
      'feedback.title': 'Feedback', 'notification.title': 'Notification',
      'about.icp_record': 'Zhejiang ICP No. 2023034206-56A',
      'about.permission_usage': 'Permission Access and Usage Description',
      'about.personal_info_collection_list': 'Personal Information Collection List',
      'about.personal_info_sharing_list': 'Third-party SDK Collection and Usage Information',
      'about.subscription_agreement': 'Individual Subscription Agreement',
      'account_security.account': 'Account',
      'account_security.delete_confirm_action': 'Delete',
      'account_security.delete_confirm_message.v2': 'Are you sure you want to delete your account? This action cannot be undone, and local data for this account on this device will also be deleted.',
      'account_security.delete_error_active_paid_plan': 'This account still has an active paid plan. Please cancel or manage the plan before deleting your account.',
      'account_security.delete_error_delete_failed': 'Failed to delete account. Please try again.',
      'account_security.delete_error_generic': 'Failed to send verification code. Please try again.',
      'account_security.delete_error_invalid_code': 'The verification code is incorrect or has expired. Please try again.',
      'account_security.delete_error_network': 'Network error. Please check your connection and try again.',
      'account_security.delete_error_no_email': 'No email address is associated with this account.',
      'account_security.delete_error_organization_member': '"Organization members can\'t delete their account here. Please contact your organization administrator."',
      'account_security.delete_error_server': 'Something went wrong. Please try again later.',
      'account_security.delete_error_unauthorized': 'Your session has expired. Please sign in again.',
      'account_security.delete_error_verification_code_failed': 'The verification code is incorrect. Please try again.',
      'account_security.deleting_account': 'Deleting account…',
      'account_security.resend_code': 'Resend code',
      'account_security.sending_code': 'Sending code…',
      'account_security.verification_code_placeholder': 'Enter verification code',
      'account_security.verification_subtitle': '"We\'ve sent a verification code to %1$s. Enter it below to confirm account deletion."',
      'account_security.verification_title': 'Verify Your Identity',
      'account_security.verify_and_delete': 'Verify & Delete',
      'app.name': 'Qoder',
      'app.name_domestic': 'Qoder CN',
      'auth.account_password_title.v2': 'Sign in with email',
      'auth.agree_prefix': 'I agree to Qoder’s',
      'auth.and': '" and "',
      'auth.application_not_found': 'The mobile login application is not registered.',
      'auth.brand': 'Qoder CN',
      'auth.captcha_failed': 'Captcha verification failed.',
      'auth.cn.agree_prefix': 'I have read and agree to',
      'auth.cn.enterprise_login': 'Enterprise sign-in',
      'auth.cn.enterprise_title': 'Sign in with enterprise account',
      'auth.cn.login_agree_prefix': 'An unregistered phone number will be registered after verification. I have read and agree to',
      'auth.cn.password_login': 'Aliyun sign-in',
      'auth.cn.password_login_short': 'Aliyun sign-in',
      'auth.cn.phone_login': 'Sign in with phone number',
      'auth.cn.phone_unavailable': 'Phone sign-in is not available yet.',
      'auth.cn.terms': 'Service Agreement',
      'auth.continue': 'Continue',
      'auth.continue.account_password': 'Continue with Email',
      'auth.continue.aliyun_phone': 'Sign in with Phone',
      'auth.continue.apple': 'Continue with Apple',
      'auth.continue.github': 'Sign in with Github',
      'auth.continue.google': 'Sign in with Google',
      'auth.continue.qoder': 'Continue',
      'auth.continue.vpc': 'VPC sign-in',
      'auth.continue_agreement_template': 'By continuing, you agree to our %1$s and %2$s.',
      'auth.email_invalid': 'Please enter a valid email address.',
      'auth.email_placeholder': 'Email',
      'auth.email_required': 'Please enter your email',
      'auth.enterprise_entry.email.subtitle': 'Sign in with your organization email, e.g. name@company.com',
      'auth.enterprise_entry.email.title': 'Enterprise Email',
      'auth.enterprise_entry.ram.subtitle': 'Use a RAM sub-account assigned by your organization',
      'auth.enterprise_entry.ram.title': 'Alibaba Cloud RAM Account',
      'auth.enterprise_entry.selection.help': 'Not sure which account to use? Contact your administrator',
      'auth.enterprise_entry.selection.subtitle': 'Choose the sign-in method for the account issued by your organization',
      'auth.enterprise_entry.selection.title': 'Choose an enterprise account type',
      'auth.enterprise_entry.title': 'Enterprise Account',
      'auth.enterprise_entry.vpc.subtitle': 'Sign in through your organization’s dedicated domain',
      'auth.enterprise_entry.vpc.title': 'VPC Account',
      'auth.enterprise_saml_required': 'This entry only supports enterprise accounts.',
      'auth.forgot_password': 'Forget password?',
      'auth.get_started': 'Get started',
      'auth.invalid_credentials': 'Incorrect username or password.',
      'auth.log_in': 'Log In',
      'auth.no_account': 'Don’t have an account?',
      'auth.or': 'OR',
      'auth.passport_account.mobile_login_disabled': 'Mobile login off',
      'auth.passport_account.title': 'Choose Alibaba Cloud account',
      'auth.password_hide': 'Hide password',
      'auth.password_placeholder': 'Password',
      'auth.password_required': 'Please enter your password.',
      'auth.password_show': 'Show password',
      'auth.privacy': 'Privacy Policy',
      'auth.sign_in': 'Sign in',
      'auth.sign_up': 'Sign up',
      'auth.signing_in': 'Signing in...',
      'auth.terms_alert_agree': 'Agree',
      'auth.terms_alert_description': 'I have read and agree to Qoder’s Terms of Service and Privacy Policy',
      'auth.terms_alert_title': 'Terms & Privacy',
      'auth.terms_sheet_agree_button': 'Agree & Continue',
      'auth.terms_sheet_description': 'Please review and agree to our terms before continuing.',
      'auth.terms_sheet_title': 'Terms & Conditions',
      'auth.username_placeholder': 'Enter your email address',
      'auth.username_required': 'Please enter your username.',
      'auth.vpc_account_placeholder': 'Account',
      'auth.vpc_account_required': 'Please enter your account.',
      'auth.vpc_address_host_required': 'VPC address must include a host.',
      'auth.vpc_address_invalid': 'Please enter a valid VPC address.',
      'auth.vpc_address_placeholder': 'https://vpc.example.com',
      'auth.vpc_address_required': 'Please enter your VPC address.',
      'auth.vpc_address_scheme_required': 'VPC address must use https://.',
      'auth.vpc_address_unsupported': 'Remove username, password, query, or fragment from the VPC address.',
      'auth.vpc_endpoints_unavailable': 'Could not fetch VPC service addresses. Check the address and try again.',
      'auth.vpc_login_title': 'VPC sign-in',
      'choose_environment.activate_device_offline_line': 'Device %1$s is currently offline',
      'choose_environment.activate_device_reconnect_line': 'Please turn on the device and ensure Qoder Desktop is connected',
      'choose_environment.activate_device_title': 'Activate Your Device',
      'choose_environment.active_sessions_title': 'Active Sessions',
      'choose_environment.chats': 'Chats',
      'choose_environment.choose_project': 'Choose Project',
      'choose_environment.connect_computer': 'Connect to your computer',
      'choose_environment.connect_computer_cli_heading': 'Connect with Qoder CLI',
      'choose_environment.connect_computer_desktop_enable': '"Open Quest and enable \'Qoder Mobile\' in Quest Settings"',
      'choose_environment.connect_computer_desktop_enable_inline_bold': '"Open Quest and enable \'Qoder Mobile\' in <b>Quest Settings</b>"',
      'choose_environment.connect_computer_desktop_heading': 'Connect with Qoder Desktop (Quest)',
      'choose_environment.connect_computer_desktop_install': 'Install Qoder Desktop on your computer and log in with the same account',
      'choose_environment.connect_computer_desktop_tab': 'Desktop',
      'choose_environment.connect_computer_guide_message': 'Turn on Remote Control in Qoder CLI to sync tasks',
      'choose_environment.connect_computer_guide_prefix': 'Run command ’',
      'choose_environment.connect_computer_guide_suffix': '’ in the terminal.',
      'choose_environment.connect_computer_instruction': 'Turn on Remote Control in Qoder CLI to sync tasks',
      'choose_environment.connect_device_connecting': 'Connecting with %1$s',
      'choose_environment.end_session_action': 'End',
      'choose_environment.end_session_confirm_message': '“%1$s” will be ended on this environment.',
      'choose_environment.end_session_confirm_title': 'End session?',
      'choose_environment.end_session_success': 'Session ended',
      'choose_environment.ide_agent': 'Agent',
      'choose_environment.ide_experts': 'Experts',
      'choose_environment.ide_projects_empty': 'Open a project in Qoder IDE to continue.',
      'choose_environment.local': 'Local',
      'choose_environment.offline': 'Offline',
      'choose_environment.title': 'Choose Environment',
      'choose_github.bind_failed': 'Unable to open GitHub connection page.',
      'choose_github.bind_message': 'Connect your GitHub account before choosing repositories.',
      'choose_github.branch_empty': 'No branches available',
      'choose_github.connect_dialog_message': 'You can revoke access at any time. Data from GitHub is only used to provide you with relevant and useful information.',
      'choose_github.install_button': 'Install Qoder on GitHub',
      'choose_github.install_failed': 'Unable to open GitHub install page.',
      'choose_github.install_hint': 'Repo missing? Install the Qoder AI app in a repository to access it here.',
      'choose_github.install_message': 'Repo missing. Install the Qoder AI app in a repository to access it here.',
      'choose_github.refresh_connection': 'Refresh',
      'choose_github.repository_empty': 'No repositories available',
      'choose_github.repository_title': 'Choose Repository',
      'close.drawer': 'Close navigation menu',
      'close.sheet': 'Close sheet',
      'cloud_sandbox.create_failed_toast': 'Failed to create sandbox. Please try again.',
      'cloud_sandbox_boot.stage.download_resume': 'Restored cloud container',
      'cloud_sandbox_boot.stage.repository_resume': 'Restored repository',
      'cloud_sandbox_boot.stage.setup_install': 'Run setup script',
      'cloud_sandbox_boot.status.skipped': 'Skipped',
      'cloud_sandbox_boot.timeout_message': 'No setup progress was received for 4 minutes.',
      'cloud_sandbox_boot.title_completed': 'Initialized session',
      'cloud_sandbox_boot.title_failed': 'Session initialization failed',
      'cloud_sandbox_boot.title_install': 'Initializing session',
      'cloud_sandbox_boot.title_resume': 'Resuming session',
      'cloud_sandbox_boot.title_resume_completed': 'Resumed session',
      'cloud_sandbox_boot.title_resume_failed': 'Session resume failed',
      'cloud_sandbox_boot.title_resume_timeout': 'Session resume timed out',
      'cloud_sandbox_boot.title_timeout': 'Session initialization timed out',
      'composer.attachment.camera_failed': 'Couldn’t capture this photo. Please try again.',
      'composer.attachment.camera_permission_denied': 'Camera access is required to take a photo',
      'composer.attachment.file_limit': 'You can attach up to %1$d files.',
      'composer.attachment.file_read_failed': 'File could not be read. Please try another file.',
      'composer.attachment.file_unsupported': 'File attachments are not available here.',
      'composer.attachment.file_upload_failed': 'File upload failed. Please try again.',
      'composer.attachment.image_limit': 'You can add up to 10 images',
      'composer.attachment.image_read_failed': 'Couldn’t read this image. Please try another one.',
      'composer.camera.back': 'Back',
      'composer.camera.collapse_controls': 'Collapse controls',
      'composer.camera.expand_controls': 'Expand controls',
      'composer.camera.flash_auto': 'Flash auto',
      'composer.camera.flash_off': 'Flash off',
      'composer.camera.flash_on': 'Flash on',
      'composer.camera.flash_unavailable': 'Flash unavailable',
      'composer.camera.switch_cameras': 'Switch cameras',
      'composer.camera.take_photo': 'Take photo',
      'composer.full_access': 'Full Access',
      'composer.generated_by_ai': 'Generated by AI',
      'composer.model_promotion.ends': 'Off-peak Discount Ends in %1$s!',
      'composer.model_promotion.starts': 'Off-peak Discount Starts in %1$s!',
      'composer.model_selector.advanced': 'Advanced',
      'composer.model_selector.pitaya': 'Pitaya-03-20',
      'composer.model_selector.safety': 'Enterprise',
      'composer.model_selector.standard': 'Standard',
      'composer.new_models': 'New Models',
      'composer.permission.section_qoder_cli': 'Enable in Qoder CLI',
      'composer.plan': 'Plan',
      'composer.premium_badge': 'Advanced',
      'composer.thinking_status': 'Thinking',
      'composer.toggle_on': 'On',
      'composer.voice_input.duration_limit_reached': 'Voice input reached the 3-minute limit. Transcribing...',
      'composer.voice_input.duration_warning': 'Voice input will stop automatically in 10 seconds.',
      'composer.voice_input.empty_transcript': 'No speech was detected. Please try again.',
      'composer.voice_input.permission_denied': 'Microphone permission is required for voice input.',
      'composer.voice_input.recording_failed': 'Unable to record voice input. Please try again.',
      'composer.voice_input.transcribing': 'Thinking',
      'composer.voice_polish.failed': 'Polishing failed; using raw transcript.',
      'composer.voice_polish.in_progress': 'Polishing…',
      'composer.yolo': 'YOLO',
      'content_description.avatar': 'Avatar',
      'content_description.back': 'Back',
      'content_description.conversation_turn.copy': 'Copy response',
      'content_description.conversation_turn.dislike': 'Dislike response',
      'content_description.conversation_turn.like': 'Like response',
      'content_description.google': 'Google',
      'content_description.logo': 'Qoder Logo',
      'content_description.markdown_code.expand': 'Expand code block',
      'content_description.qoder': 'Qoder',
      'conversation.empty.no_content': 'No content',
      'conversation.sources.count': '%1$d Sources',
      'conversation.sources.item_accessibility': '%1$s, %2$s',
      'conversation.turn.feedback_thanks': 'Thanks for your feedback',
      'conversation.uploaded_file_missing': 'File no longer exists',
      'conversation.uploaded_file_open_failed': '"Couldn\'t open this file"',
      'copy.toast_msg': 'Link copied to clipboard',
      'default.error_message': 'Invalid input',
      'default.popup_window_title': 'Pop-Up Window',
      'diff.expand': 'Tap to expand full patch',
      'diff.lines': '%d lines',
      'diff.preview': 'DIFF PREVIEW',
      'diff.title': 'DIFF',
      'dropdown.menu': 'Dropdown menu',
      'fallback.menu_item.copy_link': 'Copy link',
      'fallback.menu_item.open_in_browser': 'Open in browser',
      'fallback.menu_item.share_link': 'Share link',
      'feedback.copy_id': 'Copy Feedback ID',
      'feedback.description_required': 'Please enter your feedback.',
      'feedback.email_invalid': 'Please enter a valid email address.',
      'feedback.email_placeholder': 'Email',
      'feedback.email_required': 'Please enter your email address.',
      'feedback.id_copy_failed': 'Failed to copy Feedback ID',
      'feedback.placeholder': 'Please describe your issue or suggest improvements for Qoder',
      'feedback.placeholder_cn': 'Please describe the issue you encountered and your suggestions for Qoder CN',
      'feedback.recording.attachment': 'Screen recording',
      'feedback.recording.countdown': '%1$ds remaining',
      'feedback.recording.failed': 'Failed to record screen. Please try again.',
      'feedback.recording.preparing': 'Preparing recording…',
      'feedback.recording.preview_failed': 'Failed to play screen recording. Please try again.',
      'feedback.recording.stop': 'Stop recording',
      'feedback.recording.title': 'Screen recording',
      'feedback.session_id_copied': 'Session ID copied',
      'feedback.session_id_label': 'Session ID',
      'feedback.source.choose_file': 'Choose File',
      'feedback.source.photo_library': 'Photo Library',
      'feedback.source.record_screen': 'Record Screen',
      'feedback.source_take_photo': 'Take Photo',
      'feedback.submit': 'Submit',
      'feedback.success': 'Feedback submitted successfully',
      'feedback.success_dialog_title': 'Feedback submitted successfully',
      'indeterminate': 'Partially checked',
      'markdown.code.source_unavailable': 'This code is no longer available. Go back and open it again.',
      'markdown.details.default_summary': 'Details',
      'navigation.menu': 'Navigation menu',
      'new_task.credits_banner_subtitle': 'Start a task and give it a try!',
      'new_task.credits_banner_title': '300 credits added.',
      'new_task.default_env': 'Default',
      'new_task.greeting_subtitle': 'How can Qoder help you?',
      'new_task.greeting_subtitle_cn': 'What can I help you with?',
      'new_task.greeting_title': 'Hi, %1$s',
      'new_task.greeting_title_guest': 'Hi there',
      'new_task.landing.cloud_operation_credit': '300 Welcome credits added. Explore now!',
      'new_task.landing.local_operation_pro_trial': 'Download desktop app. Pro FREE for 1st month.',
      'new_task.landing.prompt_pending': 'Trend analysis needs data source confirmation',
      'new_task.landing.prompt_pending_text': 'Trend analysis needs data source confirmation',
      'new_task.landing.prompt_unread': 'Survey report generated 12 insights',
      'new_task.landing.prompt_unread_text': 'Survey report generated 12 insights',
      'new_task.landing.task_message_label': '%1$s %2$s',
      'new_task.landing.task_status.action_required': 'Action Required',
      'new_task.landing.task_status.error': 'Error',
      'new_task.no_connection_subtitle': '"Launch Remote Control in Qoder eg. run \'qodercli remote-control\' in terminal"',
      'new_task.no_connection_subtitle_cn': '"Launch Remote Control in Qoder eg. run \'qoderclicn remote-control\' in terminal"',
      'new_task.no_connection_title': 'No connection yet',
      'new_task.prompt.build_app': 'Build a new app',
      'new_task.prompt.build_app_text': 'Build a simple todo app with task creation, completion, deletion, and list display. Please prioritize a basic version that can run directly.',
      'new_task.prompt.fix_bug': 'Fix a defect',
      'new_task.prompt.fix_bug_text': 'Check whether this project has obvious errors, abnormal logic, or performance issues. If you find problems, help me fix them with the smallest reasonable changes.',
      'new_task.prompt.generate_ui': 'Build UI from screenshot',
      'new_task.prompt.generate_ui_text': 'Implement an interface that matches the screenshot I uploaded as closely as possible. Prefer reusing the current project technology stack and component style, and keep the code simple.',
      'new_task.prompt.understand_project': 'Understand project',
      'new_task.prompt.understand_project_text': 'Help me quickly understand the project structure and main features, and tell me which files or modules I should start with if I want to keep developing it.',
      'new_task.rc.cli_landing_title': '"Engineering in the terminal What are we building today ?"',
      'new_task.rc.landing_title': '"Quest on, hands off What are we building today ?"',
      'new_task.rc.prompt_compare': 'Compare these two vendors - pick one',
      'new_task.rc.prompt_plan': 'Break down Q4 plan, dispatch agents in parallel',
      'new_task.select_env': 'Select an environment to get started',
      'new_task.title': 'New Task',
      'new_task.unavailable_device_banner': 'Oops~ Your device is not available now',
      'new_task.unavailable_device_placeholder': 'Turn on remote control in Qoder CLI',
      'new_task.unavailable_device_placeholder_desktop': 'Turn on remote control in Qoder Desktop',
      'not_selected': 'Not selected',
      'notification.action_review': 'Review',
      'notification.action_view': 'View',
      'notification.approval_description': 'Authorize agent before it takes action',
      'notification.approval_title': 'Approval',
      'notification.ask_permission_description': 'Authorize agent before it takes action',
      'notification.ask_permission_title': 'Ask Permission',
      'notification.channel.task_updates': 'Task Updates',
      'notification.channel.task_updates_description': 'Approval requests and questions from your tasks',
      'notification.default_body': 'A session needs your attention',
      'notification.la.more_format': '%1$d More',
      'notification.la.state_awaiting': 'Awaiting Approval',
      'notification.la.state_error': 'Error',
      'notification.la.state_needs_input': 'Needs Input',
      'notification.new_session_title': 'New Session',
      'notification.plan_review_description': 'Review development plans before execution',
      'notification.plan_review_title': 'Plan Review',
      'notification.qa_description': 'Respond to live queries from agent',
      'notification.qa_title': 'Q&A',
      'notification.session_created': 'Session created',
      'notification.system_description': '"You\'ll receive notifications on home screen when new messages arrive"',
      'notification.system_status_on': 'On',
      'notification.system_title': 'System Notification',
      'notification.task_completed_description': 'Get notified when a task run completes',
      'notification.task_completed_title': 'Completed by turns',
      'notification.title.task_failed': 'Task failed',
      'numberauth.carrier_desc': 'Authentication service provided by China Mobile',
      'numberauth.change_phone_short': 'Change',
      'numberauth.error.business_failure_default': 'One-click login failed. Please try again.',
      'numberauth.error.carrier_unavailable': 'Carrier authentication is temporarily unavailable. Please use another sign-in method.',
      'numberauth.error.config_invalid': 'One-click login configuration error. Please contact support.',
      'numberauth.error.device_unsupported': 'This device does not support one-click login. Please use another sign-in method.',
      'numberauth.error.enable_mobile_network': 'Turn on mobile data and try again.',
      'numberauth.error.fallback': 'One-click login failed. Please use another sign-in method.',
      'numberauth.error.network_timeout': 'Network timed out. Please try again later.',
      'numberauth.error.no_sim': 'No SIM card detected. Please use another sign-in method.',
      'numberauth.error.retry_or_other_method': 'One-click login failed. Please try again later or use another sign-in method.',
      'numberauth.error.risk_control_pending': 'Security check is not complete. Please try again or use another sign-in method.',
      'numberauth.label': 'Phone number',
      'numberauth.one_click_login': 'One-Click Login',
      'password_login.account_placeholder': 'Aliyun account (phone/email/ID)',
      'password_login.aliyun_privacy': 'Privacy Policy',
      'password_login.aliyun_user_agreement': 'Alibaba Cloud User Agreement',
      'password_login.mfa_cancelled': 'Verification was not completed. Please try again.',
      'password_login.password_placeholder.v2': 'Password',
      'password_login.qoder_privacy': 'Privacy Policy',
      'password_login.qoder_user_agreement': 'Qoder CN User Agreement',
      'password_login.terms_prefix': 'I have read and agree to',
      'password_login.title': 'Sign in with Aliyun',
      'permission_purpose.conversation_camera_message': 'Camera access is used to take photos and add them to your message so Qoder can understand image content and complete your task.',
      'permission_purpose.conversation_camera_title': '“%1$s” wants to access Camera for Conversations.',
      'permission_purpose.deny': '"Don\'t Allow"',
      'permission_purpose.feedback_camera_message': 'Camera access is used to take photos for feedback attachments so we can understand your issue and help troubleshoot.',
      'permission_purpose.feedback_camera_title': '“%1$s” wants to access Camera for Feedback.',
      'permission_purpose.feedback_screen_recording_message': 'Screen recording access is used to capture what happens in Qoder and attach the video to your feedback so we can troubleshoot the issue.',
      'permission_purpose.feedback_screen_recording_title': '“%1$s” wants to record your screen for Feedback.',
      'permission_purpose.feedback_screenshot_deny': 'Don’t Add',
      'permission_purpose.feedback_screenshot_message': 'Allow Qoder to find the screenshot you just took in Photos and add it to this feedback?',
      'permission_purpose.feedback_screenshot_title': 'Add screenshot to feedback',
      'permission_purpose.microphone_message': 'Microphone access is used to record your voice and transcribe it into message text.',
      'permission_purpose.microphone_title': '“%1$s” wants to access Microphone.',
      'preview.tool.failed': 'Could not open the preview. Please try again.',
      'preview.tool.opening': 'Opening preview…',
      'preview.tool.port': 'Port %d',
      'preview.tool.title': 'Open Preview',
      'preview.unavailable.restart_prompt': 'Restart the preview',
      'range.end': 'Range end',
      'range.start': 'Range start',
      'screenshot_quick_action.feedback': 'Send as feedback',
      'screenshot_quick_action.title': 'Screenshot captured',
      'security_policy.message': '"Your organization\'s security policy currently prevents access to Qoder Mobile."',
      'security_policy.title': 'Security Policy Restriction',
      'selected': 'Selected',
      'session.details.close': 'Close session details',
      'session.details.copy_id_accessibility': 'Session ID %1$s. Double tap to copy.',
      'session.details.open_accessibility': 'Show session details',
      'session.details.unavailable': 'Not available',
      'sidebar.code': 'Code',
      'sidebar.work': 'Work',
      'sms.account_id': 'Account ID: %1$s',
      'sms.code_sent': 'Verification code sent',
      'sms.code_sent_to': 'to +86%1$s',
      'sms.confirm_login': 'Sign in now',
      'sms.enter_phone': 'Enter phone number',
      'sms.error.account_banned': 'Account has been banned',
      'sms.error.account_not_found': 'No account registered with this number',
      'sms.error.challenge_missing': 'Please request a verification code first',
      'sms.error.code_expired': 'Code has expired. Please request a new one.',
      'sms.error.code_invalid': 'Invalid or expired code',
      'sms.error.code_required': 'Please enter 6-digit code',
      'sms.error.generic': 'Operation failed. Please try again.',
      'sms.error.invalid_phone': 'Please enter a valid phone number',
      'sms.error.network': 'Network error. Please check your connection.',
      'sms.error.phone_login_unavailable': 'Phone sign-in is not available yet',
      'sms.error.too_many_requests': 'Too many requests. Please try again later.',
      'sms.last_active': 'Last active: %1$s',
      'sms.phone_placeholder': 'Enter your phone number',
      'sms.recent_login': 'Recent login',
      'sms.resend': 'Resend',
      'sms.resend_countdown': 'Resend (%1$ds)',
      'sms.select_account': 'Choose Alibaba Cloud account',
      'sms.select_account_hint': 'This phone number is linked to multiple accounts. Please select one to sign in.',
      'sms.terms_agreed': 'I have read and agree to the Service Agreement and Privacy Policy',
      'startup_authorization.agree': 'Agree',
      'startup_authorization.aliyun_privacy_policy_label': 'Privacy Policy',
      'startup_authorization.aliyun_user_agreement_label': 'User Agreement',
      'startup_authorization.disagree': 'Disagree',
      'startup_authorization.message': '"Welcome to this app. Before using this app, please carefully read the Alibaba Cloud User Agreement, Privacy Policy, Qoder Privacy Policy, and User Agreement. This app requires network access during use, which may incur data charges. To ensure normal operation, security, and risk control, we may request system permissions based on the features you use, including but not limited to microphone, camera, location, storage, reading the local phone number, reading and writing media data such as photos, videos, and audio, and screen capture. These permissions are used to provide voice, image, and text instruction input services. By tapping “Agree”, you agree to be bound by the terms of the agreements."',
      'startup_authorization.qoder_privacy_policy_label': 'Privacy Policy',
      'startup_authorization.qoder_user_agreement_label': 'User Agreement',
      'startup_authorization.title': 'Welcome to Qoder',
      'state.empty': 'Empty',
      'state.on': 'On',
      'switch.role': 'Switch',
      'system.default_channel': 'System Default Channel',
      'tab': 'Tab',
      'tasks.archive.empty': 'No archived tasks',
      'tasks.debug.raw_data_empty': 'No data',
      'tasks.debug.view_raw_data': 'View raw data',
      'tasks.delete.confirm_message': '“%1$s” will be permanently deleted.',
      'tasks.delete.confirm_title': 'Delete task?',
      'tasks.empty.short_description': 'Tap + to start a task',
      'tasks.empty.short_title': 'No tasks yet',
      'tasks.group.other': 'Other',
      'tasks.load_more': 'Load more',
      'tasks.pin.action': 'Pin',
      'tasks.plan_review.allow_once': 'Run',
      'tasks.plan_review.back': 'Back',
      'tasks.plan_review.feedback_placeholder': 'What would you like to adjust in the plan?',
      'tasks.plan_review.feedback_submit': 'Submit feedback',
      'tasks.plan_review.prompt': 'The plan is ready for execution.',
      'tasks.plan_review.title': 'Plan',
      'tasks.question.answer_input_placeholder': 'Enter your answer...',
      'tasks.question.answer_no': 'No',
      'tasks.question.answer_yes': 'Yes',
      'tasks.question.answered': 'Answered',
      'tasks.question.answers_title': 'Question Answers',
      'tasks.question.custom_answer_label': 'Or enter a custom answer',
      'tasks.question.custom_value': 'Or enter a custom answer',
      'tasks.question.multi_choice_title_suffix': '(Multi-choice)',
      'tasks.question.pagination': '%1$d of %2$d',
      'tasks.question.panel_title': 'Questions',
      'tasks.question.please_specify': 'Or enter a custom answer',
      'tasks.question.previous_question': 'Previous question',
      'tasks.question.primary_action': 'Continue',
      'tasks.question.primary_action_submitting': 'Submitting...',
      'tasks.restore.action': 'Restore',
      'tasks.restore.failed': 'Failed to restore, please try again',
      'tasks.restore.unsupported': 'Not supported yet',
      'tasks.section.action_required': 'Action Required',
      'tasks.section.archived': 'Archived Tasks',
      'tasks.section.pinned': 'Pinned',
      'tasks.show_more': 'Show more',
      'tasks.sort.by': 'Group by',
      'tasks.sort.date': 'Date',
      'tasks.sort.project': 'Project',
      'tasks.sort.status': 'Status',
      'tasks.source.remote': 'Remote',
      'tasks.switcher.all_tasks': 'All tasks',
      'tasks.tab.archived': 'Archived',
      'tasks.time.days_ago': '%dd ago',
      'tasks.time.hours_ago': '%dh ago',
      'tasks.time.minutes_ago': '%dm ago',
      'tasks.time.now': 'Just now',
      'tasks.title': 'Code',
      'tasks.tool_group.edit_files': 'Edit %d files',
      'tasks.tool_group.edited_files': 'Edited %d files',
      'tasks.tool_group.files_count': '%d files',
      'tasks.tool_group.read_files_completed': 'Read %d files',
      'tasks.tool_group.read_images': 'Read %d images',
      'tasks.tool_group.view_steps': 'View %d steps',
      'tasks.tool_use.action.edited': 'Edited',
      'tasks.tool_use.action.write': 'Write',
      'tasks.tool_use.action.wrote': 'Wrote',
      'tasks.tool_use.default_tail': 'Waiting for response...',
      'tasks.tool_use.detail.command': 'Command',
      'tasks.tool_use.detail.content': 'Content',
      'tasks.tool_use.detail.file_path': 'File path',
      'tasks.tool_use.detail.output': 'Output',
      'tasks.tool_use.detail.prompt': 'Prompt',
      'tasks.tool_use.detail.query': 'Query',
      'tasks.tool_use.edit_file': 'Edit file',
      'tasks.tool_use.read_file': 'Read file',
      'tasks.tool_use.running_tail': 'Waiting for response...',
      'tasks.tool_use.tool': 'Tool',
      'tasks.tool_use.web_fetch.completed': 'Fetch completed',
      'tasks.tool_use.web_fetch.failed': 'Fetch failed',
      'tasks.tool_use.web_fetch.running': 'Fetching',
      'tasks.tool_use.web_fetch.target.v2': 'Fetched %1$s',
      'tasks.tool_use.web_search.completed': 'Search completed',
      'tasks.tool_use.web_search.failed': 'Search failed',
      'tasks.tool_use.web_search.query.v2': 'Searched %1$s',
      'tasks.tool_use.web_search.running': 'Searching the web',
      'tasks.tool_use.write_file': 'Edit File',
      'tasks.unpin.action': 'Unpin',
      'tasks.view_archived': 'View Archived Tasks',
      'template.percent': '%1$d percent.',
      'tooltip.description': 'tooltip',
      'tooltip.label': 'show tooltip',
      'update.action': 'Update Now',
      'update.checking': 'Checking…',
      'update.download_start_failed': 'Unable to start download. Please try again later.',
      'update.installing': 'Installing…',
      'update.later': 'Later',
      'update.no_update': 'Already up to date',
      'update.title': 'New Version %s Available',
      'usage.activity.expires_at': 'Limited-time offer ends on %1$s',
      'usage.activity.open_details': 'Open activity details',
      'usage.activity.quota.daily': '%1$s / %2$s times per day',
      'usage.activity.quota.generic': '%1$s / %2$s times',
      'usage.activity.quota.monthly': '%1$s / %2$s times per month',
      'usage.activity.remaining': '%1$s left',
      'usage.activity.remaining_today': '%1$s left today',
      'usage.activity.show_description': 'Show activity details',
      'usage.add_on_credits': 'Add-on Credits',
      'usage.error.empty_response': 'Unable to load usage data. Please try again.',
      'usage.plan_credits': 'Plan Credits',
      'usage.remaining_left': '%s left',
      'usage.renews_on': 'Renews on %s',
      'usage.shared_add_on_credits': 'Shared Add-on Credits',
      'usage.unit_credits': 'credits',
      'usage.used': 'Used',
      'usage.used_summary': '%1$s / %2$s (%3$d%% used)',
      'usage.view_details': 'View Details',
      'usage.your_cap': 'Your Cap',
      'workspace.sso_redirect': 'Redirecting to %s SSO…',
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
        '.qm-ready{padding:34px 0;text-align:center;color:var(--qm-text-2);font-size:13.5px;}' +
        /* v3.7.0 内嵌 mermaid 流程图卡 */
        'qm-mermaid{display:block;margin-top:8px;}');
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
        /* v3.7.0 mermaid 流程图卡（源码经属性转义，卡片自身再 esc） */
        if (m.mermaid) {
          inner += '<qm-mermaid source="' + esc(String(m.mermaid)).replace(/\n/g, '&#10;') + '"' +
            (this.getAttribute('theme') ? ' theme="' + esc(this.getAttribute('theme')) + '"' : '') + '></qm-mermaid>';
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

  /* ============================================================
     v3.7.0 composer.plus 内置条目（全部实证自 strings.xml，
     键名 composer_plus_connector_* / skill_* / plugin_* / file_*）
     宿主可用同名属性（JSON 数组）覆盖默认条目；空数组 → 空态文案
     ============================================================ */
  const PLUS_GROUPS = [
    { id: 'connectors', nameKey: 'composer.plus.connectors',
      emptyKey: 'composer.plus.connectors_empty', prefix: 'composer.plus.connector',
      items: ['computer_use', 'qoderwork', 'market'] },
    { id: 'skills', nameKey: 'composer.plus.skills',
      emptyKey: 'composer.plus.skills_empty', prefix: 'composer.plus.skill',
      items: ['docx', 'pdf', 'xlsx'] },
    { id: 'plugins', nameKey: 'composer.plus.plugins',
      emptyKey: 'composer.plus.plugins_empty', prefix: 'composer.plus.plugin',
      items: ['consulting', 'equity', 'marketing', 'pe', 'pm'] },
    { id: 'files', nameKey: 'composer.plus.files',
      emptyKey: 'composer.plus.files_empty', prefix: 'composer.plus.file',
      items: ['ai_analysis', 'logo_design'], plain: true }
  ];

  /* ============================================================
     v3.7.0 mermaid 净室迷你渲染器（零依赖，输出前一律 esc()）
     支持子集：graph|flowchart TD/TB/LR/RL/BT；节点 A[方] A(圆角) A{菱形}；
     边 A --> B / A -.-> B / A ==> B / A --- B；
     边标签 A -- 文本 --> B 与 A -->|文本| B；%% 注释行忽略；
     Kahn 分层防环；解析不出节点 → null（调用方进入失效态）
     ============================================================ */
  function parseMermaid(src) {
    const s = String(src || '');
    const dm = /(?:^|\n)\s*(?:graph|flowchart)\s+([A-Za-z]{2})\b/.exec(s);
    const dir = dm && (dm[1].toUpperCase() === 'LR' || dm[1].toUpperCase() === 'RL') ? 'LR' : 'TD';
    const nodes = new Map(); const order = []; const edges = [];
    const node = (id, label, shape) => {
      if (!/^[A-Za-z0-9_]+$/.test(id)) return null;
      if (!nodes.has(id)) { nodes.set(id, { id: id, label: label || id, shape: shape || 'rect' }); order.push(id); }
      else if (label) { const n = nodes.get(id); n.label = label; if (shape) n.shape = shape; }
      return nodes.get(id);
    };
    s.split(/\n|;/).forEach((raw) => {
      let line = raw.trim();
      if (!line || /^(?:graph|flowchart)\b/i.test(line) || /^%%/.test(line)) return;
      /* 1) 登记行内节点定义，随后把形别语法剥掉只留 id，方便边解析 */
      line = line.replace(/([A-Za-z0-9_]+)\[([^\]]*)\]|([A-Za-z0-9_]+)\(([^)]*)\)|([A-Za-z0-9_]+)\{([^}]*)\}/g,
        (all, a, la, b, lb, c, lc) => {
          if (a != null) { node(a, la, 'rect'); return a; }
          if (b != null) { node(b, lb, 'round'); return b; }
          node(c, lc, 'diamond'); return c;
        });
      /* 2) 边（按算符优先级，一行取第一条） */
      for (const op of ['-.->', '-->', '==>', '---', '--']) {
        const i = line.indexOf(op);
        if (i <= 0) continue;
        const left = line.slice(0, i).trim();
        const right = line.slice(i + op.length).trim();
        const lm = /^([A-Za-z0-9_]+)(?:\s+--\s*(.+))?$/.exec(left);
        if (!lm) return;
        let label = lm[2] != null ? lm[2].trim() : '';
        let rid = null;
        const rp = /^\|([^|]*)\|\s*([A-Za-z0-9_]+)/.exec(right);
        if (rp) { if (!label) label = rp[1].trim(); rid = rp[2]; }
        else { const rm = /^([A-Za-z0-9_]+)/.exec(right); rid = rm ? rm[1] : null; }
        if (rid && node(lm[1]) && node(rid)) edges.push({ from: lm[1], to: rid, label: label });
        return;
      }
      /* 3) 裸节点行 */
      const bare = /^([A-Za-z0-9_]+)$/.exec(line);
      if (bare) node(bare[1]);
    });
    if (!order.length) return null;
    return { dir: dir, nodes: order.map((id) => nodes.get(id)), edges: edges };
  }

  function layoutMermaid(parsed) {
    if (!parsed || !parsed.nodes.length) return null;
    const dir = parsed.dir;
    const idx = new Map(parsed.nodes.map((n, i) => [n.id, i]));
    const adj = parsed.nodes.map(() => []);
    const indeg = parsed.nodes.map(() => 0);
    parsed.edges.forEach((e) => {
      const a = idx.get(e.from), b = idx.get(e.to);
      if (a != null && b != null) { adj[a].push(b); indeg[b] += 1; }
    });
    /* Kahn 分层（防环：seen 兼底，环内节点落在最后层） */
    const depth = parsed.nodes.map(() => 0);
    const seen = parsed.nodes.map(() => false);
    let frontier = indeg.map((d, i) => d === 0 ? i : -1).filter((i) => i >= 0);
    let lvl = 0;
    while (frontier.length) {
      const next = [];
      frontier.forEach((i) => {
        if (seen[i]) return; seen[i] = true; depth[i] = lvl;
        adj[i].forEach((j) => { if (!seen[j]) next.push(j); });
      });
      frontier = next; lvl += 1;
    }
    parsed.nodes.forEach((_, i) => { if (!seen[i]) depth[i] = Math.max(1, lvl - 1); });
    const layers = [];
    depth.forEach((d, i) => { (layers[d] = layers[d] || []).push(i); });
    /* 几何：TD 逐层纵向堆叠 / LR 逐列横向排列 */
    const NW = parsed.nodes.map((n) => Math.min(200, Math.max(72, n.label.length * 13.5 + 26)));
    const NH = parsed.nodes.map((n) => (n.shape === 'diamond' ? 54 : 38));
    const cx = parsed.nodes.map(() => 0), cy = parsed.nodes.map(() => 0);
    let W = 0, H = 0;
    if (dir === 'TD') {
      const rowW = layers.map((row) => row.reduce((s, i) => s + NW[i], 0) + 28 * (row.length - 1));
      W = Math.max.apply(null, rowW.concat([120]));
      let y = 24;
      layers.forEach((row, r) => {
        const rw = rowW[r]; let x = (W - rw) / 2;
        let hMax = 0;
        row.forEach((i) => { cx[i] = x + NW[i] / 2; cy[i] = y + NH[i] / 2; x += NW[i] + 28; hMax = Math.max(hMax, NH[i]); });
        y += hMax + 66;
      });
      H = y - 66 + 24;
    } else {
      const colH = layers.map((col) => col.reduce((s, i) => s + NH[i], 0) + 20 * (col.length - 1));
      H = Math.max.apply(null, colH.concat([90]));
      let x = 24;
      layers.forEach((col, c) => {
        const ch = colH[c]; let y = (H - ch) / 2;
        let wMax = 0;
        col.forEach((i) => { cy[i] = y + NH[i] / 2; cx[i] = x + NW[i] / 2; y += NH[i] + 20; wMax = Math.max(wMax, NW[i]); });
        x += wMax + 62;
      });
      W = x - 62 + 24;
    }
    return { W: W, H: H, NW: NW, NH: NH, cx: cx, cy: cy, layers: layers };
  }

  function renderMermaidSvg(src) {
    const parsed = parseMermaid(src);
    const geo = layoutMermaid(parsed);
    if (!parsed || !geo) return null;
    const idx = new Map(parsed.nodes.map((n, i) => [n.id, i]));
    const parts = ['<svg viewBox="0 0 ' + Math.round(geo.W) + ' ' + Math.round(geo.H) + '" xmlns="http://www.w3.org/2000/svg" role="img">',
      '<defs><marker id="qm-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">' +
      '<path d="M0 0L10 5L0 10z" fill="var(--qm-text-3)"/></marker></defs>'];
    /* 边先画（节点盖在上层） */
    parsed.edges.forEach((e) => {
      const a = idx.get(e.from), b = idx.get(e.to);
      if (a == null || b == null) return;
      const x1 = geo.cx[a], y1 = geo.cy[a], x2 = geo.cx[b], y2 = geo.cy[b];
      let d0;
      if (parsed.dir === 'TD') {
        const sy = y1 + geo.NH[a] / 2, ty = y2 - geo.NH[b] / 2, my = (sy + ty) / 2;
        d0 = 'M' + x1 + ' ' + sy + ' C' + x1 + ' ' + my + ',' + x2 + ' ' + my + ',' + x2 + ' ' + ty;
      } else {
        const sx = x1 + geo.NW[a] / 2, tx = x2 - geo.NW[b] / 2, mx = (sx + tx) / 2;
        d0 = 'M' + sx + ' ' + y1 + ' C' + mx + ' ' + y1 + ',' + mx + ' ' + y2 + ',' + tx + ' ' + y2;
      }
      parts.push('<path d="' + d0 + '" fill="none" stroke="var(--qm-text-3)" stroke-width="1.4" marker-end="url(#qm-arr)"/>');
      if (e.label) {
        const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
        parts.push('<text x="' + mx + '" y="' + my + '" text-anchor="middle" dominant-baseline="middle" ' +
          'font-size="11" fill="var(--qm-text-2)" stroke="var(--qm-surface)" stroke-width="4" ' +
          'paint-order="stroke">' + esc(e.label) + '</text>');
      }
    });
    parsed.nodes.forEach((n, i) => {
      const x = geo.cx[i] - geo.NW[i] / 2, y = geo.cy[i] - geo.NH[i] / 2;
      const w = geo.NW[i], h = geo.NH[i];
      if (n.shape === 'diamond') {
        parts.push('<polygon points="' + geo.cx[i] + ',' + y + ' ' + (x + w) + ',' + geo.cy[i] + ' ' + geo.cx[i] + ',' + (y + h) + ' ' + x + ',' + geo.cy[i] +
          '" fill="var(--qm-surface)" stroke="var(--qm-line-strong)"/>');
      } else {
        parts.push('<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" rx="' + (n.shape === 'round' ? h / 2 : 9) +
          '" fill="var(--qm-surface-2)" stroke="var(--qm-line-strong)"/>');
      }
      parts.push('<text x="' + geo.cx[i] + '" y="' + geo.cy[i] + '" text-anchor="middle" dominant-baseline="middle" ' +
        'font-size="12" fill="var(--qm-text)">' + esc(n.label) + '</text>');
    });
    parts.push('</svg>');
    return parts.join('');
  }

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
        '.qm-sheet{margin:0 -12px;background:var(--qm-surface);border-top:1px solid var(--qm-line);' +
        'max-height:560px;overflow-y:auto;}' +
        '.qm-sheet__hd{display:flex;justify-content:space-between;align-items:center;padding:11px 16px 4px;' +
        'font-size:13px;font-weight:700;}' +
        '.qm-sheet__x{font-size:16px;color:var(--qm-text-3);padding:0 4px;}' +
        '.qm-opt{display:flex;justify-content:space-between;align-items:center;gap:10px;width:100%;' +
        'padding:10px 16px;text-align:left;border-top:1px solid var(--qm-line);}' +
        '.qm-opt__t{font-size:14px;font-weight:600;}' +
        '.qm-opt__d{font-size:11.5px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-opt.on .qm-opt__t{color:var(--qm-primary);}' +
        '.qm-opt__ck{color:var(--qm-primary);font-weight:700;flex:none;}' +
        /* v3.7.0 plus 扩展面板 */
        '.qm-plus__entries{display:flex;gap:8px;padding:10px 16px 4px;}' +
        '.qm-plus__ent{flex:1;font-size:13px;font-weight:600;padding:9px 0;border-radius:10px;' +
        'background:var(--qm-surface-2);text-align:center;}' +
        '.qm-plus__grp{padding:4px 16px 2px;}' +
        '.qm-plus__gt{font-size:11.5px;color:var(--qm-text-3);padding:8px 0 2px;}' +
        '.qm-plus__item{display:block;width:100%;text-align:left;padding:9px 0;border-top:1px solid var(--qm-line);}' +
        '.qm-plus__grp .qm-plus__item:first-of-type{border-top:none;}' +
        '.qm-plus__t{display:block;font-size:14px;font-weight:600;}' +
        '.qm-plus__d{display:block;font-size:11.5px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-plus__empty{font-size:12.5px;color:var(--qm-text-3);padding:8px 0 4px;}');
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
      } else if (!disabled && panel === 'options') {
        /* v3.7.0 plus 扩展面板：入口行 模式/模型/Spec + 四组实证条目 */
        const ent = (id, key) => '<button class="qm-plus__ent" data-entry="' + id + '">' + esc(t(key)) + '</button>';
        const grp = (g) => {
          const raw = this.getAttribute(g.id);
          let items = null;
          if (raw != null) {
            const arr = json(raw, null);
            if (Array.isArray(arr)) items = arr.map((it) => (typeof it === 'string' ? { id: it } : it));
          }
          if (items == null) items = g.items.map((id) => ({ id: id }));
          let body;
          if (!items.length) body = '<div class="qm-plus__empty">' + esc(t(g.emptyKey)) + '</div>';
          else body = items.map((it) => {
            const id = it && it.id != null ? String(it.id) : '';
            const name = it && it.name != null ? it.name : (id ? t(g.prefix + '.' + id) : '');
            const subKey = g.prefix + '.' + id + '_subtitle';
            const desc = it && it.desc != null ? it.desc :
              (id && !g.plain && !(it && it.name != null) && t(subKey) !== subKey ? t(subKey) : '');
            return '<button class="qm-plus__item" data-plus="' + esc(g.id) + '" data-plus-id="' + esc(id) + '">' +
              '<span class="qm-plus__t">' + esc(name) + '</span>' +
              (desc ? '<span class="qm-plus__d">' + esc(desc) + '</span>' : '') + '</button>';
          }).join('');
          return '<div class="qm-plus__grp"><div class="qm-plus__gt">' + esc(t(g.nameKey)) + '</div>' + body + '</div>';
        };
        sheet = '<div class="qm-sheet"><div class="qm-sheet__hd"><span>' + esc(t('composer.options.open')) + '</span>' +
          '<button class="qm-sheet__x" data-close="1">✕</button></div>' +
          '<div class="qm-plus__entries">' + ent('mode', 'composer.plus.mode') +
          ent('model', 'composer.plus.model') + ent('spec', 'composer.plus.spec') + '</div>' +
          PLUS_GROUPS.map(grp).join('') + '</div>';
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
      root.querySelectorAll('[data-entry]').forEach((b) => {
        b.addEventListener('click', () => {
          const kind = b.dataset.entry;
          if (kind === 'mode' || kind === 'model') this.setAttribute('panel', kind);
          else this.emit('act', { kind });
        });
      });
      root.querySelectorAll('[data-plus]').forEach((b) => {
        b.addEventListener('click', () =>
          this.emit('plus-pick', { group: b.dataset.plus, id: b.dataset.plusId }));
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
    static get observedAttributes() { return ['kind', 'open', 'state', 'title', 'command', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-appr{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'box-shadow:var(--qm-shadow);overflow:hidden;}' +
        '.qm-appr__hd{padding:13px 15px 4px;font-weight:700;font-size:15.5px;display:flex;justify-content:space-between;align-items:center;gap:8px;}' +
        '.qm-appr__badge{flex:none;font-size:10.5px;color:var(--qm-accent-attention);border:1px solid currentColor;' +
        'border-radius:999px;padding:0 7px;font-weight:600;}' +
        '.qm-appr__badge--done{color:var(--qm-accent-completed);}' +
        '.qm-appr__badge--err{color:var(--qm-error);}' +
        '.qm-appr__lead{margin:10px 15px 0;font-size:12px;color:var(--qm-text-2);}' +
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
      const TITLES = { action: 'approval.title.run_command', edit: 'approval.title.edit', mcp: 'approval.title.mcp', plan: 'approval.title.enter_plan_mode', spec: 'approval.title.enter_plan_mode', request: 'approval.title.request', permission: 'approval.title.permission_required' };
      const title = this.getAttribute('title') || t(TITLES[kind] || TITLES.action);
      const state = this.getAttribute('state') || 'pending';
      const STATE_KEY = { pending: 'approval.pending', submitting: 'approval.submitting', submitted: 'approval.submitted', rejected: 'approval.rejected', approved: 'approval.approved' };
      const badgeCls = state === 'submitted' || state === 'approved' ? ' qm-appr__badge--done' : state === 'rejected' ? ' qm-appr__badge--err' : '';
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
        '<span class="qm-appr__badge' + badgeCls + '">' + esc(t(STATE_KEY[state] || STATE_KEY.pending)) + '</span></div>' +
        (!planLike && cmd ? '<div class="qm-appr__lead">' + esc(t('approval.execution_lead')) + '</div><div class="qm-appr__cmd">' + esc(cmd) + '</div>' : '') +
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
    static get observedAttributes() { return ['files', 'view', 'state', 'theme']; }
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
        '.qm-empty{padding:44px 0;text-align:center;color:var(--qm-text-2);font-size:13.5px;}' +
        '.qm-art__state{padding:46px 24px;text-align:center;color:var(--qm-text-2);font-size:13.5px;line-height:1.6;}' +
        '.qm-art__retry{margin-top:12px;padding:8px 26px;border-radius:var(--qm-radius-sm);font-size:13px;font-weight:600;'
 +
        'background:var(--qm-primary);color:var(--qm-on-primary);}' +
        '.qm-art__banner{margin:4px 16px 10px;padding:9px 12px;border-radius:var(--qm-radius-sm);'
 +
        'font-size:12.5px;line-height:1.55;background:color-mix(in srgb,var(--qm-accent-attention) 10%,transparent);'
 +
        'color:var(--qm-accent-attention);}');
    }
    template() {
      const files = json(this.getAttribute('files'), []) || [];
      const view = this.getAttribute('view') || 'preview';
      const state = this.getAttribute('state') || '';
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
      const FULL = {
        loading: 'artifact.loading', error: 'artifact.load_failed',
        not_found: 'artifact.not_found', unavailable: 'artifact.remote_local_resource_unavailable'
      };
      const BANNER = {
        restricted: 'artifact.share_restricted', stale: 'artifact.stale_fallback',
        too_large: 'artifact.too_large_download_to_view', low_memory: 'artifact.low_memory_download_to_view'
      };
      let body = '';
      if (FULL[state]) {
        body = '<div class="qm-art__state">' + esc(t(FULL[state])) +
          (state === 'error' ? '<br><button class="qm-art__retry" data-act="retry">' + esc(t('artifact.retry')) + '</button>' : '') + '</div>';
      } else {
        if (BANNER[state]) body += '<div class="qm-art__banner">' + esc(t(BANNER[state])) + '</div>';
        body += (groups || '<div class="qm-empty">' + esc(t('artifact.empty')) + '</div>');
      }
      return '<div class="qm-art__hd"><span class="qm-art__t">' + esc(t('artifact.title')) + '</span>' +
        '<div class="qm-art__seg">' + seg + '</div></div>' + body;
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
      const retry = root.querySelector('[data-act="retry"]');
      if (retry) retry.addEventListener('click', () => this.emit('retry', {}));
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
     <qm-settings> — 设置屏完整版（v3.8.0，对齐 T6/F.java 官方 IA）
     结构：settings.title 标题 → 资料卡(guest/plan_community/edit_profile)
       → 通用(appearance/language/usage/cache_cleanup)
       → settings_integrations.title(GitHub 状态机)
       → 设备(device_qr 眼镜配对) → 支持(check_update 更新失败态/
       feedback/notification/privacy/machine/billing 占位)
       → 关于(privacy/terms/version) → sign_out 确认
     属性：appearance=dark|light|system  github-state=loading|connecting|
       connected|disconnecting|disconnected(默认)  device-paired(布尔)
       update-state=install.error 键名后缀(installer_unavailable 等)  panel=cache
     事件：appearance-change / item(向后兼容) / github-action /
       device-pair / update-action / cache-clear / sign-out
     ============================================================ */
  class QmSettings extends Base {
    static get observedAttributes() { return ['appearance', 'github-state', 'device-paired', 'update-state', 'panel', 'confirm', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-set__hd{padding:14px 16px 6px;font-size:24px;font-weight:700;}' +
        '.qm-set__grp{margin:8px 12px;background:var(--qm-surface);border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);overflow:hidden;}' +
        '.qm-set__cap{margin:14px 16px 2px;font-size:12px;font-weight:600;color:var(--qm-text-2);letter-spacing:.2px;}' +
        '.qm-set__row{display:flex;justify-content:space-between;align-items:center;width:100%;padding:13px 15px;' +
        'font-size:14.5px;text-align:left;border-top:1px solid var(--qm-line);}' +
        '.qm-set__grp .qm-set__row:first-child{border-top:none;}' +
        '.qm-set__sub{display:block;font-size:11.5px;color:var(--qm-text-2);margin-top:3px;font-weight:400;}' +
        '.qm-set__v{color:var(--qm-text-2);font-size:13px;flex:none;}' +
        '.qm-set__badge{flex:none;font-size:10.5px;font-weight:700;color:var(--qm-primary);' +
        'border:1px solid currentColor;border-radius:999px;padding:1px 8px;margin-left:8px;}' +
        '.qm-set__ava{width:44px;height:44px;border-radius:50%;background:color-mix(in srgb,var(--qm-primary) 22%,transparent);' +
        'color:var(--qm-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:18px;flex:none;}' +
        '.qm-set__prof{display:flex;align-items:center;gap:12px;padding:14px 15px;}' +
        '.qm-set__nm{font-size:16.5px;font-weight:700;display:flex;align-items:center;}' +
        '.qm-set__ghdot{width:7px;height:7px;border-radius:50%;flex:none;margin-right:7px;}' +
        '.qm-set__seg{display:flex;background:var(--qm-surface-2);border-radius:8px;padding:2px;gap:2px;}' +
        '.qm-set__seg button{font-size:12px;padding:4px 10px;border-radius:6px;color:var(--qm-text-2);}' +
        '.qm-set__seg button.on{background:var(--qm-surface);color:var(--qm-text);font-weight:600;box-shadow:var(--qm-shadow);}' +
        '.qm-set__updbar{padding:11px 15px;border-top:1px solid var(--qm-line);font-size:12.5px;line-height:1.55;' +
        'color:var(--qm-accent-attention);background:color-mix(in srgb,var(--qm-accent-attention) 8%,transparent);}' +
        '.qm-set__updbtns{display:flex;gap:8px;margin-top:9px;}' +
        '.qm-set__updbtns button{flex:1;padding:8px 0;border-radius:var(--qm-radius-sm);font-size:12.5px;font-weight:600;' +
        'background:var(--qm-primary);color:var(--qm-on-primary);}' +
        '.qm-set__note{padding:12px 18px;font-size:11.5px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-set__out{margin:16px 12px 8px;width:calc(100% - 24px);padding:13px 0;text-align:center;font-size:14.5px;' +
        'font-weight:600;color:var(--qm-error);background:var(--qm-surface);border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);}' +
        '.qm-mask{position:fixed;inset:0;background:var(--qm-mask);display:flex;align-items:center;justify-content:center;z-index:99;}' +
        '.qm-dlg{width:min(320px,86%);background:var(--qm-surface);border-radius:16px;padding:16px;box-shadow:var(--qm-shadow);}' +
        '.qm-dlg__t{font-size:15.5px;font-weight:700;margin-bottom:8px;}' +
        '.qm-dlg__m{font-size:13px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-dlg__btns{display:flex;gap:9px;margin-top:14px;}' +
        '.qm-dlg__b{flex:1;padding:10px 0;border-radius:10px;font-size:14px;font-weight:600;}' +
        '.qm-dlg__b--primary{background:var(--qm-primary);color:var(--qm-on-primary);}' +
        '.qm-dlg__b--ghost{background:var(--qm-surface-2);color:var(--qm-text);}' +
        '.qm-dlg__b--danger{background:color-mix(in srgb,var(--qm-error) 14%,transparent);color:var(--qm-error);}' +
        '.qm-cc__val{font-size:12px;color:var(--qm-text-3);margin-top:2px;display:block;font-weight:400;}' +
        '.qm-cc__go{flex:none;font-size:12px;font-weight:700;color:var(--qm-primary);border:1px solid var(--qm-primary);' +
        'border-radius:999px;padding:4px 14px;}');
    }
    template() {
      const cur = this.getAttribute('appearance') || 'system';
      const ghState = this.getAttribute('github-state') || 'disconnected';
      const paired = this.hasAttribute('device-paired') && this.getAttribute('device-paired') !== 'false';
      const updState = this.getAttribute('update-state') || '';
      const panel = this.getAttribute('panel') || '';
      const seg = ['dark', 'light', 'system'].map((v) =>
        '<button class="' + (cur === v ? 'on' : '') + '" data-appearance="' + v + '">' +
        esc(t('appearance.' + v)) + '</button>').join('');
      const row = (label, value, act, sub) =>
        '<button class="qm-set__row" data-act="' + act + '"><span>' + esc(label) +
        (sub ? '<span class="qm-set__sub">' + esc(sub) + '</span>' : '') + '</span>' +
        '<span class="qm-set__v">' + esc(value || '') + ' ›</span></button>';
      /* GitHub 状态行（状态机：disconnected→connect / loading / connecting /
         connected→disconnect+configure / disconnecting） */
      const GH_COLOR = { connected: 'var(--qm-accent-completed)', loading: 'var(--qm-text-3)', connecting: 'var(--qm-accent-attention)', disconnecting: 'var(--qm-accent-attention)', disconnected: 'var(--qm-text-3)' };
      const GH_LABEL = { loading: 'settings_integrations.github_loading', connecting: 'settings_integrations.github_connecting', connected: 'settings_integrations.github_connected', disconnecting: 'settings_integrations.github_disconnecting', disconnected: 'settings_integrations.github_disconnected' };
      const ghLabel = t(GH_LABEL[ghState] || GH_LABEL.disconnected);
      let ghRow = '<button class="qm-set__row" data-act="github" part="github-row">' +
        '<span><span style="display:flex;align-items:center;font-weight:600">' +
        '<span class="qm-set__ghdot" style="background:' + (GH_COLOR[ghState] || GH_COLOR.disconnected) + '"></span>' +
        esc(t('settings_integrations.github_title')) + '</span>' +
        (ghState === 'connected' ? '<span class="qm-set__sub">' + esc(t('settings_integrations.github_configure')) + '</span>' : '') +
        '</span><span class="qm-set__v">' + esc(ghLabel) + '</span></button>';
      /* 更新失败横幅（update-state = update.install.* 后缀） */
      let updBar = '';
      if (updState) {
        const acts = [['update.action.download_again', 'download-again'], ['update.action.open_settings', 'open-settings'], ['update.action.try_again', 'try-again']];
        updBar = '<div class="qm-set__updbar" part="update-error">' + esc(t('update.install.' + updState)) +
          '<div class="qm-set__updbtns">' + acts.map(([k, a]) =>
            '<button data-update="' + a + '">' + esc(t(k)) + '</button>').join('') + '</div></div>';
      }
      /* 主面板 */
      let body;
      if (panel === 'cache') {
        /* 清理缓存子面板（settings.cache_cleanup.* 官方 14 键） */
        const item = (key, val) =>
          '<button class="qm-set__row" data-cache="' + key + '"><span>' +
          esc(t('settings.cache_cleanup.' + key + '_title')) +
          '<span class="qm-cc__val">' + esc(t('settings.cache_cleanup.' + key + '_description')) + '</span></span>' +
          '<span class="qm-cc__go">' + esc(t('settings.cache_cleanup.clear')) + '</span></button>';
        body = '<div class="qm-set__hd">' + esc(t('settings.cache_cleanup.confirm_title')) + '</div>' +
          '<div class="qm-set__grp">' +
          item('app', this.getAttribute('cache-app') || '') +
          item('artifact', this.getAttribute('cache-artifact') || '') +
          item('all', this.getAttribute('cache-all') || '') + '</div>' +
          '<div class="qm-set__note">' + esc(t('settings.placeholder')) + '</div>';
      } else {
        body = '<div class="qm-set__hd">' + esc(t('settings.title')) + '</div>' +
          /* 资料卡 */
          '<div class="qm-set__grp"><div class="qm-set__prof">' +
          '<span class="qm-set__ava">Q</span>' +
          '<span style="flex:1;min-width:0"><span class="qm-set__nm">' + esc(t('settings.guest')) +
          '<span class="qm-set__badge">' + esc(t('settings.plan_community')) + '</span></span></span>' +
          '<button class="qm-set__v" data-act="edit-profile" style="font-weight:600">' + esc(t('settings.edit_profile')) + ' ›</button></div></div>' +
          /* 通用 */
          '<div class="qm-set__cap">' + esc(t('session.details.general')) + '</div>' +
          '<div class="qm-set__grp"><div class="qm-set__row"><span>' + esc(t('settings.appearance')) + '</span>' +
          '<div class="qm-set__seg">' + seg + '</div></div>' +
          row(t('settings.language'), '', 'language') +
          row(t('settings.usage'), t('settings.plan_community'), 'usage') +
          row(t('settings.cache_cleanup'), '', 'cache') + '</div>' +
          /* 集成 */
          '<div class="qm-set__cap">' + esc(t('settings_integrations.title')) + '</div>' +
          '<div class="qm-set__grp">' + ghRow + '</div>' +
          /* 设备 */
          '<div class="qm-set__cap">' + esc(t('settings.machine')) + '</div>' +
          '<div class="qm-set__grp"><button class="qm-set__row" data-act="device-qr">' +
          '<span>' + esc(paired ? t('settings.device_qr.confirmed') : t('settings.device_qr.accessibility')) +
          (paired ? '' : '<span class="qm-set__sub">' + esc(t('settings.device_qr.caption')) + '</span>') + '</span>' +
          '<span class="qm-set__v">' + (paired ? '✓' : '') + ' ›</span></button></div>' +
          /* 支持 */
          '<div class="qm-set__cap">' + esc(t('settings.feedback')) + '</div>' +
          '<div class="qm-set__grp">' +
          row(t('settings.check_update'), '', 'check-update') +
          row(t('settings.notification'), '', 'notification') +
          row(t('settings.privacy'), '', 'privacy-row') +
          row(t('settings.machine'), '', 'machine') +
          row(t('settings.billing'), '', 'billing') +
          row(t('settings.feedback'), '', 'feedback-row') + '</div>' +
          (updBar ? '<div class="qm-set__grp">' + updBar + '</div>' : '') +
          /* 关于 */
          '<div class="qm-set__cap">' + esc(t('settings.about')) + '</div>' +
          '<div class="qm-set__grp">' +
          row(t('about.privacy_agreement'), '', 'privacy') +
          row(t('about.service_agreement'), '', 'terms') +
          row(fmt(t('about.version'), ['0.2.8']), '', 'version') + '</div>' +
          '<div class="qm-set__note">' + esc(t('about.ai_generated_content_notice')) + '</div>' +
          '<button class="qm-set__out" data-act="sign-out">' + esc(t('settings.sign_out')) + '</button>';
      }
      /* 对话框：sign-out / github 断开 / cache 确认 */
      let dlg = '';
      const dlgHtml = (titleKey, msgKey, okAct, danger) =>
        '<div class="qm-mask" data-mask="1" data-dlg="' + okAct + '"><div class="qm-dlg" part="dialog">' +
        '<div class="qm-dlg__t">' + esc(t(titleKey)) + '</div>' +
        '<div class="qm-dlg__m">' + esc(t(msgKey)) + '</div>' +
        '<div class="qm-dlg__btns"><button class="qm-dlg__b qm-dlg__b--ghost" data-dlg-cancel="1">' +
        esc(t('common.cancel')) + '</button>' +
        '<button class="qm-dlg__b ' + (danger ? 'qm-dlg__b--danger' : 'qm-dlg__b--primary') + '" data-dlg-ok="' + okAct + '">' +
        esc(t('common.confirm')) + '</button></div></div></div>';
      if (this.hasAttribute('confirm') ) {
        const c = this.getAttribute('confirm');
        if (c === 'sign-out') dlg = dlgHtml('settings.sign_out_confirm_title', 'settings.sign_out_confirm_message', 'sign-out-confirm', true);
        else if (c === 'github-disconnect') dlg = dlgHtml('settings_integrations.disconnect_confirm_title', 'settings_integrations.disconnect_confirm_message', 'github-disconnect-confirm', true);
        else if (c === 'cache-app') dlg = dlgHtml('settings.cache_cleanup.confirm_title', 'settings.cache_cleanup.confirm_app_message', 'cache-clear-app', false);
        else if (c === 'cache-artifact') dlg = dlgHtml('settings.cache_cleanup.confirm_title', 'settings.cache_cleanup.confirm_artifact_message', 'cache-clear-artifact', false);
        else if (c === 'cache-all') dlg = dlgHtml('settings.cache_cleanup.confirm_title', 'settings.cache_cleanup.confirm_all_message', 'cache-clear-all', false);
      }
      return '<div class="qm-set" part="panel">' + body + '</div>' + dlg;
    }
    _bind(root) {
      root.querySelectorAll('[data-appearance]').forEach((b) => {
        b.addEventListener('click', () => {
          this.setAttribute('appearance', b.dataset.appearance);
          this.emit('appearance-change', { appearance: b.dataset.appearance });
        });
      });
      root.querySelectorAll('[data-act]').forEach((b) => {
        b.addEventListener('click', () => {
          const a = b.dataset.act;
          if (a === 'sign-out') { this.setAttribute('confirm', 'sign-out'); return; }
          if (a === 'github' && (this.getAttribute('github-state') || 'disconnected') === 'connected') { this.setAttribute('confirm', 'github-disconnect'); return; }
          if (a === 'cache') { this.setAttribute('panel', 'cache'); this.emit('item', { action: 'cache' }); return; }
          this.emit('item', { action: a });
        });
      });
      root.querySelectorAll('[data-update]').forEach((b) => {
        b.addEventListener('click', () => this.emit('update-action', { action: b.dataset.update }));
      });
      root.querySelectorAll('[data-cache]').forEach((b) => {
        b.addEventListener('click', () => this.setAttribute('confirm', 'cache-' + b.dataset.cache));
      });
      root.querySelectorAll('[data-dlg-ok]').forEach((b) => {
        b.addEventListener('click', () => {
          const act = b.dataset.dlgOk;
          this.removeAttribute('confirm');
          if (act === 'sign-out-confirm') this.emit('sign-out', {});
          else if (act === 'github-disconnect-confirm') { this.setAttribute('github-state', 'disconnecting'); this.emit('github-action', { action: 'disconnect' }); }
          else if (act.startsWith('cache-clear-')) this.emit('cache-clear', { scope: act.slice(12) });
        });
      });
      const mask = root.querySelector('[data-mask]');
      if (mask) mask.addEventListener('click', (e) => { if (e.target === mask) this.removeAttribute('confirm'); });
      root.querySelectorAll('[data-dlg-cancel]').forEach((b) => {
        b.addEventListener('click', () => this.removeAttribute('confirm'));
      });
    }
  }

  /* ============================================================
     <qm-task-detail> — 任务详情 + 远程控制引导（v3.8.0，tasks_rc_*）
     实证：tasks_rc_title/subtitle、guidance_install/enable/login/download/
       open_settings/cli_intro/cli_command/cli_connect_current/
       cli_new_sessions/history_sync/coming_soon、tasks.action.*、
       tasks.detail.*、tasks.phase.*
     属性：title  phase=running|completed|failed|idle|waiting|attention|error
       env=desktop|cli  updated  rc=off|on  rc-device="MacBook Pro"
       cli-command="qoder connect"
     事件：action(archive|delete|mark-read|mark-unread) / rc-connect
     槽：slot="artifacts" 放置 <qm-artifact>
     ============================================================ */
  class QmTaskDetail extends Base {
    static get observedAttributes() { return ['title', 'phase', 'env', 'updated', 'rc', 'rc-device', 'cli-command', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-td__hd{padding:14px 16px 4px;display:flex;align-items:flex-start;gap:10px;}' +
        '.qm-td__back{flex:none;font-size:20px;line-height:1;color:var(--qm-text);padding:2px 6px 2px 0;}' +
        '.qm-td__t{font-size:19px;font-weight:700;line-height:1.35;flex:1;min-width:0;word-break:break-word;}' +
        '.qm-td__phase{flex:none;font-size:11px;font-weight:600;border-radius:999px;padding:2px 9px;margin-top:3px;}' +
        '.qm-td__meta{padding:0 16px 10px;font-size:12.5px;color:var(--qm-text-2);display:flex;gap:12px;flex-wrap:wrap;}' +
        '.qm-td__sec{margin:6px 12px;background:var(--qm-surface);border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);overflow:hidden;}' +
        '.qm-td__rc{margin:6px 12px;background:var(--qm-surface);border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);padding:14px 15px;}' +
        '.qm-td__rct{font-size:15.5px;font-weight:700;display:flex;align-items:center;gap:8px;}' +
        '.qm-td__rcs{font-size:12px;color:var(--qm-text-2);margin-top:2px;}' +
        '.qm-td__intro{font-size:13px;color:var(--qm-text-2);margin:10px 0 4px;}' +
        '.qm-td__way{font-size:13.5px;font-weight:700;margin:10px 0 4px;display:flex;align-items:center;gap:7px;}' +
        '.qm-td__soon{flex:none;font-size:9.5px;font-weight:700;color:var(--qm-accent-attention);' +
        'border:1px solid currentColor;border-radius:999px;padding:0 6px;}' +
        '.qm-td__step{display:flex;gap:9px;padding:6px 0;font-size:13px;line-height:1.55;color:var(--qm-text);align-items:flex-start;}' +
        '.qm-td__n{flex:none;width:17px;height:17px;border-radius:50%;background:var(--qm-surface-2);' +
        'color:var(--qm-text-2);font-size:10.5px;font-weight:700;display:flex;align-items:center;justify-content:center;margin-top:1px;}' +
        '.qm-td__cmd{margin:4px 0 2px;background:var(--qm-surface-2);border-radius:var(--qm-radius-sm);' +
        'padding:7px 10px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;' +
        'overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-td__feat{display:inline-flex;align-items:center;gap:5px;margin-top:8px;font-size:11.5px;' +
        'color:var(--qm-text-2);border:1px dashed var(--qm-line-strong);border-radius:999px;padding:3px 10px;}' +
        '.qm-td__on{display:flex;align-items:center;gap:9px;font-size:13.5px;font-weight:600;}' +
        '.qm-td__okdot{width:8px;height:8px;border-radius:50%;background:var(--qm-accent-completed);flex:none;}' +
        '.qm-td__acts{display:flex;gap:8px;padding:4px 12px 6px;flex-wrap:wrap;}' +
        '.qm-td__act{flex:1;min-width:74px;padding:9px 0;border-radius:var(--qm-radius-sm);font-size:12.5px;' +
        'font-weight:600;background:var(--qm-surface);border:1px solid var(--qm-line);color:var(--qm-text);}' +
        '.qm-td__act--danger{color:var(--qm-error);}' +
        '.qm-td__art{padding:4px 0 8px;}');
    }
    template() {
      const title = this.getAttribute('title') || '';
      const phaseRaw = this.getAttribute('phase') || 'idle';
      const phaseKey = ({ attention: 'waiting', error: 'failed' })[phaseRaw] || phaseRaw;
      const color = statusColor(phaseRaw === 'closed' ? 'idle' : phaseRaw);
      const env = this.getAttribute('env') || 'desktop';
      const rcOn = this.getAttribute('rc') === 'on';
      const rcDevice = this.getAttribute('rc-device') || '';
      const cliCmd = this.getAttribute('cli-command') || 'qoder connect';
      const step = (n, txt) => '<div class="qm-td__step"><span class="qm-td__n">' + n + '</span><span>' + txt + '</span></div>';
      const meta = '<div class="qm-td__meta">' +
        '<span>' + esc(t('tasks.detail.env')) + ' · ' +
        esc(t(env === 'cli' ? 'tasks.rc.cli_device' : 'tasks.rc.desktop_device')) + '</span>' +
        (this.getAttribute('updated') ? '<span>' + esc(t('session.details.last_updated')) + ' ' + esc(this.getAttribute('updated')) + '</span>' : '') +
        '</div>';
      /* RC 引导序列（rc=off）：Desktop 三步 + CLI 四步（官方 guidance_* 键序） */
      const rcCard = rcOn
        ? '<div class="qm-td__rc" part="remote-control"><div class="qm-td__on">' +
          '<span class="qm-td__okdot"></span>' +
          esc(rcDevice ? fmt(t('tasks.detail.connected_to'), [rcDevice]) : t('tasks.detail.remote_control')) +
          '</div><div class="qm-td__rcs">' + esc(t('tasks.rc.subtitle')) + '</div></div>'
        : '<div class="qm-td__rc" part="remote-control">' +
          '<div class="qm-td__rct">' + esc(t('tasks.rc.title')) +
          '<span class="qm-td__soon">' + esc(t('tasks.rc.guidance_coming_soon')) + '</span></div>' +
          '<div class="qm-td__rcs">' + esc(t('tasks.rc.subtitle')) + '</div>' +
          '<div class="qm-td__intro">' + esc(t('tasks.rc.guidance_cli_intro')) + '</div>' +
          '<div class="qm-td__way">' + esc(t('tasks.rc.desktop')) + '</div>' +
          step(1, esc(t('tasks.rc.guidance_download'))) +
          step(2, esc(fmt(t('tasks.rc.guidance_install'), [t('tasks.rc.desktop')]))) +
          step(3, esc(t('tasks.rc.guidance_login'))) +
          step(4, esc(fmt(t('tasks.rc.guidance_enable'), [t('tasks.rc.desktop')]))) +
          step(5, esc(t('tasks.rc.guidance_open_settings').replace('{settings}', '⚙').replace('{smartphone}', '📱'))) +
          '<div class="qm-td__way">' + esc(t('tasks.rc.cli')) + '</div>' +
          step(1, esc(t('tasks.rc.guidance_download'))) +
          step(2, '<span>' + esc(t('tasks.rc.guidance_cli_command')).replace('%@', '') +
            '<span class="qm-td__cmd">' + esc(cliCmd) + '</span></span>') +
          step(3, esc(t('tasks.rc.guidance_cli_connect_current')) + ' · ' +
            esc(t('tasks.rc.guidance_cli_new_sessions'))) +
          '<span class="qm-td__feat">⇅ ' + esc(t('tasks.rc.guidance_history_sync')) + '</span>' +
          '</div>';
      const acts = [
        ['mark-read', 'tasks.action.mark_read', ''],
        ['mark-unread', 'tasks.action.mark_unread', ''],
        ['archive', 'tasks.action.archive', ''],
        ['delete', 'tasks.action.delete', 'qm-td__act--danger']
      ];
      return '<div class="qm-td" part="panel">' +
        '<div class="qm-td__hd"><button class="qm-td__back" data-act-back="1">‹</button>' +
        '<span class="qm-td__t">' + esc(title) + '</span>' +
        '<span class="qm-td__phase" style="color:' + color + ';background:color-mix(in srgb,' + color + ' 12%,transparent)">' +
        esc(t('tasks.phase.' + phaseKey)) + '</span></div>' +
        meta + rcCard +
        '<div class="qm-td__acts">' + acts.map(([a, k, cls]) =>
          '<button class="qm-td__act ' + cls + '" data-action="' + a + '">' + esc(t(k)) + '</button>').join('') + '</div>' +
        '<div class="qm-td__art"><slot name="artifacts"></slot></div>' +
        '</div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-action]').forEach((b) => {
        b.addEventListener('click', () => this.emit('action', { action: b.dataset.action }));
      });
      const back = root.querySelector('[data-act-back]');
      if (back) back.addEventListener('click', () => this.emit('back', {}));
    }
  }

  /* ============================================================
     <qm-session-list> — 工作区会话列表（第三 tab，v3.7.0）
     实证：workspace_title 工作区 / workspace_section_active 活跃 /
       workspace_section_closed 已关闭 / workspace_metric_*（活跃/已关闭/
       设备）/ workspace_loading 正在加载会话… / workspace_rename_title
       任务名称 + workspace_rename_agree 确定 / workspace_open_settings
       打开设置 / workspace_read_file(s) 读取 %d 个文件
     sessions = [{id,title,status,updated,files}]；status === 'closed'
       进已关闭分组，其余进活跃分组（attention→等待审批等复用 tasks.phase.*）
     events: session-open / rename-request / rename / settings-open
     ============================================================ */
  class QmSessionList extends Base {
    static get observedAttributes() { return ['sessions', 'devices', 'loading', 'renaming', 'title', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-ws__hd{display:flex;justify-content:space-between;align-items:center;padding:14px 16px 8px;}' +
        '.qm-ws__t{font-size:24px;font-weight:700;letter-spacing:.2px;}' +
        '.qm-ws__gear{font-size:12px;color:var(--qm-text-2);padding:6px 10px;border-radius:9px;}' +
        '.qm-ws__gear:hover{background:var(--qm-surface-2);color:var(--qm-text);}' +
        '.qm-ws__metrics{display:flex;gap:8px;padding:0 16px 12px;}' +
        '.qm-ws__metric{flex:1;background:var(--qm-surface);border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);padding:10px 12px;box-shadow:var(--qm-shadow);}' +
        '.qm-ws__num{font-size:19px;font-weight:800;}' +
        '.qm-ws__lab{font-size:11.5px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-sec{padding:10px 18px 4px;font-size:12.5px;color:var(--qm-text-3);}' +
        '.qm-list{padding:0 12px 16px;display:flex;flex-direction:column;gap:10px;}' +
        '.qm-card{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'padding:13px 14px;box-shadow:var(--qm-shadow);text-align:left;width:100%;}' +
        '.qm-card__top{display:flex;align-items:center;gap:8px;}' +
        '.qm-dot{width:8px;height:8px;border-radius:50%;flex:none;}' +
        '.qm-card__title{font-weight:600;font-size:15px;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}' +
        '.qm-card__tag{flex:none;font-size:11px;padding:2px 8px;border-radius:999px;font-weight:600;}' +
        '.qm-card__meta{margin-top:5px;font-size:12.5px;color:var(--qm-text-2);display:flex;gap:10px;}' +
        '.qm-card__more{flex:none;font-size:15px;color:var(--qm-text-3);padding:0 4px;margin:-4px -2px;line-height:1;}' +
        '.qm-ws__loading{padding:46px 0 52px;text-align:center;color:var(--qm-text-2);font-size:13.5px;}' +
        '.qm-mask{position:fixed;inset:0;background:var(--qm-mask);display:flex;align-items:center;' +
        'justify-content:center;z-index:99;}' +
        '.qm-dlg{width:min(320px,86%);background:var(--qm-surface);border-radius:16px;padding:16px;' +
        'box-shadow:var(--qm-shadow);}' +
        '.qm-dlg__t{font-size:15.5px;font-weight:700;margin-bottom:10px;}' +
        '.qm-dlg__in{width:100%;border:1px solid var(--qm-line-strong);border-radius:10px;padding:9px 11px;' +
        'font-size:14px;background:var(--qm-bg);color:var(--qm-text);outline:none;font-family:inherit;}' +
        '.qm-dlg__btns{display:flex;gap:9px;margin-top:13px;}' +
        '.qm-dlg__b{flex:1;padding:10px 0;border-radius:10px;font-size:14px;font-weight:600;}' +
        '.qm-dlg__b--primary{background:var(--qm-primary);color:var(--qm-on-primary);}' +
        '.qm-dlg__b--ghost{background:var(--qm-surface-2);color:var(--qm-text);}');
    }
    template() {
      const loading = this.hasAttribute('loading') && this.getAttribute('loading') !== 'false';
      const sessions = json(this.getAttribute('sessions'), []) || [];
      const devicesRaw = this.getAttribute('devices');
      const devices = devicesRaw == null ? null : (parseInt(devicesRaw, 10) || 0);
      const title = this.getAttribute('title') != null ? this.getAttribute('title') : t('workspace.title');
      const renamingId = this.getAttribute('renaming') || '';
      const active = sessions.filter((s) => s && s.status !== 'closed');
      const closed = sessions.filter((s) => s && s.status === 'closed');
      const metric = (num, key) => '<div class="qm-ws__metric"><div class="qm-ws__num">' + num + '</div>' +
        '<div class="qm-ws__lab">' + esc(t(key)) + '</div></div>';
      const card = (s) => {
        const st = s.status === 'closed' ? 'closed' : (s.status || 'idle');
        const phase = st === 'closed' ? null : (({ attention: 'waiting', error: 'failed' })[st] || st);
        const color = statusColor(st === 'closed' ? 'idle' : st);
        const tag = st === 'closed' ? t('workspace.section.closed') : t('tasks.phase.' + phase);
        return '<div class="qm-card" data-id="' + esc(s.id != null ? s.id : '') + '" part="card">' +
          '<div class="qm-card__top"><span class="qm-dot" style="background:' + color + '"></span>' +
          '<span class="qm-card__title">' + esc(s.title || '') + '</span>' +
          '<span class="qm-card__tag" style="color:' + color + ';background:color-mix(in srgb,' + color + ' 12%,transparent)">' +
          esc(tag) + '</span>' +
          (st !== 'closed' ? '<button class="qm-card__more" data-more="' + esc(s.id != null ? s.id : '') + '" part="more">⋯</button>' : '') +
          '</div>' +
          '<div class="qm-card__meta">' +
          (s.updated ? '<span>' + esc(s.updated) + '</span>' : '') +
          (s.files ? '<span>' + esc(fmt(t('workspace.read_files'), [s.files])) + '</span>' : '') +
          '</div></div>';
      };
      let html = '<div class="qm-ws" part="sessions"><div class="qm-ws__hd"><span class="qm-ws__t">' + esc(title) + '</span>' +
        '<button class="qm-ws__gear" data-act="settings">' + esc(t('workspace.open_settings')) + '</button></div>' +
        '<div class="qm-ws__metrics">' + metric(active.length, 'workspace.metric.active') +
        metric(closed.length, 'workspace.metric.closed') +
        (devices != null ? metric(devices, 'workspace.metric.devices') : '') + '</div>';
      if (loading) {
        html += '<div class="qm-ws__loading">' + esc(t('workspace.loading')) + '</div>';
      } else {
        if (active.length) html += '<div class="qm-sec">' + esc(t('workspace.section.active')) + '</div>' +
          '<div class="qm-list">' + active.map(card).join('') + '</div>';
        if (closed.length) html += '<div class="qm-sec">' + esc(t('workspace.section.closed')) + '</div>' +
          '<div class="qm-list">' + closed.map(card).join('') + '</div>';
      }
      if (renamingId) {
        const cur = sessions.filter((s) => s && String(s.id) === String(renamingId))[0];
        html += '<div class="qm-mask" data-mask="1"><div class="qm-dlg" part="dialog">' +
          '<div class="qm-dlg__t">' + esc(t('workspace.rename_title')) + '</div>' +
          '<input class="qm-dlg__in" data-rename-input value="' + esc(cur && cur.title || '') + '">' +
          '<div class="qm-dlg__btns"><button class="qm-dlg__b qm-dlg__b--ghost" data-rename-cancel="1">✕</button>' +
          '<button class="qm-dlg__b qm-dlg__b--primary" data-rename-ok="1">' + esc(t('workspace.rename_agree')) + '</button>' +
          '</div></div></div>';
      }
      return html + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-card').forEach((c) => {
        c.addEventListener('click', () => this.emit('session-open', { id: c.dataset.id }));
      });
      root.querySelectorAll('[data-more]').forEach((b) => {
        b.addEventListener('click', (e) => {
          e.stopPropagation();
          this.setAttribute('renaming', b.dataset.more);
          this.emit('rename-request', { id: b.dataset.more });
        });
      });
      const gear = root.querySelector('[data-act="settings"]');
      if (gear) gear.addEventListener('click', () => this.emit('settings-open', {}));
      const mask = root.querySelector('[data-mask]');
      if (mask) {
        const input = root.querySelector('[data-rename-input]');
        const id = this.getAttribute('renaming');
        mask.addEventListener('click', (e) => { if (e.target === mask) this.setAttribute('renaming', ''); });
        const cancel = root.querySelector('[data-rename-cancel]');
        if (cancel) cancel.addEventListener('click', () => this.setAttribute('renaming', ''));
        const ok = root.querySelector('[data-rename-ok]');
        if (ok) ok.addEventListener('click', () => {
          const title = input ? input.value : '';
          this.setAttribute('renaming', '');
          this.emit('rename', { id: id, title: title });
        });
      }
    }
    get sessions() { return json(this.getAttribute('sessions'), []); }
    set sessions(v) { this.setAttribute('sessions', JSON.stringify(v || [])); }
  }

  /* ============================================================
     <qm-mermaid> — mermaid 流程图卡（v3.7.0）
     实证：markdown.mermaid.title 流程图 / cd_mermaid_render 渲染图表 /
       conversation_mermaid_rendering 正在渲染图表… /
       conversation_mermaid_source_unavailable 该图已失效，请返回后重新打开。
     state: idle（默认：源码 + 渲染图表按钮）→ done（内置渲染器 SVG）
       / rendering（宿主驱动）/ unavailable（失效态）
     解析失败（无节点）点击渲染后进入 unavailable；事件：render
     ============================================================ */
  class QmMermaid extends Base {
    static get observedAttributes() { return ['source', 'state', 'title', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-mm{background:var(--qm-surface);border:1px solid var(--qm-line);border-radius:var(--qm-radius);' +
        'overflow:hidden;box-shadow:var(--qm-shadow);}' +
        '.qm-mm__hd{display:flex;align-items:center;gap:7px;padding:10px 13px 8px;font-size:13px;font-weight:700;}' +
        '.qm-mm__hd::before{content:"";width:7px;height:7px;border-radius:2px;background:var(--qm-primary);flex:none;}' +
        '.qm-mm__src{margin:0 13px;background:var(--qm-surface-2);border-radius:var(--qm-radius-sm);' +
        'padding:9px 11px;font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:11.5px;' +
        'line-height:1.6;color:var(--qm-text-2);white-space:pre-wrap;word-break:break-word;max-height:132px;overflow:auto;}' +
        '.qm-mm__ft{display:flex;justify-content:flex-end;padding:8px 13px 12px;}' +
        '.qm-mm__btn{font-size:12.5px;font-weight:600;color:var(--qm-primary);background:var(--qm-primary-weak);' +
        'border-radius:999px;padding:6px 14px;}' +
        '.qm-mm__busy{font-size:12px;color:var(--qm-text-3);padding:2px 13px 12px;text-align:right;}' +
        '.qm-mm__dead{font-size:12.5px;color:var(--qm-text-2);padding:2px 13px 14px;}' +
        '.qm-mm__svg{padding:4px 13px 14px;}' +
        '.qm-mm__svg svg{width:100%;height:auto;display:block;}');
    }
    template() {
      const state = this.getAttribute('state') || 'idle';
      const title = this.getAttribute('title') != null ? this.getAttribute('title') : t('markdown.mermaid.title');
      const source = this.getAttribute('source') || '';
      let body = '';
      if (state === 'rendering') {
        body = '<div class="qm-mm__busy">' + esc(t('mermaid.loading')) + '</div>';
      } else if (state === 'unavailable') {
        body = '<div class="qm-mm__dead">' + esc(t('mermaid.unavailable')) + '</div>';
      } else if (state === 'done') {
        const out = renderMermaidSvg(source);
        body = out ? '<div class="qm-mm__svg">' + out + '</div>'
          : '<div class="qm-mm__dead">' + esc(t('mermaid.unavailable')) + '</div>';
      } else {
        body = '<div class="qm-mm__src">' + esc(source) + '</div>' +
          '<div class="qm-mm__ft"><button class="qm-mm__btn" data-render="1" part="render">' +
          esc(t('mermaid.render')) + '</button></div>';
      }
      return '<div class="qm-mm" part="mermaid"><div class="qm-mm__hd">' + esc(title) + '</div>' + body + '</div>';
    }
    _bind(root) {
      const btn = root.querySelector('[data-render]');
      if (btn) btn.addEventListener('click', () => {
        const source = this.getAttribute('source') || '';
        this.emit('render', { source: source });
        this.setAttribute('state', renderMermaidSvg(source) ? 'done' : 'unavailable');
      });
    }
    get source() { return this.getAttribute('source') || ''; }
    set source(v) { this.setAttribute('source', String(v == null ? '' : v)); }
  }

  /* ============================================================
     注册（Node/SSR：无 registry，静默跳过）
     ============================================================ */
  /* ============================================================
     <qm-login> — 登录注册域 v3.9.0（官方键名 auth.* · sms.* · numberauth.* ·
     password_login.* · passport.* · security_policy.* · startup_authorization.*）
     view: home(聚合登录) | sms(验证码) | password(邮箱密码) | aliyun(阿里云密码)
           | enterprise(企业账号选择) | vpc(VPC 表单) | terms(条款) | startup(启动授权)
           | security(安全策略限制) | accounts(账号选择)
     事件：oauth / submit / terms-open / view-change
     ============================================================ */
  class QmLogin extends Base {
    static get observedAttributes() { return ['view', 'phone', 'countdown', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-lg{padding:22px 20px 26px;display:flex;flex-direction:column;min-height:100%;}' +
        '.qm-lg__brand{display:flex;flex-direction:column;align-items:center;padding:8px 0 18px;}' +
        '.qm-lg__logo{width:56px;height:56px;border-radius:16px;background:var(--qm-primary-weak);' +
        'color:var(--qm-primary);display:flex;align-items:center;justify-content:center;font-weight:800;font-size:26px;}' +
        '.qm-lg__hi{font-size:21px;font-weight:700;margin-top:14px;}' +
        '.qm-lg__sub{font-size:13px;color:var(--qm-text-3);margin-top:4px;}' +
        '.qm-lg__btns{display:flex;flex-direction:column;gap:10px;margin-top:8px;}' +
        '.qm-oa{display:flex;align-items:center;gap:10px;width:100%;padding:11px 14px;border-radius:var(--qm-radius);' +
        'border:1px solid var(--qm-line);background:var(--qm-surface);font-size:14.5px;font-weight:600;}' +
        '.qm-oa__ic{width:22px;height:22px;border-radius:6px;flex:none;display:flex;align-items:center;' +
        'justify-content:center;background:var(--qm-surface-2);font-size:12px;font-weight:800;color:var(--qm-text-2);}' +
        '.qm-oa--pri{background:var(--qm-primary);border-color:var(--qm-primary);color:var(--qm-on-primary);justify-content:center;}' +
        '.qm-or{display:flex;align-items:center;gap:12px;color:var(--qm-text-4);font-size:11.5px;margin:6px 0;}' +
        '.qm-or::before,.qm-or::after{content:"";flex:1;height:1px;background:var(--qm-line);}' +
        '.qm-lg__fld{margin-top:12px;}' +
        '.qm-lg__inp{width:100%;padding:11px 13px;border:1px solid var(--qm-line);border-radius:10px;' +
        'background:var(--qm-surface);font-size:14.5px;color:var(--qm-text);}' +
        '.qm-lg__row{display:flex;gap:10px;}' +
        '.qm-lg__hint{font-size:12px;color:var(--qm-text-3);margin-top:6px;}' +
        '.qm-lg__err{font-size:12.5px;color:var(--qm-error);margin-top:6px;}' +
        '.qm-lg__link{font-size:12.5px;color:var(--qm-primary);font-weight:600;}' +
        '.qm-lg__agree{font-size:11.5px;color:var(--qm-text-3);line-height:1.6;margin-top:14px;}' +
        '.qm-ent{border:1px solid var(--qm-line);border-radius:var(--qm-radius);padding:13px 14px;text-align:left;' +
        'background:var(--qm-surface);margin-bottom:10px;width:100%;}' +
        '.qm-ent__t{font-size:14.5px;font-weight:600;}' +
        '.qm-ent__s{font-size:12px;color:var(--qm-text-3);margin-top:3px;}' +
        '.qm-lg__title{font-size:19px;font-weight:700;margin-bottom:4px;}' +
        '.qm-back{font-size:13px;color:var(--qm-text-2);padding:0 0 10px;}' +
        '.qm-code{display:flex;gap:8px;margin-top:14px;}' +
        '.qm-code i{flex:1;height:46px;border:1px solid var(--qm-line);border-radius:10px;background:var(--qm-surface);}' +
        '.qm-terms p{font-size:13px;color:var(--qm-text-2);line-height:1.7;margin-top:10px;}');
    }
    template() {
      const view = this.getAttribute('view') || 'home';
      const agree = '<div class="qm-lg__agree">' + esc(t('auth.agree_prefix')) + ' ' +
        '<span class="qm-lg__link">' + esc(t('auth.terms_sheet_title')) + '</span> ' + esc(t('auth.and')) + ' ' +
        '<span class="qm-lg__link">' + esc(t('auth.privacy')) + '</span></div>';
      const inp = (ph) => '<div class="qm-lg__fld"><input class="qm-lg__inp" placeholder="' + esc(t(ph)) + '"></div>';
      if (view === 'startup') {
        return '<div class="qm-lg"><div class="qm-lg__title">' + esc(t('startup_authorization.title')) + '</div>' +
          '<div class="qm-terms"><p>' + esc(t('startup_authorization.message')) + '</p></div>' +
          '<div class="qm-lg__agree">' + esc(t('startup_authorization.aliyun_user_agreement_label')) + ' · ' +
          esc(t('startup_authorization.aliyun_privacy_policy_label')) + ' · ' +
          esc(t('startup_authorization.qoder_user_agreement_label')) + ' · ' +
          esc(t('startup_authorization.qoder_privacy_policy_label')) + '</div>' +
          '<div class="qm-lg__btns"><button class="qm-oa qm-oa--pri" data-act="agree">' + esc(t('startup_authorization.agree')) + '</button>' +
          '<button class="qm-oa" data-act="disagree">' + esc(t('startup_authorization.disagree')) + '</button></div></div>';
      }
      if (view === 'security') {
        return '<div class="qm-lg"><div class="qm-lg__title">' + esc(t('security_policy.title')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('security_policy.message')) + '</div></div>';
      }
      if (view === 'terms') {
        return '<div class="qm-lg"><div class="qm-back" data-act="back">‹ ' + esc(t('tasks.plan_review.back')) + '</div>' +
          '<div class="qm-lg__title">' + esc(t('auth.terms_sheet_title')) + '</div>' +
          '<div class="qm-terms"><p>' + esc(t('auth.terms_sheet_description')) + '</p>' +
          '<p>' + esc(t('auth.terms_alert_description')) + '</p></div>' +
          '<div class="qm-lg__btns"><button class="qm-oa qm-oa--pri" data-act="agree-continue">' +
          esc(t('auth.terms_sheet_agree_button')) + '</button></div></div>';
      }
      if (view === 'enterprise') {
        const card = (act, tk, sk) => '<button class="qm-ent" data-act="' + act + '"><div class="qm-ent__t">' +
          esc(t(tk)) + '</div><div class="qm-ent__s">' + esc(t(sk)) + '</div></button>';
        return '<div class="qm-lg"><div class="qm-back" data-act="back">‹ ' + esc(t('tasks.plan_review.back')) + '</div>' +
          '<div class="qm-lg__title">' + esc(t('auth.enterprise_entry.selection.title')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.enterprise_entry.selection.subtitle')) + '</div>' +
          '<div class="qm-lg__btns" style="margin-top:14px">' +
          card('email', 'auth.enterprise_entry.email.title', 'auth.enterprise_entry.email.subtitle') +
          card('ram', 'auth.enterprise_entry.ram.title', 'auth.enterprise_entry.ram.subtitle') +
          card('vpc', 'auth.enterprise_entry.vpc.title', 'auth.enterprise_entry.vpc.subtitle') + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.enterprise_entry.selection.help')) + '</div>' +
          '<div class="qm-lg__err">' + esc(t('auth.enterprise_saml_required')) + '</div></div>';
      }
      if (view === 'vpc') {
        return '<div class="qm-lg"><div class="qm-back" data-act="back">‹ ' + esc(t('tasks.plan_review.back')) + '</div>' +
          '<div class="qm-lg__title">' + esc(t('auth.vpc_login_title')) + '</div>' +
          inp('auth.vpc_address_placeholder') +
          '<div class="qm-lg__err">' + esc(t('auth.vpc_address_required')) + '</div>' +
          inp('auth.vpc_account_placeholder') +
          '<div class="qm-lg__err">' + esc(t('auth.vpc_account_required')) + '</div>' +
          inp('auth.password_placeholder') +
          '<div class="qm-lg__btns"><button class="qm-oa qm-oa--pri" data-act="submit">' + esc(t('auth.log_in')) + '</button></div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.vpc_address_scheme_required')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.vpc_address_invalid')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.vpc_address_host_required')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.vpc_address_unsupported')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('auth.vpc_endpoints_unavailable')) + '</div></div>';
      }
      if (view === 'sms') {
        const cd = parseInt(this.getAttribute('countdown') || '0', 10) || 0;
        return '<div class="qm-lg"><div class="qm-back" data-act="back">‹ ' + esc(t('tasks.plan_review.back')) + '</div>' +
          '<div class="qm-lg__title">' + esc(t('auth.cn.phone_login')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('sms.code_sent')) + ' ' + esc(t('sms.code_sent_to')) + '</div>' +
          '<div class="qm-code"><i></i><i></i><i></i><i></i><i></i><i></i></div>' +
          '<div class="qm-lg__row" style="margin-top:12px">' +
          '<span class="qm-lg__link" data-act="resend">' +
          (cd > 0 ? esc(fmt(t('sms.resend_countdown'), [cd])) : esc(t('sms.resend'))) + '</span></div>' +
          '<div class="qm-lg__err">' + esc(t('sms.error.code_required')) + '</div>' +
          '<div class="qm-lg__btns"><button class="qm-oa qm-oa--pri" data-act="submit">' + esc(t('sms.confirm_login')) + '</button></div>' +
          '<div class="qm-lg__agree">' + esc(t('sms.terms_agreed')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('numberauth.carrier_desc')) + '</div></div>';
      }
      if (view === 'aliyun') {
        return '<div class="qm-lg"><div class="qm-back" data-act="back">‹ ' + esc(t('tasks.plan_review.back')) + '</div>' +
          '<div class="qm-lg__title">' + esc(t('password_login.title')) + '</div>' +
          inp('password_login.account_placeholder') + inp('auth.password_placeholder') +
          '<div class="qm-lg__err">' + esc(t('auth.invalid_credentials')) + '</div>' +
          '<div class="qm-lg__row" style="margin-top:8px"><span class="qm-lg__link">' + esc(t('auth.forgot_password')) + '</span></div>' +
          '<div class="qm-lg__btns"><button class="qm-oa qm-oa--pri" data-act="submit">' + esc(t('auth.log_in')) + '</button></div>' +
          '<div class="qm-lg__agree">' + esc(t('password_login.terms_prefix')) + ' ' +
          '<span class="qm-lg__link">' + esc(t('password_login.qoder_user_agreement')) + '</span> ' + esc(t('auth.and')) + ' ' +
          '<span class="qm-lg__link">' + esc(t('password_login.qoder_privacy')) + '</span></div></div>';
      }
      if (view === 'accounts') {
        return '<div class="qm-lg"><div class="qm-lg__title">' + esc(t('auth.passport_account.title')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(t('sms.select_account_hint')) + '</div>' +
          '<button class="qm-ent" style="margin-top:12px" data-act="pick"><div class="qm-ent__t">' +
          esc(t('sms.phone_placeholder')) + '</div><div class="qm-ent__s">' + esc(t('sms.last_active')) + '</div></button>' +
          '<div class="qm-lg__hint">' + esc(t('auth.passport_account.mobile_login_disabled')) + '</div>' +
          '<div class="qm-lg__hint">' + esc(fmt(t('sms.account_id'), ['1001'])) + '</div></div>';
      }
      if (view === 'password') {
        return '<div class="qm-lg"><div class="qm-back" data-act="back">‹ ' + esc(t('tasks.plan_review.back')) + '</div>' +
          '<div class="qm-lg__title">' + esc(t('auth.account_password_title.v2')) + '</div>' +
          inp('auth.email_placeholder') + inp('auth.password_placeholder') +
          '<div class="qm-lg__row" style="margin-top:8px;justify-content:space-between">' +
          '<span class="qm-lg__err">' + esc(t('auth.email_invalid')) + '</span>' +
          '<span class="qm-lg__link">' + esc(t('auth.forgot_password')) + '</span></div>' +
          '<div class="qm-lg__btns"><button class="qm-oa qm-oa--pri" data-act="submit">' + esc(t('auth.log_in')) + '</button></div>' +
          '<div class="qm-lg__agree">' + esc(fmt(t('auth.continue_agreement_template'),
            [t('auth.terms_alert_title'), t('auth.privacy')])) + '</div></div>';
      }
      /* home：聚合登录 */
      const oa = (act, ic, key) => '<button class="qm-oa" data-act="' + act + '">' +
        '<span class="qm-oa__ic">' + ic + '</span>' + esc(t(key)) + '</button>';
      return '<div class="qm-lg"><div class="qm-lg__brand"><div class="qm-lg__logo">Q</div>' +
        '<div class="qm-lg__hi">' + esc(t('new_task.greeting_title_guest')) + '</div>' +
        '<div class="qm-lg__sub">' + esc(t('new_task.greeting_subtitle')) + '</div></div>' +
        '<div class="qm-lg__btns">' +
        '<button class="qm-oa qm-oa--pri" data-act="one-click">' + esc(t('numberauth.one_click_login')) + '</button>' +
        oa('sms', svg(ICONS.phone), 'auth.cn.phone_login') +
        oa('aliyun', '阿', 'auth.cn.password_login') +
        oa('password', '@', 'auth.continue.account_password') +
        '</div><div class="qm-or">' + esc(t('auth.or')) + '</div>' +
        '<div class="qm-lg__btns">' +
        oa('enterprise', '企', 'auth.cn.enterprise_login') +
        oa('vpc', 'V', 'auth.continue.vpc') +
        oa('github', 'G', 'auth.continue.github') +
        oa('google', 'G', 'auth.continue.google') +
        oa('apple', '', 'auth.continue.apple') + '</div>' +
        agree +
        '<div class="qm-lg__hint" style="margin-top:10px">' + esc(t('auth.cn.login_agree_prefix')) + '</div>' +
        '<div class="qm-lg__row" style="justify-content:space-between;margin-top:12px">' +
        '<span class="qm-lg__hint">' + esc(t('auth.no_account')) + ' <span class="qm-lg__link">' + esc(t('auth.sign_up')) + '</span></span>' +
        '<span class="qm-lg__hint">' + esc(t('auth.get_started')) + '</span></div>' +
        '<div class="qm-lg__hint">' + esc(t('auth.brand')) + ' · ' + esc(t('auth.cn.phone_unavailable')) + ' · ' +
        esc(t('auth.signing_in')) + ' · ' + esc(t('auth.application_not_found')) + ' · ' +
        esc(t('auth.captcha_failed')) + ' · ' + esc(t('auth.username_required')) + ' · ' +
        esc(t('auth.password_required')) + ' · ' + esc(t('auth.email_required')) + ' · ' +
        esc(t('auth.password_show')) + ' / ' + esc(t('auth.password_hide')) + ' · ' +
        esc(t('auth.terms_alert_agree')) + ' · ' + esc(t('auth.terms_alert_title')) + ' · ' +
        esc(t('auth.username_placeholder')) + ' · ' + esc(t('auth.continue.qoder')) + ' · ' +
        esc(t('auth.sign_in')) + ' · ' + esc(t('auth.email_placeholder')) + ' · ' +
        esc(t('auth.cn.terms')) + '</div></div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-act]').forEach((b) => {
        b.addEventListener('click', () => {
          const act = b.dataset.act;
          if (['sms', 'aliyun', 'password', 'enterprise', 'vpc', 'terms', 'accounts'].includes(act)) {
            this.setAttribute('view', act);
            this.emit('view-change', { view: act });
          } else if (act === 'back') {
            this.setAttribute('view', 'home');
          } else {
            this.emit(act, { view: this.getAttribute('view') });
          }
        });
      });
      root.querySelectorAll('.qm-lg__inp').forEach((i) =>
        i.addEventListener('input', () => this.emit('input', { value: i.value })));
    }
    get view() { return this.getAttribute('view') || 'home'; }
    set view(v) { this.setAttribute('view', v); }
  }

  /* ============================================================
     <qm-environment> — 环境/设备选择器 v3.9.0（choose_environment.* 与
     choose_github.* 官方键名；RC 闭环最后一环）
     view: picker | guide | github | connecting | activate
     devices=[{name,online,host}] sessions=[{name,active}]
     事件：pick / end-session / refresh / install
     ============================================================ */
  class QmEnvironment extends Base {
    static get observedAttributes() { return ['view', 'devices', 'sessions', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-ev{padding:16px;}' +
        '.qm-ev__t{font-size:20px;font-weight:700;margin-bottom:4px;}' +
        '.qm-ev__s{font-size:12.5px;color:var(--qm-text-3);margin-bottom:10px;line-height:1.6;}' +
        '.qm-ev__sec{font-size:12.5px;color:var(--qm-text-3);padding:10px 2px 6px;}' +
        '.qm-dev{display:flex;align-items:center;gap:11px;width:100%;padding:12px 13px;margin-bottom:8px;' +
        'border:1px solid var(--qm-line);border-radius:var(--qm-radius);background:var(--qm-surface);text-align:left;}' +
        '.qm-dev__ic{width:36px;height:36px;border-radius:10px;background:var(--qm-primary-weak);color:var(--qm-primary);' +
        'display:flex;align-items:center;justify-content:center;flex:none;}' +
        '.qm-dev__ic svg{width:19px;height:19px;}' +
        '.qm-dev__t{font-size:14.5px;font-weight:600;}' +
        '.qm-dev__s{font-size:12px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-dev__st{margin-left:auto;font-size:11.5px;font-weight:600;flex:none;}' +
        '.qm-tabs{display:flex;gap:6px;margin-bottom:12px;flex-wrap:wrap;}' +
        '.qm-ev__cmd{font-family:var(--qm-font-mono,monospace);font-size:12.5px;background:var(--qm-surface-2);' +
        'border-radius:8px;padding:9px 11px;margin:6px 0;}' +
        '.qm-ev__step{display:flex;gap:9px;padding:5px 0;font-size:13.5px;line-height:1.55;}' +
        '.qm-ev__n{width:18px;height:18px;border-radius:50%;background:var(--qm-primary-weak);color:var(--qm-primary);' +
        'font-size:11px;display:flex;align-items:center;justify-content:center;flex:none;margin-top:2px;}' +
        '.qm-ev__end{margin-left:auto;font-size:12px;color:var(--qm-error);flex:none;font-weight:600;}');
    }
    template() {
      const view = this.getAttribute('view') || 'picker';
      const devices = json(this.getAttribute('devices'), []) || [];
      const sessions = json(this.getAttribute('sessions'), []) || [];
      if (view === 'guide') {
        return '<div class="qm-ev"><div class="qm-ev__t">' + esc(t('choose_environment.connect_computer')) + '</div>' +
          '<div class="qm-ev__sec">' + esc(t('choose_environment.connect_computer_desktop_heading')) + '</div>' +
          '<div class="qm-ev__step"><span class="qm-ev__n">1</span><span>' + esc(t('choose_environment.connect_computer_desktop_install')) + '</span></div>' +
          '<div class="qm-ev__step"><span class="qm-ev__n">2</span><span>' + esc(t('choose_environment.connect_computer_desktop_enable_inline_bold')) + '</span></div>' +
          '<div class="qm-ev__sec">' + esc(t('choose_environment.connect_computer_cli_heading')) + '</div>' +
          '<div class="qm-ev__step"><span class="qm-ev__n">1</span><span>' + esc(t('choose_environment.connect_computer_guide_prefix')) + '</span></div>' +
          '<div class="qm-ev__cmd">qodercli remote-control</div>' +
          '<div class="qm-ev__step"><span class="qm-ev__n">2</span><span>' + esc(t('choose_environment.connect_computer_guide_suffix')) + ' ' +
          esc(t('choose_environment.connect_computer_instruction')) + '</span></div>' +
          '<div class="qm-ev__step"><span class="qm-ev__n">3</span><span>' + esc(t('choose_environment.connect_computer_guide_message')) + '</span></div></div>';
      }
      if (view === 'github') {
        return '<div class="qm-ev"><div class="qm-ev__t">' + esc(t('choose_github.repository_title')) + '</div>' +
          '<div class="qm-ev__s">' + esc(t('choose_github.install_hint')) + '</div>' +
          '<button class="qm-dev" data-act="install"><span class="qm-dev__ic">G</span>' +
          '<span><span class="qm-dev__t">' + esc(t('choose_github.install_button')) + '</span>' +
          '<span class="qm-dev__s">' + esc(t('choose_github.install_message')) + '</span></span></button>' +
          '<div class="qm-ev__s">' + esc(t('choose_github.bind_message')) + '</div>' +
          '<div class="qm-ev__s">' + esc(t('choose_github.connect_dialog_message')) + '</div>' +
          '<div class="qm-ev__s">' + esc(t('choose_github.branch_empty')) + ' · ' + esc(t('choose_github.repository_empty')) + '</div>' +
          '<div class="qm-ev__s">' + esc(t('choose_github.bind_failed')) + ' · ' + esc(t('choose_github.install_failed')) + '</div>' +
          '<button class="qm-dev" data-act="refresh"><span class="qm-dev__ic">⟳</span>' +
          '<span class="qm-dev__t">' + esc(t('choose_github.refresh_connection')) + '</span></button></div>';
      }
      if (view === 'connecting') {
        return '<div class="qm-ev"><div class="qm-ev__t">' +
          esc(fmt(t('choose_environment.connect_device_connecting'), [devices[0] ? (devices[0].name || '') : ''])) +
          '</div><div class="qm-ev__s">' + esc(t('choose_environment.activate_device_reconnect_line')) + '</div></div>';
      }
      if (view === 'activate') {
        return '<div class="qm-ev"><div class="qm-ev__t">' + esc(t('choose_environment.activate_device_title')) + '</div>' +
          '<div class="qm-ev__s">' + esc(fmt(t('choose_environment.activate_device_offline_line'), [''])) + '</div>' +
          '<div class="qm-ev__s">' + esc(t('choose_environment.activate_device_reconnect_line')) + '</div></div>';
      }
      /* picker */
      const seg = (key) => '<span class="qm-chip">' + esc(t(key)) + '</span>';
      const devRows = devices.map((d, i) =>
        '<button class="qm-dev" data-pick="' + i + '"><span class="qm-dev__ic">' + svg(ICONS.monitor) + '</span>' +
        '<span><span class="qm-dev__t">' + esc(d.name || '') + '</span>' +
        '<span class="qm-dev__s">' + esc(t('choose_environment.local')) + ' · ' +
        esc(d.host || t('choose_environment.ide_projects_empty')) + '</span></span>' +
        '<span class="qm-dev__st" style="color:' + (d.online === false ? 'var(--qm-text-4)' : 'var(--qm-accent-completed)') + '">' +
        esc(d.online === false ? t('choose_environment.offline') : t('choose_environment.local')) + '</span></button>').join('');
      const sesRows = sessions.map((sn, i) =>
        '<button class="qm-dev" data-end="' + i + '"><span class="qm-dev__ic">' + svg(ICONS.terminal) + '</span>' +
        '<span><span class="qm-dev__t">' + esc(sn.name || '') + '</span>' +
        '<span class="qm-dev__s">' + esc(fmt(t('sms.last_active'), [sn.active || ''])) + '</span></span>' +
        '<span class="qm-ev__end">' + esc(t('choose_environment.end_session_action')) + '</span></button>').join('');
      return '<div class="qm-ev"><div class="qm-ev__t">' + esc(t('choose_environment.title')) + '</div>' +
        '<div class="qm-ev__s">' + esc(t('new_task.select_env')) + '</div>' +
        '<div class="qm-tabs">' + seg('choose_environment.local') + seg('choose_environment.cloud') +
        seg('choose_environment.ide_agent') + seg('choose_environment.ide_experts') + seg('choose_environment.chats') + '</div>' +
        (devRows || '') +
        '<button class="qm-dev" data-act="guide"><span class="qm-dev__ic">' + svg(ICONS.monitor) + '</span>' +
        '<span><span class="qm-dev__t">' + esc(t('choose_environment.connect_computer')) + '</span>' +
        '<span class="qm-dev__s">' + esc(t('choose_environment.connect_computer_desktop_tab')) + ' · ' +
        esc(t('choose_environment.connect_computer_desktop_heading')) + '</span></span></button>' +
        (sesRows ? '<div class="qm-ev__sec">' + esc(t('choose_environment.active_sessions_title')) + '</div>' + sesRows : '') +
        '<div class="qm-ev__sec">' + esc(t('choose_environment.choose_project')) + '</div>' +
        '<button class="qm-dev" data-act="github"><span class="qm-dev__ic">G</span>' +
        '<span class="qm-dev__t">' + esc(t('choose_github.repository_title')) + '</span></button>' +
        '<div class="qm-ev__s">' + esc(fmt(t('choose_environment.end_session_confirm_message'), ['demo'])) + ' ' +
        esc(t('choose_environment.end_session_confirm_title')) + ' · ' + esc(t('choose_environment.end_session_success')) + '</div></div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'guide' || act === 'github') this.setAttribute('view', act);
        this.emit(act, {});
      }));
      root.querySelectorAll('[data-pick]').forEach((b) => b.addEventListener('click', () =>
        this.emit('pick', { index: +b.dataset.pick })));
      root.querySelectorAll('[data-end]').forEach((b) => b.addEventListener('click', () =>
        this.emit('end-session', { index: +b.dataset.end })));
    }
  }

  /* ============================================================
     <qm-account> — 账号与安全 + 更新 + 关于 v3.9.0
     （account_security.* / update.* / about.* 官方键名）
     view: home | delete-verify   update-state: idle|checking|installing|none
     事件：delete-request / verify-delete / update / link
     ============================================================ */
  class QmAccount extends Base {
    static get observedAttributes() { return ['view', 'email', 'update-state', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-ac{padding:16px;}' +
        '.qm-ac__row{display:flex;align-items:center;gap:11px;width:100%;padding:12px 4px;' +
        'border-bottom:1px solid var(--qm-line);text-align:left;}' +
        '.qm-ac__t{font-size:14.5px;}' +
        '.qm-ac__s{font-size:12px;color:var(--qm-text-3);margin-top:2px;display:block;}' +
        '.qm-ac__arr{margin-left:auto;color:var(--qm-text-4);}' +
        '.qm-ac__danger{color:var(--qm-error);font-weight:600;}' +
        '.qm-ac__sec{font-size:12.5px;color:var(--qm-text-3);padding:14px 2px 6px;}' +
        '.qm-ac__msg{font-size:12.5px;color:var(--qm-text-2);line-height:1.7;margin-top:10px;}' +
        '.qm-ac__err{font-size:12.5px;color:var(--qm-error);margin-top:8px;}');
    }
    template() {
      const view = this.getAttribute('view') || 'home';
      const email = this.getAttribute('email') || '';
      if (view === 'delete-verify') {
        const errs = ['account_security.delete_error_active_paid_plan',
          'account_security.delete_error_organization_member', 'account_security.delete_error_no_email',
          'account_security.delete_error_unauthorized', 'account_security.delete_error_network',
          'account_security.delete_error_invalid_code', 'account_security.delete_error_verification_code_failed',
          'account_security.delete_error_generic', 'account_security.delete_error_delete_failed',
          'account_security.delete_error_server'];
        return '<div class="qm-ac"><div class="qm-ac__sec">' + esc(t('account_security.verification_title')) + '</div>' +
          '<div class="qm-ac__msg">' + esc(fmt(t('account_security.verification_subtitle'), [email])) + '</div>' +
          '<div class="qm-ac__row"><span class="qm-ac__t">' + esc(t('account_security.verification_code_placeholder')) + '</span>' +
          '<span class="qm-ac__arr" data-act="resend" style="color:var(--qm-primary);font-size:12.5px;font-weight:600">' +
          esc(t('account_security.resend_code')) + '</span></div>' +
          errs.map((k) => '<div class="qm-ac__err">' + esc(t(k)) + '</div>').join('') +
          '<div class="qm-ac__msg">' + esc(t('account_security.sending_code')) + ' → ' +
          esc(t('account_security.deleting_account')) + '</div>' +
          '<button class="qm-ac__row" data-act="verify-delete" style="border:none">' +
          '<span class="qm-ac__t qm-ac__danger">' + esc(t('account_security.verify_and_delete')) + '</span></button>' +
          '<button class="qm-ac__row" data-act="back" style="border:none">' +
          '<span class="qm-ac__t">' + esc(t('account_security.delete_confirm_action')) + '</span></button>' +
          '<div class="qm-ac__msg">' + esc(t('account_security.delete_confirm_message.v2')) + '</div></div>';
      }
      const row = (act, title, sub, danger) => '<button class="qm-ac__row" data-act="' + act + '">' +
        '<span style="flex:1"><span class="qm-ac__t' + (danger ? ' qm-ac__danger' : '') + '">' + esc(title) + '</span>' +
        (sub ? '<span class="qm-ac__s">' + esc(sub) + '</span>' : '') + '</span>' +
        '<span class="qm-ac__arr">›</span></button>';
      const us = this.getAttribute('update-state') || 'idle';
      const updSub = us === 'checking' ? t('update.checking') : us === 'installing' ? t('update.installing')
        : us === 'none' ? t('update.no_update') : fmt(t('update.title'), ['3.9.0']);
      return '<div class="qm-ac">' +
        row('profile', t('account_security.account'), email || t('account_security.verification_title')) +
        row('update', t('tasks.time.now'), updSub) +
        row('notify', t('notification.system_title'), t('notification.system_description')) +
        '<div class="qm-ac__sec">About</div>' +
        row('about-permission', t('about.permission_usage'), '') +
        row('about-collect', t('about.personal_info_collection_list'), '') +
        row('about-sharing', t('about.personal_info_sharing_list'), '') +
        row('about-sub', t('about.subscription_agreement'), '') +
        row('about-icp', t('about.icp_record'), '') +
        '<div class="qm-ac__sec">' + esc(t('account_security.verification_title')) + '</div>' +
        row('delete', t('account_security.delete_confirm_action'), t('account_security.delete_confirm_message.v2'), true) +
        '</div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'delete') this.setAttribute('view', 'delete-verify');
        if (act === 'back') this.setAttribute('view', 'home');
        this.emit(act, {});
      }));
    }
  }

  /* ============================================================
     <qm-usage> — 用量详情 v3.9.0（usage.* · usage.activity.* 官方键名）
     plan={used,total,renews} addon={...} activity={...}  事件：open-details
     ============================================================ */
  class QmUsage extends Base {
    static get observedAttributes() { return ['plan', 'addon', 'activity', 'error', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-us{padding:16px;}' +
        '.qm-us__t{font-size:20px;font-weight:700;margin-bottom:12px;}' +
        '.qm-card2{border:1px solid var(--qm-line);border-radius:var(--qm-radius);background:var(--qm-surface);' +
        'padding:14px;margin-bottom:10px;width:100%;text-align:left;}' +
        '.qm-us__k{font-size:13px;color:var(--qm-text-2);}' +
        '.qm-us__v{font-size:19px;font-weight:700;margin-top:4px;}' +
        '.qm-us__bar{height:6px;border-radius:3px;background:var(--qm-surface-2);margin-top:10px;overflow:hidden;}' +
        '.qm-us__fill{height:100%;border-radius:3px;background:var(--qm-primary);}' +
        '.qm-us__meta{font-size:12px;color:var(--qm-text-3);margin-top:8px;line-height:1.6;}' +
        '.qm-us__link{font-size:12.5px;color:var(--qm-primary);font-weight:600;margin-top:8px;}');
    }
    template() {
      if (this.hasAttribute('error')) {
        return '<div class="qm-us"><div class="qm-us__t">' + esc(t('usage.view_details')) + '</div>' +
          '<div class="qm-us__meta">' + esc(t('usage.error.empty_response')) + '</div></div>';
      }
      const plan = json(this.getAttribute('plan'), {}) || {};
      const addon = json(this.getAttribute('addon'), {}) || {};
      const act = json(this.getAttribute('activity'), {}) || {};
      const card = (k, v, meta, link) => '<div class="qm-card2"><div class="qm-us__k">' + esc(k) + '</div>' +
        '<div class="qm-us__v">' + esc(v) + '</div>' +
        (meta ? '<div class="qm-us__meta">' + esc(meta) + '</div>' : '') +
        (link ? '<div class="qm-us__link">' + esc(t('usage.view_details')) + ' · ' + esc(t('usage.activity.open_details')) + '</div>' : '') +
        '</div>';
      const pct = plan.total ? Math.min(100, Math.round((plan.used || 0) / plan.total * 100)) : 0;
      return '<div class="qm-us"><div class="qm-us__t">' + esc(t('settings.usage')) + '</div>' +
        card(t('usage.plan_credits'),
          fmt(t('usage.used_summary'), [String(plan.used || 0), String(plan.total || 0), pct]) + ' ' + t('usage.unit_credits'),
          (plan.renews ? fmt(t('usage.renews_on'), [plan.renews]) + ' · ' : '') + t('usage.your_cap') + ' · ' + t('usage.used')) +
        '<div class="qm-card2"><div class="qm-us__bar"><div class="qm-us__fill" style="width:' + pct + '%"></div></div></div>' +
        card(t('usage.add_on_credits'), fmt(t('usage.remaining_left'), [String(addon.left || 0)]),
          t('usage.shared_add_on_credits')) +
        card(t('usage.activity.quota.generic').replace('%@ / %@', '').trim() || t('usage.add_on_credits'),
          fmt(t('usage.activity.remaining_today'), [String(act.left || 0)]),
          (act.expires ? fmt(t('usage.activity.expires_at'), [act.expires]) + ' · ' : '') +
          fmt(t('usage.activity.quota.daily'), [String(act.used || 0), String(act.total || 0)]) + ' · ' +
          t('usage.activity.show_description'), true) +
        '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-card2').forEach((c) =>
        c.addEventListener('click', () => this.emit('open-details', {})));
    }
  }

  /* ============================================================
     <qm-feedback> — 反馈表单 v3.9.0（feedback.* · permission_purpose.* 官方键名）
     state: form | recording | success    事件：submit / source / copy-id
     ============================================================ */
  class QmFeedback extends Base {
    static get observedAttributes() { return ['state', 'countdown', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-fb{padding:16px;}' +
        '.qm-fb__t{font-size:20px;font-weight:700;margin-bottom:10px;}' +
        '.qm-fb__ta{width:100%;min-height:96px;border:1px solid var(--qm-line);border-radius:10px;' +
        'background:var(--qm-surface);padding:11px;font-size:14px;color:var(--qm-text);resize:vertical;}' +
        '.qm-fb__lbl{font-size:12.5px;color:var(--qm-text-3);margin:12px 0 6px;}' +
        '.qm-fb__src{display:flex;flex-wrap:wrap;gap:8px;}' +
        '.qm-fb__chip{font-size:12.5px;padding:7px 12px;border-radius:999px;background:var(--qm-surface-2);color:var(--qm-text-2);}' +
        '.qm-fb__rec{display:flex;align-items:center;gap:10px;padding:12px;border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);margin-top:12px;background:var(--qm-surface);}' +
        '.qm-fb__dot{width:10px;height:10px;border-radius:50%;background:var(--qm-error);flex:none;}' +
        '.qm-fb__ok{text-align:center;padding:30px 0;}' +
        '.qm-fb__perm{font-size:12px;color:var(--qm-text-2);line-height:1.7;margin-top:10px;}');
    }
    template() {
      const state = this.getAttribute('state') || 'form';
      if (state === 'success') {
        return '<div class="qm-fb"><div class="qm-fb__ok"><div class="qm-fb__t">' + esc(t('feedback.success_dialog_title')) + '</div>' +
          '<div class="qm-fb__lbl">' + esc(t('feedback.success')) + '</div>' +
          '<button class="qm-fb__chip" data-act="copy-id" style="margin-top:10px">' + esc(t('feedback.copy_id')) + '</button>' +
          '<div class="qm-fb__perm">' + esc(t('feedback.id_copy_failed')) + ' · ' + esc(t('feedback.session_id_copied')) + '</div></div></div>';
      }
      if (state === 'recording') {
        const cd = parseInt(this.getAttribute('countdown') || '0', 10) || 0;
        return '<div class="qm-fb"><div class="qm-fb__t">' + esc(t('feedback.recording.title')) + '</div>' +
          '<div class="qm-fb__rec"><span class="qm-fb__dot"></span>' +
          '<span style="flex:1;font-size:14px">' + (cd > 0 ? esc(fmt(t('feedback.recording.countdown'), [cd])) : esc(t('feedback.recording.preparing'))) + '</span>' +
          '<button class="qm-fb__chip" data-act="stop">' + esc(t('feedback.recording.stop')) + '</button></div>' +
          '<div class="qm-fb__perm">' + esc(t('feedback.recording.failed')) + ' · ' + esc(t('feedback.recording.preview_failed')) + '</div>' +
          '<div class="qm-fb__perm">' + esc(t('feedback.recording.attachment')) + '</div></div>';
      }
      /* form */
      return '<div class="qm-fb"><div class="qm-fb__t">' + esc(t('feedback.title')) + '</div>' +
        '<textarea class="qm-fb__ta" placeholder="' + esc(t('feedback.placeholder')) + '"></textarea>' +
        '<div class="qm-fb__lbl">' + esc(t('feedback.description_required')) + '</div>' +
        '<div class="qm-fb__lbl">' + esc(t('feedback.email_placeholder')) + ' · ' + esc(t('feedback.email_required')) + ' · ' +
        esc(t('feedback.email_invalid')) + '</div>' +
        '<div class="qm-fb__lbl">' + esc(t('feedback.session_id_label')) + '</div>' +
        '<div class="qm-fb__src">' +
        ['source_choose_file', 'source_photo_library', 'source_take_photo', 'source_record_screen']
          .map((k) => '<button class="qm-fb__chip" data-act="source">' + esc(t('feedback.' + k)) + '</button>').join('') +
        '</div>' +
        '<div class="qm-fb__perm">' + esc(t('feedback.placeholder_cn')) + '</div>' +
        '<div class="qm-fb__perm"><b>' + esc(t('permission_purpose.feedback_camera_title')) + '</b><br>' +
        esc(t('permission_purpose.feedback_camera_message')) + '</div>' +
        '<div class="qm-fb__perm"><b>' + esc(t('permission_purpose.feedback_screen_recording_title')) + '</b><br>' +
        esc(t('permission_purpose.feedback_screen_recording_message')) + '</div>' +
        '<div class="qm-fb__perm"><b>' + esc(t('permission_purpose.feedback_screenshot_title')) + '</b><br>' +
        esc(t('permission_purpose.feedback_screenshot_message')) + ' · ' +
        esc(t('permission_purpose.feedback_screenshot_deny')) + '</div>' +
        '<div class="qm-fb__perm">' + esc(t('permission_purpose.deny')) + '</div>' +
        '<button class="qm-fb__chip" data-act="record" style="margin-top:12px">' + esc(t('feedback.source.record_screen')) + '</button>' +
        '<button class="qm-fb__chip" data-act="submit" style="margin-top:12px;background:var(--qm-primary);color:var(--qm-on-primary)">' +
        esc(t('feedback.submit')) + '</button></div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-act]').forEach((b) => b.addEventListener('click', () => {
        const act = b.dataset.act;
        if (act === 'record') this.setAttribute('state', 'recording');
        if (act === 'submit') this.setAttribute('state', 'success');
        if (act === 'stop') this.setAttribute('state', 'form');
        this.emit(act, {});
      }));
    }
  }

  /* ============================================================
     <qm-notifications> — 通知中心 v3.9.0（notification.* 官方键名）
     事件：toggle / open
     ============================================================ */
  class QmNotifications extends Base {
    static get observedAttributes() { return ['items', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-nt{padding:16px;}' +
        '.qm-nt__t{font-size:20px;font-weight:700;margin-bottom:10px;}' +
        '.qm-nt__sec{font-size:12.5px;color:var(--qm-text-3);padding:8px 2px 6px;}' +
        '.qm-nt__row{display:flex;align-items:center;gap:11px;padding:10px 2px;border-bottom:1px solid var(--qm-line);}' +
        '.qm-nt__k{font-size:14px;font-weight:600;}' +
        '.qm-nt__d{font-size:12px;color:var(--qm-text-3);margin-top:2px;}' +
        '.qm-sw{margin-left:auto;width:38px;height:22px;border-radius:11px;background:var(--qm-primary);position:relative;flex:none;}' +
        '.qm-sw::after{content:"";position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:50%;background:#fff;}' +
        '.qm-sw--off{background:var(--qm-surface-2);}' +
        '.qm-sw--off::after{right:auto;left:2px;}' +
        '.qm-nt__card{display:flex;gap:10px;padding:11px 12px;border:1px solid var(--qm-line);' +
        'border-radius:var(--qm-radius);margin-bottom:8px;background:var(--qm-surface);width:100%;text-align:left;}' +
        '.qm-nt__tag{font-size:11px;font-weight:700;color:var(--qm-primary);flex:none;}');
    }
    template() {
      const items = json(this.getAttribute('items'), []) || [];
      const ch = (k, d, on) => '<div class="qm-nt__row"><span style="flex:1"><span class="qm-nt__k">' + esc(t(k)) + '</span>' +
        '<span class="qm-nt__d">' + esc(t(d)) + '</span></span>' +
        '<span class="qm-sw' + (on ? '' : ' qm-sw--off') + '" data-toggle="' + esc(k) + '"></span></div>';
      const cards = items.length ? items.map((n) =>
        '<button class="qm-nt__card" data-open="' + esc(n.type || '') + '">' +
        '<span class="qm-nt__tag">' + esc(n.tag || t('notification.new_session_title')) + '</span>' +
        '<span><span class="qm-nt__k">' + esc(n.title || '') + '</span>' +
        '<span class="qm-nt__d">' + esc(n.body || t('notification.default_body')) + '</span></span></button>').join('') :
        ['new_session_title', 'session_created', 'title_task_failed'].map((k) =>
          '<button class="qm-nt__card" data-open="' + k + '"><span class="qm-nt__tag">' + esc(t('notification.' + k)) + '</span>' +
          '<span><span class="qm-nt__d">' + esc(t('notification.default_body')) + ' · ' +
          esc(t('notification.action_view')) + ' · ' + esc(t('notification.action_review')) + '</span></span></button>').join('');
      return '<div class="qm-nt"><div class="qm-nt__t">' + esc(t('notification.title')) + '</div>' +
        '<div class="qm-nt__sec">' + esc(t('notification.channel.task_updates')) + '</div>' +
        ch('notification.approval_title', 'notification.approval_description', true) +
        ch('notification.ask_permission_title', 'notification.ask_permission_description', true) +
        ch('notification.plan_review_title', 'notification.plan_review_description', true) +
        ch('notification.qa_title', 'notification.qa_description', false) +
        ch('notification.task_completed_title', 'notification.task_completed_description', true) +
        '<div class="qm-nt__sec">' + esc(t('notification.system_title')) + ' · ' + esc(t('notification.system_status_on')) + '</div>' +
        ch('notification.system_title', 'notification.system_description', true) +
        '<div class="qm-nt__sec">' + esc(t('notification.channel.task_updates_description')) + '</div>' + cards + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-toggle]').forEach((s) =>
        s.addEventListener('click', () => { s.classList.toggle('qm-sw--off'); this.emit('toggle', { key: s.dataset.toggle }); }));
      root.querySelectorAll('[data-open]').forEach((b) =>
        b.addEventListener('click', () => this.emit('open', { type: b.dataset.open })));
    }
  }

  /* ============================================================
     <qm-ask> — Agent 提问卡 v3.9.0（官方键名 tasks.question.*）
     q={title, multi, options[], page, total}  事件：answer / next / back
     ============================================================ */
  class QmAsk extends Base {
    static get observedAttributes() { return ['q', 'answered', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-ask{padding:14px 16px;}' +
        '.qm-ask__t{font-size:15px;font-weight:700;}' +
        '.qm-ask__pg{font-size:11.5px;color:var(--qm-text-3);margin:3px 0 10px;}' +
        '.qm-opt{display:block;width:100%;text-align:left;font-size:14px;padding:10px 12px;' +
        'border:1px solid var(--qm-line);border-radius:10px;background:var(--qm-surface);margin-bottom:7px;}' +
        '.qm-opt.on{border-color:var(--qm-primary);color:var(--qm-primary);font-weight:600;background:var(--qm-primary-weak);}' +
        '.qm-ask__other{font-size:12.5px;color:var(--qm-text-3);margin:6px 0 10px;}' +
        '.qm-ask__inp{width:100%;padding:10px 12px;border:1px solid var(--qm-line);border-radius:10px;' +
        'background:var(--qm-surface);font-size:14px;}' +
        '.qm-ask__row{display:flex;gap:8px;margin-top:10px;}' +
        '.qm-ask__btn{flex:1;font-size:13.5px;font-weight:600;padding:10px;border-radius:10px;' +
        'border:1px solid var(--qm-line);background:var(--qm-surface);}' +
        '.qm-ask__btn--pri{background:var(--qm-primary);border-color:var(--qm-primary);color:var(--qm-on-primary);}');
    }
    template() {
      if (this.hasAttribute('answered')) {
        return '<div class="qm-ask"><div class="qm-ask__t">' + esc(t('tasks.question.answers_title')) + '</div>' +
          '<div class="qm-ask__pg">' + esc(t('tasks.question.answered')) + ' · ' + esc(t('composer.thinking_status')) + '</div></div>';
      }
      const q = json(this.getAttribute('q'), {}) || {};
      const opts = q.options || [];
      const yesno = '<div class="qm-opt" data-opt="yes">' + esc(t('tasks.question.answer_yes')) + '</div>' +
        '<div class="qm-opt" data-opt="no">' + esc(t('tasks.question.answer_no')) + '</div>';
      return '<div class="qm-ask"><div class="qm-ask__t">' + esc(q.title || t('tasks.question.panel_title')) +
        (q.multi ? ' ' + esc(t('tasks.question.multi_choice_title_suffix')) : '') + '</div>' +
        '<div class="qm-ask__pg">' + esc(fmt(t('tasks.question.pagination'), [q.page || 1, q.total || opts.length || 1])) + '</div>' +
        (opts.length ? opts.map((o, i) => '<div class="qm-opt" data-opt="' + i + '">' + esc(o) + '</div>').join('') : yesno) +
        '<div class="qm-ask__other">' + esc(t('tasks.question.custom_value')) + '</div>' +
        '<input class="qm-ask__inp" placeholder="' + esc(t('tasks.question.answer_input_placeholder')) + '">' +
        '<div class="qm-ask__row">' +
        '<button class="qm-ask__btn" data-act="back">' + esc(t('tasks.question.previous_question')) + '</button>' +
        '<button class="qm-ask__btn qm-ask__btn--pri" data-act="next">' + esc(t('tasks.question.primary_action')) + '</button></div>' +
        '<div class="qm-ask__pg" style="margin-top:8px">' + esc(t('tasks.question.primary_action_submitting')) + ' · ' +
        esc(t('tasks.question.please_specify')) + '</div></div>';
    }
    _bind(root) {
      root.querySelectorAll('.qm-opt').forEach((o) => o.addEventListener('click', () => {
        o.classList.toggle('on');
        this.emit('answer', { value: o.textContent });
      }));
      root.querySelectorAll('[data-act]').forEach((b) =>
        b.addEventListener('click', () => this.emit(b.dataset.act, {})));
    }
  }

  /* ============================================================
     <qm-plan-review> — 方案审核卡 v3.9.0（tasks.plan_review.* 官方键名）
     事件：run / back / feedback
     ============================================================ */
  class QmPlanReview extends Base {
    static get observedAttributes() { return ['global', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-pr{padding:14px 16px;}' +
        '.qm-pr__tag{font-size:11px;font-weight:700;color:var(--qm-primary);letter-spacing:.5px;}' +
        '.qm-pr__t{font-size:15.5px;font-weight:700;margin:4px 0 6px;}' +
        '.qm-pr__p{font-size:13.5px;color:var(--qm-text-2);line-height:1.6;}' +
        '.qm-pr__ta{width:100%;min-height:64px;border:1px solid var(--qm-line);border-radius:10px;' +
        'background:var(--qm-surface);padding:10px;font-size:13.5px;margin-top:10px;color:var(--qm-text);}' +
        '.qm-pr__row{display:flex;gap:8px;margin-top:10px;}' +
        '.qm-pr__btn{flex:1;font-size:13.5px;font-weight:600;padding:10px;border-radius:10px;' +
        'border:1px solid var(--qm-line);background:var(--qm-surface);}' +
        '.qm-pr__btn--pri{background:var(--qm-primary);border-color:var(--qm-primary);color:var(--qm-on-primary);}');
    }
    template() {
      const g = this.hasAttribute('global');
      return '<div class="qm-pr"><span class="qm-pr__tag">' + esc(t('tasks.plan_review.title')) + '</span>' +
        '<div class="qm-pr__t">' + esc(t(g ? 'tasks.plan_review.prompt' : 'tasks.plan_review.prompt')) + '</div>' +
        '<textarea class="qm-pr__ta" placeholder="' +
        esc(t(g ? 'tasks.plan_review.feedback_placeholder' : 'tasks.plan_review.feedback_placeholder')) + '"></textarea>' +
        '<div class="qm-pr__row">' +
        '<button class="qm-pr__btn" data-act="back">' + esc(t('tasks.plan_review.back')) + '</button>' +
        '<button class="qm-pr__btn" data-act="feedback">' +
        esc(t(g ? 'tasks.plan_review.feedback_submit' : 'tasks.plan_review.feedback_submit')) + '</button>' +
        '<button class="qm-pr__btn qm-pr__btn--pri" data-act="run">' + esc(t('tasks.plan_review.allow_once')) + '</button></div></div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-act]').forEach((b) =>
        b.addEventListener('click', () => this.emit(b.dataset.act, {})));
    }
  }

  /* ============================================================
     <qm-tool-detail> — 工具调用详情 v3.9.0（tasks.tool_use.* · tool.group.* ·
     diff.* · la.* · preview.* 官方键名）type: bash|read|write|edit|web-search|
     web-fetch|files   state: running|completed|failed   事件：toggle
     ============================================================ */
  class QmToolDetail extends Base {
    static get observedAttributes() { return ['type', 'state', 'target', 'count', 'open', 'theme']; }
    static get hostCss() {
      return baseCss(
        '.qm-td{border:1px solid var(--qm-line);border-radius:var(--qm-radius);background:var(--qm-surface);' +
        'margin:6px 16px;overflow:hidden;}' +
        '.qm-td__hd{display:flex;align-items:center;gap:9px;width:100%;padding:10px 12px;text-align:left;}' +
        '.qm-td__ic{width:24px;height:24px;border-radius:7px;background:var(--qm-surface-2);color:var(--qm-text-2);' +
        'display:flex;align-items:center;justify-content:center;font-size:11px;flex:none;}' +
        '.qm-td__t{font-size:13.5px;font-weight:600;}' +
        '.qm-td__s{font-size:11.5px;color:var(--qm-text-3);margin-top:1px;}' +
        '.qm-td__st{margin-left:auto;font-size:11px;font-weight:700;flex:none;}' +
        '.qm-td__bd{border-top:1px solid var(--qm-line);padding:10px 12px;}' +
        '.qm-td__k{font-size:11px;color:var(--qm-text-3);margin-top:7px;}' +
        '.qm-td__v{font-family:var(--qm-font-mono,monospace);font-size:12px;background:var(--qm-surface-2);' +
        'border-radius:7px;padding:7px 9px;margin-top:3px;word-break:break-all;white-space:pre-wrap;}' +
        '.qm-td__diff{font-family:var(--qm-font-mono,monospace);font-size:12px;padding:7px 9px;margin-top:3px;' +
        'background:var(--qm-surface-2);border-radius:7px;white-space:pre-wrap;}');
    }
    template() {
      const type = this.getAttribute('type') || 'bash';
      const state = this.getAttribute('state') || 'running';
      const target = this.getAttribute('target') || '';
      const count = this.getAttribute('count');
      const open = this.hasAttribute('open');
      const head = {
        'bash': t('tasks.tool_use.detail.command'), 'read': t('tasks.tool_use.read_file'),
        'write': t('tasks.tool_use.action.write'), 'edit': t('tasks.tool_use.edit_file'),
        'web-search': t('tasks.tool_use.web_search.running'),
        'web-fetch': t('tasks.tool_use.web_fetch.running'), 'files': t('tool.group.files')
      }[type] || t('tasks.tool_use.tool');
      const stMap = { running: ['tasks.tool_use.default_tail', 'attention'], completed: ['tasks.tool_use.action.edited', 'completed'], failed: ['tasks.tool_use.web_search.failed', 'error'] };
      const stTx = type === 'web-search' && state === 'completed' ? t('tasks.tool_use.web_search.completed')
        : type === 'web-search' && state === 'failed' ? t('tasks.tool_use.web_search.failed')
        : type === 'web-search' ? t('tasks.tool_use.web_search.query.v2')
        : type === 'web-fetch' && state === 'completed' ? t('tasks.tool_use.web_fetch.completed')
        : type === 'web-fetch' && state === 'failed' ? t('tasks.tool_use.web_fetch.failed')
        : type === 'web-fetch' ? t('tasks.tool_use.web_fetch.target.v2')
        : stMap[state][0];
      const fields = [['tasks.tool_use.detail.command', 'qoder --version'], ['tasks.tool_use.detail.file_path', target],
        ['tasks.tool_use.detail.query', target], ['tasks.tool_use.detail.prompt', target],
        ['tasks.tool_use.detail.content', target], ['tasks.tool_use.detail.output', 'OK']];
      return '<div class="qm-td"' + (open ? ' open' : '') + ' part="tool">' +
        '<button class="qm-td__hd" data-act="toggle"><span class="qm-td__ic">' + svg(ICONS.terminal) + '</span>' +
        '<span><span class="qm-td__t">' + esc(head) + '</span>' +
        '<span class="qm-td__s">' + esc(target || (count ? fmt(t('tasks.tool_group.view_steps'), [count]) : t('tasks.tool_group.files_count'))) + '</span></span>' +
        '<span class="qm-td__st" style="color:' + statusColor(state === 'failed' ? 'failed' : state === 'completed' ? 'completed' : 'waiting') + '">' +
        esc(stTx === 'tasks.tool_use.default_tail' || stTx ? stTx : '') + '</span></button>' +
        (open ? '<div class="qm-td__bd">' + fields.map(([k, v]) =>
          '<div class="qm-td__k">' + esc(t(k)) + '</div><div class="qm-td__v">' + esc(v || '') + '</div>').join('') +
          '<div class="qm-td__k">DIFF</div><div class="qm-td__diff">' + esc(t('diff.preview')) + ' · ' +
          esc(t('diff.title')) + ' · ' + esc(fmt(t('diff.lines'), [12])) + ' · ' + esc(t('diff.expand')) + '</div>' +
          '<div class="qm-td__k">LA</div><div class="qm-td__v">' + esc(t('notification.la.state_awaiting')) + ' · ' +
          esc(t('notification.la.state_needs_input')) + ' · ' + esc(t('notification.la.state_error')) + ' · ' + esc(fmt(t('notification.la.more_format'), [3])) + '</div>' +
          '<div class="qm-td__k">PREVIEW</div><div class="qm-td__v">' + esc(t('preview.tool.title')) + ' · ' +
          esc(t('preview.tool.opening')) + ' · ' + esc(fmt(t('preview.tool.port'), [3000])) + ' · ' +
          esc(t('preview.tool.failed')) + ' · ' + esc(t('preview.unavailable.restart_prompt')) + '</div>' +
          '</div>' : '') + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('[data-act]').forEach((b) =>
        b.addEventListener('click', () => this.toggleAttribute('open')));
    }
  }

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
  def('qm-task-detail', QmTaskDetail);
  def('qm-session-list', QmSessionList);
  def('qm-mermaid', QmMermaid);
  def('qm-login', QmLogin);
  def('qm-environment', QmEnvironment);
  def('qm-account', QmAccount);
  def('qm-usage', QmUsage);
  def('qm-feedback', QmFeedback);
  def('qm-notifications', QmNotifications);
  def('qm-ask', QmAsk);
  def('qm-plan-review', QmPlanReview);
  def('qm-tool-detail', QmToolDetail);

  QI.Mobile = {
    WC,
    register,
    t, setLocale, STRINGS,
    locale: () => _locale,
    statusColor,
    parseMermaid, renderMermaidSvg,
    version: '3.9.0'
  };
  register();

})();
