# Handoff para frontend (José): puerta de entrada a los contratos

**La fuente de verdad es el OpenAPI que genera FastAPI.** Hay una copia versionada en [api/openapi.json](api/openapi.json), y en ejecución está en `GET /openapi.json` y en `/docs`.

- Esta página es un índice; no repite los esquemas.
- La copia y los ejemplos se regeneran con `scripts/export_openapi.py`, y la CI falla si dejan de coincidir con el código (`services/api/tests/test_openapi_contract.py`).
- Commit de referencia: el SHA de `main` registrado en [RELEASE_READINESS_2026-11-04.md](RELEASE_READINESS_2026-11-04.md).

## A. Configuración

| Tema | Valor |
| --- | --- |
| URL base local | `http://127.0.0.1:8000`. En la web se configura con `NEXT_PUBLIC_API_URL` en `apps/web/.env.local` |
| Entornos | `SERVICE_MODE=local`: lectura pública y `/guide`/`/captures` con token. `SERVICE_MODE=demo`: casi todo con token. No hay despliegue público |
| Autenticación | `Authorization: Bearer <token>`, con tokens individuales en `DEMO_TOKENS` del backend. Sin token, `401` |
| Rutas públicas | `/health`, `/species*`, `/taxa*`, `/parks*`, `/trails/*`, `/knowledge/*`, `/media/*`, `/forest/sources` y la documentación |
| Headers de respuesta | `X-Correlation-ID` en todas las respuestas; conviene incluirlo en los reportes de error |
| Identidad | El servidor la fija a partir del token. El cliente nunca envía un `user_id` |
| Variables | Públicas: solo `NEXT_PUBLIC_API_URL`. Privadas, solo en el backend: `MODEL_API_KEY`, `DATABASE_URL`, `DEMO_TOKENS` y las unidades de presupuesto |
| CORS | `CORS_ORIGINS`, por defecto `["http://localhost:3000"]` |
| PostgreSQL/PostGIS | Lo necesitan capturas, observaciones, contexto y el ledger, con las migraciones `services/api/sql/001–004`. Atlas, taxones y Wilo en mock funcionan sin base de datos |
| Tiempo de espera | `META_TIMEOUT_SECONDS=90`. Wilo tarda 20–37 s en responder |

## B. Endpoints

El estado de cada uno está en [PROJECT_DELIVERY_STATUS.md](PROJECT_DELIVERY_STATUS.md).

