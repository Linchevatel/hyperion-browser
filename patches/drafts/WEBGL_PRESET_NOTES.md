# WebGL preset spoofing — дизайн и C++ драфт

## Статус и границы

`webgl_preset_spoofing_draft.patch` применяется **после**
`patches/hyperion_core_fingerprint.patch`, не заменяет его. Это дизайн-драфт,
не готовый production-патч. Компиляция и запуск браузера не выполнялись.

Прочитаны целиком существующий патч и `/tmp/webgl-gtx980.json`. Сигнатуры и
реализация сверены с исходниками `/build/chromium/src` контейнера 105;
`git describe --tags --exact-match HEAD` вернул **154.0.8037.92**.

Проверки без компиляции:

- `git apply --check` на локальной копии пяти затронутых файлов рабочего дерева
  контейнера: успешно;
- `git apply --check` на локальной копии чистых файлов `HEAD`, поверх применённых
  соответствующих hunks `hyperion_core_fingerprint.patch`: успешно.

Эта работа не изменяла контейнер, основной патч или посторонние локальные
файлы проекта. Параллельные изменения вне `patches/drafts/` не затрагивались.

**Блокер production: произвольный файл обычно недоступен renderer sandbox.**
Ленивый синхронный загрузчик в драфте реализован по запросу, но сам по себе не
решает транспорт пресета в sandbox. При отказе чтения spoofing не включится.
Кроме того, чтение может нарушать ограничения blocking I/O renderer-потока в
debug-сборке. Нельзя выдавать этот драфт за гарантированно работающий полный
спуфинг в обычном sandboxed Chromium.

## Архитектура

Затронуты пять файлов:

1. `content/browser/renderer_host/render_process_host_impl.cc`: новый публичный
   флаг добавлен в существующий `kHyperionSwitches`, иначе renderer его не увидит.
2. `third_party/blink/renderer/modules/webgl/webgl_rendering_context_base.cc`:
   cache, JSON → JS conversion, общие параметры, extensions и precision.
3. Соответствующий `.h`: два protected-хелпера.
4. `third_party/blink/renderer/modules/webgl/webgl2_rendering_context_base.cc`:
   обёртка над **собственным** WebGL2 switch.
5. Соответствующий `.h`: native-хелпер WebGL2.

`getParameter()` сначала вызывает прежний switch, перенесённый без изменения
семантики в non-virtual `GetParameterWithoutPreset()`. Затем общий
`ApplyWebGLPresetParameter()` подменяет успешный результат. WebGL2 делегирует
общие pnames в **native-хелпер** базового класса, а не в его public-обёртку;
поэтому подмена выполняется ровно один раз.

Почему не early-return из JSON перед switch:

- существующие проверки `ExtensionEnabled()` должны продолжать выполняться;
- неизвестный enum должен вернуть null и поставить `INVALID_ENUM`;
- lost context и WebGL object bindings нельзя превратить в произвольное число;
- не нужно дублировать и поддерживать огромный validation switch.

Не вызываем `getError()` для определения успеха: это поглотило бы ошибки сайта.
Штатные скалярные/векторные queries здесь не имеют побочных действий, требующих
повторения после подмены. Реальные GPU queries остаются, поэтому это подмена
наблюдаемых результатов, не устранение GPU-вызовов или timing fingerprint.

### JSON и кэш

`HyperionWebGLPresetCache` хранит только `std::optional<base::Value>`.
`static const base::NoDestructor<...>` создаётся один раз на процесс при первом
обращении. Читается абсолютный `GetSwitchValuePath()`; ограничения: 1 MiB,
JSON depth 32, `base::JSON_PARSE_RFC`, dictionary root. Относительный путь,
ошибка чтения или невалидный root выключают пресет до перезапуска renderer.
Изменение файла на диске не вызывает reload.

Для этой ветки реально доступны **`base::DictValue` / `base::ListValue`**;
`JSONReader::Read()` требует явного `options`. Не использованы предположения
о старых `base::Value::Dict` или однопараметрическом `Read()`.

Секции выбираются через проверенный **`IsWebGL2()`**. Нет fallback webgl2 →
webgl1: отсутствующая секция означает native API для данного типа контекста.

