/* ============================================================
   Qoder UI Interactions - 完整交互逻辑 + Web Components
   依赖 qoder-ui.js（基础主题/Toast/Dialog）
   ============================================================ */
(function() {
  'use strict';

  const QI = window.QoderUI = window.QoderUI || {};

  /* ============================================================
     1. 命令面板 Command Palette
     ============================================================ */
  QI.palette = {
    _el: null,
    _input: null,
    _list: null,
    _items: [],
    _filtered: [],
    _activeIndex: 0,
    _onSelect: null,

    open(items, onSelect) {
      this._items = items || [];
      this._onSelect = onSelect;
      this._filtered = items;
      this._activeIndex = 0;
      if (!this._el) this._create();
      this._render();
      this._el.classList.add('qoder-palette--open');
      setTimeout(() => this._input.focus(), 50);
      document.body.style.overflow = 'hidden';
    },

    close() {
      if (this._el) {
        this._el.classList.remove('qoder-palette--open');
        this._input.value = '';
      }
      document.body.style.overflow = '';
    },

    _create() {
      this._el = document.createElement('div');
      this._el.className = 'qoder-palette';
      this._el.innerHTML = `
        <div class="qoder-palette__modal" role="dialog" aria-label="命令面板">
          <div class="qoder-palette__input-wrap">
            <span class="qoder-palette__icon">⌘</span>
            <input class="qoder-palette__input" type="text" placeholder="输入命令名称..." autocomplete="off">
            <span class="qoder-palette__shortcut">ESC</span>
          </div>
          <div class="qoder-palette__list"></div>
          <div class="qoder-palette__footer">
            <div class="qoder-palette__footer-hints">
              <span class="qoder-palette__footer-hint"><kbd>↑↓</kbd> 导航</span>
              <span class="qoder-palette__footer-hint"><kbd>↵</kbd> 选择</span>
              <span class="qoder-palette__footer-hint"><kbd>esc</kbd> 关闭</span>
            </div>
          </div>
        </div>`;
      document.body.appendChild(this._el);
      this._input = this._el.querySelector('.qoder-palette__input');
      this._list = this._el.querySelector('.qoder-palette__list');

      this._input.addEventListener('input', () => this._filter());
      this._input.addEventListener('keydown', (e) => this._onKeydown(e));
      this._el.addEventListener('click', (e) => {
        if (e.target === this._el) this.close();
      });
    },

    _filter() {
      const q = this._input.value.toLowerCase();
      this._filtered = q ? this._items.filter(i =>
        i.label.toLowerCase().includes(q) || (i.detail || '').toLowerCase().includes(q)
      ) : this._items;
      this._activeIndex = 0;
      this._render();
    },

    _render() {
      if (!this._list) return;
      if (this._filtered.length === 0) {
        this._list.innerHTML = '<div class="qoder-palette__empty">没有找到匹配的命令</div>';
        return;
      }
      let html = '';
      let currentGroup = '';
      this._filtered.forEach((item, i) => {
        if (item.group && item.group !== currentGroup) {
          currentGroup = item.group;
          html += `<div class="qoder-palette__group-label">${currentGroup}</div>`;
        }
        const active = i === this._activeIndex ? ' qoder-palette__item--active' : '';
        const icon = item.icon ? `<span class="qoder-palette__item-icon">${item.icon}</span>` : '';
        const shortcut = item.shortcut ? `<span class="qoder-palette__item-shortcut">${item.shortcut}</span>` : '';
        const detail = item.detail ? `<span class="qoder-palette__item-detail">${item.detail}</span>` : '';
        html += `<div class="qoder-palette__item${active}" data-index="${i}">
          ${icon}<span class="qoder-palette__item-label">${this._highlight(item.label)}</span>${detail}${shortcut}
        </div>`;
      });
      this._list.innerHTML = html;
      this._list.querySelectorAll('.qoder-palette__item').forEach(el => {
        el.addEventListener('click', () => {
          const idx = parseInt(el.dataset.index);
          this._select(this._filtered[idx]);
        });
      });
    },

    _highlight(text) {
      const q = this._input.value;
      if (!q) return text;
      const idx = text.toLowerCase().indexOf(q.toLowerCase());
      if (idx < 0) return text;
      return text.slice(0, idx) + '<mark>' + text.slice(idx, idx + q.length) + '</mark>' + text.slice(idx + q.length);
    },

    _onKeydown(e) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        this._activeIndex = Math.min(this._activeIndex + 1, this._filtered.length - 1);
        this._render();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        this._activeIndex = Math.max(this._activeIndex - 1, 0);
        this._render();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (this._filtered[this._activeIndex]) this._select(this._filtered[this._activeIndex]);
      } else if (e.key === 'Escape') {
        this.close();
      }
    },

    _select(item) {
      if (this._onSelect) this._onSelect(item);
      this.close();
    }
  };

  /* ============================================================
     2. 上下文菜单 Context Menu
     ============================================================ */
  QI.contextMenu = {
    _el: null,

    show(x, y, items) {
      if (!this._el) {
        this._el = document.createElement('div');
        this._el.className = 'qoder-context-menu';
        document.body.appendChild(this._el);
        document.addEventListener('click', () => this.hide());
      }
      let html = '';
      items.forEach(item => {
        if (item.divider) {
          html += '<div class="qoder-context-menu__divider"></div>';
        } else {
          const disabled = item.disabled ? ' qoder-context-menu__item--disabled' : '';
          const danger = item.danger ? ' qoder-context-menu__item--danger' : '';
          const icon = item.icon ? `<span class="qoder-context-menu__icon">${item.icon}</span>` : '<span class="qoder-context-menu__icon"></span>';
          const shortcut = item.shortcut ? `<span class="qoder-context-menu__shortcut">${item.shortcut}</span>` : '';
          html += `<div class="qoder-context-menu__item${disabled}${danger}" data-action="${item.action || ''}">
            ${icon}<span class="qoder-context-menu__label">${item.label}</span>${shortcut}
          </div>`;
        }
      });
      this._el.innerHTML = html;
      this._el.classList.add('qoder-context-menu--open');
      // 位置调整防止溢出
      const rect = this._el.getBoundingClientRect();
      if (x + rect.width > window.innerWidth) x = window.innerWidth - rect.width - 8;
      if (y + rect.height > window.innerHeight) y = window.innerHeight - rect.height - 8;
      this._el.style.left = x + 'px';
      this._el.style.top = y + 'px';
      this._el.querySelectorAll('.qoder-context-menu__item').forEach(el => {
        el.addEventListener('click', () => {
          const action = el.dataset.action;
          const item = items.find(i => i.action === action);
          if (item && !item.disabled && item.onClick) item.onClick();
          this.hide();
        });
      });
    },

    hide() {
      if (this._el) this._el.classList.remove('qoder-context-menu--open');
    }
  };

  /* ============================================================
     3. 通知中心 Notification Center
     ============================================================ */
  QI.notificationCenter = {
    _el: null,
    _notifications: [],
    _unreadCount: 0,

    open() {
      if (!this._el) this._create();
      this._el.classList.add('qoder-notification-center--open');
      this._unreadCount = 0;
      this._render();
    },

    close() {
      if (this._el) this._el.classList.remove('qoder-notification-center--open');
    },

    toggle() {
      if (this._el && this._el.classList.contains('qoder-notification-center--open')) {
        this.close();
      } else {
        this.open();
      }
    },

    add(notification) {
      this._notifications.unshift({
        id: Date.now(),
        type: notification.type || 'info',
        title: notification.title || '',
        desc: notification.desc || '',
        time: new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }),
        unread: true
      });
      this._unreadCount++;
      if (this._el && this._el.classList.contains('qoder-notification-center--open')) {
        this._unreadCount = 0;
        this._render();
      }
      // 同时显示Toast
      if (QI.toast) QI.toast.show(notification.title, notification.type);
    },

    clearAll() {
      this._notifications = [];
      this._unreadCount = 0;
      this._render();
    },

    getUnreadCount() { return this._unreadCount; },

    _create() {
      this._el = document.createElement('div');
      this._el.className = 'qoder-notification-center';
      this._el.innerHTML = `
        <div class="qoder-notification-center__header">
          <div class="qoder-notification-center__title">
            通知 <span class="qoder-notification-center__count">0</span>
          </div>
          <button class="qoder-notification-center__clear">全部已读</button>
        </div>
        <div class="qoder-notification-center__tabs">
          <div class="qoder-notification-center__tab qoder-notification-center__tab--active">全部</div>
          <div class="qoder-notification-center__tab">未读</div>
        </div>
        <div class="qoder-notification-center__list"></div>`;
      document.body.appendChild(this._el);
      this._el.querySelector('.qoder-notification-center__clear').addEventListener('click', () => this.clearAll());
    },

    _render() {
      if (!this._el) return;
      const list = this._el.querySelector('.qoder-notification-center__list');
      const count = this._el.querySelector('.qoder-notification-center__count');
      count.textContent = this._notifications.filter(n => n.unread).length;
      if (this._notifications.length === 0) {
        list.innerHTML = `<div class="qoder-notification-center__empty">
          <div class="qoder-notification-center__empty-icon">🔔</div>
          <div class="qoder-notification-center__empty-text">暂无通知</div>
        </div>`;
        return;
      }
      list.innerHTML = this._notifications.map(n => `
        <div class="qoder-notification-item ${n.unread ? 'qoder-notification-item--unread' : ''}">
          <div class="qoder-notification-item__icon qoder-notification-item__icon--${n.type}">
            ${n.type === 'success' ? '✓' : n.type === 'error' ? '✕' : n.type === 'warning' ? '!' : 'i'}
          </div>
          <div class="qoder-notification-item__body">
            <div class="qoder-notification-item__title">${n.title}</div>
            <div class="qoder-notification-item__desc">${n.desc}</div>
            <div class="qoder-notification-item__time">${n.time}</div>
          </div>
        </div>`).join('');
    }
  };

  /* ============================================================
     4. 表单组件交互
     ============================================================ */
  function initSelects() {
    document.querySelectorAll('.qoder-select').forEach(select => {
      if (select._initialized) return;
      select._initialized = true;
      const trigger = select.querySelector('.qoder-select__trigger');
      const dropdown = select.querySelector('.qoder-select__dropdown');
      if (!trigger || !dropdown) return;
      trigger.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.qoder-select--open').forEach(s => {
          if (s !== select) s.classList.remove('qoder-select--open');
        });
        select.classList.toggle('qoder-select--open');
      });
      dropdown.querySelectorAll('.qoder-select__option').forEach(opt => {
        opt.addEventListener('click', (e) => {
          e.stopPropagation();
          if (opt.classList.contains('qoder-select__option--disabled')) return;
          const value = opt.dataset.value;
          const label = opt.textContent.trim();
          select.querySelector('.qoder-select__value').textContent = label;
          select.querySelector('.qoder-select__value').classList.remove('qoder-select__value--placeholder');
          dropdown.querySelectorAll('.qoder-select__option').forEach(o => o.classList.remove('qoder-select__option--selected'));
          opt.classList.add('qoder-select__option--selected');
          select.classList.remove('qoder-select--open');
          select.dispatchEvent(new CustomEvent('change', { detail: { value, label } }));
        });
      });
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.qoder-select--open').forEach(s => s.classList.remove('qoder-select--open'));
    });
  }

  function initDatePickers() {
    document.querySelectorAll('.qoder-datepicker').forEach(dp => {
      if (dp._initialized) return;
      dp._initialized = true;
      const input = dp.querySelector('.qoder-datepicker__input');
      const panel = dp.querySelector('.qoder-datepicker__panel');
      if (!input || !panel) return;
      input.addEventListener('click', (e) => {
        e.stopPropagation();
        document.querySelectorAll('.qoder-datepicker--open').forEach(d => {
          if (d !== dp) d.classList.remove('qoder-datepicker--open');
        });
        dp.classList.toggle('qoder-datepicker--open');
      });
      panel.addEventListener('click', (e) => e.stopPropagation());
    });
    document.addEventListener('click', () => {
      document.querySelectorAll('.qoder-datepicker--open').forEach(d => d.classList.remove('qoder-datepicker--open'));
    });
  }

  function initSliders() {
    document.querySelectorAll('.qoder-slider').forEach(slider => {
      if (slider._initialized) return;
      slider._initialized = true;
      const track = slider.querySelector('.qoder-slider__track');
      const thumb = slider.querySelector('.qoder-slider__thumb');
      const fill = slider.querySelector('.qoder-slider__fill');
      const valueEl = slider.querySelector('.qoder-slider__value');
      if (!track || !thumb) return;
      const min = parseFloat(slider.dataset.min || 0);
      const max = parseFloat(slider.dataset.max || 100);
      let value = parseFloat(slider.dataset.value || 50);
      function update(v) {
        value = Math.max(min, Math.min(max, v));
        const pct = ((value - min) / (max - min)) * 100;
        thumb.style.left = pct + '%';
        if (fill) fill.style.width = pct + '%';
        if (valueEl) valueEl.textContent = Math.round(value);
        slider.dispatchEvent(new CustomEvent('change', { detail: { value } }));
      }
      update(value);
      let dragging = false;
      function onMove(e) {
        if (!dragging) return;
        const rect = track.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const pct = (clientX - rect.left) / rect.width;
        update(min + pct * (max - min));
      }
      thumb.addEventListener('mousedown', () => { dragging = true; });
      thumb.addEventListener('touchstart', () => { dragging = true; });
      track.addEventListener('click', (e) => {
        const rect = track.getBoundingClientRect();
        const pct = (e.clientX - rect.left) / rect.width;
        update(min + pct * (max - min));
      });
      document.addEventListener('mousemove', onMove);
      document.addEventListener('touchmove', onMove);
      document.addEventListener('mouseup', () => { dragging = false; });
      document.addEventListener('touchend', () => { dragging = false; });
    });
  }

  function initCollapsibles() {
    document.querySelectorAll('.qoder-collapsible__header').forEach(header => {
      if (header._initialized) return;
      header._initialized = true;
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('qoder-collapsible--open');
      });
    });
  }

  function initThinking() {
    document.querySelectorAll('.qoder-thinking__header').forEach(header => {
      if (header._initialized) return;
      header._initialized = true;
      header.addEventListener('click', () => {
        header.parentElement.classList.toggle('qoder-thinking--open');
      });
    });
  }

  function initSettingsNav() {
    document.querySelectorAll('.qoder-settings__nav-item').forEach(item => {
      if (item._initialized) return;
      item._initialized = true;
      item.addEventListener('click', () => {
        document.querySelectorAll('.qoder-settings__nav-item').forEach(i => i.classList.remove('qoder-settings__nav-item--active'));
        item.classList.add('qoder-settings__nav-item--active');
      });
    });
  }

  function initActivityBar() {
    document.querySelectorAll('.qoder-activity-bar__item').forEach(item => {
      if (item._initialized) return;
      item._initialized = true;
      item.addEventListener('click', () => {
        document.querySelectorAll('.qoder-activity-bar__item').forEach(i => i.classList.remove('qoder-activity-bar__item--active'));
        item.classList.add('qoder-activity-bar__item--active');
      });
    });
  }

  /* ============================================================
     5. 拖拽排序 Drag & Drop
     ============================================================ */
  QI.draggable = {
    init(containerSelector, itemSelector) {
      const container = document.querySelector(containerSelector);
      if (!container) return;
      let dragEl = null;
      let placeholder = null;
      container.querySelectorAll(itemSelector).forEach(item => {
        item.setAttribute('draggable', 'true');
        item.addEventListener('dragstart', (e) => {
          dragEl = item;
          item.style.opacity = '0.4';
          e.dataTransfer.effectAllowed = 'move';
        });
        item.addEventListener('dragend', () => {
          item.style.opacity = '';
          if (placeholder && placeholder.parentNode) placeholder.parentNode.removeChild(placeholder);
          dragEl = null;
        });
        item.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (!dragEl || dragEl === item) return;
          const rect = item.getBoundingClientRect();
          const after = e.clientY > rect.top + rect.height / 2;
          if (!placeholder) {
            placeholder = document.createElement('div');
            placeholder.style.height = item.offsetHeight + 'px';
            placeholder.style.background = 'var(--accent-bg)';
            placeholder.style.borderRadius = '6px';
            placeholder.style.margin = '2px 0';
          }
          if (after) {
            item.parentNode.insertBefore(placeholder, item.nextSibling);
          } else {
            item.parentNode.insertBefore(placeholder, item);
          }
        });
        item.addEventListener('drop', (e) => {
          e.preventDefault();
          if (placeholder && dragEl) {
            placeholder.parentNode.insertBefore(dragEl, placeholder);
          }
        });
      });
    }
  };

  /* ============================================================
     6. 键盘快捷键系统
     ============================================================ */
  QI.hotkeys = {
    _bindings: [],

    register(keys, callback, description) {
      const normalized = keys.toLowerCase().replace(/\s/g, '');
      this._bindings.push({ keys: normalized, callback, description });
    },

    init() {
      document.addEventListener('keydown', (e) => {
        const parts = [];
        if (e.ctrlKey || e.metaKey) parts.push('ctrl');
        if (e.shiftKey) parts.push('shift');
        if (e.altKey) parts.push('alt');
        const key = e.key.toLowerCase();
        if (!['control', 'shift', 'alt', 'meta'].includes(key)) parts.push(key);
        const combo = parts.join('+');
        const binding = this._bindings.find(b => b.keys === combo);
        if (binding) {
          e.preventDefault();
          binding.callback(e);
        }
      });
    },

    getAll() { return this._bindings; }
  };

  /* ============================================================
     7. Web Components - 基础组件封装
     ============================================================ */

  // <qoder-button>
  class QoderButton extends HTMLElement {
    static get observedAttributes() { return ['variant', 'size', 'disabled']; }
    connectedCallback() { this._render(); }
    attributeChangedCallback() { if (this._rendered) this._render(); }
    _render() {
      const variant = this.getAttribute('variant') || 'primary';
      const size = this.getAttribute('size') || '';
      const disabled = this.hasAttribute('disabled') ? 'disabled' : '';
      const sizeClass = size ? ` qoder-btn--${size}` : '';
      const text = this._originalText || this.textContent;
      this._originalText = text;
      this.innerHTML = `<button class="qoder-btn qoder-btn--${variant}${sizeClass}" ${disabled}>${text}</button>`;
      this._rendered = true;
      this.querySelector('button').addEventListener('click', (e) => {
        this.dispatchEvent(new CustomEvent('click', { detail: e, bubbles: true }));
      });
    }
  }

  // <qoder-input>
  class QoderInput extends HTMLElement {
    static get observedAttributes() { return ['placeholder', 'type', 'value', 'error']; }
    connectedCallback() { this._render(); }
    attributeChangedCallback(name) { if (this._rendered && name !== 'value') this._render(); }
    _render() {
      const placeholder = this.getAttribute('placeholder') || '';
      const type = this.getAttribute('type') || 'text';
      const value = this.getAttribute('value') || '';
      const error = this.hasAttribute('error');
      this.innerHTML = `<div class="qoder-input-wrap ${error ? 'qoder-input-wrap--error' : ''}">
        <input class="qoder-input" type="${type}" placeholder="${placeholder}" value="${value}" aria-invalid="${error}">
      </div>`;
      this._rendered = true;
      this.querySelector('input').addEventListener('input', (e) => {
        this.dispatchEvent(new CustomEvent('input', { detail: { value: e.target.value } }));
      });
      this.querySelector('input').addEventListener('change', (e) => {
        this.setAttribute('value', e.target.value);
        this.dispatchEvent(new CustomEvent('change', { detail: { value: e.target.value } }));
      });
    }
    get value() { return this.querySelector('input')?.value || ''; }
    set value(v) { if (this.querySelector('input')) this.querySelector('input').value = v; this.setAttribute('value', v); }
  }

  // <qoder-badge>
  class QoderBadge extends HTMLElement {
    connectedCallback() {
      const variant = this.getAttribute('variant') || 'primary';
      this.innerHTML = `<span class="qoder-badge qoder-badge--${variant}">${this.innerHTML}</span>`;
    }
  }

  // <qoder-avatar>
  class QoderAvatar extends HTMLElement {
    connectedCallback() {
      const size = this.getAttribute('size') || '';
      const text = this.getAttribute('text') || '?';
      const src = this.getAttribute('src') || '';
      const sizeClass = size ? ` qoder-avatar--${size}` : '';
      if (src) {
        this.innerHTML = `<div class="qoder-avatar${sizeClass}"><img src="${src}" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;"></div>`;
      } else {
        this.innerHTML = `<div class="qoder-avatar${sizeClass}">${text}</div>`;
      }
    }
  }

  // <qoder-alert>
  class QoderAlert extends HTMLElement {
    connectedCallback() {
      const type = this.getAttribute('type') || 'info';
      const iconMap = { info: 'i', success: '✓', warning: '!', error: '✕' };
      this.innerHTML = `<div class="qoder-alert qoder-alert--${type}">
        <span class="qoder-icon">${iconMap[type] || 'i'}</span>${this.innerHTML}
      </div>`;
    }
  }

  // <qoder-switch>
  class QoderSwitch extends HTMLElement {
    static get observedAttributes() { return ['checked']; }
    connectedCallback() { this._render(); }
    attributeChangedCallback() { if (this._rendered && this.querySelector('input')) this.querySelector('input').checked = this.hasAttribute('checked'); }
    _render() {
      const checked = this.hasAttribute('checked') ? 'checked' : '';
      this.innerHTML = `<label class="qoder-switch"><input type="checkbox" ${checked}><span class="qoder-switch__slider"></span></label>`;
      this._rendered = true;
      this.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) this.setAttribute('checked', ''); else this.removeAttribute('checked');
        this.dispatchEvent(new CustomEvent('change', { detail: { checked: e.target.checked } }));
      });
    }
    get checked() { return this.querySelector('input')?.checked || false; }
    set checked(v) { if (v) this.setAttribute('checked', ''); else this.removeAttribute('checked'); }
  }

  // <qoder-tabs>
  class QoderTabs extends HTMLElement {
    static get observedAttributes() { return ['items', 'active']; }
    connectedCallback() { this._render(); }
    attributeChangedCallback() { if (this._rendered) this._render(); }
    _render() {
      const items = (this.getAttribute('items') || '').split(',').map(s => s.trim());
      const active = parseInt(this.getAttribute('active') || 0);
      this.innerHTML = `<div class="qoder-tabs" role="tablist">${items.map((item, i) =>
        `<div class="qoder-tabs__item ${i === active ? 'qoder-tabs__item--active' : ''}" data-index="${i}" role="tab" aria-selected="${i === active}">${item}</div>`
      ).join('')}</div>`;
      this._rendered = true;
      this.querySelectorAll('.qoder-tabs__item').forEach(tab => {
        tab.addEventListener('click', () => {
          this.setAttribute('active', tab.dataset.index);
          this._render();
          this.dispatchEvent(new CustomEvent('change', { detail: { index: parseInt(tab.dataset.index) } }));
        });
      });
    }
  }

  // <qoder-progress>
  class QoderProgress extends HTMLElement {
    static get observedAttributes() { return ['value']; }
    connectedCallback() { this._render(); }
    attributeChangedCallback() { if (this._rendered) this._render(); }
    _render() {
      const value = parseInt(this.getAttribute('value') || 0);
      this.innerHTML = `<div class="qoder-progress" role="progressbar" aria-valuenow="${value}" aria-valuemin="0" aria-valuemax="100"><div class="qoder-progress__bar" style="width:${value}%"></div></div>`;
      this._rendered = true;
    }
    get value() { return parseInt(this.getAttribute('value') || 0); }
    set value(v) { this.setAttribute('value', v); }
  }

  // <qoder-spinner>
  class QoderSpinner extends HTMLElement {
    connectedCallback() {
      const size = this.getAttribute('size') || '';
      this.innerHTML = `<div class="qoder-spinner" style="${size ? `width:${size}px;height:${size}px;` : ''}"></div>`;
    }
  }

  // <qoder-select>
  class QoderSelect extends HTMLElement {
    connectedCallback() {
      const placeholder = this.getAttribute('placeholder') || '请选择';
      const options = JSON.parse(this.getAttribute('options') || '[]');
      this.innerHTML = `<div class="qoder-select">
        <div class="qoder-select__trigger" tabindex="0">
          <span class="qoder-select__value qoder-select__value--placeholder">${placeholder}</span>
          <span class="qoder-select__chevron">▼</span>
        </div>
        <div class="qoder-select__dropdown">
          ${options.map((o, i) => `<div class="qoder-select__option" data-value="${o.value || o}">${o.label || o}</div>`).join('')}
        </div>
      </div>`;
      setTimeout(() => initSelects(), 0);
    }
  }

  // <qoder-slider>
  class QoderSliderEl extends HTMLElement {
    connectedCallback() {
      const min = this.getAttribute('min') || 0;
      const max = this.getAttribute('max') || 100;
      const value = this.getAttribute('value') || 50;
      this.innerHTML = `<div class="qoder-slider" data-min="${min}" data-max="${max}" data-value="${value}">
        <div class="qoder-slider__track">
          <div class="qoder-slider__fill"></div>
          <div class="qoder-slider__thumb"></div>
        </div>
        <span class="qoder-slider__value">${value}</span>
      </div>`;
      setTimeout(() => initSliders(), 0);
    }
  }

  // <qoder-tooltip>
  class QoderTooltip extends HTMLElement {
    connectedCallback() {
      const text = this.getAttribute('text') || '';
      const position = this.getAttribute('position') || 'top';
      this.innerHTML = `<div class="qoder-tooltip" style="position:relative;display:inline-block;">
        ${this.innerHTML}
        <span class="qoder-tooltip__content" style="position:absolute;${position === 'top' ? 'bottom:100%;' : 'top:100%;'}left:50%;transform:translateX(-50%);white-space:nowrap;">${text}</span>
      </div>`;
    }
  }

  // <qoder-card>
  class QoderCard extends HTMLElement {
    connectedCallback() {
      const title = this.getAttribute('title') || '';
      this.innerHTML = `<div class="qoder-card">
        ${title ? `<div class="qoder-card__header"><h3 class="qoder-card__title">${title}</h3></div>` : ''}
        <div class="qoder-card__body">${this.innerHTML}</div>
      </div>`;
    }
  }

  // <qoder-breadcrumb>
  class QoderBreadcrumb extends HTMLElement {
    connectedCallback() {
      const items = JSON.parse(this.getAttribute('items') || '[]');
      this.innerHTML = `<nav class="qoder-breadcrumb">${items.map((item, i) => `
        <span class="qoder-breadcrumb__item ${i === items.length - 1 ? 'qoder-breadcrumb__item--current' : ''}">
          ${item.href ? `<a href="${item.href}">${item.label}</a>` : item.label}
        </span>
        ${i < items.length - 1 ? '<span class="qoder-breadcrumb__separator">/</span>' : ''}
      `).join('')}</nav>`;
    }
  }

  // <qoder-steps>
  class QoderSteps extends HTMLElement {
    connectedCallback() {
      const steps = JSON.parse(this.getAttribute('steps') || '[]');
      const current = parseInt(this.getAttribute('current') || 0);
      const vertical = this.hasAttribute('vertical');
      this.innerHTML = `<div class="qoder-steps ${vertical ? 'qoder-steps--vertical' : ''}">
        ${steps.map((step, i) => {
          let status = 'wait';
          if (i < current) status = 'complete';
          else if (i === current) status = 'active';
          return `<div class="qoder-step qoder-step--${status}">
            <div class="qoder-step__indicator">${status === 'complete' ? '✓' : i + 1}</div>
            <div class="qoder-step__content">
              <div class="qoder-step__title">${step.title}</div>
              ${step.desc ? `<div class="qoder-step__desc">${step.desc}</div>` : ''}
            </div>
            ${i < steps.length - 1 ? '<div class="qoder-step__line"></div>' : ''}
          </div>`;
        }).join('')}
      </div>`;
    }
  }

  // <qoder-timeline>
  class QoderTimeline extends HTMLElement {
    connectedCallback() {
      const items = JSON.parse(this.getAttribute('items') || '[]');
      this.innerHTML = `<div class="qoder-timeline">${items.map(item => `
        <div class="qoder-timeline__item qoder-timeline__item--${item.status || 'active'}">
          <div class="qoder-timeline__dot"></div>
          ${item.time ? `<div class="qoder-timeline__time">${item.time}</div>` : ''}
          <div class="qoder-timeline__title">${item.title}</div>
          ${item.desc ? `<div class="qoder-timeline__desc">${item.desc}</div>` : ''}
        </div>
      `).join('')}</div>`;
    }
  }

  // <qoder-empty>
  class QoderEmpty extends HTMLElement {
    connectedCallback() {
      const icon = this.getAttribute('icon') || '📭';
      const title = this.getAttribute('title') || '暂无数据';
      const desc = this.getAttribute('desc') || '';
      this.innerHTML = `<div class="qoder-empty">
        <div class="qoder-empty__icon">${icon}</div>
        <div class="qoder-empty__title">${title}</div>
        ${desc ? `<div class="qoder-empty__desc">${desc}</div>` : ''}
        ${this.innerHTML}
      </div>`;
    }
  }

  // <qoder-pagination>
  class QoderPagination extends HTMLElement {
    connectedCallback() {
      const total = parseInt(this.getAttribute('total') || 10);
      const current = parseInt(this.getAttribute('current') || 1);
      let html = '';
      html += `<div class="qoder-pagination__item qoder-pagination__item--${current === 1 ? 'disabled' : ''}">‹</div>`;
      for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - current) <= 1) {
          html += `<div class="qoder-pagination__item ${i === current ? 'qoder-pagination__item--active' : ''}">${i}</div>`;
        } else if (Math.abs(i - current) === 2) {
          html += `<div class="qoder-pagination__ellipsis">...</div>`;
        }
      }
      html += `<div class="qoder-pagination__item qoder-pagination__item--${current === total ? 'disabled' : ''}">›</div>`;
      html += `<span class="qoder-pagination__total">共 ${total} 页</span>`;
      this.innerHTML = `<div class="qoder-pagination">${html}</div>`;
    }
  }

  // 注册所有自定义元素
  function registerComponents() {
    const components = [
      ['qoder-button', QoderButton],
      ['qoder-input', QoderInput],
      ['qoder-badge', QoderBadge],
      ['qoder-avatar', QoderAvatar],
      ['qoder-alert', QoderAlert],
      ['qoder-switch', QoderSwitch],
      ['qoder-tabs', QoderTabs],
      ['qoder-progress', QoderProgress],
      ['qoder-spinner', QoderSpinner],
      ['qoder-select', QoderSelect],
      ['qoder-slider', QoderSliderEl],
      ['qoder-tooltip', QoderTooltip],
      ['qoder-card', QoderCard],
      ['qoder-breadcrumb', QoderBreadcrumb],
      ['qoder-steps', QoderSteps],
      ['qoder-timeline', QoderTimeline],
      ['qoder-empty', QoderEmpty],
      ['qoder-pagination', QoderPagination]
    ];
    components.forEach(([name, cls]) => {
      if (!customElements.get(name)) customElements.define(name, cls);
    });
  }

  /* ============================================================
     8. 响应式适配
     ============================================================ */
  function initResponsive() {
    const style = document.createElement('style');
    style.textContent = `
      @media (max-width: 768px) {
        .qoder-sidebar-layout { flex-direction: column; }
        .qoder-activity-bar { width: 100%; height: 48px; flex-direction: row; border-right: none; border-bottom: 1px solid var(--border-subtle); }
        .qoder-activity-bar__item--active::before { left: 50%; top: auto; bottom: -8px; transform: translateX(-50%); width: 24px; height: 2px; border-radius: 2px 2px 0 0; }
        .qoder-sidebar-panel { width: 100%; border-right: none; border-bottom: 1px solid var(--border-subtle); max-height: 300px; }
        .qoder-settings { flex-direction: column; }
        .qoder-settings__sidebar { width: 100%; border-right: none; border-bottom: 1px solid var(--border-subtle); }
        .qoder-chat__messages-inner { padding: 0 12px; }
        .qoder-chat-input { padding: 8px 12px 12px; }
        .qoder-palette__modal { max-width: calc(100vw - 32px); }
        .qoder-notification-center { width: 100vw; }
        .qoder-agent-grid { grid-template-columns: 1fr; }
        .qoder-stat-card__value { font-size: 22px; }
      }
      @media (max-width: 480px) {
        .qoder-chat__welcome-suggestions { grid-template-columns: 1fr; }
        .qoder-descriptions__label { width: 100px; font-size: 12px; }
      }
      :focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
      [role="button"] { cursor: pointer; }
    `;
    document.head.appendChild(style);
  }

  /* ============================================================
     9. 自动初始化
     ============================================================ */
  function autoInit() {
    registerComponents();
    initSelects();
    initDatePickers();
    initSliders();
    initCollapsibles();
    initThinking();
    initSettingsNav();
    initActivityBar();
    initResponsive();
    QI.hotkeys.init();

    // 默认快捷键
    QI.hotkeys.register('ctrl+shift+p', () => {
      QI.palette.open([
        { icon: '🎨', label: '切换主题', group: '外观', shortcut: 'Ctrl+K T' },
        { icon: '💬', label: '新建会话', group: '聊天', shortcut: 'Ctrl+N' },
        { icon: '⚙️', label: '打开设置', group: '系统', shortcut: 'Ctrl+,' },
        { icon: '🔔', label: '通知中心', group: '系统', shortcut: 'Ctrl+Shift+U' },
        { icon: '📋', label: '切换终端', group: '视图', shortcut: 'Ctrl+`' },
        { icon: '🔍', label: '全局搜索', group: '编辑', shortcut: 'Ctrl+Shift+F' }
      ], (item) => {
        if (QI.toast) QI.toast.show('执行: ' + item.label, 'info');
      });
    }, '打开命令面板');

    QI.hotkeys.register('escape', () => {
      QI.palette.close();
      QI.contextMenu.hide();
      if (QI.dialog) QI.dialog.closeAll();
    }, '关闭弹窗');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInit);
  } else {
    autoInit();
  }

  // 导出
  QI.interactions = { init: autoInit };
})();
