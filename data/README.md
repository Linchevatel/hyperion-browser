# Hyperion Hardware Kits & Fonts Data

Этот каталог содержит нормализованные и коррелированные наборы данных для генератора отпечатков антидетект-браузера **Hyperion**.

---

## 1. Структура каталога

```
data/
├── hardware_kits/
│   ├── windows.json   # 10 hardware kits для Windows
│   ├── macos.json     # 5 hardware kits для macOS
│   └── linux.json     # 6 hardware kits для Linux
├── fonts/
│   ├── win10.json     # Предустановленные шрифты Windows 10 (без Segoe UI Variable)
│   ├── win11.json     # Предустановленные шрифты Windows 11 (+ Segoe UI Variable family)
│   ├── macos.json     # Предустановленные шрифты macOS (SF, Helvetica Neue, Menlo, Monaco...)
│   └── linux.json     # Предустановленные шрифты Linux (DejaVu, Liberation, Ubuntu, Noto...)
└── README.md
```

---

## 2. Hardware Kits (`data/hardware_kits/*.json`)

### Цель и концепция
В стандартных генераторах отпечатков GPU, разрешение экрана, ядра CPU и объем RAM часто выбираются независимо, порождая аномальные и невозможные для антифрод-систем комбинации (например, `RTX 4090 + 1366x768 + 4 cores` или `Apple M1 + Direct3D11`).

Hardware Kit задает **правдоподобную коррелированную аппаратную платформу**:
1. Класс GPU определяет допустимые диапазоны ядер CPU (`hardwareConcurrency`) и оперативной памяти (`ram_gb`).
2. `deviceMemory` рассчитывается по спецификации W3C как ближайшая степень двойки (максимум 8): `0.25, 0.5, 1, 2, 4, 8` на основе `min(ram_gb)`.
3. Разрешения экранов (`displays`) сгруппированы по конкретному WebGL renderer на основе реальных отпечатков. Каждый экран сохраняет реальный `availHeight` (с учетом высоты системного таскбара / дока) и относительный вес популярности (`weight`).
4. Синтез речи (`speechVoices`): списки голосов для ОС из пресетов Camoufox (и типовые дефолтные наборы при их отсутствии).
5. User-Agent Firefox из Camoufox намеренно **не переносится** — Hyperion генерирует актуальные Chromium UA отдельно.

### Схема Hardware Kit
```json
{
  "id": "win_desktop_nvidia_gtx980_1080p",
  "os": "windows",
  "category": "desktop",
  "weight": 25.0,
  "navigator": {
    "platform": "Win32",
    "hardwareConcurrency": [6, 12],
    "maxTouchPoints": 0
  },
  "ram_gb": [16, 32],
  "deviceMemory": 8,
  "webgl": {
    "vendor": "Google Inc. (NVIDIA)",
    "renderer": "ANGLE (NVIDIA, NVIDIA GeForce GTX 980 Direct3D11 vs_5_0 ps_5_0)"
  },
  "displays": [
    {
      "width": 1920,
      "height": 1080,
      "availWidth": 1920,
      "availHeight": 1032,
      "devicePixelRatio": 1,
      "colorDepth": 24,
      "weight": 6.7
    }
  ],
  "speechVoices": [
    "Microsoft David - English (United States):en-US:local",
    "Microsoft Mark - English (United States):en-US:local",
    "Microsoft Zira - English (United States):en-US:local",
    "Microsoft David Desktop - English (United States):en-US:local",
    "Microsoft Zira Desktop - English (United States):en-US:local"
  ]
}
```

---

## 3. Шрифты (`data/fonts/*.json`)

Формат каждого файла: `{"fonts": ["Font 1", "Font 2", ...]}`.

| Файл | Кол-во шрифтов | Описание и маркерные особенности |
| :--- | :---: | :--- |
| `win10.json` | 164 | База GoLogin + стандартный набор Windows 10. **Строго исключены** шрифты семейства `Segoe UI Variable`. |
| `win11.json` | 169 | База Windows 10 + эксклюзивные шрифты Windows 11 (`Segoe UI Variable`, `Segoe UI Variable Display`, `Segoe UI Variable Small`, `Segoe UI Variable Text`, `Segoe Fluent Icons`). |
| `macos.json` | 107 | Системные шрифты Apple (San Francisco, SF Pro / Compact / Mono, Helvetica Neue, Menlo, Monaco, Geneva, Lucida Grande, PingFang и др.). |
| `linux.json` | 62 | Стандартный стек дистрибутивов Ubuntu, Debian, Fedora (DejaVu Sans/Serif/Mono, Liberation Sans/Serif/Mono, Ubuntu, FreeFont, Noto Sans/Serif/Mono и др.). |

---

## 4. Источники данных и лицензии

1. **Camoufox fingerprint-presets** (`/tmp/camoufox-presets.json`):
   - Лицензия: **Mozilla Public License 2.0 (MPL-2.0)**
   - Репозиторий: [https://github.com/daijro/camoufox](https://github.com/daijro/camoufox)
   - Использовано: 285 пресетов (Windows: 168, macOS: 58, Linux: 59).
2. **GoLogin Dump Sample** (`/tmp/gologin_win.json`):
   - Использован как эталон структуры системных шрифтов Windows (`Gologin.fonts.families`).
3. **Steam Hardware Survey & StatCounter Global Stats**:
   - Калибровка весов популярности GPU и экранов (интегрированная графика Intel ~30%, дискретная NVIDIA mid-range ~25%, Apple Silicon доминирует на macOS ~70%).

---

## 5. Инструкция по регенерации Hardware Kits

Конвертер реализован на Python 3 (`scripts/convert_camoufox_kits.py`), детерминирован и идемпотентен.

```bash
# Базовый запуск (использует /tmp/camoufox-presets.json и пишет в data/hardware_kits/):
python3 scripts/convert_camoufox_kits.py /tmp/camoufox-presets.json

# Либо с явным указанием путей через флаги:
python3 scripts/convert_camoufox_kits.py --input /tmp/camoufox-presets.json --output-dir data/hardware_kits

# Валидация сгенерированных JSON-файлов:
python3 -m json.tool data/hardware_kits/windows.json > /dev/null && echo "OK"
python3 -m json.tool data/hardware_kits/macos.json > /dev/null && echo "OK"
python3 -m json.tool data/hardware_kits/linux.json > /dev/null && echo "OK"
```