OffscreenCanvas может работать в worker. Поэтому кэш не содержит `String`,
`Vector<String>`, Oilpan-объектов или V8 handles. C++ local-static initialization
синхронизирована; после публикации JSON только читается. JS wrappers и typed
arrays создаются заново в isolate вызывающего `ScriptState`.

## Типы `parameters`

Ключи — десятичные строки `base::NumberToString(pname)`; hex-ключи не принимаются.
Оболочка финальной схемы сохраняется: `{ "type": "...", "value": ... }`.
Драфт определяет следующий словарь значений `type`:

| type | Результат | Создание |
|---|---|---|
| `int` | signed int32 → JS Number | `WebGLAny(int)` → `v8::Integer::New` |
| `uint` | unsigned uint32 → JS Number | `WebGLAny(unsigned)` → `NewFromUnsigned` |
| `float` | float32 → JS Number | `WebGLAny(float)` → `v8::Number::New` |
| `number` | double → JS Number, включая большие 64-bit limits | непосредственно `v8::Number::New` |
| `bool` | Boolean | `WebGLAny(bool)` |
| `string` | JS String | `WebGLAny(String::FromUtf8(...))` → `V8String` |
| `intvec` | Int32Array | `DOMInt32Array::Create(Vector<int32_t>)`, `WebGLAny` |
| `uintvec` | Uint32Array | `DOMUint32Array::Create(Vector<uint32_t>)`, `WebGLAny` |
| `floatvec` | Float32Array | `DOMFloat32Array::Create(Vector<float>)`, `WebGLAny` |
| `boolvec` | обычный JS Array<boolean> | `WebGLAny(base::span<const bool>)` |

Эти overloads проверены в `bindings/modules/v8/webgl_any.cc`. Для строк
используется именно штатный `V8String`, а не выдуманный `V8AtomicString` overload.
Проверен `DOMTypedArray::Create(base::span<const ValueType>)`; существующий
Chromium-код уже передаёт в него Blink Vector.

Подмена требует совпадения наблюдаемой категории native JS value: string,
boolean, number либо соответствующего typed array. Для `intvec`/`floatvec`
проверяется длина native-вектора. `boolvec` — ровно четыре компонента штатного
`COLOR_WRITEMASK`; Uint32Array списка compressed formats допускает другую длину.
Каждый вектор ограничен 4096 элементами. Скалярные числа должны быть конечными,
целые — без дробной части и в пределах соответствующего 32-bit типа.

`4294967295` нельзя читать через `GetInt()`; JSONReader может представить его
как double. `uint` проверяет пределы до cast. Для 64-bit limits нужен `number`,
не float32 и не потенциально UB cast double → uint64. JS WebGL здесь возвращает
Number, **не BigInt**; точность сверх 2^53 ограничена самим JS. Драфт проверяет
категорию Number, но не сверяет каждую scalar type метку с нормативным GLenum:
семантически корректный converter пресета остаётся обязательным.

### Null и WebGL objects

Null в reference dump не всегда является сохраняемым значением: это может быть
неподдерживаемый enum или ещё не включённое расширение. Без сохранённого error
state эти ситуации не отличить от unbound object. Поэтому null/object entries
**не подменяются**; даже `type: "null"` деградирует к native. Нельзя изготовить
WebGLBuffer/WebGLTexture/WebGLProgram из JSON. Если приложение меняет binding,
его реальный объект должен сохраниться, а не превратиться в null из дампа.

Отсутствующий parameter, неизвестный type, неверная форма value, несовпадающий
JS тип или диапазон — fallback native для конкретного parameter.

## Extensions: важное уточнение требований

Проверенные сигнатуры:

```cpp
ScriptObject getExtension(ScriptState*, const String&);
std::optional<Vector<String>> getSupportedExtensions();
```

`getExtension()` не возвращает nullptr напрямую: nullptr передаётся как
`WebGLExtension*` в существующий nullable `ToV8Traits`, давая JS null.
Штатный `EnableExtensionIfSupported()` продолжает проверять поддержку,
feature flags, disabled extensions и lost context; объекты не фабрикуются.

