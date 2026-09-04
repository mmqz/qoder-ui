/* ============================================================
   Qoder UI Features - 完整交互功能实现
   依赖 qoder-ui.js + qoder-interactions.js
   ============================================================ */
(function() {
  'use strict';
  if (typeof window === 'undefined') return; // SSR 安全
  const QF = window.QoderUI = window.QoderUI || {};

  /* ============================================================
     1. 聊天系统 ChatManager
     ============================================================ */
  QF.chat = {
    _instances: new Map(),

    init(containerSelector) {
      const containers = document.querySelectorAll(containerSelector);
      containers.forEach(container => {
        if (container._chatInitialized) return;
        container._chatInitialized = true;
        const id = 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
        container.dataset.chatId = id;
        this._instances.set(id, { container, messages: [] });
        this._bindInput(container, id);
        this._bindCodeBlocks(container);
        this._bindMessageActions(container);
        this._bindThinking(container);
      });
    },

    _bindInput(container, id) {
      const textarea = container.querySelector('.qoder-chat-input__textarea');
      const sendBtn = container.querySelector('.qoder-chat-input__send');
      if (!textarea) return;

      // 高度自适应
      textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
      });

      const send = () => {
        const text = textarea.value.trim();
        if (!text) return;
        this._addMessage(container, id, 'user', text);
        textarea.value = '';
        textarea.style.height = 'auto';
        // v3.3：有 transport → 后端流式回复；否则本地 Mock（v3.2 行为）
        const tp = QF.transport && QF.transport.get();
        if (tp) {
          this._streamReply(container, id, tp, text);
        } else {
          setTimeout(() => this._addMessage(container, id, 'ai', '收到你的消息："' + text + '"。这是一个模拟回复，实际使用时请接入你的AI后端。'), 600);
        }
      };

      textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          send();
        }
      });
      if (sendBtn) sendBtn.addEventListener('click', send);
    },

    _addMessage(container, id, role, content) {
      const messagesInner = container.querySelector('.qoder-chat__messages-inner');
      if (!messagesInner) return;
      // 移除欢迎页（如果存在）
      const welcome = messagesInner.querySelector('.qoder-chat__welcome');
      if (welcome) welcome.remove();

      const avatar = role === 'user' ? 'U' : 'AI';
      const msgDiv = document.createElement('div');
      msgDiv.className = 'qoder-chat__msg qoder-chat__msg--' + role;
      msgDiv.innerHTML = `
        <div class="qoder-chat__msg-avatar">${avatar}</div>
        <div class="qoder-chat__msg-body">
          <div class="qoder-chat__msg-content">${this._escapeHtml(content)}</div>
          ${role === 'ai' ? `<div class="qoder-chat__msg-actions">
            <button class="qoder-chat__action" data-action="copy">复制</button>
            <button class="qoder-chat__action" data-action="regenerate">重新生成</button>
            <button class="qoder-chat__action" data-action="like">👍</button>
            <button class="qoder-chat__action" data-action="dislike">👎</button>
          </div>` : ''}
        </div>`;
      messagesInner.appendChild(msgDiv);
      this._bindMessageActions(msgDiv);
      // 滚动到底部
      const messagesEl = container.querySelector('.qoder-chat__messages');
      if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
      return msgDiv;
    },

    /* ---------- v3.3 流式回复（transport 接入） ---------- */
    _streamReply(container, id, transport, text) {
      const msgDiv = this._addMessage(container, id, 'ai', '');
      if (!msgDiv) return;
      const contentEl = msgDiv.querySelector('.qoder-chat__msg-content');
      contentEl.classList.add('qoder-chat__msg-content--streaming');
      let buffer = '';
      const self = this;
      const paint = () => {
        contentEl.textContent = buffer;
        const messagesEl = container.querySelector('.qoder-chat__messages');
        if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
      };
      transport.chat(text, {
        onStart() { paint(); },
        onDelta(delta, full) { buffer = full != null ? full : (buffer + delta); paint(); },
        onDone(full) {
          buffer = full != null ? full : buffer;
          contentEl.classList.remove('qoder-chat__msg-content--streaming');
          contentEl.innerHTML = self._escapeHtml(buffer || '（空回复）');
          const messagesEl = container.querySelector('.qoder-chat__messages');
          if (messagesEl) messagesEl.scrollTop = messagesEl.scrollHeight;
        },
        onError(err) {
          contentEl.classList.remove('qoder-chat__msg-content--streaming');
          contentEl.innerHTML = '<span style="color:var(--error);">⚠ 连接错误：' + self._escapeHtml((err && err.message) || '未知错误') + '</span>';
        }
      }, { sessionId: id });
    },

    _escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML.replace(/\n/g, '<br>');
    },

    _bindCodeBlocks(container) {
      container.querySelectorAll('.qoder-code-block__copy').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', () => {
          const code = btn.closest('.qoder-code-block').querySelector('code');
          if (code) {
            navigator.clipboard.writeText(code.textContent).then(() => {
              const orig = btn.textContent;
              btn.textContent = '已复制 ✓';
              setTimeout(() => btn.textContent = orig, 1500);
            }).catch(() => {
              // fallback
              const ta = document.createElement('textarea');
              ta.value = code.textContent;
              document.body.appendChild(ta);
              ta.select();
              document.execCommand('copy');
              document.body.removeChild(ta);
              btn.textContent = '已复制 ✓';
              setTimeout(() => btn.textContent = '复制', 1500);
            });
          }
        });
      });
    },

    _bindMessageActions(container) {
      container.querySelectorAll('.qoder-chat__action').forEach(btn => {
        if (btn._bound) return;
        btn._bound = true;
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const msg = btn.closest('.qoder-chat__msg');
          if (action === 'copy' && msg) {
            const content = msg.querySelector('.qoder-chat__msg-content');
            if (content) {
              navigator.clipboard.writeText(content.textContent).catch(() => {});
              btn.textContent = '已复制 ✓';
              setTimeout(() => btn.textContent = '复制', 1500);
            }
          } else if (action === 'like' || action === 'dislike') {
            btn.style.opacity = '1';
            btn.style.background = 'var(--accent-bg)';
          } else if (action === 'regenerate') {
            if (QF.toast) QF.toast.show('重新生成中...', 'info');
          }
        });
      });
    },

    _bindThinking(container) {
      container.querySelectorAll('.qoder-thinking__header').forEach(header => {
        if (header._bound) return;
        header._bound = true;
        header.addEventListener('click', () => {
          header.parentElement.classList.toggle('qoder-thinking--open');
        });
      });
    }
  };

  /* ============================================================
     2. 命令面板增强 - 模糊搜索
     ============================================================ */
  if (QF.palette) {
    const origFilter = QF.palette._filter.bind(QF.palette);
    QF.palette._filter = function() {
      const q = this._input.value.toLowerCase().trim();
      if (!q) {
        this._filtered = this._items;
      } else {
        // 模糊匹配：子序列匹配 + 包含匹配
        this._filtered = this._items.filter(item => {
          const label = item.label.toLowerCase();
          const detail = (item.detail || '').toLowerCase();
          // 包含匹配
          if (label.includes(q) || detail.includes(q)) return true;
          // 子序列模糊匹配
          let qi = 0;
          for (let i = 0; i < label.length && qi < q.length; i++) {
            if (label[i] === q[qi]) qi++;
          }
          return qi === q.length;
        });
        // 按匹配质量排序：包含匹配优先
        this._filtered.sort((a, b) => {
          const aIn = a.label.toLowerCase().includes(q) ? 0 : 1;
          const bIn = b.label.toLowerCase().includes(q) ? 0 : 1;
          return aIn - bIn;
        });
      }
      this._activeIndex = 0;
      this._render();
    };
  }

  /* ============================================================
     3. 设置面板 - 内容切换 + 持久化
     ============================================================ */
  QF.settings = {
    init(containerSelector) {
      document.querySelectorAll(containerSelector).forEach(panel => {
        if (panel._settingsInit) return;
        panel._settingsInit = true;
        const navItems = panel.querySelectorAll('.qoder-settings__nav-item');
        const contentAreas = panel.querySelectorAll('.qoder-settings__content-area, .qoder-settings__content');

        navItems.forEach((item, idx) => {
          item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('qoder-settings__nav-item--active'));
            item.classList.add('qoder-settings__nav-item--active');
            // 如果有 data-target 属性，切换对应内容
            const target = item.dataset.target;
            if (target) {
              contentAreas.forEach(area => {
                area.style.display = area.id === target ? '' : 'none';
              });
            }
          });
        });

        // 持久化开关
        panel.querySelectorAll('.qoder-switch input, .qoder-checkbox input').forEach(input => {
          const key = 'qoder_setting_' + (input.name || input.id || Math.random());
          const saved = localStorage.getItem(key);
          if (saved !== null) input.checked = saved === 'true';
          input.addEventListener('change', () => {
            localStorage.setItem(key, input.checked);
          });
        });

        // 持久化select
        panel.querySelectorAll('.qoder-select').forEach(select => {
          const key = 'qoder_setting_select_' + select.id;
          const saved = localStorage.getItem(key);
          if (saved) {
            const valEl = select.querySelector('.qoder-select__value');
            if (valEl) valEl.textContent = saved;
          }
          select.addEventListener('change', (e) => {
            localStorage.setItem(key, e.detail.label);
          });
        });
      });
    }
  };

  /* ============================================================
     4. 侧边栏会话管理
     ============================================================ */
  QF.sessions = {
    _sessions: JSON.parse(localStorage.getItem('qoder_sessions') || '[]'),

    init(panelSelector) {
      document.querySelectorAll(panelSelector).forEach(panel => {
        if (panel._sessionsInit) return;
        panel._sessionsInit = true;
        this._render(panel);
        // 新建按钮
        const newBtn = panel.querySelector('[data-action="new-session"]');
        if (newBtn) newBtn.addEventListener('click', () => this.create(panel));
      });
    },

    create(panel) {
      const session = {
        id: 's_' + Date.now(),
        title: '新会话 ' + (this._sessions.length + 1),
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        active: true
      };
      this._sessions.forEach(s => s.active = false);
      this._sessions.unshift(session);
      this._save();
      this._render(panel);
      if (QF.toast) QF.toast.show('已创建新会话', 'success');
    },

    delete(panel, id) {
      this._sessions = this._sessions.filter(s => s.id !== id);
      this._save();
      this._render(panel);
    },

    select(panel, id) {
      this._sessions.forEach(s => s.active = s.id === id);
      this._save();
      this._render(panel);
    },

    _save() {
      localStorage.setItem('qoder_sessions', JSON.stringify(this._sessions));
    },

    _render(panel) {
      const list = panel.querySelector('.qoder-collapsible__body') || panel;
      if (!list) return;
      if (this._sessions.length === 0) {
        // 保留默认示例
        return;
      }
      list.innerHTML = this._sessions.map(s => `
        <div class="qoder-session-item ${s.active ? 'qoder-session-item--active' : ''}" data-id="${s.id}">
          <span class="qoder-session-item__title">${s.title}</span>
          <span class="qoder-session-item__time">${s.time}</span>
          <button class="qoder-session-item__delete" data-id="${s.id}" style="display:none;background:none;border:none;color:var(--text-tertiary);cursor:pointer;padding:0 4px;">×</button>
        </div>`).join('');
      list.querySelectorAll('.qoder-session-item').forEach(item => {
        item.addEventListener('click', (e) => {
          if (e.target.classList.contains('qoder-session-item__delete')) return;
          this.select(panel, item.dataset.id);
        });
        item.addEventListener('mouseenter', () => {
          const del = item.querySelector('.qoder-session-item__delete');
          if (del) del.style.display = 'inline';
        });
        item.addEventListener('mouseleave', () => {
          const del = item.querySelector('.qoder-session-item__delete');
          if (del) del.style.display = 'none';
        });
      });
      list.querySelectorAll('.qoder-session-item__delete').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.delete(panel, btn.dataset.id);
        });
      });
    }
  };

  /* ============================================================
     5. DatePicker 完整日历
     ============================================================ */
  QF.datepicker = {
    init() {
      document.querySelectorAll('.qoder-datepicker').forEach(dp => {
        if (dp._dpInit) return;
        dp._dpInit = true;
        const input = dp.querySelector('.qoder-datepicker__input input');
        const panel = dp.querySelector('.qoder-datepicker__panel');
        if (!input || !panel) return;

        let currentDate = new Date();
        let selectedDate = null;

        const render = () => {
          const year = currentDate.getFullYear();
          const month = currentDate.getMonth();
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const daysInPrevMonth = new Date(year, month, 0).getDate();
          const today = new Date();

          let html = `<div class="qoder-datepicker__header">
            <span class="qoder-datepicker__nav" data-nav="prev">‹</span>
            <span class="qoder-datepicker__title">${year} 年 ${month + 1} 月</span>
            <span class="qoder-datepicker__nav" data-nav="next">›</span>
          </div><div class="qoder-datepicker__grid">`;
          ['日','一','二','三','四','五','六'].forEach(d => html += `<span class="qoder-datepicker__dow">${d}</span>`);
          // 上月填充
          for (let i = firstDay - 1; i >= 0; i--) {
            html += `<span class="qoder-datepicker__day qoder-datepicker__day--other">${daysInPrevMonth - i}</span>`;
          }
          // 当月
          for (let d = 1; d <= daysInMonth; d++) {
            let cls = 'qoder-datepicker__day';
            if (d === today.getDate() && month === today.getMonth() && year === today.getFullYear()) cls += ' qoder-datepicker__day--today';
            if (selectedDate && d === selectedDate.getDate() && month === selectedDate.getMonth() && year === selectedDate.getFullYear()) cls += ' qoder-datepicker__day--selected';
            html += `<span class="${cls}" data-day="${d}">${d}</span>`;
          }
          // 下月填充
          const totalCells = firstDay + daysInMonth;
          const remaining = (7 - totalCells % 7) % 7;
          for (let d = 1; d <= remaining; d++) {
            html += `<span class="qoder-datepicker__day qoder-datepicker__day--other">${d}</span>`;
          }
          html += '</div>';
          panel.innerHTML = html;

          panel.querySelector('[data-nav="prev"]').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() - 1);
            render();
          });
          panel.querySelector('[data-nav="next"]').addEventListener('click', () => {
            currentDate.setMonth(currentDate.getMonth() + 1);
            render();
          });
          panel.querySelectorAll('.qoder-datepicker__day:not(.qoder-datepicker__day--other)').forEach(day => {
            day.addEventListener('click', () => {
              selectedDate = new Date(year, month, parseInt(day.dataset.day));
              input.value = `${year}-${String(month + 1).padStart(2, '0')}-${String(day.dataset.day).padStart(2, '0')}`;
              dp.classList.remove('qoder-datepicker--open');
              dp.dispatchEvent(new CustomEvent('change', { detail: { date: selectedDate } }));
            });
          });
        };

        input.addEventListener('click', (e) => {
          e.stopPropagation();
          document.querySelectorAll('.qoder-datepicker--open').forEach(d => { if (d !== dp) d.classList.remove('qoder-datepicker--open'); });
          dp.classList.toggle('qoder-datepicker--open');
          if (dp.classList.contains('qoder-datepicker--open')) render();
        });
        panel.addEventListener('click', (e) => e.stopPropagation());
      });
      document.addEventListener('click', () => {
        document.querySelectorAll('.qoder-datepicker--open').forEach(d => d.classList.remove('qoder-datepicker--open'));
      });
    }
  };

  /* ============================================================
     6. Upload 文件上传
     ============================================================ */
  QF.upload = {
    init() {
      document.querySelectorAll('.qoder-upload').forEach(upload => {
        if (upload._uploadInit) return;
        upload._uploadInit = true;
        const area = upload.querySelector('.qoder-upload__area');
        if (!area) return;

        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.multiple = true;
        fileInput.style.display = 'none';
        upload.appendChild(fileInput);

        area.addEventListener('click', () => fileInput.click());
        area.addEventListener('dragover', (e) => {
          e.preventDefault();
          area.classList.add('qoder-upload__area--dragover');
        });
        area.addEventListener('dragleave', () => area.classList.remove('qoder-upload__area--dragover'));
        area.addEventListener('drop', (e) => {
          e.preventDefault();
          area.classList.remove('qoder-upload__area--dragover');
          this._handleFiles(upload, e.dataTransfer.files);
        });
        fileInput.addEventListener('change', () => this._handleFiles(upload, fileInput.files));
      });
    },

    _handleFiles(upload, files) {
      let list = upload.querySelector('.qoder-upload__list');
      if (!list) {
        list = document.createElement('div');
        list.className = 'qoder-upload__list';
        list.style.marginTop = '12px';
        upload.appendChild(list);
      }
      Array.from(files).forEach(file => {
        const item = document.createElement('div');
        item.className = 'qoder-upload__item';
        item.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-surface);border-radius:6px;margin-bottom:6px;font-size:12px;';
        item.innerHTML = `
          <span class="qoder-icon qoder-icon--file-text" style="font-size:14px;"></span>
          <span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${file.name}</span>
          <span style="color:var(--text-tertiary);">${(file.size / 1024).toFixed(1)}KB</span>
          <div class="qoder-upload__progress" style="width:60px;height:4px;background:var(--border);border-radius:2px;overflow:hidden;"><div class="qoder-upload__progress-bar" style="height:100%;background:var(--accent);width:0%;transition:width 0.3s;"></div></div>
          <button class="qoder-upload__remove" style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;">×</button>`;
        list.appendChild(item);

        // 模拟上传进度
        const bar = item.querySelector('.qoder-upload__progress-bar');
        let progress = 0;
        const interval = setInterval(() => {
          progress += Math.random() * 30;
          if (progress >= 100) {
            progress = 100;
            clearInterval(interval);
            bar.style.background = 'var(--success)';
          }
          bar.style.width = progress + '%';
        }, 200);

        item.querySelector('.qoder-upload__remove').addEventListener('click', () => item.remove());
      });
      if (QF.toast) QF.toast.show(`已添加 ${files.length} 个文件`, 'info');
    }
  };

  /* ============================================================
     7. 终端管理器 TerminalManager（v3.2 完整重写）
        - 多标签：每个标签独立 body / 命令历史 / 工作目录
        - 标签切换、关闭（×）、新建（+）
        - 分屏（⊞）：双栏并排，点击分栏聚焦
        - 清屏（🗑）：清空当前分栏输出
     ============================================================ */
  QF.terminal = {
    _groups: new Map(),
    _shellSeq: ['bash', 'zsh', 'sh', 'fish', 'pwsh'],
    _shellIdx: 0,

    init() {
      document.querySelectorAll('.qoder-terminal').forEach(term => {
        if (term._termInit) return;
        term._termInit = true;
        this._setupGroup(term);
      });
    },

    /* ---------- 组初始化：规范化结构 ---------- */
    _setupGroup(el) {
      const tabsBar = el.querySelector('.qoder-terminal__tabs');
      const oldBody = el.querySelector('.qoder-terminal__body');

      // bodies 容器：承载每个标签的独立 body
      const bodiesWrap = document.createElement('div');
      bodiesWrap.className = 'qoder-terminal__bodies';
      if (oldBody) {
        el.insertBefore(bodiesWrap, oldBody);
        bodiesWrap.appendChild(oldBody); // 保留演示内容作为第一个标签
      } else {
        el.appendChild(bodiesWrap);
      }

      const state = {
        el, tabsBar, bodiesWrap,
        tabs: [],
        activeId: null,
        split: false,
        splitTabId: null,
        _idSeq: 0
      };
      this._groups.set(el, state);

      // 标签1：沿用现有 body（保留初始输出）
      const firstName = 'bash';
      const firstBody = oldBody || this._makeBody();
      firstBody.classList.add('qoder-terminal__body');
      firstBody.dataset.tabId = 'tab_0';
      const tab1 = this._makeTabState(firstName, firstBody, state);
      state.tabs.push(tab1);

      // 标签2：若原有第二个静态标签则对应新建
      if (tabsBar) {
        const staticTabs = tabsBar.querySelectorAll('.qoder-terminal__tab:not(.qoder-terminal__tab--add)');
        if (staticTabs.length > 1) {
          const zshBody = this._makeBody();
          bodiesWrap.appendChild(zshBody); // 必须挂载到 DOM（v3.2 修复 detached bug）
          state.tabs.push(this._makeTabState('zsh', zshBody, state));
        }
      }

      // 重建标签栏
      if (!tabsBar) {
        state.tabsBar = document.createElement('div');
        state.tabsBar.className = 'qoder-terminal__tabs';
        el.insertBefore(state.tabsBar, bodiesWrap);
      }
      state.activeId = tab1.id;
      this._renderTabs(state);

      // 命令行输入行
      this._attachInput(tab1, state);
      if (state.tabs[1]) this._attachInput(state.tabs[1], state);

      return state;
    },

    _makeBody() {
      const body = document.createElement('div');
      body.className = 'qoder-terminal__body';
      body.innerHTML = '<div class="qoder-terminal__line qoder-terminal__line--dim">Shell ready. 输入 help 查看可用命令。</div>';
      return body;
    },

    _makeTabState(name, body, state) {
      const id = 'tab_' + (state._idSeq++);
      if (body) body.dataset.tabId = id;
      return { id, name, body, history: [], historyIdx: 0, cwd: '~' };
    },

    /* ---------- 标签栏渲染 ---------- */
    _renderTabs(state) {
      const bar = state.tabsBar;
      bar.innerHTML = '';

      state.tabs.forEach(tab => {
        const el = document.createElement('div');
        el.className = 'qoder-terminal__tab' + (tab.id === state.activeId ? ' qoder-terminal__tab--active' : '');
        el.dataset.tabId = tab.id;
        el.title = tab.name + ' — 点击切换';
        el.innerHTML =
          '<span class="qoder-terminal__tab-icon">⌨</span>' +
          '<span class="qoder-terminal__tab-title">' + tab.name + '</span>' +
          '<span class="qoder-terminal__tab-close" title="关闭标签">×</span>';
        // 切换
        el.addEventListener('click', (e) => {
          if (e.target.classList.contains('qoder-terminal__tab-close')) return;
          this.activateTab(state.el, tab.id);
        });
        // 关闭
        el.querySelector('.qoder-terminal__tab-close').addEventListener('click', (e) => {
          e.stopPropagation();
          this.closeTab(state.el, tab.id);
        });
        bar.appendChild(el);
      });

      // 新建标签（+）
      const add = document.createElement('div');
      add.className = 'qoder-terminal__tab qoder-terminal__tab--add';
      add.title = '新建终端标签';
      add.textContent = '+';
      add.addEventListener('click', () => this.createTab(state.el));
      bar.appendChild(add);

      // 操作区：分屏 / 清屏
      const actions = document.createElement('div');
      actions.className = 'qoder-terminal__actions';
      actions.innerHTML =
        '<span class="qoder-terminal__action" data-action="split" title="分屏 / 取消分屏">⊞</span>' +
        '<span class="qoder-terminal__action" data-action="clear" title="清空当前终端">🗑</span>';
      actions.querySelector('[data-action="split"]').addEventListener('click', () => this.toggleSplit(state.el));
      actions.querySelector('[data-action="clear"]').addEventListener('click', () => this.clearActive(state.el));
      bar.appendChild(actions);
    },

    /* ---------- bodies 可见性同步 ---------- */
    _syncBodies(state) {
      const visibleIds = state.split && state.splitTabId
        ? [state.activeId, state.splitTabId]
        : [state.activeId];
      state.tabs.forEach(tab => {
        const show = visibleIds.indexOf(tab.id) >= 0;
        tab.body.style.display = show ? '' : 'none';
      });
      state.bodiesWrap.classList.toggle('qoder-terminal__bodies--split', !!(state.split && state.splitTabId));
    },

    /* ---------- 公开 API：切换 ---------- */
    activateTab(el, tabId) {
      const state = this._groups.get(el);
      if (!state) return;
      const tab = state.tabs.find(t => t.id === tabId);
      if (!tab) return;
      state.activeId = tabId;
      this._renderTabs(state);
      this._syncBodies(state);
      this._focus(tab);
    },

    /* ---------- 公开 API：新建 ---------- */
    createTab(el, name) {
      const state = this._groups.get(el);
      if (!state) return null;
      const shellName = name || this._shellSeq[this._shellIdx++ % this._shellSeq.length];
      const body = this._makeBody();
      state.bodiesWrap.appendChild(body); // 挂载到 DOM
      const tab = this._makeTabState(shellName, body, state);
      state.tabs.push(tab);
      this._attachInput(tab, state);
      state.activeId = tab.id;
      // 分屏下新建：让右栏跟随新标签
      if (state.split && !state.splitTabId) state.splitTabId = tab.id;
      this._renderTabs(state);
      this._syncBodies(state);
      this._focus(tab);
      el.dispatchEvent(new CustomEvent('qoder-terminal-tab-open', { detail: { id: tab.id, name: tab.name }, bubbles: true }));
      return tab;
    },

    /* ---------- 公开 API：关闭 ---------- */
    closeTab(el, tabId) {
      const state = this._groups.get(el);
      if (!state) return;
      const idx = state.tabs.findIndex(t => t.id === tabId);
      if (idx < 0) return;
      const closed = state.tabs[idx];
      state.tabs.splice(idx, 1);
      closed.body.remove();

      // 全部关闭则自动补一个新 bash
      if (state.tabs.length === 0) {
        state.split = false;
        state.splitTabId = null;
        const body = this._makeBody();
        state.bodiesWrap.appendChild(body); // 挂载到 DOM
        const tab = this._makeTabState('bash', body, state);
        state.tabs.push(tab);
        this._attachInput(tab, state);
        state.activeId = tab.id;
        this._renderTabs(state);
        this._syncBodies(state);
        this._focus(tab);
        return;
      }

      // 激活对象调整
      if (state.activeId === tabId) {
        const next = state.tabs[Math.min(idx, state.tabs.length - 1)];
        state.activeId = next.id;
      }
      if (state.splitTabId === tabId) {
        const other = state.tabs.find(t => t.id !== state.activeId);
        state.splitTabId = other ? other.id : null;
        if (!state.splitTabId) state.split = false;
      }
      this._renderTabs(state);
      this._syncBodies(state);
      const active = state.tabs.find(t => t.id === state.activeId);
      if (active) this._focus(active);
      el.dispatchEvent(new CustomEvent('qoder-terminal-tab-close', { detail: { id: tabId, name: closed.name }, bubbles: true }));
    },

    /* ---------- 公开 API：分屏切换 ---------- */
    toggleSplit(el) {
      const state = this._groups.get(el);
      if (!state) return;
      if (state.split) {
        state.split = false;
        state.splitTabId = null;
      } else {
        // 右栏优先选当前激活标签之外的标签，否则自动新建
        let other = state.tabs.find(t => t.id !== state.activeId);
        if (!other) other = this.createTab(el);
        state.split = true;
        state.splitTabId = other.id;
      }
      this._renderTabs(state);
      this._syncBodies(state);
      const active = state.tabs.find(t => t.id === state.activeId);
      if (active) this._focus(active);
    },

    /* ---------- 公开 API：清屏 ---------- */
    clearActive(el) {
      const state = this._groups.get(el);
      if (!state) return;
      const tab = state.tabs.find(t => t.id === state.activeId);
      if (!tab) return;
      tab.body.innerHTML = '';
      tab.history = [];
      tab.historyIdx = 0;
      this._attachInput(tab, state);
      this._focus(tab);
    },

    /* ---------- 焦点 ---------- */
    _focus(tab) {
      if (!tab || !tab.body) return;
      // v3.3 修复：取最后一行输入（此前 :last-of-type 误中第一行）
      const inputs = tab.body.querySelectorAll('.qoder-terminal__input-text');
      const input = inputs[inputs.length - 1];
      if (input) input.focus();
    },

    /* ---------- 输入行 ---------- */
    _inputLineHtml() {
      return '<span class="qoder-terminal__prompt">user@qoder</span>:<span class="qoder-terminal__path"></span>$ ' +
        '<span class="qoder-terminal__input-text" contenteditable="true" spellcheck="false" style="outline:none;display:inline-block;min-width:10px;"></span>' +
        '<span class="qoder-terminal__cursor">▋</span>';
    },

    _attachInput(tab, state) {
      if (!tab || !tab.body || tab.body.querySelector('.qoder-terminal__input-text')) return;
      const line = document.createElement('div');
      line.className = 'qoder-terminal__line qoder-terminal__input-line';
      line.innerHTML = this._inputLineHtml();
      tab.body.appendChild(line);
      line.querySelector('.qoder-terminal__path').textContent = tab.cwd;
      const inputEl = line.querySelector('.qoder-terminal__input-text');

      // 点击 body 任意处聚焦当前分栏（body 只绑定一次，防止 clear 后重复）
      if (tab.body._clickBound !== true) {
        tab.body._clickBound = true;
        tab.body.addEventListener('click', () => {
          // 分屏时点击即切换激活
          if (state.split && tab.id !== state.activeId) {
            this.activateTab(state.el, tab.id);
          } else {
            const inputs = tab.body.querySelectorAll('.qoder-terminal__input-text');
            const activeInput = inputs[inputs.length - 1];
            if (activeInput) activeInput.focus();
          }
        });
      }

      this._bindInput(inputEl, line, tab, state);
    },

    /* ---------- 输入行键盘逻辑（v3.3 提取为独立方法：
       此前新输入行复用空函数，导致首条命令后 Enter 失效） ---------- */
    _bindInput(inputEl, line, tab, state) {
      const submit = () => {
        const cmd = inputEl.textContent.trim();
        line.querySelector('.qoder-terminal__cursor')?.remove();
        line.setAttribute('contenteditable', 'false');
        if (cmd) {
          tab.history.push(cmd);
          tab.historyIdx = tab.history.length;
          this._execute(tab, cmd);
        }
        // 新输入行
        const newLine = document.createElement('div');
        newLine.className = 'qoder-terminal__line qoder-terminal__input-line';
        newLine.innerHTML = this._inputLineHtml();
        newLine.querySelector('.qoder-terminal__path').textContent = tab.cwd;
        tab.body.appendChild(newLine);
        const newInput = newLine.querySelector('.qoder-terminal__input-text');
        newInput.focus();
        this._bindInput(newInput, newLine, tab, state);
        tab.body.scrollTop = tab.body.scrollHeight;
      };

      inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          submit();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          if (tab.historyIdx > 0) {
            tab.historyIdx--;
            inputEl.textContent = tab.history[tab.historyIdx] || '';
          }
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          if (tab.historyIdx < tab.history.length - 1) {
            tab.historyIdx++;
            inputEl.textContent = tab.history[tab.historyIdx];
          } else {
            tab.historyIdx = tab.history.length;
            inputEl.textContent = '';
          }
        } else if (e.key === 'l' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          tab.body.innerHTML = '';
          this._attachInput(tab, state);
        }
      });
    },

    /* ---------- v3.3 输出一行（transport 用，text 安全转义） ---------- */
    _printOut(body, text, kind) {
      const line = document.createElement('div');
      line.className = 'qoder-terminal__line' + (kind === 'stderr' ? ' qoder-terminal__line--err' : '');
      line.textContent = text;
      body.appendChild(line);
      body.scrollTop = body.scrollHeight;
    },

    /* ---------- 命令执行（按标签独立 cwd/输出） ---------- */
    _execute(tab, cmd) {
      const body = tab.body;

      // v3.3：有 transport → 交给后端执行（clear/exit 仍为本地 UI 行为）
      const tp = QF.transport && QF.transport.get();
      if (tp && tp.supportsTerminal && cmd !== 'clear' && cmd !== 'exit') {
        const self = this;
        tp.exec(cmd, tab.cwd, {
          onOutput(data, stream) { String(data).split('\n').forEach(l => self._printOut(body, l, stream)); },
          onCwd(cwd) {
            tab.cwd = cwd;
            const lastPath = body.querySelector('.qoder-terminal__input-line:last-of-type .qoder-terminal__path');
            if (lastPath) lastPath.textContent = cwd;
          },
          onError(err) { self._printOut(body, (err && err.message) || 'transport error', 'stderr'); }
        }, { tabId: tab.id });
        return;
      }

      const output = document.createElement('div');
      output.className = 'qoder-terminal__line';
      let result = '';
      if (cmd === 'help') {
        result = '可用命令: help, clear, echo, date, whoami, ls, pwd, cd, exit';
      } else if (cmd === 'clear') {
        body.innerHTML = '';
        const groupEl = this._groupOf(tab);
        const st = groupEl ? this._groups.get(groupEl) : null;
        if (st) this._attachInput(tab, st);
        return;
      } else if (cmd === 'date') {
        result = new Date().toString();
      } else if (cmd === 'whoami') {
        result = 'user';
      } else if (cmd === 'ls') {
        result = 'src/  examples/  package.json  README.md';
      } else if (cmd === 'pwd') {
        result = '/home/user/qoder-ui';
      } else if (cmd === 'exit') {
        const groupEl = this._groupOf(tab);
        if (groupEl) this.closeTab(groupEl, tab.id);
        return;
      } else if (cmd.startsWith('echo ')) {
        result = cmd.slice(5);
      } else if (cmd.startsWith('cd')) {
        const target = cmd.slice(2).trim();
        if (!target || target === '~') tab.cwd = '~';
        else if (target === '..') {
          const parts = tab.cwd.split('/');
          tab.cwd = parts.length > 1 ? parts.slice(0, -1).join('/') || '/' : tab.cwd;
        } else {
          tab.cwd = (tab.cwd === '~' ? '' : tab.cwd) + '/' + target.replace(/^\/+/, '');
        }
        const lastLine = body.querySelector('.qoder-terminal__input-line:last-of-type .qoder-terminal__path');
        if (lastLine) lastLine.textContent = tab.cwd;
        return;
      } else {
        result = '<span style="color:var(--error);">command not found: ' + cmd.replace(/</g, '&lt;') + '</span>';
      }
      output.innerHTML = result;
      body.appendChild(output);
      body.scrollTop = body.scrollHeight;
    },

    _groupOf(tab) {
      for (const [el, state] of this._groups) {
        if (state.tabs.indexOf(tab) >= 0) return el;
      }
      return null;
    }
  };

  /* ============================================================
     8. 通知中心增强 - 未读过滤 + 单条删除
     ============================================================ */
  if (QF.notificationCenter) {
    const nc = QF.notificationCenter;
    nc._filter = 'all';

    const origRender = nc._render.bind(nc);
    nc._render = function() {
      if (!this._el) return;
      const list = this._el.querySelector('.qoder-notification-center__list');
      const count = this._el.querySelector('.qoder-notification-center__count');
      if (!list) return;
      count.textContent = this._notifications.filter(n => n.unread).length;

      // 标签切换
      const tabs = this._el.querySelectorAll('.qoder-notification-center__tab');
      tabs.forEach(tab => {
        if (!tab._bound) {
          tab._bound = true;
          tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('qoder-notification-center__tab--active'));
            tab.classList.add('qoder-notification-center__tab--active');
            this._filter = tab.textContent.includes('未读') ? 'unread' : 'all';
            this._render();
          });
        }
      });

      const filtered = this._filter === 'unread' ? this._notifications.filter(n => n.unread) : this._notifications;
      if (filtered.length === 0) {
        list.innerHTML = `<div class="qoder-notification-center__empty"><div class="qoder-notification-center__empty-icon">🔔</div><div class="qoder-notification-center__empty-text">暂无通知</div></div>`;
        return;
      }
      list.innerHTML = filtered.map(n => `
        <div class="qoder-notification-item ${n.unread ? 'qoder-notification-item--unread' : ''}" data-id="${n.id}">
          <div class="qoder-notification-item__icon qoder-notification-item__icon--${n.type}">${n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : n.type === 'warning' ? '!' : 'i'}</div>
          <div class="qoder-notification-item__body">
            <div class="qoder-notification-item__title">${n.title}</div>
            <div class="qoder-notification-item__desc">${n.desc}</div>
            <div class="qoder-notification-item__time">${n.time}</div>
          </div>
          <button class="qoder-notification-item__close" data-id="${n.id}" style="background:none;border:none;color:var(--text-tertiary);cursor:pointer;font-size:16px;padding:0 4px;align-self:flex-start;">×</button>
        </div>`).join('');
      list.querySelectorAll('.qoder-notification-item__close').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const id = parseInt(btn.dataset.id);
          this._notifications = this._notifications.filter(n => n.id !== id);
          this._render();
        });
      });
    };
  }

  /* ============================================================
     9. ColorPicker 取色器
     ============================================================ */
  QF.colorpicker = {
    init() {
      document.querySelectorAll('.qoder-color-picker').forEach(cp => {
        if (cp._cpInit) return;
        cp._cpInit = true;
        const swatches = cp.querySelector('.qoder-color-picker__swatches');
        if (!swatches) return;

        // 添加自定义颜色输入
        const customRow = document.createElement('div');
        customRow.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:10px;';
        customRow.innerHTML = `<input type="color" value="#358e62" style="width:32px;height:32px;border:none;border-radius:6px;cursor:pointer;background:none;"><input type="text" value="#358e62" style="flex:1;padding:4px 8px;border:1px solid var(--border);border-radius:6px;background:var(--bg-surface);color:var(--text-primary);font-size:12px;font-family:var(--qoder-font-mono);">`;
        cp.appendChild(customRow);

        const colorInput = customRow.querySelector('input[type="color"]');
        const textInput = customRow.querySelector('input[type="text"]');

        colorInput.addEventListener('input', () => {
          textInput.value = colorInput.value;
          cp.dispatchEvent(new CustomEvent('change', { detail: { color: colorInput.value } }));
        });
        textInput.addEventListener('change', () => {
          if (/^#[0-9a-fA-F]{6}$/.test(textInput.value)) {
            colorInput.value = textInput.value;
          }
        });

        swatches.querySelectorAll('.qoder-color-picker__swatch').forEach(swatch => {
          swatch.addEventListener('click', () => {
            swatches.querySelectorAll('.qoder-color-picker__swatch').forEach(s => s.classList.remove('qoder-color-picker__swatch--active'));
            swatch.classList.add('qoder-color-picker__swatch--active');
            const color = swatch.style.background;
            textInput.value = color;
            cp.dispatchEvent(new CustomEvent('change', { detail: { color } }));
          });
        });
      });
    }
  };

  /* ============================================================
     10. 快捷键帮助面板
     ============================================================ */
  QF.shortcutsPanel = {
    _el: null,

    open() {
      if (!this._el) {
        this._el = document.createElement('div');
        this._el.className = 'qoder-palette';
        this._el.innerHTML = `
          <div class="qoder-palette__modal" style="max-width:500px;" role="dialog">
            <div class="qoder-palette__input-wrap">
              <span class="qoder-palette__icon">⌨</span>
              <span style="flex:1;font-size:14px;font-weight:600;">键盘快捷键</span>
              <span class="qoder-palette__shortcut">ESC</span>
            </div>
            <div class="qoder-palette__list" id="shortcutsList"></div>
          </div>`;
        document.body.appendChild(this._el);
        this._el.addEventListener('click', (e) => { if (e.target === this._el) this.close(); });
      }
      const list = this._el.querySelector('#shortcutsList');
      const bindings = QF.hotkeys ? QF.hotkeys.getAll() : [];
      const defaults = [
        { keys: 'Ctrl+Shift+P', description: '打开命令面板' },
        { keys: 'Ctrl+K T', description: '切换主题' },
        { keys: 'Ctrl+N', description: '新建会话' },
        { keys: 'Ctrl+,', description: '打开设置' },
        { keys: '?', description: '显示快捷键帮助' },
        { keys: 'Esc', description: '关闭弹窗' }
      ];
      const all = [...defaults, ...bindings.map(b => ({ keys: this._formatKeys(b.keys), description: b.description || '' }))];
      list.innerHTML = all.map(s => `
        <div class="qoder-palette__item" style="cursor:default;">
          <span class="qoder-palette__item-label">${s.description}</span>
          <span class="qoder-palette__item-shortcut">${s.keys}</span>
        </div>`).join('');
      this._el.classList.add('qoder-palette--open');
      document.body.style.overflow = 'hidden';
    },

    close() {
      if (this._el) this._el.classList.remove('qoder-palette--open');
      document.body.style.overflow = '';
    },

    _formatKeys(keys) {
      return keys.split('+').map(k => {
        if (k === 'ctrl') return 'Ctrl';
        if (k === 'shift') return 'Shift';
        if (k === 'alt') return 'Alt';
        if (k === 'meta') return 'Cmd';
        return k.charAt(0).toUpperCase() + k.slice(1);
      }).join('+');
    }
  };

  /* ============================================================
     11. 自动初始化所有功能
     ============================================================ */
  function autoInitFeatures() {
    // 聊天
    QF.chat.init('.qoder-chat');
    // 设置面板
    QF.settings.init('.qoder-settings');
    // 侧边栏会话
    QF.sessions.init('.qoder-sidebar-panel');
    // DatePicker
    QF.datepicker.init();
    // Upload
    QF.upload.init();
    // 终端
    QF.terminal.init();
    // ColorPicker
    QF.colorpicker.init();
    // 拖拽排序 - 自动初始化会话列表
    if (QF.draggable) {
      document.querySelectorAll('.qoder-collapsible__body').forEach(body => {
        if (body.querySelector('.qoder-session-item')) {
          QF.draggable.init(body, '.qoder-session-item');
        }
      });
    }
    // 快捷键 ? 打开帮助面板
    if (QF.hotkeys) {
      QF.hotkeys.register('?', () => QF.shortcutsPanel.open(), '显示快捷键帮助');
    }
    // 全局代码块复制
    document.querySelectorAll('.qoder-code-block__copy').forEach(btn => {
      if (btn._bound) return;
      btn._bound = true;
      btn.addEventListener('click', () => {
        const code = btn.closest('.qoder-code-block').querySelector('code');
        if (code) {
          navigator.clipboard.writeText(code.textContent).catch(() => {});
          const orig = btn.textContent;
          btn.textContent = '已复制 ✓';
          setTimeout(() => btn.textContent = orig, 1500);
        }
      });
    });
  }

  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', autoInitFeatures);
    } else {
      autoInitFeatures();
    }
  }

  QF.features = { init: autoInitFeatures };
})();
