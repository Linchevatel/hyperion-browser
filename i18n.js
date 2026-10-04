/**
 * Hyperion i18n — renderer-side helper.
 * Загружается ДО app.js. Словарь подхватывается из main-процесса
 * через window.hyperion.getLocales() при старте (см. boot в app.js).
 *
 * API:
 *   t('modal.create.title')            — простой lookup
 *   t('toast.started', {name: 'X'})    — интерполяция {name}
 *   applyI18n()                        — расставить тексты по data-i18n атрибутам
 *
 * HTML-атрибуты:
 *   data-i18n="key"          → textContent
 *   data-i18n-ph="key"       → placeholder
 *   data-i18n-title="key"    → title (тултип)
 *   data-i18n-html="key"     → innerHTML (ТОЛЬКО для доверенных строк словаря!)
 */
(function () {
  const I18N = {
    lang: 'ru',
    dict: {},

    /** Разрешить ключ 'a.b.c' по словарю. Нет ключа — вернуть сам ключ. */
    _resolve(key) {
      let cur = this.dict;
      for (const part of key.split('.')) {
        if (cur == null || typeof cur !== 'object' || !(part in cur)) return null;
        cur = cur[part];
      }
      return typeof cur === 'string' ? cur : null;
    },

    t(key, params) {
      let s = this._resolve(key);
      if (s == null) {
        console.warn('[i18n] missing key:', key);
        return key;
      }
      if (params) {
        s = s.replace(/\{(\w+)\}/g, (m, name) =>
          params[name] !== undefined ? String(params[name]) : m
        );
      }
      return s;
    },

    /** Расставить переводы по data-i18n атрибутам в поддереве. */
    apply(root) {
      root = root || document;
      root.querySelectorAll('[data-i18n]').forEach(el => {
        el.textContent = this.t(el.getAttribute('data-i18n'));
      });
      root.querySelectorAll('[data-i18n-ph]').forEach(el => {
        el.setAttribute('placeholder', this.t(el.getAttribute('data-i18n-ph')));
      });
      root.querySelectorAll('[data-i18n-title]').forEach(el => {
        el.setAttribute('title', this.t(el.getAttribute('data-i18n-title')));
      });
      root.querySelectorAll('[data-i18n-html]').forEach(el => {
        el.innerHTML = this.t(el.getAttribute('data-i18n-html'));
      });
    },

    /** Обновить состояние переключателя языка (select в настройках) */
    _syncSwitcher() {
      const el = document.getElementById('btn-lang-toggle');
      if (el && el.tagName === 'SELECT') el.value = this.lang;
    },

    /** Инициализация: словарь от main + кнопка переключения. */
    async init() {
      try {
        const loc = await window.hyperion.getLocales();
        this.lang = loc.lang || 'ru';
        this.dict = loc.dict || {};
      } catch (e) {
        console.error('[i18n] failed to load locales:', e);
      }
      this.apply();
      this._syncSwitcher();
      this._wireSwitcher();
    },

    _wireSwitcher() {
      const el = document.getElementById('btn-lang-toggle');
      if (!el || el.dataset.wired) return;
      el.dataset.wired = '1';
      el.addEventListener('change', async () => {
        const next = el.value;
        if (next === this.lang) return;
        try {
          await window.hyperion.setLanguage(next);
          const loc = await window.hyperion.getLocales();
          this.lang = loc.lang || next;
          this.dict = loc.dict || {};
        } catch (err) { console.error(err); return; }
        // Живое переключение БЕЗ reload: статика — через data-i18n,
        // динамику перерендерит app.js по событию.
        this.apply();
        this._syncSwitcher();
        window.dispatchEvent(new CustomEvent('hyperion:language-changed'));
      });
    }
  };

  window.I18N = I18N;
  window.t = (key, params) => I18N.t(key, params);
  window.applyI18n = (root) => I18N.apply(root);
})();