Эффективный список: **preset ∩ реально supported-and-allowed registry**,
в порядке пресета, с удалением дублей и native canonical spelling. Для сравнений
используется тот же `DeprecatedEqualIgnoringCase`, что и у native
`ExtensionTracker::MatchesName()`. Валидный пустой список скрывает всё;
отсутствующий, не-list или содержащий неверные элементы список выключает masking.
Имена в самом JSON должны быть непустыми ASCII-строками.

`getExtension(name)` блокируется для имён вне whitelist, в том числе до того,
как объект мог бы включить расширение. Для имён внутри whitelist остаётся
реальная проверка поддержки. Поэтому рекламируемые имена не обещают
несуществующих extension objects.

**«Ровно список из пресета» достижимо только когда весь список поддержан данным
backend.** Это сознательное ограничение драфта, а не скрытая реализация полного
эмулирования чужого GPU. Если product требует побайтно идентичный список,
нужен предварительный compatibility validator и отказ от неподходящего
профиля/backend, либо настоящая реализация недостающих расширений. Включать
unsupported extension через spoofed registry support небезопасно.

Native extension constructors могут внутренне включать зависимости; драфт
маскирует public acquisition, но не блокирует внутренний
`EnableExtensionIfSupported()`. Подменять этот общий метод без анализа
зависимостей нельзя. Возможная видимость зависимых pnames требует отдельных
проверок и согласованного whitelist.

## Shader precision и legacy flags

Проверенная сигнатура:

```cpp
WebGLShaderPrecisionFormat* getShaderPrecisionFormat(GLenum, GLenum);
```

Подмена выполняется **после** native shader/precision enum validation и проверки
lost context. Ключ — `shaderType_precisionType`. Поля должны быть неотрицательными
int32; результат создаётся штатным
`MakeGarbageCollected<WebGLShaderPrecisionFormat>(rangeMin, rangeMax, precision)`.
Частичная/неверная запись деградирует к native query. Проверка физической
правдоподобности троек precision остаётся на генераторе пресета.

Приоритет: **старый fingerprint-webgl-vendor/renderer → JSON → native**.
Старые флаги сохраняют прежнюю область действия: только unmasked pnames,
только после включения `WEBGL_debug_renderer_info`. Они не обходят whitelist.
Обычные `GL_VENDOR`/`GL_RENDERER` можно задавать отдельно через JSON.

## Конвертация референсного дампа

Референс содержит по 147 parameter keys для WebGL1/WebGL2; он не является
готовым preset и автоматически в браузере не импортируется:

- `webGl:parameters` → `webgl1.parameters`, `webGl2:*` → `webgl2.*`;
- `*:supportedExtensions` → `extensions`;
- `*:shaderPrecisionFormats` → `shader_precision`, запятая в ключе → `_`;
- реальные shader enums в дампе: **35633** (vertex), **35632** (fragment).
  **35663** в иллюстративной схеме запроса невалиден и правильно даст native
  `INVALID_ENUM`, даже если такая запись существует в JSON.
- `MAX_VIEWPORT_DIMS`, `VIEWPORT`, `SCISSOR_BOX` → `intvec`;
- aliased ranges, blend/clear colors, depth range → `floatvec`, даже если JSON
  элементы выглядят целыми;
- `COLOR_WRITEMASK` → `boolvec`; compressed formats → `uintvec`;
- stencil masks 4294967295 → `uint`; `MAX_SERVER_WAIT_TIMEOUT` → `number`;
- null values нужно пропускать, не угадывать type по ним.

Определять signed/unsigned/float только по числу из JSON нельзя: GLenum → type
mapping надо взять из WebGL specification и проверенных native switches.
Контекстные атрибуты из дампа этим флагом не изменяются.

## Production transport и открытые вопросы

Рекомендуемый следующий этап: browser читает и валидирует публичный path на
разрешённом blocking sequence **до первого WebGL-вызова**, затем передаёт
bounded immutable bytes renderer через Mojo/shared memory/разрешённый handle.
Renderer может один раз парсить полученный JSON тем же JSONReader. Browser
остаётся единственным участником с доступом к внешнему пути. Не передавать
большой JSON как command-line argument; не вводить `--no-sandbox`.
Нужны протокол readiness и согласованное поведение при ошибке; асинхронное
позднее переключение native → preset уже раскроет смешанный fingerprint.

