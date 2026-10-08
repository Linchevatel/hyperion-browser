/**
 * Regression and unit tests for i18n main and renderer modules.
 * Run: node scripts/test_i18n.js
 */
const assert = require('assert');
const path = require('path');
const vm = require('vm');
const fs = require('fs');

function freshI18nMain() {
  const modPath = path.resolve(__dirname, '../i18n-main.js');
  delete require.cache[modPath];
  return require(modPath);
}

function createMockIpcMain() {
  const handlers = {};
  return {
    handle(channel, listener) {
      handlers[channel] = listener;
    },
    async invoke(channel, ...args) {
      if (!handlers[channel]) throw new Error(`Missing handler for ${channel}`);
      return handlers[channel]({ sender: {} }, ...args);
    },
    handlers
  };
}

async function testMainSavedOverridesLocale() {
  // Explicit saved 'ru' overrides 'en' locale
  {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => ({ language: 'ru' }),
      getSystemLocale: () => 'en_US'
    });
    assert.strictEqual(i18n.getLang(), 'ru', 'Saved ru must override en locale');
    const locales = await ipc.invoke('get-locales');
    assert.strictEqual(locales.lang, 'ru');
  }

  // Explicit saved 'en' overrides 'ru' locale
  {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => ({ language: 'en' }),
      getSystemLocale: () => 'ru_RU.UTF-8'
    });
    assert.strictEqual(i18n.getLang(), 'en', 'Saved en must override ru locale');
    const locales = await ipc.invoke('get-locales');
    assert.strictEqual(locales.lang, 'en');
  }
}

async function testMainLocaleFallbacks() {
  const ruLocales = [
    'ru',
    'ru-RU',
    'ru_RU',
    'ru_RU.UTF-8',
    'ru.UTF-8',
    'ru@euro',
    'RU',
    'ru-kz',
    'ru_BY'
  ];

  for (const loc of ruLocales) {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => ({}),
      getSystemLocale: () => loc
    });
    assert.strictEqual(i18n.getLang(), 'ru', `Expected locale "${loc}" to resolve to ru`);
  }

  const enLocales = [
    'en',
    'en_US',
    'en-GB',
    'C',
    'C.UTF-8',
    'POSIX',
    '',
    null,
    undefined,
    'unknown',
    'de_DE',
    'fr_FR',
    'rum', // prefix guard: should not match ru
    'russian'
  ];

  for (const loc of enLocales) {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => ({}),
      getSystemLocale: () => loc
    });
    assert.strictEqual(i18n.getLang(), 'en', `Expected locale "${loc}" to resolve to en`);
  }
}

async function testMainInvalidSavedFallback() {
  const invalidSaved = ['de', 'fr', '', null, 123, true, {}];
  for (const saved of invalidSaved) {
    // With ru locale -> ru
    {
      const i18n = freshI18nMain();
      const ipc = createMockIpcMain();
      i18n.init(ipc, {
        readSettings: () => ({ language: saved }),
        getSystemLocale: () => 'ru_RU.UTF-8'
      });
      assert.strictEqual(i18n.getLang(), 'ru', `Invalid saved "${saved}" with ru locale must resolve to ru`);
    }
    // With non-ru locale -> en
    {
      const i18n = freshI18nMain();
      const ipc = createMockIpcMain();
      i18n.init(ipc, {
        readSettings: () => ({ language: saved }),
        getSystemLocale: () => 'C'
      });
      assert.strictEqual(i18n.getLang(), 'en', `Invalid saved "${saved}" with C locale must resolve to en`);
    }
  }
}

async function testMainExceptionsResilience() {
  // readSettings throws -> fallback to getSystemLocale
  {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => { throw new Error('disk read failed'); },
      getSystemLocale: () => 'ru-RU'
    });
    assert.strictEqual(i18n.getLang(), 'ru', 'Exception in readSettings should fall back to locale');
  }

  // getSystemLocale throws -> fallback to en
  {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => ({}),
      getSystemLocale: () => { throw new Error('locale unavailable'); }
    });
    assert.strictEqual(i18n.getLang(), 'en', 'Exception in getSystemLocale should default to en');
  }

  // Both throw -> default to en
  {
    const i18n = freshI18nMain();
    const ipc = createMockIpcMain();
    i18n.init(ipc, {
      readSettings: () => { throw new Error('settings error'); },
      getSystemLocale: () => { throw new Error('locale error'); }
    });
    assert.strictEqual(i18n.getLang(), 'en', 'Exceptions in both should default to en');
  }
}

async function testMainSetLanguageAndPersistence() {
  const i18n = freshI18nMain();
  const ipc = createMockIpcMain();
  let savedData = null;

  i18n.init(ipc, {
    readSettings: () => ({ language: 'en' }),
    writeSettings: (patch) => { savedData = patch; }
  });

  assert.strictEqual(i18n.getLang(), 'en');

  // Switch to ru
  let res = await ipc.invoke('set-language', 'ru');
  assert.deepStrictEqual(res, { ok: true, lang: 'ru' });
  assert.strictEqual(i18n.getLang(), 'ru');
  assert.deepStrictEqual(savedData, { language: 'ru' });

  // Switch to en
  res = await ipc.invoke('set-language', 'en');
  assert.deepStrictEqual(res, { ok: true, lang: 'en' });
  assert.strictEqual(i18n.getLang(), 'en');
  assert.deepStrictEqual(savedData, { language: 'en' });

  // Switch to invalid -> normalized to en
  res = await ipc.invoke('set-language', 'es');
  assert.deepStrictEqual(res, { ok: true, lang: 'en' });
  assert.strictEqual(i18n.getLang(), 'en');
  assert.deepStrictEqual(savedData, { language: 'en' });

  // writeSettings error handled gracefully
  const i18nErr = freshI18nMain();
  const ipcErr = createMockIpcMain();
  i18nErr.init(ipcErr, {
    writeSettings: () => { throw new Error('EACCES'); }
  });
  const resErr = await ipcErr.invoke('set-language', 'ru');
  assert.deepStrictEqual(resErr, { ok: true, lang: 'ru' });
}

