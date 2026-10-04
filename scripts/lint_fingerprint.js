#!/usr/bin/env node
/**
 * Hyperion Fingerprint Self-Consistency Linter
 *
 * Генерирует N отпечатков на ОС и проверяет инварианты реалистичности.
 * Любое нарушение — мгновенный детект у антифрода (CreepJS и др.).
 *
 * Запуск: node scripts/lint_fingerprint.js [countPerOs]
 * Exit code: 0 — всё чисто, 1 — есть нарушения.
 */

const path = require('path');
const fs = require('fs');
const { generateFingerprint, approxDeviceMemory } = require(path.join(__dirname, '..', 'fingerprint.js'));

const COUNT = parseInt(process.argv[2] || '50', 10);
const ENGINE_MAJOR = (() => {
  try {
    return fs.readFileSync(path.join(__dirname, '..', 'CHROMIUM_VERSION'), 'utf8').trim().split('.')[0];
  } catch (e) { return '154'; }
})();

const VALID_DPR = new Set([1, 1.25, 1.5, 1.75, 2, 2.5]);
const VALID_DEVMEM_DESKTOP = new Set([2, 4, 8, 16, 32]);
const VALID_DEVMEM_MOBILE = new Set([1, 2, 4, 8]);

let errors = 0;
let checked = 0;
const kitStats = {};

function fail(os, id, rule, detail) {
  errors++;
  console.log(`  ✗ [${os}/${rule}] ${detail}`);
}

function lintProfile(fp, os) {
  const id = fp.kit_id || 'no-kit';
  checked++;

  // 1. UA заявляет мажорную версию реального движка
  const uaM = fp.user_agent.match(/(?:Chrome|CriOS)\/(\d+)/);
  if (!uaM) fail(os, id, 'ua', `нет Chrome-версии в UA: ${fp.user_agent}`);
  else if (uaM[1] !== ENGINE_MAJOR) fail(os, id, 'ua', `UA Chrome/${uaM[1]} ≠ движок ${ENGINE_MAJOR}`);

  // 2. deviceMemory — бакет Chromium, консистентный с RAM
  const dm = fp.hardware.device_memory;
  const validBuckets = fp.client_hints?.mobile ? VALID_DEVMEM_MOBILE : VALID_DEVMEM_DESKTOP;
  if (!validBuckets.has(dm)) fail(os, id, 'devmem', `deviceMemory=${dm} вне бакетов Chromium`);
  const expectDm = approxDeviceMemory(fp.hardware.memory, !!fp.client_hints?.mobile);
  if (dm !== expectDm) fail(os, id, 'devmem', `deviceMemory=${dm} ≠ bucket(${fp.hardware.memory})=${expectDm}`);

  // 3. WebGL рендерер ↔ ОС
  const r = fp.webgl.unmasked_renderer || '';
  if (os === 'macos' && /Direct3D|ANGLE \(NVIDIA/.test(r)) fail(os, id, 'webgl-os', `macOS с Windows-рендерером: ${r}`);
  if (os === 'windows' && !/ANGLE|Microsoft|Basic Render/.test(r)) fail(os, id, 'webgl-os', `Windows без ANGLE: ${r}`);
  if (os === 'linux' && /Direct3D|ANGLE/.test(r)) fail(os, id, 'webgl-os', `Linux с ANGLE/D3D: ${r}`);

  // 4. Платформа ↔ ОС
  const expectPlatform = { windows: 'Win32', macos: 'MacIntel', linux: 'Linux x86_64' }[os];
  if (expectPlatform && fp.platform !== expectPlatform) fail(os, id, 'platform', `${fp.platform} ≠ ${expectPlatform}`);

  // 5. Экран: availHeight строго меньше height на десктопах (таскбар/менюбар)
  const s = fp.screen;
  if (['windows', 'linux'].includes(os) && s.avail_height >= s.height) {
    fail(os, id, 'screen', `availHeight(${s.avail_height}) >= height(${s.height}) на ${os}`);
  }
  if (s.width < 640 || s.height < 480) fail(os, id, 'screen', `подозрительное разрешение ${s.width}x${s.height}`);

  // 6. DPR из стандартного ряда ОС (десктоп)
  if (['windows', 'macos', 'linux'].includes(os) && !VALID_DPR.has(s.pixel_ratio)) {
    fail(os, id, 'dpr', `devicePixelRatio=${s.pixel_ratio} вне ряда [1,1.25,1.5,1.75,2,2.5]`);
  }

  // 7. Логические пиксели консистентны с DPR (physical = logical * dpr — целое)
  const physW = s.width * s.pixel_ratio;
  if (Math.abs(physW - Math.round(physW)) > 0.01) fail(os, id, 'dpr', `нецелая физ. ширина: ${physW}`);

  // 8. WebGL preset существует, если заявлен
  if (fp.webgl.preset) {
    const pp = path.join(__dirname, '..', 'data', 'webgl_presets', `${fp.webgl.preset}.json`);
    if (!fs.existsSync(pp)) fail(os, id, 'preset', `нет файла пресета ${fp.webgl.preset}`);
  }

  // 9. Голоса: у Windows/macOS должны быть (пустой список — детект)
  if (['windows', 'macos'].includes(os) && (!fp.speech_voices || fp.speech_voices.length === 0)) {
    fail(os, id, 'voices', 'пустой speech_voices на desktop OS');
  }

  // 10. Железо правдоподобно: high-end GPU не с 4GB RAM
  if (/RTX 40|RTX 3090|RTX 3080/.test(r) && fp.hardware.memory < 16) {
    fail(os, id, 'hw-mismatch', `${r} с ${fp.hardware.memory}GB RAM`);
  }

  kitStats[id] = (kitStats[id] || 0) + 1;
}

console.log(`Hyperion Fingerprint Linter — ${COUNT} профилей на ОС, движок Chrome/${ENGINE_MAJOR}\n`);

for (const os of ['windows', 'macos', 'linux']) {
  for (let i = 0; i < COUNT; i++) {
    lintProfile(generateFingerprint(os, `lint-${os}-${i}`, ENGINE_MAJOR), os);
  }
}

console.log(`\nПроверено: ${checked} отпечатков, нарушений: ${errors}`);
console.log('\nРаспределение по hardware kits:');
const sorted = Object.entries(kitStats).sort((a, b) => b[1] - a[1]);
for (const [kit, n] of sorted) {
  console.log(`  ${String(n).padStart(3)} × ${kit}`);
}

process.exit(errors > 0 ? 1 : 0);
