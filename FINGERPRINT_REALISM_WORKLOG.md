# WORKLOG: Fingerprint Realism Overhaul

> Рабочий документ. При сжатии контекста — читать этот файл первым.

## Цель
Довести реалистичность отпечатков Hyperion до уровня выше коммерческих антидетектов (Dolphin/GoLogin/Multilogin).

## Источники данных (уже найдены и проверены)
1. **Camoufox** `pythonlib/camoufox/fingerprint-presets.json` (MPL-2.0): 285 коррелированных пресетов (win 168 / mac 58 / linux 59): navigator+screen(вкл. availWidth/availHeight/DPR)+webgl vendor/renderer+speechVoices. raw: https://raw.githubusercontent.com/daijro/camoufox/main/pythonlib/camoufox/fingerprint-presets.json (есть копия /tmp/camoufox-presets.json)
2. **Camoufox test-data** `webgl-gtx980-linux.json`: полный WebGL-дамп — 147 параметров × WebGL1/2, extensions, shaderPrecisionFormats, contextAttributes. Схема для наших webgl_presets. (копия /tmp/webgl-gtx980.json)
3. **GoLogin DB repo** s0ckd3/Data-fingerprint-Gologin-Browser: DEMO_*.json — ANGLE-формат webglParams (43 glParamValues, extensions, shaiderPrecisionFormat), fonts families, mediaDevices. Эталон формата (без лицензии — только как образец структуры). (копия /tmp/gologin_win.json)
4. GitHub code search: 237 файлов с реальными ANGLE WebGL-дампами.

## План работ (приоритет)
- [ ] P0: фикс deviceMemory bucketing (патч возвращает сырую RAM 16/32 — детект! Chrome даёт только 0.25–8 степени двойки). Патч: navigator_device_memory.cc + fingerprint.js маппинг.
- [ ] P0: data/hardware_kits — конвертер Camoufox→наша схема (kit: gpu+displays+cores/ram диапазоны+voices), веса популярности, weighted sampling (PCG32 от seed).
- [ ] P0: переписать fingerprint.js на kits (сохранить детерминизм по profileId, обратную совместимость API generateFingerprint).
- [ ] P1: C++ патч — полный WebGL спуфинг: getParameter/getSupportedExtensions/getShaderPrecisionFormat по JSON-пресету (флаг --fingerprint-webgl-preset-file=<path>). Схема = camoufox webgl dump (147 параметров × GL1/GL2).
- [ ] P1: data/webgl_presets — начальный набор (ANGLE-формат, из GoLogin-дампов как образец + github dumps + dumper).
- [ ] P1: speechSynthesis voices спуфинг (helper extension, списки из camoufox presets).
- [ ] P1: self-consistency linter (scripts/lint_fingerprint.js): deviceMemory bucket, macOS≠D3D11, availHeight=height-taskbar, DPR↔resolution.
- [ ] P1: dumper.html — страница снятия дампа с реальной машины.
- [ ] P2: fonts по версиям ОС (Win10 vs Win11: Segoe UI Variable), navigator.fonts.query патч.
- [ ] P2: CreepJS quality gate в CI.