async function testMainTranslationHelper() {
  const i18n = freshI18nMain();
  const ipc = createMockIpcMain();
  i18n.init(ipc, {
    readSettings: () => ({ language: 'en' })
  });

  // Basic key interpolation
  const rendered = i18n.t('profile.defaultName', { num: 42 });
  assert.ok(rendered.includes('42'), `Expected interpolation in "${rendered}"`);

  // Non-existent key returns key name
  const missing = i18n.t('non.existent.key.xyz');
  assert.strictEqual(missing, 'non.existent.key.xyz');
}

function createMockElement(tagName, attrs = {}, textContent = '') {
  const listeners = {};
  const el = {
    tagName: tagName.toUpperCase(),
    value: attrs.value || '',
    dataset: { ...attrs.dataset },
    textContent,
    innerHTML: '',
    attributes: { ...attrs },
    getAttribute(name) { return el.attributes[name] || null; },
    setAttribute(name, val) { el.attributes[name] = String(val); },
    addEventListener(evt, cb) {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(cb);
    },
    async trigger(evt, eventObj = {}) {
      if (listeners[evt]) {
        for (const cb of listeners[evt]) await cb(eventObj);
      }
    }
  };
  return el;
}

async function testRendererI18nVm() {
  const i18nCode = fs.readFileSync(path.resolve(__dirname, '../i18n.js'), 'utf8');

  // Test 1: init with ru from main
  {
    let dispatchedEvents = [];
    const elementsById = {};
    const allElements = [];

    const selectEl = createMockElement('select', { id: 'btn-lang-toggle', value: '' });
    elementsById['btn-lang-toggle'] = selectEl;

    const spanEl = createMockElement('span', { 'data-i18n': 'btn.save' });
    allElements.push(spanEl);
    const inputEl = createMockElement('input', { 'data-i18n-ph': 'ph.search', 'data-i18n-title': 'tip.search' });
    allElements.push(inputEl);

    let mainLang = 'ru';
    const context = {
      console,
      CustomEvent: class CustomEvent { constructor(name) { this.type = name; } },
      document: {
        documentElement: { lang: '' },
        getElementById(id) { return elementsById[id] || null; },
        querySelectorAll(sel) {
          if (sel === '[data-i18n]') return allElements.filter(e => e.getAttribute('data-i18n'));
          if (sel === '[data-i18n-ph]') return allElements.filter(e => e.getAttribute('data-i18n-ph'));
          if (sel === '[data-i18n-title]') return allElements.filter(e => e.getAttribute('data-i18n-title'));
          if (sel === '[data-i18n-html]') return allElements.filter(e => e.getAttribute('data-i18n-html'));
          return [];
        }
      },
      window: {
        dispatchEvent(evt) { dispatchedEvents.push(evt.type); },
        hyperion: {
          getLocales: async () => ({
            lang: mainLang,
            dict: {
              btn: { save: 'Сохранить' },
              ph: { search: 'Поиск...' },
              tip: { search: 'Подсказка' }
            }
          }),
          setLanguage: async (next) => { mainLang = next; }
        }
      }
    };

    vm.createContext(context);
    vm.runInContext(i18nCode, context);

    await context.window.I18N.init();

    assert.strictEqual(context.window.I18N.lang, 'ru');
    assert.strictEqual(context.document.documentElement.lang, 'ru');
    assert.strictEqual(selectEl.value, 'ru');
    assert.strictEqual(spanEl.textContent, 'Сохранить');
    assert.strictEqual(inputEl.getAttribute('placeholder'), 'Поиск...');
    assert.strictEqual(inputEl.getAttribute('title'), 'Подсказка');

    // Test live switcher toggle to 'en'
    selectEl.value = 'en';
    await selectEl.trigger('change');
    assert.strictEqual(context.window.I18N.lang, 'en');
    assert.strictEqual(context.document.documentElement.lang, 'en');
    assert.ok(dispatchedEvents.includes('hyperion:language-changed'));
  }

  // Test 2: invalid or empty lang from main falls back to en
  {
    const context = {
      console,
      CustomEvent: class CustomEvent { constructor(name) { this.type = name; } },
      document: {
        documentElement: { lang: '' },
        getElementById() { return null; },
        querySelectorAll() { return []; }
      },
      window: {
        dispatchEvent() {},
        hyperion: {
          getLocales: async () => ({ lang: 'unknown', dict: {} })
        }
      }
    };

    vm.createContext(context);
    vm.runInContext(i18nCode, context);
    await context.window.I18N.init();
    assert.strictEqual(context.window.I18N.lang, 'en');
    assert.strictEqual(context.document.documentElement.lang, 'en');
  }
}

async function run() {
  console.log('Running i18n test suite...');
  await testMainSavedOverridesLocale();
  await testMainLocaleFallbacks();
  await testMainInvalidSavedFallback();
  await testMainExceptionsResilience();
  await testMainSetLanguageAndPersistence();
  await testMainTranslationHelper();
  await testRendererI18nVm();
  console.log('All i18n tests passed successfully.');
}

run().catch((err) => {
  console.error('Test failure:', err);
  process.exit(1);
});