| Familia | Rutas exactas (OpenAPI) | Autenticación | Ejemplo validado |
| --- | --- | --- | --- |
| Salud | `GET /health` | No | — |
| Especies (8 árboles) | `GET /species`, `GET /species/{species_id}` | No | — |
| Taxones | `GET /taxa`, `GET /taxa/{taxon_id}`, `/conservation`, `/eligibility`, `/media` | No | [taxon](api/examples/taxon-guigna.json), [demo_only](api/examples/taxa-demo-only.json), [eligibility](api/examples/eligibility-guigna.json), [conservation](api/examples/conservation-guigna-los-rios.json) |
| Parques | `GET /parks`, `GET /parks/{park_id}`, `/trails`, `/map`, `/biodiversity` | No | [lista](api/examples/parks-los-lagos.json), [Puyehue](api/examples/park-puyehue.json), [senderos](api/examples/trails-puyehue.json), [mapa](api/examples/map-conguillio.json) |
| Senderos | `GET /trails/{trail_id}` | No | [cierre publicado](api/examples/trail-closure.json) |
| Conocimiento | `GET /knowledge/status`, `GET /knowledge/search` | No | [estado](api/examples/knowledge-status.json) |
| Identificación | `POST /identify` (multipart, foto) | Según el modo | — |
| Capturas | `POST /captures/attempts`, `GET /captures/me`, `GET`/`DELETE /captures/{capture_id}`, `DELETE /identifications/{identification_id}` | Sí | `evaluations/expeditions-contract-examples.json` |
| Expediciones | `GET /expeditions`, `GET /expeditions/{expedition_id}` | Según el modo | — |
| Wilo | `POST /guide/transcribe`, `POST /guide/query`, `POST /guide/ask` | Sí | [mock](api/examples/ask-text-mock.json), [respuesta real observada](api/examples/observed/wilo-answer-34-mixed.json), [422](api/examples/error-ask-no-input.json), [401](api/examples/error-unauthorized.json) |
| Wilo en tiempo real | `WS /guide/voice/stream` (no aparece en OpenAPI) | Token en el primer mensaje | [protocolo](WILO_VOICE_API_HANDOFF.md#ws-guidevoicestream-tiempo-real-opcional) |
| Bosque y GIS | `GET /forest/sources`, `POST /forest/analyze`, `POST /forest/analyze/weighted`, `GET /layers`, `POST /context/point`, `POST /context/area` | Según el modo | — |
| Observaciones (legado) | `GET`/`POST /observations`, `DELETE /observations/{observation_id}` | Según el modo | — |

Los archivos `api/examples/*.json` se generan contra la app real en modo mock, y `api/examples/observed/` guarda una respuesta real de Meta ya anonimizada. Los tests validan ambos contra los modelos Pydantic. Ninguna respuesta de éxito es inventada.

## C. Contrato por operación

Para cada operación, el OpenAPI contiene el método, la ruta, la petición, la respuesta, los campos opcionales y nulos, y los códigos HTTP. Lo que el OpenAPI no expresa:

| Operación | Estado real | Límite de tiempo | Dependencias | Limitaciones | Prueba |
| --- | --- | --- | --- | --- | --- |
| `GET /parks*`, `/trails/*`, `/knowledge/*` | `validated` | Menos de 50 ms, sin red | Snapshot | `live_status` y `opening_status` nunca afirman apertura | `test_wilo.py` |
| `GET /taxa*` | `implemented` | Menos de 50 ms | Catálogo | Sin coordenadas | `test_biodiversity*`, `test_wilo.py` |
| `POST /guide/transcribe` | `validated` | 2–3 s | Meta, ledger | WAV de 16/24 kHz mono PCM16, hasta 60 s y 3 MiB | `test_wilo.py`, `test_voice_guide.py` |
| `POST /guide/query` y `/ask` | `validated` | **20–37 s** | Meta, ledger, Atlas | Sin memoria de sesión | `test_wilo.py`, `test_wilo_grounding.py` |
| `WS /guide/voice/stream` | `implemented` | En tiempo real, hasta 60 s | Meta, ledger | Probado solo con upstream simulado | `test_stream_*` |
| `POST /identify` | `validated` | Depende de Meta; no se midió en este incremento | Meta | Solo 8 árboles; puede abstenerse | `test_api.py`, [informe](OPEN_SET_IDENTIFICATION_REPORT.md) |
| `/captures/*` | `validated` (DB) | < 1 s | PostGIS | Identidad de demo | Integración PostGIS |

## D. Modelos de dominio

Los nombres son los de `components.schemas` en el OpenAPI:

| Concepto | Esquema | Notas |
| --- | --- | --- |
| Parque | `ParkOut`, `ParkSummary`, `ParkPage` | `conflicts[]` con `resolution: official_preferred` |
| Sector | Dentro de `ParkOut.sectors` (texto) | El Atlas guarda `ParkSector` como entidad, pero no tiene una ruta propia |
| Sendero | `TrailOut` | Ver la sección F |
| Recurso de mapa | `ParkMap`, `MapResourceOut` | |
| Taxón | `Taxon`, `TaxonSummary`, `TaxonPage` | `TaxonSummary.demo_status` y `collectible` |
| Elegibilidad | `DemoEligibility` | Equivale a «TaxonEligibility» |
| Conservación | `RegionalConservation` | |
| Expedición, captura | `Expedition`, `Capture`, `CaptureAttempt`, `Collection` | |
| Identificación | Respuesta de `POST /identify` | |
| Wilo | `WiloAnswer`, `GuideAnswer`, `Transcription` | |

## E. Voz y streaming

La referencia canónica es [WILO_VOICE_API_HANDOFF.md](WILO_VOICE_API_HANDOFF.md). Cubre el handshake, el audio, los eventos (`partial` con `replace: true` y `final`), el cierre, la cancelación, los errores, la autenticación, los tiempos y la política de reintentos (nunca automáticos ante un resultado incierto).

## F. Mapas: cómo interpretar los campos

| Campo | Significado y acción en la UI |
| --- | --- |
| `bbox` | `[oeste, sur, este, norte]` en EPSG:4326, a partir de BCN. **Solo sirve para encuadrar el mapa**: no es un límite legal ni sirve para decidir si un punto está dentro |
| `boundary_geometry` | Siempre `null`, con `boundary_unavailable_reason`. No dibujar polígonos |
| `geometry` / `geometry_available` | Siempre `null` y `false`. **No dibujar polilíneas ni ofrecer navegación** |
| `map_resources` | `official_profile_page` lleva a la ficha CONAF; `bbox_reference` es el encuadre |
| `source_status: official_reviewed` | Sendero de la ficha CONAF, revisado contra el texto |
| `source_status: official_named_only` | CONAF solo lo nombra, sin métricas |
| `source_status: secondary_reference` | Viene de una guía turística: **marcar «referencia no oficial»** |
| `opening_status: not_verified` | No significa abierto. Mostrar «Consulta el aviso CONAF vigente» |
| `opening_status: published_closure` | Cierre declarado en la ficha (por ejemplo, hasta el 31-12-2026). Mostrarlo como aviso |

## G. Catálogo de la demo

José no mantiene listas manuales: los estados vienen de la API.

| Estado | Significado |
| --- | --- |
| `demo_ready` | Ficha completa, apta para mostrarse como terminada. Se filtra con `/taxa?demo_only=true` |
| `educational_only` | Contenido educativo; no es un objetivo de captura (incluye mamíferos sensibles y *Cyttaria*) |
| `excluded_from_demo` | No mostrar como ficha |
| `collectible` | `demo_ready` y no sensible: puede ser coleccionable |
| `recognition_experimental` | En `Taxon.identification.status`. La identificación por foto no es fiable para este taxón |
| `recognition_restricted` | El reconocimiento está deshabilitado por política (especies sensibles) |

## H. Estados de la UI

| Estado | Cuándo | Qué mostrar |
| --- | --- | --- |
| Loading | Carga de fichas o del Atlas | Esqueleto |
| Recording | Micrófono activo | Nivel de audio, botón Detener y límite de 60 s |
| Transcribing | `POST /guide/transcribe` en curso | «Transcribiendo…» (unos 2–3 s) |
| Transcript review | Llega el texto | **Campo editable** y botones Preguntar o Volver a grabar |
| Thinking | `POST /guide/query` en curso | «Wilo está pensando…» y **Cancelar** (20–37 s) |
| Completed | `status: completed` | Respuesta, fuentes y botones de entidades (ficha o mapa) |
| Insufficient evidence | `status: insufficient_evidence` | La respuesta y `limitations` como nota, sin tono de error |
| Rate limited | `429` | «Wilo está ocupado; reintenta en N s», según `Retry-After`, con un botón manual |
| Unauthorized | `401` | Pedir acceso a la demo |
| Unavailable | `502` / `503` | Ofrecer el respaldo de texto |
| Cancelled | El usuario canceló | Volver a la revisión del texto |

## Verificar desde la app

1. Levantar la API en mock:

   ```bash
   uv run --project services/api uvicorn bosque_api.main:app --port 8000
   ```

   Con `DEMO_TOKENS='{"jose":"<token-local>"}'` en `.env`.
2. Ejecutar el recorrido de consumo, un cliente externo que solo usa la biblioteca estándar:

   ```bash
   WILO_DEMO_TOKEN=<token-local> python scripts/frontend_contract_smoke.py --base-url http://127.0.0.1:8000
   ```

   Resultado del 04-11: 10 de 10 comprobaciones.
3. Generar los tipos TypeScript, sin instalar nada en el repositorio:

   ```bash
   npx openapi-typescript docs/api/openapi.json -o apps/web/lib/api-types.ts
   ```

   No se ejecutó en este incremento y queda a decisión de José.
