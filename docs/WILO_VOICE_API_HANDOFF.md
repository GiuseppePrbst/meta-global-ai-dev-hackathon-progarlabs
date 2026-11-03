# Wilo: contrato de voz, guía y Atlas para José (03-11-2026)

Este documento es el contrato completo para integrar a Wilo en la app. Reúne en un solo lugar lo que la misión llamaba `WILO_API_CONTRACT` y `WILO_VOICE_INTEGRATION`, sin duplicar contenido. Estado del código:

- **Implementado en la rama `feat/wilo-voice-knowledge-atlas`, en un PR abierto que aún no está en `main`.**
- El esquema OpenAPI exacto se sirve en `GET /openapi.json` y `/docs`.
- WebSocket no aparece en OpenAPI; su protocolo está en este documento.

## Base, autenticación y permisos

| Tema | Contrato |
| --- | --- |
| URL base local | `http://127.0.0.1:8000` (`uv run --project services/api uvicorn bosque_api.main:app`) |
| Autenticación | `Authorization: Bearer <token demo individual>` en `/guide/*` y `/captures/*`. Sin token: `401` |
| Rutas públicas de lectura | `/parks`, `/parks/{id}`, `/parks/{id}/trails`, `/parks/{id}/map`, `/trails/{id}`, `/knowledge/status`, `/knowledge/search`, `/taxa…` |
| Clave Meta | Solo en el backend. La app nunca recibe `MODEL_API_KEY`. El WebSocket hace de proxy |
| Permisos por solicitud | `adult_confirmed=true` siempre. `rights_confirmed=true` si se envía audio. `external_processing_confirmed=true` cuando el backend está en modo Meta, porque el audio y la pregunta se envían a Meta |
| Micrófono | Pedir permiso al usuario solo al pulsar el botón Push-to-Talk. Sin permiso o sin red, ofrecer escribir |
| Modo mock | Con `AI_PROVIDER=mock`, se responde `status: "mock"`, sin transcripción ni contenido botánico. Nunca debe mostrarse como una respuesta real |

## Audio

- WAV RIFF mono, PCM entero de 16 bits a **16 kHz o 24 kHz**.
- Duración mayor que 0 y de hasta **60 s**; tamaño de hasta **3 MiB**; `Content-Type: audio/wav`.
- Otros formatos responden `415`. Si la app graba en AAC o M4A, debe convertir en el dispositivo antes de enviar.
- `language_hint` admite `auto` (predeterminado, sin sesgo), `es`, `en` o `mixed` (español más inglés). Cualquier otro valor responde `422`.
  - Usar `auto` salvo que la app conozca el idioma de la interfaz.
  - En la evaluación real, las keywords importaron mucho más que el sesgo ([WILO_ASR_REAL_EVALUATION.md](WILO_ASR_REAL_EVALUATION.md)).
- El vocabulario (Wilo, parques, sectores, senderos y taxones) lo agrega el backend desde el Atlas. La app no envía keywords.

## Endpoints de Wilo

### `POST /guide/ask` (recomendado)

`multipart/form-data` con **exactamente uno** de `file` (WAV) o `question` (texto, de 1 a 2000 caracteres).

| Campo | Tipo | Obligatorio |
| --- | --- | --- |
| `adult_confirmed` | bool | sí |
| `file` | WAV | uno de los dos |
| `question` | texto | uno de los dos |
| `rights_confirmed` | bool | con audio |
| `external_processing_confirmed` | bool | en modo Meta |
| `language_hint` | `auto` \| `es` \| `en` \| `mixed` | no |
| `session_id` | UUID | no; solo se devuelve, porque el servidor no guarda memoria |
| `capture_id` | UUID | no; contexto de una captura propia |

Respuesta `WiloAnswer`. Este ejemplo es real, de la prueba 34-MIXED del 03-11, con audio real. La transcripción se reemplazó por el texto del guion y se resumieron las fuentes:

```json
{
  "session_id": "5b0c…",
  "transcript": "Hey Wilo, ¿qué senderos hay en Puyehue National Park? Please answer in English.",
  "answer": "Great pick for exploring the southern forest! In Puyehue National Park CONAF names three trails: El Indio, La Princesa and Repucura. I don't have live verification of opening status, distances or conditions, so please check the current CONAF notice before your visit.",
  "speech_text": "Great pick! In Puyehue National Park, CONAF names El Indio, La Princesa and Repucura. Opening status is not verified, so check the current CONAF notice before visiting.",
  "provider": "meta",
  "transcription_model": "muse-voice-transcribe-1.0",
  "answer_model": "muse-spark-1.3",
  "status": "completed",
  "insufficient_evidence": false,
  "knowledge_version": "sha256:…",
  "sources": [
    {"id": "atlas:puyehue-el-indio", "title": "CONAF, ficha del parque", "url": "https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/", "type": "official", "accessed_at": "2026-11-03", "confidence": "official", "review_status": "agent_reviewed_against_source", "scope": "Trail"}
  ],
  "claims": [
    {"text": "CONAF names El Indio as a trail in Puyehue National Park.", "source_ids": ["atlas:puyehue-el-indio"]}
  ],
  "entities": [
    {"type": "park", "id": "puyehue"},
    {"type": "trail", "id": "puyehue-el-indio"},
    {"type": "trail", "id": "puyehue-la-princesa"},
    {"type": "trail", "id": "puyehue-repucura"}
  ],
  "map": {"park_id": "puyehue", "geometry_available": false},
  "tools_used": ["get_park_trails"],
  "latency_ms": {"transcription": 2823, "retrieval": 0.4, "generation": 22595},
  "limitations": ["Respuesta asistida desde el snapshot del Knowledge Atlas; sin verificación en vivo."],
  "language_hint": "auto",
  "prompt_version": "wilo-guide-v3",
  "correlation_id": "…"
}
```

`status` toma tres valores:

- `completed`: hay respuesta con fuentes.
- `insufficient_evidence`: Wilo se abstiene o la evidencia es parcial. Mostrar `answer` y `limitations` igual; no es un error.
- `mock`: modo sin proveedor.

### `POST /guide/transcribe` y `POST /guide/query` (etapas por separado)

Sirven para que el usuario corrija el texto antes de preguntar:

- **`/guide/transcribe`** recibe `file`, `adult_confirmed`, `rights_confirmed`, `external_processing_confirmed` y `language_hint`. Devuelve `Transcription`: `transcript`, `provider`, `model`, `audio_duration_ms`, `latency_ms`, `provider_session_id`, `turns` y `limitations`.
- **`/guide/query`** recibe JSON `{"question", "adult_confirmed", "external_processing_confirmed", "capture_id?"}`. Devuelve `GuideAnswer`, que tiene los mismos campos de respuesta que `WiloAnswer` sin `transcript` ni modelos de voz.

Cada etapa reserva su propio presupuesto (`transcribe` o `guide`).

### `WS /guide/voice/stream` (tiempo real, opcional)

1. El primer frame es texto JSON, dentro de 10 s:

   ```json
   {"type": "start", "token": "<demo>", "adult_confirmed": true, "rights_confirmed": true, "external_processing_confirmed": true, "audio_encoding": "PCM_16KHZ", "language_hint": "auto", "answer": true}
   ```

   El navegador no puede enviar encabezados al abrir un WebSocket, así que el token va en este mensaje.
2. Después, frames binarios PCM16 mono little-endian, a ritmo real: unos 100 ms por frame, de hasta 64 KiB, con un máximo de 60 s.
3. Para terminar, `{"type": "stop"}`; para abortar, `{"type": "cancel"}`.

Eventos del servidor (todos llevan `session_id`):

| Evento | Uso en la UI |
| --- | --- |
| `ready` | `{provider, max_seconds, partial_mode: "replace"}`. Empezar a grabar |
| `speech_start` | Indicador de que se detecta voz |
| `partial` | `{text, replace: true}`. **Reemplaza** el texto parcial anterior; nunca se concatena |
| `final` | `{text, audio_duration_ms, first_partial_ms}`. Es el texto definitivo |
| `answer_started` | Mostrar el estado de carga «Wilo está pensando…» |
| `answer` | `{answer: WiloAnswer}` |
| `cancelled` / `done` | Fin normal |
| `error` | `{code, message}`. El servidor cierra después |

Códigos de error del WebSocket:

| Código | Causa |
| --- | --- |
| `bad_start` | Primer mensaje mal formado |
| `unauthorized` | Token inválido |
| `permissions` | Falta un permiso |
| `bad_audio` | Frame impar, mayor de 64 KiB o pausa de más de 15 s |
| `duration_exceeded` | Más de 60 s de audio |
| `rate_limited` / `unavailable` | Sin presupuesto o proveedor saturado |
| `stt_error` | Falla de la transcripción |

## Errores HTTP

Todos llevan `X-Correlation-ID`. No se reintenta automáticamente si el resultado es incierto.

