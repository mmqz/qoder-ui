/* ============================================================
   Qoder UI Web Components（v3.2 全量重写）
   ============================================================
   - 全部组件基于 QoderUI.ShadowElement 基类：
       · Shadow DOM 样式隔离（共享 CSSStyleSheet，可 no-shadow 退回）
       · observedAttributes + attributeChangedCallback 属性响应
       · emit(): bubbles + composed 标准事件
       · <slot> 投影光内容
   - 18 个组件：
       button input badge avatar alert switch tabs progress
       spinner select slider tooltip card breadcrumb steps
       timeline empty pagination
   依赖加载顺序：
       qoder-core.js → qoder-shadow.js → qoder-ui.js
       → qoder-interactions.js → qoder-wc.js
   ============================================================ */
(function() {
  'use strict';

  // v3.3.2（测试发现修复）：注册不依赖 window，Node/SSR 可导入 API
  const _g = typeof globalThis !== 'undefined' ? globalThis : {};
  const QI = _g.QoderUI = _g.QoderUI || {};
  const Base = QI.ShadowElement;
  if (!Base) {
    console.error('[QoderUI.wc] 缺少依赖 qoder-shadow.js，Web Components 未注册');
    return;
  }
  const Core = _g.QoderCore || {};
  const esc = Core.escapeHtml || function(s) { return String(s == null ? '' : s); };
  const json = (attr, fallback) => {
    try { return JSON.parse(attr); } catch (e) { return fallback; }
  };

  const WC = QI.WC = {};
  const components = [];

  /** 声明辅助：注册组件类并记录到表 */
  function def(name, cls) {
    WC[name] = cls;
    components.push([name, cls]);
  }

  /* ============================================================
     <qoder-button> — variant / size / disabled
     ============================================================ */
  class QoderButton extends Base {
    static get observedAttributes() { return ['variant', 'size', 'disabled']; }
    static get hostCss() { return ':host{display:inline-block;}'; }
    template() {
      const variant = this.getAttribute('variant') || 'primary';
      const size = this.getAttribute('size') || '';
      const disabled = this.hasAttribute('disabled') ? 'disabled' : '';
      const sizeClass = size ? ' qoder-btn--' + size : '';
      return '<button class="qoder-btn qoder-btn--' + esc(variant) + sizeClass + '"' +
        disabled + ' part="button"><slot></slot></button>';
    }
    _bind(root) {
      root.querySelector('button').addEventListener('click', () => this.emit('click', {}));
    }
    get disabled() { return this.hasAttribute('disabled'); }
    set disabled(v) { if (v) this.setAttribute('disabled', ''); else this.removeAttribute('disabled'); }
  }
  def('qoder-button', QoderButton);

  /* ============================================================
     <qoder-input> — placeholder / type / value / error
     value 属性变化不重建 DOM，直接同步输入框（避免失焦）
     ============================================================ */
  class QoderInput extends Base {
    static get observedAttributes() { return ['placeholder', 'type', 'value', 'error']; }
    static get hostCss() { return ':host{display:inline-block;min-width:180px;}'; }
    template() {
      const placeholder = this.getAttribute('placeholder') || '';
      const type = this.getAttribute('type') || 'text';
      const value = this.getAttribute('value') || '';
      const error = this.hasAttribute('error');
      return '<div class="qoder-input-wrap' + (error ? ' qoder-input-wrap--error' : '') + '">' +
        '<input class="qoder-input" type="' + esc(type) + '" placeholder="' + esc(placeholder) +
        '" value="' + esc(value) + '" aria-invalid="' + error + '" part="input"></div>';
    }
    _bind(root) {
      const input = root.querySelector('input');
      input.addEventListener('input', () => this.emit('input', { value: input.value }));
      input.addEventListener('change', () => {
        this.setAttribute('value', input.value);
        this.emit('change', { value: input.value });
      });
    }
    attributeChangedCallback(name) {
      if (name === 'value' && this._rendered) {
        const input = this.$('input');
        if (input && document.activeElement !== input) input.value = this.getAttribute('value') || '';
        return;
      }
      Base.prototype.attributeChangedCallback.call(this, name);
    }
    get value() { const i = this.$('input'); return i ? i.value : (this.getAttribute('value') || ''); }
    set value(v) { this.setAttribute('value', v); const i = this.$('input'); if (i) i.value = v; }
  }
  def('qoder-input', QoderInput);

  /* ============================================================
     <qoder-badge> — variant（内容经 slot 投影）
     ============================================================ */
  class QoderBadge extends Base {
    static get observedAttributes() { return ['variant']; }
    static get hostCss() { return ':host{display:inline-block;}'; }
    template() {
      const variant = this.getAttribute('variant') || 'primary';
      return '<span class="qoder-badge qoder-badge--' + esc(variant) + '" part="badge"><slot></slot></span>';
    }
  }
  def('qoder-badge', QoderBadge);

  /* ============================================================
     <qoder-avatar> — size / text / src
     ============================================================ */
  class QoderAvatar extends Base {
    static get observedAttributes() { return ['size', 'text', 'src']; }
    static get hostCss() { return ':host{display:inline-block;}'; }
    template() {
      const size = this.getAttribute('size') || '';
      const text = this.getAttribute('text') || '?';
      const src = this.getAttribute('src') || '';
      const sizeClass = size ? ' qoder-avatar--' + size : '';
      if (src) {
        return '<div class="qoder-avatar' + sizeClass + '" part="avatar">' +
          '<img src="' + esc(src) + '" alt="' + esc(text) + '" style="width:100%;height:100%;border-radius:inherit;object-fit:cover;"></div>';
      }
      return '<div class="qoder-avatar' + sizeClass + '" part="avatar">' + esc(text) + '</div>';
    }
  }
  def('qoder-avatar', QoderAvatar);

  /* ============================================================
     <qoder-alert> — type（内容经 slot 投影）
     ============================================================ */
  class QoderAlert extends Base {
    static get observedAttributes() { return ['type']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const type = this.getAttribute('type') || 'info';
      const iconMap = { info: 'i', success: '✓', warning: '!', error: '✕' };
      return '<div class="qoder-alert qoder-alert--' + esc(type) + '" part="alert">' +
        '<span class="qoder-icon">' + (iconMap[type] || 'i') + '</span><slot></slot></div>';
    }
  }
  def('qoder-alert', QoderAlert);

  /* ============================================================
     <qoder-switch> — checked（变化同步 checkbox，不重建）
     ============================================================ */
  class QoderSwitch extends Base {
    static get observedAttributes() { return ['checked']; }
    static get hostCss() { return ':host{display:inline-block;}'; }
    template() {
      const checked = this.hasAttribute('checked') ? 'checked' : '';
      return '<label class="qoder-switch" part="switch">' +
        '<input type="checkbox" ' + checked + '><span class="qoder-switch__slider"></span></label>';
    }
    _bind(root) {
      root.querySelector('input').addEventListener('change', (e) => {
        if (e.target.checked) this.setAttribute('checked', '');
        else this.removeAttribute('checked');
        this.emit('change', { checked: e.target.checked });
      });
    }
    attributeChangedCallback(name) {
      if (name === 'checked' && this._rendered) {
        const input = this.$('input');
        if (input) input.checked = this.hasAttribute('checked');
        return;
      }
      Base.prototype.attributeChangedCallback.call(this, name);
    }
    get checked() { const i = this.$('input'); return i ? i.checked : this.hasAttribute('checked'); }
    set checked(v) { if (v) this.setAttribute('checked', ''); else this.removeAttribute('checked'); }
  }
  def('qoder-switch', QoderSwitch);

  /* ============================================================
     <qoder-tabs> — items / active
     ============================================================ */
  class QoderTabs extends Base {
    static get observedAttributes() { return ['items', 'active']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const items = (this.getAttribute('items') || '').split(',').map(s => s.trim()).filter(Boolean);
      const active = parseInt(this.getAttribute('active') || 0, 10) || 0;
      return '<div class="qoder-tabs" role="tablist" part="tabs">' + items.map((item, i) =>
        '<div class="qoder-tabs__item ' + (i === active ? 'qoder-tabs__item--active' : '') +
        '" data-index="' + i + '" role="tab" aria-selected="' + (i === active) + '">' + esc(item) + '</div>'
      ).join('') + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qoder-tabs__item').forEach(tab => {
        tab.addEventListener('click', () => {
          this.setAttribute('active', tab.dataset.index);
          this.emit('change', { index: parseInt(tab.dataset.index, 10) });
        });
      });
    }
    get active() { return parseInt(this.getAttribute('active') || 0, 10); }
    set active(i) { this.setAttribute('active', i); }
  }
  def('qoder-tabs', QoderTabs);

  /* ============================================================
     <qoder-progress> — value
     ============================================================ */
  class QoderProgress extends Base {
    static get observedAttributes() { return ['value']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const value = Core.clamp(parseInt(this.getAttribute('value') || 0, 10) || 0, 0, 100);
      return '<div class="qoder-progress" role="progressbar" aria-valuenow="' + value +
        '" aria-valuemin="0" aria-valuemax="100" part="progress">' +
        '<div class="qoder-progress__bar" style="width:' + value + '%"></div></div>';
    }
    get value() { return parseInt(this.getAttribute('value') || 0, 10); }
    set value(v) { this.setAttribute('value', v); }
  }
  def('qoder-progress', QoderProgress);

  /* ============================================================
     <qoder-spinner> — size
     ============================================================ */
  class QoderSpinner extends Base {
    static get observedAttributes() { return ['size']; }
    static get hostCss() { return ':host{display:inline-block;}'; }
    template() {
      const size = parseInt(this.getAttribute('size') || 0, 10);
      return '<div class="qoder-spinner" part="spinner"' +
        (size ? ' style="width:' + size + 'px;height:' + size + 'px;"' : '') + '></div>';
    }
  }
  def('qoder-spinner', QoderSpinner);

  /* ============================================================
     <qoder-select> — placeholder / options / value / disabled
     自包含行为（不依赖全局 initSelects）
     ============================================================ */
  class QoderSelect extends Base {
    static get observedAttributes() { return ['placeholder', 'options', 'value', 'disabled']; }
    static get hostCss() { return ':host{display:inline-block;min-width:160px;}'; }
    template() {
      const placeholder = this.getAttribute('placeholder') || Core.t('请选择');
      const options = json(this.getAttribute('options'), []);
      const value = this.getAttribute('value') || '';
      const disabled = this.hasAttribute('disabled');
      const norm = options.map(o => typeof o === 'object' ? o : { label: String(o), value: o });
      const current = norm.find(o => String(o.value) === String(value));
      return '<div class="qoder-select' + (disabled ? ' qoder-select--disabled' : '') + '" part="select">' +
        '<div class="qoder-select__trigger" tabindex="' + (disabled ? -1 : 0) + '" aria-haspopup="listbox">' +
          '<span class="qoder-select__value' + (current ? '' : ' qoder-select__value--placeholder') + '">' +
            esc(current ? current.label : placeholder) + '</span>' +
          '<span class="qoder-select__chevron">▼</span>' +
        '</div>' +
        '<div class="qoder-select__dropdown" role="listbox">' +
          norm.map(o => '<div class="qoder-select__option' +
            (String(o.value) === String(value) ? ' qoder-select__option--selected' : '') +
            '" data-value="' + esc(o.value) + '" role="option">' + esc(o.label) + '</div>').join('') +
        '</div>' +
      '</div>';
    }
    _bind(root) {
      const wrap = root.querySelector('.qoder-select');
      const trigger = root.querySelector('.qoder-select__trigger');
      trigger.addEventListener('click', () => {
        if (this.hasAttribute('disabled')) return;
        wrap.classList.toggle('qoder-select--open');
      });
      trigger.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          wrap.classList.toggle('qoder-select--open');
        }
      });
      root.querySelectorAll('.qoder-select__option').forEach(opt => {
        opt.addEventListener('click', () => {
          this.setAttribute('value', opt.dataset.value);
          wrap.classList.remove('qoder-select--open');
          this.emit('change', { value: opt.dataset.value, label: opt.textContent });
        });
      });
      // v3.3.1 审计修复（M2）：document 级点击监听只挂一次（此前每次重渲染
      // 都追加一个新监听且永不移除 → 泄漏）；关闭时动态取当前 wrap 引用
      if (!this._outside) {
        this._outside = (e) => {
          if (!e.composedPath().includes(this)) {
            const w = (this.shadowRoot || this).querySelector('.qoder-select');
            if (w) w.classList.remove('qoder-select--open');
          }
        };
        document.addEventListener('click', this._outside);
      }
    }
    disconnectedCallback() {
      if (this._outside) {
        document.removeEventListener('click', this._outside);
        this._outside = null; // 重连后可重新挂载
      }
    }
    get value() { return this.getAttribute('value') || ''; }
    set value(v) { this.setAttribute('value', v); }
  }
  def('qoder-select', QoderSelect);

  /* ============================================================
     <qoder-slider> — min / max / value
     自包含拖拽（鼠标 + 触摸）
     ============================================================ */
  class QoderSlider extends Base {
    static get observedAttributes() { return ['min', 'max', 'value']; }
    static get hostCss() { return ':host{display:block;min-width:180px;}'; }
    template() {
      const min = parseFloat(this.getAttribute('min') || 0);
      const max = parseFloat(this.getAttribute('max') || 100);
      const value = Core.clamp(parseFloat(this.getAttribute('value') || 50) || 0, min, max);
      const pct = max > min ? ((value - min) / (max - min)) * 100 : 0;
      return '<div class="qoder-slider" part="slider">' +
        '<div class="qoder-slider__track">' +
          '<div class="qoder-slider__fill" style="width:' + pct + '%"></div>' +
          '<div class="qoder-slider__thumb" style="left:' + pct + '%"></div>' +
        '</div>' +
        '<span class="qoder-slider__value">' + Math.round(value) + '</span>' +
      '</div>';
    }
    _bind(root) {
      // v3.3.1 审计修复（M1）：document 级 mousemove/mouseup 监听只挂一次。
      // 此前每次重渲染（拖拽中每帧 setAttribute → 重渲染）都追加 4 个
      // document 监听且永不清理 → O(帧数²) 累积泄漏。
      // 元素引用改为事件触发时动态查询，重渲染后依然指向最新 DOM。
      const self = this;
      const track = root.querySelector('.qoder-slider__track');
      const thumb = root.querySelector('.qoder-slider__thumb');

      // min/max 事件时动态读取：document 级监听器是长驻的，
      // 闭包捕获会在 min/max 属性变更后过期
      const range = () => ({
        min: parseFloat(this.getAttribute('min') || 0),
        max: parseFloat(this.getAttribute('max') || 100)
      });

      const update = (v, silent) => {
        const { min, max } = range();
        v = Core.clamp(v, min, max);
        const pct = max > min ? ((v - min) / (max - min)) * 100 : 0;
        const r = (this.shadowRoot || this);
        const t = r.querySelector('.qoder-slider__thumb');
        const f = r.querySelector('.qoder-slider__fill');
        const val = r.querySelector('.qoder-slider__value');
        if (t) t.style.left = pct + '%';
        if (f) f.style.width = pct + '%';
        if (val) val.textContent = Math.round(v);
        // 只更新属性，不触发整体重渲染
        if (this.getAttribute('value') !== String(v)) this.setAttribute('value', v);
        if (!silent) this.emit('input', { value: v });
      };

      const onMove = (e) => {
        if (!self._dragging) return;
        const r = self.shadowRoot || self;
        const tr = r.querySelector('.qoder-slider__track');
        if (!tr) return;
        const rect = tr.getBoundingClientRect();
        const clientX = e.touches ? e.touches[0].clientX : e.clientX;
        const { min, max } = range();
        update(min + Core.clamp((clientX - rect.left) / rect.width, 0, 1) * (max - min));
      };
      const onUp = () => {
        if (self._dragging) {
          self._dragging = false;
          self.emit('change', { value: parseFloat(self.getAttribute('value')) });
        }
      };

      if (!this._docBound) {
        this._docBound = true;
        document.addEventListener('mousemove', onMove);
        document.addEventListener('touchmove', onMove, { passive: true });
        document.addEventListener('mouseup', onUp);
        document.addEventListener('touchend', onUp);
        this._sliderCleanup = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('touchmove', onMove);
          document.removeEventListener('mouseup', onUp);
          document.removeEventListener('touchend', onUp);
        };
      }

      thumb.addEventListener('mousedown', (e) => { e.preventDefault(); this._dragging = true; });
      thumb.addEventListener('touchstart', () => { this._dragging = true; }, { passive: true });
      track.addEventListener('click', (e) => {
        const rect = track.getBoundingClientRect();
        update(min + ((e.clientX - rect.left) / rect.width) * (max - min));
        this.emit('change', { value: parseFloat(this.getAttribute('value')) });
      });
    }
    disconnectedCallback() {
      if (this._sliderCleanup) {
        this._sliderCleanup();
        this._sliderCleanup = null;
        this._docBound = false; // 重连后可重新挂载
      }
    }
    get value() { return parseFloat(this.getAttribute('value') || 0); }
    set value(v) { this.setAttribute('value', v); }
  }
  def('qoder-slider', QoderSlider);

  /* ============================================================
     <qoder-tooltip> — text / position（触发内容经 slot 投影）
     ============================================================ */
  class QoderTooltip extends Base {
    static get observedAttributes() { return ['text', 'position']; }
    static get hostCss() { return ':host{display:inline-block;}'; }
    template() {
      const text = this.getAttribute('text') || '';
      const position = this.getAttribute('position') || 'top';
      return '<div class="qoder-tooltip" part="tooltip">' +
        '<slot></slot>' +
        '<span class="qoder-tooltip__content qoder-tooltip__content--' + esc(position) + '">' +
          esc(text) + '</span></div>';
    }
  }
  def('qoder-tooltip', QoderTooltip);

  /* ============================================================
     <qoder-card> — title（内容经 slot 投影）
     ============================================================ */
  class QoderCard extends Base {
    static get observedAttributes() { return ['title']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const title = this.getAttribute('title') || '';
      return '<div class="qoder-card" part="card">' +
        (title ? '<div class="qoder-card__header"><h3 class="qoder-card__title">' + esc(title) + '</h3></div>' : '') +
        '<div class="qoder-card__body"><slot></slot></div></div>';
    }
  }
  def('qoder-card', QoderCard);

  /* ============================================================
     <qoder-breadcrumb> — items (JSON)
     ============================================================ */
  class QoderBreadcrumb extends Base {
    static get observedAttributes() { return ['items']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const items = json(this.getAttribute('items'), []);
      return '<nav class="qoder-breadcrumb" part="breadcrumb">' + items.map((item, i) =>
        '<span class="qoder-breadcrumb__item ' +
        (i === items.length - 1 ? 'qoder-breadcrumb__item--current' : '') + '">' +
          (item.href ? '<a href="' + esc(item.href) + '">' + esc(item.label) + '</a>' : esc(item.label)) +
        '</span>' +
        (i < items.length - 1 ? '<span class="qoder-breadcrumb__separator">/</span>' : '')
      ).join('') + '</nav>';
    }
  }
  def('qoder-breadcrumb', QoderBreadcrumb);

  /* ============================================================
     <qoder-steps> — steps (JSON) / current / vertical
     ============================================================ */
  class QoderSteps extends Base {
    static get observedAttributes() { return ['steps', 'current', 'vertical']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const steps = json(this.getAttribute('steps'), []);
      const current = parseInt(this.getAttribute('current') || 0, 10) || 0;
      const vertical = this.hasAttribute('vertical');
      return '<div class="qoder-steps ' + (vertical ? 'qoder-steps--vertical' : '') + '" part="steps">' +
        steps.map((step, i) => {
          let status = 'wait';
          if (i < current) status = 'complete';
          else if (i === current) status = 'active';
          return '<div class="qoder-step qoder-step--' + status + '">' +
            '<div class="qoder-step__indicator">' + (status === 'complete' ? '✓' : (i + 1)) + '</div>' +
            '<div class="qoder-step__content">' +
              '<div class="qoder-step__title">' + esc(step.title || '') + '</div>' +
              (step.desc ? '<div class="qoder-step__desc">' + esc(step.desc) + '</div>' : '') +
            '</div>' +
            (i < steps.length - 1 ? '<div class="qoder-step__line"></div>' : '') +
          '</div>';
        }).join('') + '</div>';
    }
    get current() { return parseInt(this.getAttribute('current') || 0, 10); }
    set current(i) { this.setAttribute('current', i); }
  }
  def('qoder-steps', QoderSteps);

  /* ============================================================
     <qoder-timeline> — items (JSON)
     ============================================================ */
  class QoderTimeline extends Base {
    static get observedAttributes() { return ['items']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const items = json(this.getAttribute('items'), []);
      return '<div class="qoder-timeline" part="timeline">' + items.map(item =>
        '<div class="qoder-timeline__item qoder-timeline__item--' + esc(item.status || 'active') + '">' +
          '<div class="qoder-timeline__dot"></div>' +
          (item.time ? '<div class="qoder-timeline__time">' + esc(item.time) + '</div>' : '') +
          '<div class="qoder-timeline__title">' + esc(item.title || '') + '</div>' +
          (item.desc ? '<div class="qoder-timeline__desc">' + esc(item.desc) + '</div>' : '') +
        '</div>').join('') + '</div>';
    }
  }
  def('qoder-timeline', QoderTimeline);

  /* ============================================================
     <qoder-empty> — icon / title / desc（操作区经 slot 投影）
     ============================================================ */
  class QoderEmpty extends Base {
    static get observedAttributes() { return ['icon', 'title', 'desc']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const icon = this.getAttribute('icon') || '📭';
      const title = this.getAttribute('title') || Core.t('暂无数据');
      const desc = this.getAttribute('desc') || '';
      return '<div class="qoder-empty" part="empty">' +
        '<div class="qoder-empty__icon">' + esc(icon) + '</div>' +
        '<div class="qoder-empty__title">' + esc(title) + '</div>' +
        (desc ? '<div class="qoder-empty__desc">' + esc(desc) + '</div>' : '') +
        '<slot></slot></div>';
    }
  }
  def('qoder-empty', QoderEmpty);

  /* ============================================================
     <qoder-pagination> — total / current
     ============================================================ */
  class QoderPagination extends Base {
    static get observedAttributes() { return ['total', 'current']; }
    static get hostCss() { return ':host{display:block;}'; }
    template() {
      const total = Math.max(1, parseInt(this.getAttribute('total') || 10, 10) || 10);
      const current = Core.clamp(parseInt(this.getAttribute('current') || 1, 10) || 1, 1, total);
      let html = '<div class="qoder-pagination" part="pagination">';
      html += '<div class="qoder-pagination__item qoder-pagination__item--' +
        (current === 1 ? 'disabled' : '') + '" data-page="prev">‹</div>';
      for (let i = 1; i <= total; i++) {
        if (i === 1 || i === total || Math.abs(i - current) <= 1) {
          html += '<div class="qoder-pagination__item ' + (i === current ? 'qoder-pagination__item--active' : '') +
            '" data-page="' + i + '">' + i + '</div>';
        } else if (Math.abs(i - current) === 2) {
          html += '<div class="qoder-pagination__ellipsis">...</div>';
        }
      }
      html += '<div class="qoder-pagination__item qoder-pagination__item--' +
        (current === total ? 'disabled' : '') + '" data-page="next">›</div>';
      html += '<span class="qoder-pagination__total">' + Core.t('共 {n} 页').replace('{n}', total) + '</span>';
      return html + '</div>';
    }
    _bind(root) {
      root.querySelectorAll('.qoder-pagination__item[data-page]').forEach(item => {
        item.addEventListener('click', () => {
          const total = Math.max(1, parseInt(this.getAttribute('total') || 10, 10) || 10);
          const current = Core.clamp(parseInt(this.getAttribute('current') || 1, 10) || 1, 1, total);
          let next = null;
          if (item.dataset.page === 'prev') next = Math.max(1, current - 1);
          else if (item.dataset.page === 'next') next = Math.min(total, current + 1);
          else next = parseInt(item.dataset.page, 10);
          if (next === null || next === current ||
              item.classList.contains('qoder-pagination__item--disabled')) return;
          this.setAttribute('current', next);
          this.emit('change', { page: next });
        });
      });
    }
    get current() { return parseInt(this.getAttribute('current') || 1, 10); }
    set current(i) { this.setAttribute('current', i); }
  }
  def('qoder-pagination', QoderPagination);

  /* ============================================================
     注册
     ============================================================ */
  function register() {
    if (typeof customElements === 'undefined') return; // Node/SSR：无 registry，静默跳过
    components.forEach(([name, cls]) => {
      if (!customElements.get(name)) customElements.define(name, cls);
    });
  }
  WC.register = register;
  register();

})();
