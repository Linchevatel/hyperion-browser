# Hyperion Browser — План улучшений (Roadmap)

> Составлено совместно с Gemini (agy) 2026-10-03. Статус: на рассмотрении.

## 1. Антидетект-качество

| Улучшение | Суть | Сложность | Эффект |
|---|---|---|---|
| WebGL: полная консистентность параметров | Сейчас патч подменяет только VENDOR/RENDERER. `MAX_TEXTURE_SIZE`, `MAX_VIEWPORT_DIMS`, точность шейдеров и др. GL-параметры остаются от реального рендерера — CreepJS сверяет всю связку | M (C++) | Высокий |
| WebGPU спуфинг | `navigator.gpu.requestAdapter()` выдаёт реальные `GPUAdapterInfo` — растущий вектор в чекерах | M (C++/Dawn) | Высокий |
| Client Hints: аудит и доработка | Патч уже трогает `navigator_ua_data.cc` и `user_agent_utils.cc` — сначала проверить, что реально уходит в `Sec-CH-UA*` заголовках на сетевом уровне, потом дописать | S (аудит) | Высокий |
| TLS/JA4 и HTTP/2 фингерпринт | BoringSSL даёт характерный JA4. Реалистичный путь — внешний TLS-прокси (типа cycleTLS) между Chromium и сайтом, не патч BoringSSL | L | Высокий |
| SpeechSynthesis voices | `speechSynthesis.getVoices()` на Linux-движке возвращает пустой список — само по себе детект (у реального Windows ~10 голосов) | S (JS ext) | Средний |
| DNS-утечка через HTTP-прокси | При HTTP-прокси и SOCKS5-бридже DNS резолвится локально — провайдер видит реальные запросы. Нужен remote DNS | S | Средний |
| CSS @media / Screen consistency | `outerWidth/innerWidth` vs `availWidth`, `devicePixelRatio`, `matchMedia` — рассинхрон при масштабировании | S | Средний |
| Шрифты: фильтрация в C++ | fontconfig работает на Linux, но для Windows/macOS-профилей надёжнее фильтровать список шрифтов в FontCache (C++) | L | Средний |

## 2. Безопасность менеджера

| Улучшение | Суть | Сложность | Эффект |
|---|---|---|---|
| Шифрование прокси-кредов через `safeStorage` | Встроенный в Electron `safeStorage.encryptString` (OS keychain) — без нативных зависимостей | S | Высокий |
| Токен на локальный прокси-бридж | Бридж на 127.0.0.1 без авторизации — любой процесс хоста может ходить через прокси пользователя | S | Средний |
| Валидация IPC-аргументов (zod) | Строгие схемы на все `ipcMain.handle` | S | Средний |
| SQLCipher для кук профиля | Вместо надежды на gnome-keyring | M | Средний |

## 3. UX / функционал (паритет с Dolphin/AdsPower)

| Фича | Сложность | Эффект |
|---|---|---|
| Automation API: `--remote-debugging-port` per-профиль + REST (`/profile/start`, `/stop`) для Puppeteer/Playwright | S | Высокий |
| Proxy Manager: чекер (IP/geo/пинг), авторотация мобильных прокси по Change-IP URL | M | Высокий |
| Fingerprint Preview при создании профиля (canvas hash, WebGL, связка OS↔UA) | S | Средний |
| Облачная синхронизация профилей (S3/WebDAV, E2E-шифрование) | L | Средний |
| Массовые операции: bulk import кук, назначение тегов/прокси, drag-and-drop по папкам | M | Средний |

## 4. Инженерия / CI

| Задача | Сложность | Эффект |
|---|---|---|
| Pre-flight проверка патча в watcher'е: `git apply --check` против целевой версии ДО бампа (страховка от кейса v1.0.16–20 без релизов) | S | Высокий |
| Антидетект-матрица в CI: headless-прогон свежего движка против CreepJS/BrowserLeaks с порогом trust score | M | Высокий |
| Модуляризация main.js/app.js → TypeScript + bundler | L | Средний |
| ccache/sccache в сборке Chromium (ускорение 3–5×) | S | Средний |

## 🎯 Следующая итерация (приоритет)

1. Аудит Client Hints на сетевом уровне (Sec-CH-UA) → допатчить при необходимости
2. WebGL: спуф полного набора GL-параметров под выбранный GPU-профиль
3. safeStorage для прокси-кредов
4. Automation API (CDP port + REST)
5. Pre-flight patch-check в watcher