| Código | Cuándo | Qué hace la app |
| --- | --- | --- |
| 401 | Falta el token o es inválido | Pedir acceso a la demo |
| 413 | Audio de más de 3 MiB | Grabación más corta |
| 415 | No es WAV | Convertir en el dispositivo |
| 422 | Falta audio o pregunta, se enviaron ambos, falta un permiso, WAV inválido o de más de 60 s, o `language_hint` inválido | Mostrar el mensaje y ofrecer texto |
| 429 | Límite de consumo propio o del proveedor (`detail.code`: `stt_error_rate_limited` o `llm_error_rate_limited`, con `Retry-After`) | Reintentar solo cuando el usuario lo pida, después de `Retry-After` |
| 502 | `stt_error`, `tool_error` o `llm_error`, con mensaje sanitizado | Ofrecer el respaldo de texto |
| 503 | Persistencia o ledger no disponibles | «Wilo no está disponible ahora» |

**Tiempos.** La transcripción tarda unos 2–3 s. La respuesta tarda **20–37 s** (medido el 03-11). El backend corta según `META_TIMEOUT_SECONDS`, que debe ser **90**: así quedó en `.env.example` y `compose.yaml`, porque con el valor anterior de 30 se cortarían la mayoría de las respuestas.

## Flujo de UI recomendado (Push-to-Talk)

1. El usuario mantiene o pulsa el micrófono. Pedir permiso la primera vez y mostrar el nivel de audio.
2. Al soltar, convertir a WAV 16 kHz mono y enviar a `POST /guide/transcribe` (o usar el WebSocket).
3. **Mostrar `transcript` en un campo editable de inmediato.** Los errores reales de ASR («Queulat» → «Chiloé», «trails» → «trees») se corrigen aquí.
4. Al confirmar, enviar `POST /guide/query` con el texto, y mostrar «Wilo está pensando…» con opción de cancelar.
5. Mostrar `answer` y, debajo, las fuentes (`title` y dominio). Usar un estilo distinto cuando `type` sea `secondary`.
6. Mostrar `limitations` como nota, sobre todo con `insufficient_evidence`.
7. Abrir fichas y mapas desde `entities`:
   - `park` → `GET /parks/{id}`, y el mapa con `GET /parks/{id}/map`;
   - `trail` → `GET /trails/{id}`;
   - `taxon` → `GET /taxa/{id}`, con `/taxa/{id}/eligibility` para saber si es `demo_ready` o `collectible`.
8. Mapa:
   - Si `map.bbox` existe, encuadrar esa caja.
   - Con `geometry_available: false`, **no dibujar trazados ni ofrecer navegación**; mostrar la ficha y el enlace oficial (`map_resource_url`).
   - `boundary_geometry` siempre es `null` y trae su motivo.
9. **TTS opcional del dispositivo** (Web Speech API o TTS nativo), leyendo `speech_text`, o `answer` si falta. Incluir controles para pausar, silenciar y repetir. Muse Voice Transcribe no genera voz.
10. Respaldo sin voz: el mismo flujo, escribiendo y enviando a `/guide/ask` con `question`.

## Accesibilidad

- Ofrecer siempre la entrada de texto.
- Mostrar la transcripción y la respuesta como texto seleccionable.
- No reproducir audio automáticamente.
- Anunciar los estados de carga con `aria-live`.
- Los botones de micrófono, detener y cancelar necesitan etiquetas.
- Mantener contraste suficiente entre fuentes oficiales y secundarias.

## Atlas: endpoints de lectura

- `GET /parks?region=los-lagos&has_trails=true&q=…`: `items[]` con `id`, `name`, `regions`, `area_ha`, `trail_count`, `has_bbox`, más `total` y `knowledge_version`.
- `GET /parks/{id}`: superficie, provincias, comunas, sectores, `visit_notice`, `access_text`, `conflicts[]`, `linked_taxa`, `live_status: "not_verified"`, `sources` y `limitations`.
- `GET /parks/{id}/trails?sector=&include_secondary=false`: senderos con:
  - `source_status`: `official_reviewed`, `official_named_only` o `secondary_reference`;
  - `opening_status`: `not_verified` o `published_closure`, nunca «abierto»;
  - `geometry_available: false`.
- `GET /trails/{id}` y `GET /parks/{id}/map`, con `bbox` y `map_resources`.
- `GET /knowledge/status`: versión, conteos y `stale`. `GET /knowledge/search?q=&type=&park_id=`.

## Pruebas locales

1. Backend en modo mock, sin claves:

   ```bash
   uv run --project services/api uvicorn bosque_api.main:app --port 8000
   ```

2. Tests del contrato. Usan audio sintético y mocks de Meta, sin red:

   ```bash
   uv run --project services/api --extra dev pytest -c services/api/pyproject.toml services/api/tests/test_wilo.py
   ```

3. Modo Meta real: hace falta `AI_PROVIDER=meta`, `META_ENABLED=true`, `MODEL_API_KEY`, `DATABASE_URL` con las migraciones 001–004, unidades de presupuesto y `DEMO_TOKENS`. Ver [API_INTEGRATION.md](API_INTEGRATION.md).