Процессный cache предполагает один пресет на renderer process. Если несколько
профилей делят процесс, требуется изоляция процессов либо cache на профиль /
ExecutionContext. Обновление пресета между контекстами в одном процессе драфт
не поддерживает. Failed initialization не повторяется; production-диагностику
лучше вести один раз вне page-visible console, без публикации содержимого JSON.

Отдельный experimental WebGL-on-WebGPU backend (`webgl*_webgpu*`) существует
в данной ветке и этим драфтом не покрыт. Перед заявлением «весь WebGL» проверить
выбор backend/feature flags или отдельно подключить тот же preset слой.

## Что проверить при интеграции и компиляции

- GN dependencies и DEPS/checkdeps для новых base/files/json includes; новых
  source files в драфте нет. Сверить clang-format hunks после интеграции.
- Реальную доступность bytes при включённом sandbox; отсутствие blocking DCHECK.
- Linux/Windows/macOS path encoding: применяется `GetSwitchValuePath()`, не ASCII.
- Новые non-virtual protected declarations и WebGL2 fallback, отсутствие
  повторного spoofing; сохранение Blink binding/public virtual signatures.
- Unit tests parser/cache, затем web tests обоих контекстов: scalar categories,
  `instanceof Int32Array/Uint32Array/Float32Array`, `Array.isArray(boolvec)`, свежие
  массивы на каждый вызов, UTF-8 строки, float32 округление, uint32 max, number.
- WebGL2-only limits и собственные GL_VERSION / GLSL strings.
- Error queue: invalid enum, extension pname до enable/после enable, старый
  queued error перед query, lost/restored context. В тестах не поглощать ошибку
  ненамеренным getError при сравнении.
- Extensions: отсутствие в whitelist, mixed case, дубли, пустой/malformed list,
  native unsupported, flags-disabled, repeated getExtension identity,
  зависимости constructors, debug renderer info и legacy precedence.
- Все 12 precision combinations, неверные shader/precision enums, отсутствующие
  поля и секции, invalid JSON, relative/missing/oversized file, depth limit.
- Несколько контекстов, workers/OffscreenCanvas, несколько renderer processes,
  перезапуск и immutable cache; profile isolation.
- Mutable state: bindBuffer, useProgram, viewport, colorMask и др. JSON-значения
  скалярного/векторного state намеренно могут перестать отражать реальные setters.
  Для production желательно spoofить capability whitelist, а не startup state.

## Риски согласованности fingerprint

JSON не увеличивает реальные лимиты GPU и не меняет shader execution, texture
allocation, framebuffer completeness, draw buffers, readPixels и rendered pixels.
Ложные MAX_* выше native могут привести к отказам приложений. Спуфинг precision
не меняет численную точность исполнения шейдеров. Compressed format list должен
соответствовать реально включённым расширениям. Полный антидетект нельзя
обосновать одной подменой этих трёх API: getContextAttributes, остальные queries,
WebGPU, canvas rendering и side channels остаются отдельными поверхностями.

## Transport: final decision (b64 switch)

Решение: `--fingerprint-webgl-preset-b64=<base64url(minified-json)>`; этот раздел заменяет прежние рекомендации file/IPC transport выше.
Флаг наследуется renderer через `kHyperionSwitches`; файлового I/O и обхода sandbox нет.
API Chromium 154: `base::Base64UrlDecode`, `Base64UrlDecodePolicy::IGNORE_PADDING` из `base/base64url.h` (с padding или без).
Вход ограничен 2 MiB, декодированный JSON — 1 MiB; RFC JSON, depth 32 и dictionary root сохранены.
Один профиль Hyperion — отдельный процесс браузера с собственным user-data-dir; immutable per-process cache корректен, reload не предусмотрен.
Обычный JSON 5–15 KB даёт base64 7–20 KB и укладывается в лимиты Linux/Windows; верхние parser-лимиты не гарантируют допустимость такой командной строки ОС.
При ошибке декодирования/JSON или превышении лимитов используется native WebGL; типы, whitelist, precision и WebGL2 не изменены.
