# Guía botánico Push-to-Talk

## Estado vigente (04-11-2026)

El contrato canónico de voz es **[WILO_VOICE_API_HANDOFF.md](WILO_VOICE_API_HANDOFF.md)**, y la evaluación real está en [WILO_ASR_REAL_EVALUATION.md](WILO_ASR_REAL_EVALUATION.md). Las secciones siguientes describen la versión del 29-10, que quedó superada en varios puntos:

| Aspecto | Versión del 29-10 | Vigente |
| --- | --- | --- |
| `languageBias` | `["spanish"]` siempre | `language_hint`: `auto` (sin sesgo), `es`, `en` o `mixed` |
| Keywords | Lista fija de 10 | Hasta 100, generadas desde el Atlas, de 30 caracteres o menos |
| Guía | Un turno, 1200 tokens | `wilo-guide-v3`: afirmaciones citadas, control de cifras, segunda ronda tras una búsqueda y 4096 tokens en el turno final |
| Plazo | 30 s | `META_TIMEOUT_SECONDS=90` |
| Tiempo real | No existía | `WS /guide/voice/stream`, probado con upstream simulado |

---

> **Registro histórico.** Lo que sigue documenta decisiones y estados anteriores, en orden cronológico. Si contradice el bloque «Estado vigente», manda el bloque.

Implementación backend del 29-10-2026, sin cambios de interfaz. STT y guía son operaciones
independientes: grabar → transcribir → revisar texto → consultar. No hay sesión persistente,
WebSocket, TTS del servidor ni historial almacenado. José puede narrar `answer` con TTS del
dispositivo y debe conservar texto/subtítulos como alternativa accesible.

## Proveedor y límites

Se amplía `MetaResponsesClient`, sin SDK ni segundo cliente Meta. `MetaVoiceAdapter` usa
`muse-voice-transcribe-1.0`, multipart `request` JSON y `audio` WAV en
`https://api.meta.ai/v1/asr/transcribe`. Parámetros: `PUSH_TO_TALK`, `audioEncoding: WAV`,
`languageBias: ["spanish"]` y keywords del piloto. Sesgo de vocabulario no garantiza exactitud.
No usa modo Contributor. Standard se configura en la cuenta/clave; el código no puede
certificar esa configuración ni el saldo de créditos.

La API admite WAV RIFF mono PCM entero de 16 bits a 16/24 kHz, máximo 60 s y 3 MiB.
Valida duración desde frames, codec, contenido truncado y tamaño; reconstruye WAV para
quitar metadata. No admite MP3, M4A, Opus o WebM: convertir en el cliente antes de subir.
El límite local es más estricto que el publicado por Meta. No se crea archivo propio;
UploadFile puede usar spool temporal del framework, cerrado al terminar la petición.
Ni audio ni transcripción se guardan en la base ni se incluyen en logs/ledger.

## Guía y herramientas

Muse Spark 1.3 usa Chat Completions con `tools` reales, argumentos JSON y mensajes
`assistant.tool_calls` → `tool` con `tool_call_id`. Un turno de planificación, como máximo
cuatro llamadas y un turno final estructurado, 1200 tokens de salida por generación.
La pregunta está limitada a 2000 caracteres; no acepta historial del cliente.
Plazo total `META_TIMEOUT_SECONDS` (30 s por defecto, máximo 120 s), sin reintentos.

Herramientas implementadas: perfil, comparación y rasgos del catálogo; expedición Puyehue;
conteos propios; contexto forestal de una captura propia seleccionada por `capture_id` en
la petición. El modelo utiliza `area_id: current_capture`; no recibe su UUID ni coordenadas.
La consulta espacial ocurre en backend y solo envía composición predominante, cobertura,
limitaciones y referencias. No envía geometría ni atributos crudos.

`get_verified_trail_information` y `get_public_species_observations` devuelven `unavailable`
sin referencias: no existe un repositorio revisado de rutas u observaciones públicas.
`get_user_capture_progress` no acepta `user_id`: el propietario viene de la credencial.
SQL arbitrario, funciones desconocidas, escrituras, argumentos extra y recursos ajenos se
rechazan. Pydantic valida cada herramienta; los campos del catálogo no son instrucciones.

Sin fuentes consultadas se devuelve abstención fija sin segunda generación. La salida final
incluye únicamente referencias consultadas y seleccionadas por su ID; citas inexistentes
producen error. Esta comprobación de referencias no demuestra que cada frase del modelo
sea correcta: revisión científica y evaluación adversarial siguen pendientes.
Rasgos `source_checked` son resúmenes de referencia, no rasgos observados en una captura.

## Autorización y consumo

Ambas rutas exigen credencial individual incluso en modo local y mayoría de edad.
STT requiere derechos del audio. Meta exige además `external_processing_confirmed: true`,
`META_ENABLED`, clave backend, DB/migración 004 y reservas positivas:
`VOICE_RESERVATION_UNITS` o `GUIDE_RESERVATION_UNITS`, además de `BUDGET_UNITS`.
La reserva compartida precede decodificación STT o llamadas LLM; no se devuelve al fallar.
El límite del guía debe cubrir ambas generaciones y su contexto, no solo una llamada.
La duración local reportada en STT es uso estimado de entrada, no factura del proveedor.
Ledger conserva unidades, tokens cuando son reportados, modelo, latencia y correlation ID.

Mock: STT devuelve texto vacío explícito; guía se abstiene sin invocar herramientas ni Meta.
Las pruebas españolas usan respuestas de transporte simuladas. No se ha medido WER,
reconocimiento de nombres botánicos ni calidad de respuestas reales en esta misión.

Fuentes oficiales consultadas 29-10-2026: [STT](https://dev.meta.ai/docs/speech-to-text),
[voz](https://dev.meta.ai/docs/cookbook/voice-api-fundamentals),
[tool calling](https://dev.meta.ai/docs/cookbook/tool-function-calling).
Contratos y ejemplos en [API_INTEGRATION](API_INTEGRATION.md).

## Actualización 03-11-2026 (Wilo)

Lo anterior describe la versión del 29-10. Cambios vigentes:

- `languageBias` se envía solo cuando se pide con `language_hint` (`es` → `["Spanish"]`, `en` → `["English"]`, `mixed` → ambos). Por defecto (`auto`) no se envía.
- Las keywords ya no son una lista fija: `voice_keywords()` genera hasta 100 desde el Atlas, cada una de 30 caracteres o menos.
- La API real rechaza keywords de más de 30 caracteres y listas de más de 500 términos.
- El guía usa `wilo-guide-v3`:
  - responde en el idioma de la pregunta;
  - afirmaciones citadas y control de cifras;
  - una segunda ronda de herramientas solo después de una búsqueda;
  - 4096 tokens en el turno final.
- Se agregaron `POST /guide/ask` y un proxy WebSocket de tiempo real. TTS sigue en el dispositivo.
- El plazo recomendado es `META_TIMEOUT_SECONDS=90`.

Contrato: [WILO_VOICE_API_HANDOFF.md](WILO_VOICE_API_HANDOFF.md).
