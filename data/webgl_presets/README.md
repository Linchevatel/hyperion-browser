# WebGL Presets for Hyperion Browser

Каталог содержит нормализованные WebGL 1.0 и WebGL 2.0 пресеты для встроенного
антидетект-патча Chromium (`patches/drafts/webgl_preset_spoofing_draft.patch`).

## Схема пресета

Схема строго детерминирована и соответствует требованиям Blink C++ загрузчика:

```json
{
  "id": "preset_identifier",
  "webgl1": {
    "parameters": {
      "3379": { "type": "int", "value": 16384 },
      "3386": { "type": "intvec", "value": [32767, 32767] },
      "7938": { "type": "string", "value": "WebGL 1.0 (OpenGL ES 2.0 Chromium)" }
    },
    "extensions": [ "..." ],
    "shader_precision": {
      "35633_36337": { "rangeMin": 127, "rangeMax": 127, "precision": 23 }
    }
  },
  "webgl2": {
    "parameters": { "..." : "аналогично webgl1" },
    "extensions": [ "..." ],
    "shader_precision": { "..." : "аналогично webgl1" }
  }
}
```

### Допустимые типы значений `type`

- `int`: 32-битное знаковое целое (`[-2^31, 2^31 - 1]`).
- `uint`: 32-битное беззнаковое целое (`[0, 2^32 - 1]`), критично для stencil masks (`4294967295`) и `MAX_ELEMENT_INDEX`.
- `float`: 32-битное число с плавающей точкой (скаляры `LINE_WIDTH`, `DEPTH_CLEAR_VALUE`, `POLYGON_OFFSET_*`, `MAX_TEXTURE_LOD_BIAS`).
- `number`: 64-битное число (`double`), используется для 64-битных таймаутов `MAX_SERVER_WAIT_TIMEOUT` и `MAX_CLIENT_WAIT_TIMEOUT_WEBGL`.
- `bool`: логическое значение (`true`/`false`).
- `string`: строка (`VENDOR`, `RENDERER`, `VERSION`, `SHADING_LANGUAGE_VERSION`, `UNMASKED_*`).
- `intvec`: целочисленный вектор (`MAX_VIEWPORT_DIMS`, `VIEWPORT`, `SCISSOR_BOX`).
- `uintvec`: вектор беззнаковых целых (`COMPRESSED_TEXTURE_FORMATS`).
- `floatvec`: вектор чисел с плавающей точкой (`ALIASED_*_RANGE`, `DEPTH_RANGE`, `COLOR_CLEAR_VALUE`, `BLEND_COLOR`).
- `boolvec`: вектор из ровно 4 логических значений (`COLOR_WRITEMASK`).

---

## Пресеты и источники данных

### 1. `nvidia_gtx980_linux.json`
- **Идентификатор:** `nvidia_gtx980_linux`
- **Целевая платформа:** Linux x86_64, Native OpenGL
- **GPU:** NVIDIA GeForce GTX 980
- **Источник:** База фингерпринтов [Camoufox](https://github.com/daijro/camoufox) (дамп `/tmp/webgl-gtx980.json`).
- **Лицензия источника:** Mozilla Public License 2.0 (MPL-2.0).
- **Специфика данных:**
  - Дамп снят в среде Linux Native OpenGL с драйвером NVIDIA.
  - Содержит полные секции для `webgl1` (83 параметра) и `webgl2` (133 параметра).
  - Строки версии и вендора нормализованы под движок Chromium (`WebKit`, `WebKit WebGL`, `WebGL 1.0 (OpenGL ES 2.0 Chromium)`).
  - Включает точные списки поддерживаемых расширений (28 для WebGL1, 14 для WebGL2) и полные матрицы `shader_precision` (12 форматов precision).

### 2. `windows_generic_angle.json`
- **Идентификатор:** `windows_generic_angle`
- **Целевая платформа:** Windows (Win32 / Win64), ANGLE Direct3D11
- **GPU:** Универсальный профиль на базе ANGLE D3D11 (Intel HD Graphics 4000 Direct3D11 vs_5_0 ps_5_0).
- **Источник:** Дамп профиля браузера GoLogin (`/tmp/gologin_win.json`).
- **Лицензия источника:** GoLogin dataset (проприетарный дамп реального профиля Windows Chrome).
- **Специфика данных:**
  - Первичный дамп был снят на контексте WebGL2 (`glCanvas: webgl2`).
  - Секция `webgl1` (29 параметров) сформирована фильтрацией общих лимитов WebGL1 и дополнена эталонными расширениями ANGLE D3D11 (36 расширений) и строками версии Chromium WebGL 1.0.
  - Секция `webgl2` (79 параметров) объединяет параметры из дампа (включая `MAX_3D_TEXTURE_SIZE=2048`, `MAX_ARRAY_TEXTURE_LAYERS=2048`, `MAX_COLOR_ATTACHMENTS=8`, `MAX_UNIFORM_BLOCK_SIZE=65536` и др.) и эталонные дополнения WebGL2 для ANGLE D3D11 (`MAX_ELEMENT_INDEX=4294967295`, `MAX_SERVER_WAIT_TIMEOUT=0.0`, `MAX_CLIENT_WAIT_TIMEOUT_WEBGL=1000000000.0`, `MAX_ELEMENTS_VERTICES=1048576`, буферы чтения/отрисовки).
  - Матрицы `shader_precision` сгенерированы для стандартного desktop IEEE-754 highp профиля (12 комбинаций).

---

## Генерация и валидация

Для конвертации дампов и повторной сборки пресетов используется утилита:

```bash
# Генерация пресетов из исходных дампов
python3 scripts/convert_webgl_presets.py

# Только валидация структуры и типов JSON-файлов
python3 scripts/convert_webgl_presets.py --validate-only
```
