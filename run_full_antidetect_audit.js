const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const CHROME_PATH = '/home/obidinog/hyperion-browser/chrome';

(async () => {
  console.log('='.repeat(70));
  console.log('      ЗАПУСК ПОЛНОГО АУДИТА ЗАЩИТЫ АНТИДЕТЕКТА HYPERION');
  console.log('='.repeat(70));

  const args = [
    '--no-sandbox',
    '--fingerprint-platform=Win32',
    '--fingerprint-concurrency=8',
    '--fingerprint-memory=16',
    '--fingerprint-webgl-renderer=ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    '--fingerprint-webgl-vendor=Google Inc. (NVIDIA)',
    '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
  ];

  console.log('\n[1/3] Запуск C++ ядра Chromium с профилем Windows / RTX 4090...');
  const browser = await chromium.launch({
    executablePath: CHROME_PATH,
    headless: false,
    env: { ...process.env, DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0' },
    args
  });

  const page = await browser.newPage({
    viewport: { width: 1280, height: 900 }
  });

  console.log('\n[2/3] Проверка устойчивости к взлому прототипов (C++ vs JS-инъекции)...');
  await page.goto('about:blank');

  const audit = await page.evaluate(async () => {
    // 1. Проверка нативности дескрипторов
    const isNative = (fn) => typeof fn === 'function' && fn.toString().includes('[native code]');
    const platDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'platform');
    const memDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'deviceMemory');
    const coresDesc = Object.getOwnPropertyDescriptor(Navigator.prototype, 'hardwareConcurrency');

    // 2. Попытка обхода через iframe (стандартный трюк бот-детекторов)
    const iframe = document.createElement('iframe');
    document.body.appendChild(iframe);
    const ifrNav = iframe.contentWindow.navigator;
    const iframeResults = {
      platform: ifrNav.platform,
      cores: ifrNav.hardwareConcurrency,
      memory: ifrNav.deviceMemory,
      webdriver: ifrNav.webdriver
    };
    iframe.remove();

    // 3. Попытка обхода через Web Worker (поток вне зоны видимости window)
    const workerCode = `
      self.onmessage = () => {
        self.postMessage({
          platform: navigator.platform,
          cores: navigator.hardwareConcurrency,
          memory: navigator.deviceMemory
        });
      };
    `;
    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const worker = new Worker(URL.createObjectURL(blob));
    
    const workerResults = await new Promise((resolve) => {
      worker.onmessage = (e) => resolve(e.data);
      worker.postMessage({});
      setTimeout(() => resolve({ timeout: true }), 3000);
    });

    // 4. WebGL рендер
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    const ext = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;
    const webglR = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'NO_EXT';
    const webglV = ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : 'NO_EXT';

    return {
      windowValues: {
        webdriver: navigator.webdriver,
        platform: navigator.platform,
        cores: navigator.hardwareConcurrency,
        memory: navigator.deviceMemory
      },
      nativeCheck: {
        platformIsNative: isNative(platDesc?.get),
        memoryIsNative: isNative(memDesc?.get),
        coresIsNative: isNative(coresDesc?.get)
      },
      iframeResults,
      workerResults,
      webgl: { webglR, webglV }
    };
  });

  console.log('\n--- РЕЗУЛЬТАТЫ ВНУТРЕННЕГО АУДИТА БЕЗОПАСНОСТИ ---');
  console.log('• Окно (window.navigator):', audit.windowValues);
  console.log('• Проверка [native code] (C++ чистые геттеры):', audit.nativeCheck);
  console.log('• Попытка вскрыть через чистый iframe:', audit.iframeResults);
  console.log('• Попытка вскрыть через изолированный Web Worker:', audit.workerResults);
  console.log('• WebGL видеокарта:', audit.webgl);

  // Валидация
  const c1 = audit.windowValues.platform === 'Win32' && audit.iframeResults.platform === 'Win32' && audit.workerResults.platform === 'Win32';
  const c2 = audit.windowValues.cores === 8 && audit.iframeResults.cores === 8 && audit.workerResults.cores === 8;
  const c3 = audit.windowValues.memory === 16 && audit.iframeResults.memory === 16 && audit.workerResults.memory === 16;
  const c4 = audit.windowValues.webdriver === false && audit.iframeResults.webdriver === false;
  const c5 = audit.nativeCheck.platformIsNative && audit.nativeCheck.memoryIsNative && audit.nativeCheck.coresIsNative;

  console.log('\n--- ИНДИКАТОРЫ УЯЗВИМОСТИ ---');
  console.log('1. Утечка платформы в Iframe/Worker:       ' + (c1 ? '✅ НЕТ УТЕЧКИ (Все Win32)' : '❌ СПАЛИЛОСЬ'));
  console.log('2. Утечка ядер CPU в Iframe/Worker:        ' + (c2 ? '✅ НЕТ УТЕЧКИ (Все 8 ядер)' : '❌ СПАЛИЛОСЬ'));
  console.log('3. Утечка оперативной памяти:              ' + (c3 ? '✅ НЕТ УТЕЧКИ (Все 16 GB)' : '❌ СПАЛИЛОСЬ'));
  console.log('4. Флаг автоматизации (navigator.webdriver):' + (c4 ? '✅ FALSE (Маскировка 100%)' : '❌ TRUE'));
  console.log('5. C++ Нативность (отсутствие JS Proxy):   ' + (c5 ? '✅ ЧИСТЫЙ C++ BLINK' : '❌ JS ПРОКСИ'));

  console.log('\n[3/3] Переход на живой сканер BrowserLeaks JavaScript...');
  try {
    await page.goto('https://browserleaks.com/javascript', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const jsScreenshotPath = '/home/obidinog/hyperion-desktop/check_js.png';
    await page.screenshot({ path: jsScreenshotPath, fullPage: false });
    console.log(`✅ Скриншот таблицы параметров сохранен: ${jsScreenshotPath}`);
  } catch (err) {
    console.log('Browserleaks/js:', err.message);
  }

  try {
    await page.goto('https://browserleaks.com/webgl', { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(3000);
    const webglScreenshotPath = '/home/obidinog/hyperion-desktop/check_webgl.png';
    await page.screenshot({ path: webglScreenshotPath, fullPage: false });
    console.log(`✅ Скриншот видеокарты сохранен: ${webglScreenshotPath}`);
  } catch (err) {
    console.log('Browserleaks/webgl:', err.message);
  }

  await browser.close();
  console.log('\n' + '='.repeat(70));
  console.log('                  АУДИТ УСПЕШНО ЗАВЕРШЕН');
  console.log('='.repeat(70));
})().catch(err => {
  console.error('Ошибка аудита:', err);
  process.exit(1);
});
