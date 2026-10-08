/**
 * Hyperion i18n — main-process side.
 * Загружает locales/<lang>.json, предоставляет t() для строк main-процесса
 * (диалоги, трей, уведомления) и IPC для рендерера.
 *
 * Подключение в main.js (один раз, после создания SETTINGS_FILE-утилит):
 *   const i18nMain = require('./i18n-main');
 *   i18nMain.init(ipcMain, { readSettings, writeSettings });
 *   // далее в коде: const { t } = i18nMain; t('dialog.error')
 */
const fs = require('fs');
const path = require('path');

let currentLang = 'en';
const dicts = {};

function loadDict(lang) {
  try {
    const p = path.join(__dirname, 'locales', `${lang}.json`);
    dicts[lang] = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (e) {
    console.error(`[i18n-main] cannot load locale ${lang}:`, e.message);
    dicts[lang] = {};
  }
}

function resolve(key, lang) {
  let cur = dicts[lang];
  for (const part of key.split('.')) {
    if (cur == null || typeof cur !== 'object' || !(part in cur)) return null;
    cur = cur[part];
  }
  return typeof cur === 'string' ? cur : null;
}

function t(key, params) {
  // fallback: текущий язык → ru → сам ключ
  let s = resolve(key, currentLang);
  if (s == null && currentLang !== 'ru') s = resolve(key, 'ru');
  if (s == null) {
    console.warn('[i18n-main] missing key:', key);
    return key;
  }
  if (params) {
    s = s.replace(/\{(\w+)\}/g, (m, name) =>
      params[name] !== undefined ? String(params[name]) : m
    );
  }
  return s;
}

function getLang() { return currentLang; }
function setLang(l) { currentLang = l === 'ru' ? 'ru' : 'en'; }

/**
 * Регистрирует IPC-хендлеры.
 * @param {object} ipcMain — electron ipcMain
 * @param {object} opts
 *   opts.readSettings() → объект settings.json (может содержать language)
 *   opts.writeSettings(patch) — мерджит patch в settings.json
 */
function init(ipcMain, opts = {}) {
  loadDict('ru');
  loadDict('en');

  let savedLang;
  try {
    const st = opts.readSettings ? opts.readSettings() : {};
    savedLang = st && st.language;
  } catch (e) { /* ignore */ }

  if (savedLang === 'en' || savedLang === 'ru') {
    setLang(savedLang);
  } else {
    let locale = '';
    try {
      locale = opts.getSystemLocale ? opts.getSystemLocale() : '';
    } catch (e) { /* ignore */ }
    setLang(/^ru(?:[-_.@]|$)/i.test(String(locale || '').trim()) ? 'ru' : 'en');
  }

  ipcMain.handle('get-locales', () => ({
    lang: currentLang,
    dict: dicts[currentLang] || {}
  }));

  ipcMain.handle('set-language', (event, lang) => {
    setLang(lang);
    if (opts.writeSettings) {
      try { opts.writeSettings({ language: currentLang }); } catch (e) {
        console.error('[i18n-main] cannot persist language:', e.message);
      }
    }
    return { ok: true, lang: currentLang };
  });
}

module.exports = { t, init, getLang, setLang };