## Архитектурные решения
- Данные в репо: data/hardware_kits/*.json, data/webgl_presets/*.json, data/fonts/*.json
- Kits версионируются с мажором Chromium.
- Сэмплирование: weighted CDF по seed (детерминизм по profileId сохранить!).
- deviceMemory = min(8, floor power-of-2 от RAM).

## Прогресс (обновлять!)
### 2026-10-04
- [x] deviceMemory: патч перенесён в approximated_device_memory.cc (источник истины: navigator + Device-Memory хидер + workers); убран отклоняющийся .idl hunк (SecureContext); fingerprint.js: approxDeviceMemory() бакеты 2-32 desktop / 1-8 mobile; main.js передаёт бакет с фоллбэком для старых профилей. Проверено: node-тест бакетов соответствует алгоритму Chromium 154 (kMin=2, kMax=32).
- [x] data/hardware_kits/ (win 10 / mac 5 / linux 6 kits) из Camoufox presets — Gemini; нормализация DPR к стандартному ряду {1,1.25,1.5,1.75,2,2.5} + целые физ. пиксели (кратность знаменателю DPR) + availHeight<height. Конвертер scripts/convert_camoufox_kits.py (идемпотентный).
- [x] fingerprint.js переписан на kits: weightedPick по seed, correlated GPU↔экран↔CPU↔RAM, UA темплейтится мажором реального движка (Chrome/154), kit_id, speech_voices, webgl.preset. Детерминизм сохранён. Legacy fallback если kits нет.
- [x] main.js: getEngineMajorVersion() из CHROMIUM_VERSION (все 5 вызовов generateFingerprint); флаг --fingerprint-webgl-preset-b64 (base64url minified JSON из data/webgl_presets/<id>.json, <100KB); speech voices → helper extension (MAIN world, SpeechSynthesisVoice.prototype setPrototypeOf + own data props, native toString).
- [x] data/webgl_presets/ (Gemini): nvidia_gtx980_linux.json (83+133 params), windows_generic_angle.json (29+79); конвертер scripts/convert_webgl_presets.py; пресет-маппинг встроен в конвертер kits.
- [x] scripts/lint_fingerprint.js — 10 инвариантов; 300 отпечатков → 0 нарушений. Поймал реальные баги (дробные DPR, нецелые физпиксели).
- [x] Codex: драфт C++ патча WebGL-пресетов (patches/drafts/webgl_preset_spoofing_draft.patch, 5 файлов) — transport переключён на --fingerprint-webgl-preset-b64 (base64url в cmdline, обход sandbox). git apply --check поверх основного патча — OK (по отчёту codex).
- [ ] Слить webgl-драфт в patches/hyperion_webgl_presets.patch (отдельным файлом, CI применяет после core)
- [ ] Компиляция на контейнере 105 (ждёт окончания CI build v1.0.20!)
- [ ] dumper.html — делает Gemini
- [ ] E2E тест локально

- [x] FIX (по замечанию пользователя): GPU в UI не менялся — корневая причина НЕ в RNG (генератор давал 5 уникальных GPU на 10 UUID), а в round-trip UI: дропдауны GPU/разрешений строились из legacy-списков, kit-значений там не было → applyFingerprintToDropdowns не находил значение → syncDropdownsToFp при сохранении сбрасывал поле в первый пункт. Решение: getKitDictionaries() в fingerprint.js (GPU + разрешения из kits, regex коротких имён ANGLE с учётом скобок Intel(R)/llvmpipe), main.js get-fp-dictionaries мерджит kit-first + legacy с дедупом; browser_version '155' → getEngineMajorVersion() (2 места). Проверки: round-trip 200/200 найдены, cores/ram в списках, линтер 0 нарушений.

## Статус сборок
- v1.0.20 (Chromium 154.0.8037.92) — CI run 37150734725 запущен 2026-10-03 ~20:13 UTC, на момент записи шёл Sync Chromium Source. Проверить: `gh run view 37150734725`.

## Распределение работы
- kimi: координация, финальные правки, интеграция, коммиты с контейнера 105.
- Gemini (agy_delegate): анализ данных, конвертеры, драфты.
- Codex (codex_delegate): C++ патч дизайн/драфт (доступ к контейнеру через ssh root@100.75.210.78 → pct exec 105; исходники /build/chromium/src).
- Qwen: тривиальная рутина.

## Ключевые файлы проекта
- fingerprint.js (~990 строк, generateFingerprint(osName, profileId, browserVersion, overrides), GPU_PROFILES, RESOLUTIONS, UA_PRESETS)
- patches/hyperion_core_fingerprint.patch (9 флагов, 14 файлов Chromium)
- main.js: запуск с флагами ~line 850, ensureProfileHelperExtension (media devices spoofing)
- bundle/chrome/ — пропатченный Chromium 155 локально (в CI собирается 154!)

## Правила
- НЕ коммитить и НЕ пушить ничего до явной команды пользователя — правки только локально в /home/obidinog/project/hyperion-browser.
- Qwen (qwen_delegate) НЕ использовать вообще.
- Субагенты: только Gemini (agy_delegate) и Codex (codex_delegate).
- После правок C++ патча: проверить `git apply --check` на контейнере против /build/chromium/src (чистое дерево!).

## 2026-10-04 (вечер) — i18n EN/RU + README EN + UI-правки
- **i18n инфраструктура (kimi)**: i18n.js (renderer, window.t/I18N.init/applyI18n, data-i18n/-ph/-title/-html), i18n-main.js (main, словари locales/<lang>.json, IPC get-locales/set-language, персист language в settings.json), preload getLocales/setLanguage, кнопка EN/RU в сайдбаре (#btn-lang-toggle, reload рендерера при смене), styles.css.
- **app.js (Gemini)**: 191 замена, 170 ключей, покрытие 100%. kimi дополнил: regex-классификаторы showNotification расширены EN-ключами (иначе цвет тостов ломался в EN).
- **index.html (kimi)**: 201 data-i18n ключ через скрипты /tmp/i18n_html1.py + i18n_html2.py (правила old→new + словари). locales/parts/html.{ru,en}.json.
- **main.js (Codex, bash-обход, codex_delegate сломан MAX_RETRIES в этом сеансе)**: задача в /tmp/codex_prompt_i18n_main.md, лог /tmp/codex_i18n_main2.log. 'Отменено' — протокольная константа, НЕ переводить (app.js:2220 сравнивает).
- **Словари**: scripts/merge_locales.py мерджит locales/parts/* → locales/{ru,en}.json (371 строка, 0 коллизий, покрытие app.js t() и HTML data-i18n — 100%).
- **README (Gemini)**: README.md → полный EN, русский сохранён в README.ru.md, взаимные ссылки-переключатели в шапках.
- **UI-правка по запросу**: плашка «Доступно обновление» убрана из топбара; красная пульсирующая точка .update-dot на кнопке «Настройки» (id=settings-update-dot, логика в checkSettingsUpdates app.js).
- **Картинки**: pictures/*.jpg (6 шт, переименованы EN kebab-case, сжаты 13.5→2.1МБ), встроены в README; grip-превью localhost:6419.
- **Бэкапы перед i18n**: /tmp/i18n-backup/{index.html,app.js,main.js,preload.js,README.md}.
- Осталось: дождаться Codex main.js → merge → полная верификация (скан кириллицы, запуск EN/RU, скриншоты) → коммит по команде пользователя.
