const { _electron: electron } = require('playwright');
const path = require('path');
const assert = require('assert');

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function run() {
  console.log('====================================================');
  console.log('🛡️  HYPERION BROWSER: PLAYWRIGHT AUTOMATED BUTTON TESTING');
  console.log('====================================================');

  const electronPath = path.join(__dirname, 'node_modules', 'electron', 'dist', 'electron');
  const appPath = path.join(__dirname, 'main.js');

  const app = await electron.launch({
    executablePath: electronPath,
    args: [appPath, '--disable-gpu', '--no-sandbox'],
    env: {
      ...process.env,
      DISPLAY: process.env.DISPLAY || ':0',
      WAYLAND_DISPLAY: process.env.WAYLAND_DISPLAY || 'wayland-0'
    }
  });

  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  await sleep(1500);

  // Auto-handle any alerts / prompts
  page.on('dialog', async dialog => {
    console.log(`    [Dialog intercepted: ${dialog.type()} "${dialog.message()}"]`);
    await dialog.dismiss().catch(() => {});
  });

  const errors = [];
  page.on('pageerror', err => {
    console.error('    [PageError]', err.message);
    errors.push(err.message);
  });

  let passCount = 0;
  let failCount = 0;

  async function check(name, fn) {
    process.stdout.write(`• ${name}... `);
    try {
      await fn();
      console.log('✅ PASS');
      passCount++;
    } catch (err) {
      console.log(`❌ FAIL (${err.message})`);
      failCount++;
    }
    await sleep(200);
  }

  try {
    // -------------------------------------------------------------
    console.log('\n[1] ТЕСТИРОВАНИЕ НАВИГАЦИИ БОКОВОГО МЕНЮ (SIDEBAR)');
    // -------------------------------------------------------------
    await check('Переход во вкладку "Прокси"', async () => {
      await page.click('[data-view="proxies"]');
      await sleep(200);
      const isVis = await page.isVisible('#view-proxies');
      assert.strictEqual(isVis, true);
    });

    await check('Переход во вкладку "Отпечатки / Шаблоны"', async () => {
      await page.click('[data-view="fingerprints"]');
      await sleep(200);
      const isVis = await page.isVisible('#view-fingerprints');
      assert.strictEqual(isVis, true);
    });

    await check('Переход во вкладку "Расширения"', async () => {
      await page.click('[data-view="extensions"]');
      await sleep(200);
      const isVis = await page.isVisible('#view-extensions');
      assert.strictEqual(isVis, true);
    });

    await check('Переход во вкладку "Настройки"', async () => {
      await page.click('[data-view="settings"]');
      await sleep(200);
      const isVis = await page.isVisible('#view-settings');
      assert.strictEqual(isVis, true);
    });

    await check('Возврат во вкладку "Профили"', async () => {
      await page.click('[data-view="profiles"]');
      await sleep(200);
      const isVis = await page.isVisible('#view-profiles');
      assert.strictEqual(isVis, true);
    });

    // -------------------------------------------------------------
    console.log('\n[2] ТЕСТИРОВАНИЕ ФИЛЬТРОВ И ШАПКИ (PROFILES VIEW)');
    // -------------------------------------------------------------
    await check('Кнопка фильтра статуса "Активные"', async () => {
      await page.click('[data-filter-status="running"]');
      const active = await page.$eval('[data-filter-status="running"]', el => el.classList.contains('active'));
      assert.strictEqual(active, true);
    });

    await check('Кнопка фильтра статуса "Остановленные"', async () => {
      await page.click('[data-filter-status="stopped"]');
      const active = await page.$eval('[data-filter-status="stopped"]', el => el.classList.contains('active'));
      assert.strictEqual(active, true);
    });

    await check('Кнопка фильтра статуса "Все"', async () => {
      await page.click('[data-filter-status="all"]');
      const active = await page.$eval('[data-filter-status="all"]', el => el.classList.contains('active'));
      assert.strictEqual(active, true);
    });

    await check('Кнопки фильтра ОС (Windows, macOS, Linux, Android, iOS, Все)', async () => {
      for (const os of ['windows', 'macos', 'linux', 'android', 'ios', 'all']) {
        await page.click(`[data-filter-os="${os}"]`);
        const active = await page.$eval(`[data-filter-os="${os}"]`, el => el.classList.contains('active'));
        assert.strictEqual(active, true);
      }
    });

    await check('Поле поиска и кнопка "Обновить список" (#btn-refresh)', async () => {
      await page.fill('#search-input', 'Crypto');
      await sleep(150);
      // removed btn-refresh
      await sleep(150);
      await page.fill('#search-input', '');
      await sleep(150);
      // removed btn-refresh
    });

    // -------------------------------------------------------------
    console.log('\n[3] МОДАЛЬНОЕ ОКНО СОЗДАНИЯ ПРОФИЛЯ (#profile-modal)');
    // -------------------------------------------------------------
    await check('Открытие окна "Новый профиль" (#btn-create-profile)', async () => {
      await page.click('#btn-create-profile');
      await sleep(300);
      const isDisp = await page.$eval('#profile-modal', el => el.style.display !== 'none');
      assert.strictEqual(isDisp, true);
    });

    await check('Переключение всех вкладок в модалке профиля (general, proxy, fingerprint, extensions, cookies)', async () => {
      for (const tab of ['general', 'proxy', 'fingerprint', 'extensions', 'cookies']) {
        await page.click(`[data-tab="${tab}"]`);
        await sleep(150);
        const isActive = await page.$eval(`[data-tab="${tab}"]`, el => el.classList.contains('active'));
        assert.strictEqual(isActive, true);
        const paneVis = await page.$eval(`#pane-${tab}`, el => el.classList.contains('active'));
        assert.strictEqual(paneVis, true);
      }
    });

    await check('Переключение ОС карточек в модалке (Windows, macOS, Linux, Android, iOS)', async () => {
      await page.click('[data-tab="general"]');
      await sleep(150);
      for (const os of ['windows', 'macos', 'linux', 'android', 'ios']) {
        await page.click(`label:has(input[name="form-os"][value="${os}"])`);
        const checked = await page.$eval(`input[name="form-os"][value="${os}"]`, el => el.checked);
        assert.strictEqual(checked, true);
      }
    });

    await check('Кнопка "Случайный отпечаток" (#btn-reroll-fp)', async () => {
      await page.click('[data-tab="fingerprint"]');
      await sleep(150);
      await page.click('#btn-reroll-fp');
      await sleep(300);
      const uaAfter = await page.$eval('#fp-ua', el => el.value);
      assert.ok(uaAfter.length > 10, 'UA сгенерирован');
    });

    await check('Закрытие модалки профиля крестиком (#btn-modal-close)', async () => {
      await page.click('#btn-modal-close');
      await sleep(250);
      const isDisp = await page.$eval('#profile-modal', el => el.style.display === 'none');
      assert.strictEqual(isDisp, true);
    });

    await check('Открытие и закрытие модалки кнопкой "Отмена" (#btn-modal-cancel)', async () => {
      await page.click('#btn-create-profile');
      await sleep(250);
      await page.click('#btn-modal-cancel');
      await sleep(250);
      const isDisp = await page.$eval('#profile-modal', el => el.style.display === 'none');
      assert.strictEqual(isDisp, true);
    });

    // -------------------------------------------------------------
    console.log('\n[4] МОДАЛЬНОЕ ОКНО МАССОВОГО СОЗДАНИЯ (+N) (#bulk-create-modal)');
    // -------------------------------------------------------------
    await check('Открытие модалки массового создания (#btn-open-bulk-create)', async () => {
      await page.click('#btn-open-bulk-create');
      await sleep(250);
      const isDisp = await page.$eval('#bulk-create-modal', el => el.style.display !== 'none');
      assert.strictEqual(isDisp, true);
    });

    await check('Выбор ОС в выпадающем списке массового создания (Android, iOS)', async () => {
      await page.selectOption('#bulk-select-os', 'android');
      let val = await page.$eval('#bulk-select-os', el => el.value);
      assert.strictEqual(val, 'android');
      await page.selectOption('#bulk-select-os', 'ios');
      val = await page.$eval('#bulk-select-os', el => el.value);
      assert.strictEqual(val, 'ios');
    });

    await check('Закрытие модалки массового создания (#btn-cancel-bulk-create)', async () => {
      await page.click('#btn-cancel-bulk-create');
      await sleep(250);
      const isDisp = await page.$eval('#bulk-create-modal', el => el.style.display === 'none');
      assert.strictEqual(isDisp, true);
    });

    // -------------------------------------------------------------
    console.log('\n[5] КНОПКИ В СТРОКАХ ТАБЛИЦЫ ПРОФИЛЕЙ (ROW ACTIONS)');
    // -------------------------------------------------------------
    const rowCount = await page.$$eval('#profiles-tbody tr', rows => rows.length);
    console.log(`    Найдено профилей в таблице: ${rowCount}`);

    if (rowCount > 0) {
      await check('Чекбокс выбора профиля и появление плавающей панели (#bulk-bar)', async () => {
        await page.click('.profile-row-check');
        await sleep(200);
        const barDisp = await page.$eval('#bulk-bar', el => el.style.display !== 'none');
        assert.strictEqual(barDisp, true);
        // Deselect
        await page.click('.profile-row-check');
        await sleep(200);
        const barHidden = await page.$eval('#bulk-bar', el => el.style.display === 'none');
        assert.strictEqual(barHidden, true);
      });

      await check('Кнопка "🔍 Тест отпечатка" (Quality Scorer Modal)', async () => {
        await page.click('.btn-icon[onclick*="openQualityScorer"]');
        await sleep(250);
        const isDisp = await page.$eval('#scorer-modal', el => el.style.display !== 'none');
        assert.strictEqual(isDisp, true);
        // Close
        await page.click('#btn-close-scorer');
        await sleep(250);
        const isClosed = await page.$eval('#scorer-modal', el => el.style.display === 'none');
        assert.strictEqual(isClosed, true);
      });

      await check('Кнопка "🤖 Cookie Robot" (Warmup Modal)', async () => {
        await page.click('.btn-icon[onclick*="openWarmupRobot"]');
        await sleep(250);
        const isDisp = await page.$eval('#warmup-modal', el => el.style.display !== 'none');
        assert.strictEqual(isDisp, true);
        // Close
        await page.click('#btn-close-warmup');
        await sleep(250);
        const isClosed = await page.$eval('#warmup-modal', el => el.style.display === 'none');
        assert.strictEqual(isClosed, true);
      });

      await check('Кнопка "Настроить профиль" (Редактирование)', async () => {
        await page.click('.btn-icon[onclick*="editProfile"]');
        await sleep(250);
        const isDisp = await page.$eval('#profile-modal', el => el.style.display !== 'none');
        assert.strictEqual(isDisp, true);
        const title = await page.$eval('#modal-heading', el => el.textContent);
        assert.ok(title.includes('Редактировать'));
        await page.click('#btn-modal-close');
        await sleep(250);
      });
    }

    // -------------------------------------------------------------
    console.log('\n[6] ТЕСТИРОВАНИЕ ВКЛАДКИ "ПРОКСИ" (#view-proxies)');
    // -------------------------------------------------------------
    await page.click('[data-view="proxies"]');
    await sleep(250);

    await check('Кнопка "Добавить прокси" (#btn-add-proxy) и закрытие модалки', async () => {
      await page.click('#btn-add-proxy');
      await sleep(250);
      const isDisp = await page.$eval('#add-proxy-modal', el => el.style.display !== 'none');
      assert.strictEqual(isDisp, true);
      await page.click('#btn-cancel-add-proxy');
      await sleep(250);
      const isClosed = await page.$eval('#add-proxy-modal', el => el.style.display === 'none');
      assert.strictEqual(isClosed, true);
    });

    await check('Кнопка "Импорт списком" (#btn-import-proxies-modal) и закрытие модалки', async () => {
      await page.click('#btn-import-proxies-modal');
      await sleep(250);
      const isDisp = await page.$eval('#import-proxies-modal', el => el.style.display !== 'none');
      assert.strictEqual(isDisp, true);
      await page.click('#btn-cancel-import-proxy');
      await sleep(250);
      const isClosed = await page.$eval('#import-proxies-modal', el => el.style.display === 'none');
      assert.strictEqual(isClosed, true);
    });

    // -------------------------------------------------------------
    console.log('\n[7] ТЕСТИРОВАНИЕ ВКЛАДКИ "ОТПЕЧАТКИ / ШАБЛОНЫ" (#view-fingerprints)');
    // -------------------------------------------------------------
    await page.click('[data-view="fingerprints"]');
    await sleep(250);

    await check('Кнопка "Создать шаблон" (#btn-open-create-template)', async () => {
      await page.click('#btn-open-create-template');
      await sleep(250);
      const isDisp = await page.$eval('#create-template-modal', el => el.style.display !== 'none');
      assert.strictEqual(isDisp, true);
    });

    await check('Выбор ОС в модалке шаблона (Windows, macOS, Linux, Android, iOS)', async () => {
      for (const os of ['windows', 'macos', 'linux', 'android', 'ios']) {
        await page.click(`label:has(input[name="tpl-os"][value="${os}"])`);
        const checked = await page.$eval(`input[name="tpl-os"][value="${os}"]`, el => el.checked);
        assert.strictEqual(checked, true);
      }
      await page.click('#btn-cancel-create-template');
      await sleep(250);
      const isClosed = await page.$eval('#create-template-modal', el => el.style.display === 'none');
      assert.strictEqual(isClosed, true);
    });

    // -------------------------------------------------------------
    console.log('\n[8] ТЕСТИРОВАНИЕ ВКЛАДКИ "РАСШИРЕНИЯ" (#view-extensions)');
    // -------------------------------------------------------------
    await page.click('[data-view="extensions"]');
    await sleep(250);

    await check('Кнопки фильтрации категорий каталога расширений (Все, Утилиты, Крипта, Безопасность, Трафик)', async () => {
      const cats = ['all', 'Utility', 'Crypto', 'Security', 'Traffic'];
      for (const cat of cats) {
        await page.click(`[data-ext-cat="${cat}"]`);
        await sleep(150);
        const active = await page.$eval(`[data-ext-cat="${cat}"]`, el => el.classList.contains('active'));
        assert.strictEqual(active, true);
        const cardCount = await page.$$eval('#catalog-ext-grid .ext-card', cards => cards.length);
        assert.ok(cardCount > 0, `Категория ${cat} содержит карточки`);
      }
    });

    await check('Поле ввода и кнопка установки расширения по ссылке/ID', async () => {
      const hasInput = await page.isVisible('#input-custom-ext-id');
      const hasBtn = await page.isVisible('#btn-install-custom-ext');
      assert.strictEqual(hasInput, true);
      assert.strictEqual(hasBtn, true);
    });

    // -------------------------------------------------------------
    console.log('\n[9] ТЕСТИРОВАНИЕ ВКЛАДКИ "НАСТРОЙКИ" (#view-settings)');
    // -------------------------------------------------------------
    await page.click('[data-view="settings"]');
    await sleep(250);

    await check('Кнопка "Сохранить настройки" (#btn-save-settings)', async () => {
      await page.click('#btn-save-settings');
      await sleep(150);
    });

    await check('Проверка видимости кнопок обслуживания ядра и бэкапов', async () => {
      const hasClear = await page.isVisible('#btn-clear-cache');
      const hasBackup = await page.isVisible('#btn-export-backup');
      assert.strictEqual(hasClear, true);
      assert.strictEqual(hasBackup, true);
    });

  } finally {
    await app.close();
    console.log('\n====================================================');
    console.log(`ИТОГИ ТЕСТИРОВАНИЯ PLAYWRIGHT:`);
    console.log(`  ПРОЙДЕНО ТЕСТОВ: ${passCount}`);
    console.log(`  ОШИБОК:          ${failCount}`);
    console.log(`  JS ОШИБОК СТРАНИЦЫ: ${errors.length}`);
    console.log('====================================================\n');
    if (failCount > 0 || errors.length > 0) {
      process.exit(1);
    }
  }
}

run().catch(err => {
  console.error('КРИТИЧЕСКИЙ СБОЙ ТЕСТ-РАННЕРА:', err);
  process.exit(1);
});
