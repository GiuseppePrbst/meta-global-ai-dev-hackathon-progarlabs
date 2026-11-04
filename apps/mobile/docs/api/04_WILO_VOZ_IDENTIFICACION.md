# Wilo, voz, identificación y Atlas — contrato de integración

API base: `https://api-bosquevivo.progarlabs.com`. Las rutas de IA requieren una sesión BVS con los scopes correspondientes. La inferencia Meta continúa apagada en producción al corte de este documento; errores 503/501 son esperables hasta su habilitación autorizada.

## 1. Wilo por texto

`POST /guide/query` con `Authorization: Bearer bvs_...` y JSON:

```json
{
  "question": "¿Qué senderos hay en el Parque Nacional Puyehue?",
  "adult_confirmed": true,
  "external_processing_confirmed": true,
  "capture_id": null
}
```

El `question` admite 1–2000 caracteres. La respuesta `GuideAnswer` contiene `answer`, `provider`, `execution_status`, `insufficient_evidence`, `sources[]`, `claims[]`, `entities[]`, `map`, `limitations[]`, `speech_text`, `model`, `knowledge_version` y `correlation_id` entre otros.

- Mostrar fuentes y advertencias, no solo el texto de la respuesta.
- `insufficient_evidence=true` no es un fallo del servidor: Wilo reconoce límites de evidencia.
- La apertura de senderos **no** se deduce del Atlas; siempre usar avisos oficiales vigentes.
- Dar opción de cancelar la operación de cliente; evitar reintentos automáticos de POST que puedan reservar presupuesto adicional.

## 2. Wilo por voz (dos etapas recomendado para la UX)

**Transcribir:** `POST /guide/transcribe`, `multipart/form-data` con:

- `file`: archivo WAV RIFF, PCM16 mono 16 kHz o 24 kHz; máximo 60 s y 3 MiB.
- `adult_confirmed=true`
- `rights_confirmed=true`
- `external_processing_confirmed=true` si se utiliza Meta.
- `language_hint`: `auto`, `es`, `en` o `mixed`.

Respuesta `Transcription`: `transcript`, `provider`, `execution_status`, `audio_duration_ms`, `latency_ms`, `model`, `limitations`, etc.

**Revisar:** mostrar transcripción editable para que la persona corrija topónimos y nombres de especies.

**Preguntar:** enviar la transcripción revisada a `/guide/query`.

Alternativa: `POST /guide/ask` con `multipart/form-data`, **exactamente uno** entre `file` y `question`, más consentimientos. Devuelve `WiloAnswer` (incluye `transcript`, `answer`, `speech_text`, `status`, `sources`, etc.).

**TTS:** Muse Voice de este proyecto es transcripción. Si se desea leer la respuesta, usar TTS del dispositivo con controles de reproducir/pausar y sin activación automática.

## 3. WebSocket para voz en tiempo real (opcional)

URL: `wss://api-bosquevivo.progarlabs.com/guide/voice/stream`.

El navegador no admite un header Authorization arbitrario en la conexión WebSocket. Por eso el **primer mensaje JSON** envía el token BVS:

```json
{
  "type": "start",
  "token": "bvs_TOKEN_DE_SESION",
  "adult_confirmed": true,
  "rights_confirmed": true,
  "external_processing_confirmed": true,
  "audio_encoding": "PCM_16KHZ",
  "language_hint": "auto",
  "answer": true
}
```

Después, enviar frames binarios PCM16 mono little-endian a tiempo real (aprox. 100 ms, hasta 64 KiB/frame), finalizar con `{"type":"stop"}` o abortar con `{"type":"cancel"}`.

Eventos típicos: `ready`, `speech_start`, `partial` (si `replace: true`, **reemplazar** el parcial anterior), `final`, `answer_started`, `answer`, `cancelled`, `done`, `error`.

Errores como `unauthorized`, `forbidden`, `rate_limited`, `unavailable`, `bad_audio`, `stt_error` deben mostrarse sin reinterpretarlos como transcripciones exitosas.

Usar el contrato completo `docs/WILO_VOICE_API_HANDOFF.md` de GitHub: contiene orden de eventos y detalles no expresados por OpenAPI.

## 4. Identificación fotográfica

`POST /identify`, `multipart/form-data`, con:

- `file`: JPEG, PNG o WebP, máximo 10 MiB.
- `adult_confirmed=true`
- `rights_confirmed=true`
- `additional_files`: 0–2 fotos adicionales del **mismo ejemplar**.
- `views` opcionales: `whole_tree`, `leaf`, `bark`, `flower`, `fruit`, `unspecified`; una por foto.
- `use_segmentation` opcional; **no** asumir que SAM está habilitado.
- Máximo global de 20 MiB entre todas las imágenes.

Resultado `Identification`:

- `status`: `candidates | insufficient_evidence`.
- `acceptance`: `accepted | not_accepted | not_applicable`.
- `catalog_assessment`: `supported_candidate | insufficient_evidence | out_of_catalog_suspected | non_diagnostic_photo | not_assessed`.
- `candidates[]`, `accepted_species_id`, `missing_traits[]`, `observed_traits[]`, `limitations[]`, `recommended_next_photo`, `evidence_status`, `sources[]` y `identification_id` opcional.

**Regla de UI:** «candidata apoyada» no significa «identificación verificada». El clasificador tiene **ocho árboles** y en pruebas reales confundió olivillo con ulmo. Permitir abstención, mostrar evidencia contradictoria y pedir otra foto si corresponde. No mostrar probabilidades inventadas.

Los errores de validación pueden ser `413`, `415`, `422`; error de proveedor `502`; IA deshabilitada `501`; cuota `429`.

## 5. Mapas y contenido territorial

- `GET /parks?region=los-lagos&has_trails=true` devuelve página con `items[]`, `total` y `knowledge_version`.
- Las fichas de parques y senderos contienen procedencia (`sources`), estados y limitaciones.
- `opening_status=not_verified` **no** significa abierto; `published_closure` debe mostrarse como aviso.
- `bbox` es una caja de encuadre EPSG:4326, no un límite legal.
- Si `geometry_available=false`, no dibujar polilíneas ni ofrecer navegación por esa geometría.
- No inferir `no_coverage` GIS como ausencia de bosque; significa que la capa requerida no está configurada/disponible.

## 6. UX y accesibilidad

- Permiso de micrófono solamente al activar el control.
- Respaldo de entrada por texto siempre disponible.
- Mostrar visualmente grabación, transcripción, espera, error, cancelación y respuesta.
- Mostrar fuentes oficiales de manera diferenciada de secundarias.
- No leer automáticamente en voz alta.
- Habilitar cancelación y mostrar `Retry-After` cuando se reciba 429.
