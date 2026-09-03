/**
 * Qoder UI - 交互逻辑 & Web Components
 * 从零实现的原生 JS，零框架依赖
 * 包含：主题管理、全息卡片3D倾斜、语音动画、对话框、Toast、
 *       Tabs、Dropdown、Switch、Tooltip 等组件的 JS 逻辑
 *       + 自定义元素 <qoder-user-card> <qoder-dialog> 等
 */

(function () {
  'use strict';

  // ============================================================
  // 工具函数
  // ============================================================
  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));

  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }

  function clamp(val, min, max) { return Math.min(Math.max(val, min), max); }

  // ============================================================
  // 主题管理
  // ============================================================
  const QoderTheme = {
    THEMES: ['forest-light', 'forest-dark', 'bee-light', 'bee-dark',
             'mint-light', 'mint-dark', 'light-parchment', 'parchment-dark'],
    STORAGE_KEY: 'qoder-theme',

    get current() {
      return document.documentElement.getAttribute('data-theme') || 'forest-light';
    },

    set(theme) {
      if (!this.THEMES.includes(theme)) return;
      document.documentElement.setAttribute('data-theme', theme);
      try { localStorage.setItem(this.STORAGE_KEY, theme); } catch (e) {}
      document.dispatchEvent(new CustomEvent('qoder-theme-change', { detail: { theme } }));
    },

    init() {
      try {
        const saved = localStorage.getItem(this.STORAGE_KEY);
        if (saved && this.THEMES.includes(saved)) {
          document.documentElement.setAttribute('data-theme', saved);
        }
      } catch (e) {}
    },

    toggle() {
      const idx = this.THEMES.indexOf(this.current);
      this.set(this.THEMES[(idx + 1) % this.THEMES.length]);
    }
  };

  // ============================================================
  // 全息用户卡片 - 鼠标跟随 3D 倾斜
  // ============================================================
  function initHolographicCards() {
    $$('.qoder-user-card').forEach(card => {
      if (card.dataset.tiltInit) return;
      card.dataset.tiltInit = 'true';

      const holo = card.querySelector('.qoder-user-card__holographic');
      const maxTilt = 12; // 最大倾斜角度
      const glareX = holo ? '--q37283b' : null;
      const glareY = holo ? '--qd905da' : null;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;

        const rotateY = (x - 0.5) * maxTilt * 2;
        const rotateX = -(y - 0.5) * maxTilt * 2;

        card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;

        if (holo) {
          holo.style.setProperty('--q37283b', `${x * 100}%`);
          holo.style.setProperty('--qd905da', `${y * 100}%`);
        }
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
        if (holo) {
          holo.style.setProperty('--q37283b', '50%');
          holo.style.setProperty('--qd905da', '50%');
        }
      });
    });
  }

  // ============================================================
  // 语音胶囊 - 模拟音频可视化
  // ============================================================
  function initVoiceCapsules() {
    $$('.qoder-capsule').forEach(capsule => {
      if (capsule.dataset.voiceInit) return;
      capsule.dataset.voiceInit = 'true';

      let animId = null;
      let active = capsule.classList.contains('qoder-capsule--active');

      function animate() {
        if (!active) return;
        const blobs = $$('.qoder-capsule-blob', capsule);
        blobs.forEach((blob, i) => {
          const scale = 0.8 + Math.sin(Date.now() / 300 + i * 1.5) * 0.2;
          const opacity = 0.3 + Math.sin(Date.now() / 400 + i) * 0.2;
          blob.style.transform = `scale(${scale})`;
          blob.style.opacity = opacity;
        });
        animId = requestAnimationFrame(animate);
      }

      capsule.addEventListener('click', () => {
        active = !active;
        capsule.classList.toggle('qoder-capsule--active', active);
        if (active) animate();
        else if (animId) cancelAnimationFrame(animId);
      });
    });

    // 经典涟漪
    $$('.qoder-classic').forEach(classic => {
      if (classic.dataset.voiceInit) return;
      classic.dataset.voiceInit = 'true';

      classic.addEventListener('click', () => {
        classic.classList.toggle('qoder-classic--active');
      });
    });
  }

  // ============================================================
  // 对话框管理
  // ============================================================
  const QoderDialog = {
    open(id) {
      const overlay = document.getElementById(id);
      if (!overlay) return;
      overlay.style.display = 'flex';
      document.body.style.overflow = 'hidden';
      overlay.dispatchEvent(new CustomEvent('qoder-dialog-open'));
    },

    close(id) {
      const overlay = document.getElementById(id);
      if (!overlay) return;
      overlay.style.display = 'none';
      document.body.style.overflow = '';
      overlay.dispatchEvent(new CustomEvent('qoder-dialog-close'));
    },

    init() {
      // 点击遮罩关闭
      $$('.qoder-dialog-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
          if (e.target === overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
          }
        });
      });
      // ESC 关闭
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          $$('.qoder-dialog-overlay').forEach(o => {
            if (o.style.display === 'flex') {
              o.style.display = 'none';
              document.body.style.overflow = '';
            }
          });
        }
      });
    }
  };

  // ============================================================
  // Toast 通知
  // ============================================================
  const QoderToast = {
    container: null,

    _ensureContainer() {
      if (!this.container) {
        this.container = document.createElement('div');
        this.container.className = 'qoder-toast-container';
        this.container.style.cssText = `
          position: fixed; top: 20px; right: 20px; z-index: 9999;
          display: flex; flex-direction: column; gap: 8px;
          pointer-events: none;
        `;
        document.body.appendChild(this.container);
      }
      return this.container;
    },

    show(message, type = 'info', duration = 3000) {
      const container = this._ensureContainer();
      const toast = document.createElement('div');
      const colors = {
        info: 'var(--info)', success: 'var(--success)',
        warning: 'var(--warning)', error: 'var(--error)'
      };
      const icons = { info: 'ℹ', success: '✓', warning: '⚠', error: '✕' };

      toast.style.cssText = `
        display: flex; align-items: center; gap: 10px;
        padding: 12px 16px; border-radius: 8px;
        background: var(--bg-popup); border: 1px solid var(--border);
        border-left: 3px solid ${colors[type] || colors.info};
        box-shadow: var(--qoder-shadow-lg);
        font-size: 13px; color: var(--text-primary);
        pointer-events: auto; min-width: 240px; max-width: 400px;
        animation: qoder-toast-in 0.3s cubic-bezier(0.2, 0.8, 0.2, 1);
      `;
      toast.innerHTML = `<span style="color:${colors[type]};font-weight:700;">${icons[type] || 'ℹ'}</span><span>${message}</span>`;

      container.appendChild(toast);
      setTimeout(() => {
        toast.style.animation = 'qoder-toast-out 0.3s ease forwards';
        setTimeout(() => toast.remove(), 300);
      }, duration);
    }
  };

  // 注入 Toast 动画
  const toastStyle = document.createElement('style');
  toastStyle.textContent = `
    @keyframes qoder-toast-in { from { opacity:0; transform: translateX(40px); } to { opacity:1; transform: translateX(0); } }
    @keyframes qoder-toast-out { from { opacity:1; transform: translateX(0); } to { opacity:0; transform: translateX(40px); } }
  `;
  document.head.appendChild(toastStyle);

  // ============================================================
  // Tabs 切换
  // ============================================================
  function initTabs() {
    $$('.qoder-tabs').forEach(tabs => {
      if (tabs.dataset.tabsInit) return;
      tabs.dataset.tabsInit = 'true';

      const items = $$('.qoder-tabs__item', tabs);
      items.forEach(item => {
        item.addEventListener('click', () => {
          items.forEach(i => i.classList.remove('qoder-tabs__item--active'));
          item.classList.add('qoder-tabs__item--active');
          tabs.dispatchEvent(new CustomEvent('qoder-tab-change', {
            detail: { index: items.indexOf(item), text: item.textContent }
          }));
        });
      });
    });
  }

  // ============================================================
  // Dropdown 下拉菜单
  // ============================================================
  function initDropdowns() {
    $$('.qoder-dropdown').forEach(dropdown => {
      if (dropdown.dataset.dropInit) return;
      dropdown.dataset.dropInit = 'true';

      const menu = dropdown.querySelector('.qoder-dropdown__menu');
      if (!menu) return;

      dropdown.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = menu.style.display === 'block';
        $$('.qoder-dropdown__menu').forEach(m => m.style.display = 'none');
        menu.style.display = isOpen ? 'none' : 'block';
      });

      $$('.qoder-dropdown__item', menu).forEach(item => {
        item.addEventListener('click', (e) => {
          e.stopPropagation();
          menu.style.display = 'none';
          dropdown.dispatchEvent(new CustomEvent('qoder-dropdown-select', {
            detail: { text: item.textContent.trim() }
          }));
        });
      });
    });

    document.addEventListener('click', () => {
      $$('.qoder-dropdown__menu').forEach(m => m.style.display = 'none');
    });
  }

  // ============================================================
  // Switch 开关
  // ============================================================
  function initSwitches() {
    $$('.qoder-switch input[type="checkbox"]').forEach(input => {
      input.addEventListener('change', () => {
        input.closest('.qoder-switch').dispatchEvent(
          new CustomEvent('qoder-switch-change', { detail: { checked: input.checked } })
        );
      });
    });
  }

  // ============================================================
  // Tooltip
  // ============================================================
  function initTooltips() {
    // CSS 已处理 hover，这里补充点击/触屏支持
    $$('.qoder-tooltip').forEach(tip => {
      tip.addEventListener('click', (e) => {
        e.stopPropagation();
        const content = tip.querySelector('.qoder-tooltip__content');
        if (content) content.style.opacity = content.style.opacity === '1' ? '' : '1';
      });
    });
  }

  // ============================================================
  // 活动栈展开
  // ============================================================
  function initPetStacks() {
    $$('.qoder-pet-stack').forEach(stack => {
      stack.parentElement.addEventListener('click', () => {
        stack.classList.toggle('qoder-pet-stack--expanded');
      });
    });
  }

  // ============================================================
  // Web Components - <qoder-user-card>
  // ============================================================
  class QoderUserCard extends HTMLElement {
    static get observedAttributes() {
      return ['email', 'label', 'time', 'variant', 'name', 'role'];
    }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() {
      this.render();
      this._initTilt();
    }

    attributeChangedCallback() {
      if (this.shadowRoot) this.render();
    }

    render() {
      const email = this.getAttribute('email') || 'user@example.com';
      const label = this.getAttribute('label') || 'PRO MEMBER';
      const time = this.getAttribute('time') || 'JOINED 2024';
      const variant = this.getAttribute('variant') || 'holographic';
      const name = this.getAttribute('name') || '';
      const role = this.getAttribute('role') || '';

      const isStandard = variant === 'standard';

      this.shadowRoot.innerHTML = `
        <style>
          @import url('${this._cssPath()}');
          :host { display: inline-block; }
        </style>
        <div class="qoder-user-card ${isStandard ? 'qoder-user-card--standard' : ''}">
          <div class="qoder-user-card__frame"></div>
          ${isStandard ? `
            <div class="qoder-user-card__standard">
              <div class="qoder-user-card__standard-welcome">WELCOME</div>
              <div class="qoder-user-card__standard-logo">Q</div>
              <div class="qoder-user-card__standard-identity">
                <p class="qoder-user-card__standard-name">${name || email}</p>
                <p class="qoder-user-card__standard-role">${role || label}</p>
              </div>
              <div class="qoder-user-card__standard-metadata">
                <div><span>ID:</span><span>#0042</span></div>
                <div><span>Since:</span><span>${time}</span></div>
              </div>
            </div>
          ` : `
            <div class="qoder-user-card__surface">
              <div class="qoder-user-card__glow qoder-user-card__glow--soft"></div>
              <div class="qoder-user-card__glow qoder-user-card__glow--medium"></div>
              <div class="qoder-user-card__glow qoder-user-card__glow--strong"></div>
              <div class="qoder-user-card__glow qoder-user-card__glow--deep"></div>
            </div>
            <div class="qoder-user-card__holographic">
              <div class="qoder-user-card__holographic-spectrum"></div>
              <div class="qoder-user-card__holographic-glare"></div>
            </div>
            <div class="qoder-user-card__text-layer">
              <div class="qoder-user-card__identity">
                <p class="qoder-user-card__email">${email}</p>
                <p class="qoder-user-card__label">${label}</p>
              </div>
              <div class="qoder-user-card__footer">
                <p class="qoder-user-card__time">${time}</p>
                <div class="qoder-user-card__signature">✦</div>
              </div>
            </div>
          `}
        </div>
      `;
    }

    _cssPath() {
      // 尝试从当前脚本路径推断 CSS 路径
      const scripts = document.querySelectorAll('script[src]');
      for (const s of scripts) {
        if (s.src.includes('qoder-ui')) {
          return s.src.replace(/\/[^\/]*\.js.*$/, '/../src/index.css');
        }
      }
      return '../src/index.css';
    }

    _initTilt() {
      const card = this.shadowRoot.querySelector('.qoder-user-card');
      const holo = this.shadowRoot.querySelector('.qoder-user-card__holographic');
      if (!card) return;

      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        card.style.transform = `perspective(1000px) rotateX(${-(y-0.5)*24}deg) rotateY(${(x-0.5)*24}deg)`;
        if (holo) {
          holo.style.setProperty('--q37283b', `${x*100}%`);
          holo.style.setProperty('--qd905da', `${y*100}%`);
        }
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    }
  }

  // ============================================================
  // Web Components - <qoder-dialog>
  // ============================================================
  class QoderDialog extends HTMLElement {
    static get observedAttributes() { return ['title', 'open']; }

    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
    }

    connectedCallback() { this.render(); }

    attributeChangedCallback(name) {
      if (this.shadowRoot) {
        if (name === 'open') this._toggle();
        else this.render();
      }
    }

    render() {
      const title = this.getAttribute('title') || '对话框';
      const isOpen = this.hasAttribute('open');

      this.shadowRoot.innerHTML = `
        <style>
          @import url('${this._cssPath()}');
          :host { display: contents; }
          .overlay { display: ${isOpen ? 'flex' : 'none'}; }
        </style>
        <div class="overlay qoder-dialog-overlay" part="overlay">
          <div class="qoder-dialog" part="dialog">
            <div class="qoder-dialog-header">
              <h3 class="qoder-dialog-title">${title}</h3>
              <button class="qoder-dialog-close" part="close">×</button>
            </div>
            <div class="qoder-dialog-body" part="body">
              <slot></slot>
            </div>
            <div class="qoder-dialog-footer" part="footer">
              <slot name="footer"></slot>
            </div>
          </div>
        </div>
      `;

      this.shadowRoot.querySelector('.qoder-dialog-close').addEventListener('click', () => this.close());
      this.shadowRoot.querySelector('.overlay').addEventListener('click', (e) => {
        if (e.target.classList.contains('overlay')) this.close();
      });
    }

    _cssPath() {
      const scripts = document.querySelectorAll('script[src]');
      for (const s of scripts) {
        if (s.src.includes('qoder-ui')) return s.src.replace(/\/[^\/]*\.js.*$/, '/../src/index.css');
      }
      return '../src/index.css';
    }

    _toggle() {
      const overlay = this.shadowRoot.querySelector('.overlay');
      if (overlay) overlay.style.display = this.hasAttribute('open') ? 'flex' : 'none';
    }

    open() { this.setAttribute('open', ''); this.dispatchEvent(new CustomEvent('open')); }
    close() { this.removeAttribute('open'); this.dispatchEvent(new CustomEvent('close')); }
  }

  // ============================================================
  // Web Components - <qoder-theme-switcher>
  // ============================================================
  class QoderThemeSwitcher extends HTMLElement {
    connectedCallback() { this.render(); }

    render() {
      const themes = [
        { id: 'forest-light', name: 'Forest', grad: 'linear-gradient(135deg,#e8f5ee,#358e62)' },
        { id: 'forest-dark', name: 'Forest Dark', grad: 'linear-gradient(135deg,#1a2e24,#62c9a8)' },
        { id: 'bee-light', name: 'Bee', grad: 'linear-gradient(135deg,#fdf6e3,#e0c65c)' },
        { id: 'bee-dark', name: 'Bee Dark', grad: 'linear-gradient(135deg,#2a2615,#e0c65c)' },
        { id: 'mint-light', name: 'Mint', grad: 'linear-gradient(135deg,#e6f7f2,#4fa98f)' },
        { id: 'mint-dark', name: 'Mint Dark', grad: 'linear-gradient(135deg,#152a25,#62c9a8)' },
        { id: 'light-parchment', name: 'Parchment', grad: 'linear-gradient(135deg,#f5ebe0,#c96442)' },
        { id: 'parchment-dark', name: 'Parchment Dark', grad: 'linear-gradient(135deg,#2a1f18,#8ee5a1)' },
      ];

      this.innerHTML = `
        <div style="display:flex;gap:6px;flex-wrap:wrap;">
          ${themes.map(t => `
            <button data-theme="${t.id}" title="${t.name}"
              style="width:28px;height:28px;border-radius:50%;border:2px solid var(--border);
              background:${t.grad};cursor:pointer;transition:all .2s;padding:0;"></button>
          `).join('')}
        </div>
      `;

      const current = QoderTheme.current;
      $$('button', this).forEach(btn => {
        if (btn.dataset.theme === current) {
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 0 2px var(--accent-bg)';
        }
        btn.addEventListener('click', () => {
          QoderTheme.set(btn.dataset.theme);
          $$('button', this).forEach(b => {
            b.style.borderColor = 'var(--border)';
            b.style.boxShadow = 'none';
          });
          btn.style.borderColor = 'var(--accent)';
          btn.style.boxShadow = '0 0 0 2px var(--accent-bg)';
        });
      });
    }
  }

  // ============================================================
  // 注册自定义元素
  // ============================================================
  if (!customElements.get('qoder-user-card')) customElements.define('qoder-user-card', QoderUserCard);
  if (!customElements.get('qoder-dialog')) customElements.define('qoder-dialog', QoderDialog);
  if (!customElements.get('qoder-theme-switcher')) customElements.define('qoder-theme-switcher', QoderThemeSwitcher);

  // ============================================================
  // 自动初始化
  // ============================================================
  function init() {
    QoderTheme.init();
    QoderDialog.init();
    initHolographicCards();
    initVoiceCapsules();
    initTabs();
    initDropdowns();
    initSwitches();
    initTooltips();
    initPetStacks();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // ============================================================
  // 导出到全局
  // ============================================================
  window.QoderUI = {
    theme: QoderTheme,
    dialog: QoderDialog,
    toast: QoderToast,
    init,
    version: '2.1.0'
  };

})();
