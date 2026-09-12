/**
 * HYPERION Anti-Detect Browser — Комплексная проверка отпечатков
 * Проверяет реальную подмену параметров в ядре Chromium (C++ патчи)
 */

const { chromium } = require('playwright');
const http = require('http');

const CHROME_PATH = '/home/obidinog/hyperion-browser/chrome';

const TEST_CASES = [
  {
    name: '1. Windows 11 / RTX 4090 / 16 Cores / 32 GB RAM',
    platform: 'Win32',
    uaPlatform: 'Windows',
    concurrency: 16,
    memory: 32,
    webglRenderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)',
    webglVendor: 'Google Inc. (NVIDIA)',
    mobile: false,
    extraArgs: [
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    ]
  },
  {
    name: '2. macOS / Apple M3 Max / 12 Cores / 36 GB RAM',
    platform: 'MacIntel',
    uaPlatform: 'macOS',
    concurrency: 12,
    memory: 36,
    webglRenderer: 'ANGLE (Apple, ANGLE Metal Renderer: Apple M3 Max, Unspecified Version)',
    webglVendor: 'Google Inc. (Apple)',
    mobile: false,
    extraArgs: [
      '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36'
    ]
  },
  {
    name: '3. Android (Samsung S24 Ultra) / Adreno 750 / 8 Cores / 12 GB RAM',
    platform: 'Linux armv8l',
    uaPlatform: 'Android',
    concurrency: 8,
    memory: 12,
    webglRenderer: 'Adreno (TM) 750',
    webglVendor: 'Qualcomm',
    mobile: true,
    extraArgs: [
      '--user-agent=Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.6478.122 Mobile Safari/537.36',
      '--use-mobile-user-agent',
      '--touch-events=enabled'
    ]
  }
];

async function runVerification() {
  console.log('='.repeat(70));
  console.log('   HYPERION ANTI-DETECT: ПРОВЕРКА АППАРАТНЫХ ОТПЕЧАТКОВ (C++ BLINK)');
  console.log('='.repeat(70));

  const server = http.createServer((req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(`<!DOCTYPE html><html><head><title>Hyperion</title></head><body>OK</body></html>`);
  }).listen(9876, '127.0.0.1');

  let totalTests = 0;
  let passedTests = 0;

  for (const tc of TEST_CASES) {
    console.log(`\n▶ Тестирование профиля: \x1b[36m${tc.name}\x1b[0m`);
    console.log('-'.repeat(70));

    const args = [
      '--no-sandbox',
      `--fingerprint-platform=${tc.platform}`,
      `--fingerprint-concurrency=${tc.concurrency}`,
      `--fingerprint-memory=${tc.memory}`,
      `--fingerprint-webgl-renderer=${tc.webglRenderer}`,
      `--fingerprint-webgl-vendor=${tc.webglVendor}`,
      ...(tc.extraArgs || [])
    ];

    const browser = await chromium.launch({
      executablePath: CHROME_PATH,
      headless: false,
      env: { ...process.env, DISPLAY: ':0', WAYLAND_DISPLAY: 'wayland-0' },
      args
    });

    const page = await browser.newPage();
    await page.goto('http://127.0.0.1:9876');

    const fp = await page.evaluate(async () => {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      const ext = gl ? gl.getExtension('WEBGL_debug_renderer_info') : null;

      let uaDataPlatform = null;
      let uaDataMobile = null;
      if (navigator.userAgentData) {
        uaDataPlatform = navigator.userAgentData.platform;
        uaDataMobile = navigator.userAgentData.mobile;
      }

      return {
        webdriver: navigator.webdriver,
        platform: navigator.platform,
        concurrency: navigator.hardwareConcurrency,
        memory: navigator.deviceMemory,
        webglRenderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null,
        webglVendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : null,
        uaDataPlatform,
        uaDataMobile
      };
    });

    await browser.close();

    function check(label, actual, expected) {
      totalTests++;
      const ok = actual === expected;
      if (ok) {
        passedTests++;
        console.log(`  \x1b[32m✔ PASS\x1b[0m | ${label}: \x1b[33m${JSON.stringify(actual)}\x1b[0m`);
      } else {
        console.log(`  \x1b[31m✖ FAIL\x1b[0m | ${label}: получено \x1b[31m${JSON.stringify(actual)}\x1b[0m, ожидалось \x1b[32m${JSON.stringify(expected)}\x1b[0m`);
      }
    }

    check('navigator.webdriver (всегда false)', fp.webdriver, false);
    check('navigator.platform', fp.platform, tc.platform);
    check('navigator.hardwareConcurrency (CPU ядер)', fp.concurrency, tc.concurrency);
    check('navigator.deviceMemory (RAM ГБ)', fp.memory, tc.memory);
    check('WebGL UNMASKED_RENDERER', fp.webglRenderer, tc.webglRenderer);
    check('WebGL UNMASKED_VENDOR', fp.webglVendor, tc.webglVendor);
    if (tc.mobile) {
      check('navigator.userAgentData.mobile', fp.uaDataMobile, true);
    }
  }

  server.close();

  console.log('\n' + '='.repeat(70));
  if (passedTests === totalTests) {
    console.log(`\x1b[32mИТОГ: ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО (${passedTests}/${totalTests})! АНТИДЕТЕКТ ПОЛНОСТЬЮ ФУНКЦИОНИРУЕТ.\x1b[0m`);
  } else {
    console.log(`\x1b[31mИТОГ: Пройдено ${passedTests} из ${totalTests} тестов.\x1b[0m`);
  }
  console.log('='.repeat(70));
}

runVerification().catch(err => {
  console.error('Ошибка верификации:', err);
  process.exit(1);
});
