# Estado de entrega del producto

Esta es la fuente consolidada del estado de Bosque Vivo, verificada sobre `main` el 04-11-2026. Cuando la tabla habla de estados, usa los siguientes con estos criterios:

| Estado | Significado |
| --- | --- |
| `implemented` | El código está en `main` y tiene pruebas automáticas, pero no hay una prueba real con el proveedor |
| `validated` | Además, tiene evidencia real del tipo indicado |
| `experimental` | Funciona en investigación, con límites relevantes |
| `mock` | Solo existe la simulación explícita |
| `blocked` | Hay un bloqueo identificado |
| `future` | No está implementado |

La columna «Evidencia» indica el tipo de prueba:

- **S**: simulada, con mock o fixture.
- **DB**: PostgreSQL o PostGIS real.
- **P**: proveedor Meta real.
- **E2E**: recorrido completo, de audio o petición a respuesta.
- **UI**: interfaz.

## Funcionalidades

| Funcionalidad | Qué hace | Estado | PR / origen | Contrato | Tests y evidencia | Limitaciones | Responsable | Demo |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| **Wilo: voz** | Audio WAV en español, inglés o mixto convertido a texto con Muse Voice Transcribe 1.0 | `validated` (S, P) | #33 | `POST /guide/transcribe`, `language_hint` | `test_wilo.py`, `test_voice_guide.py`. 79 grabaciones reales: WER ≈ 0,10, 9/9 nombres científicos ([evaluación](WILO_ASR_REAL_EVALUATION.md)) | Un solo hablante. Errores observados: Queulat → Chiloé y trails → trees | Giuseppe | Sí |
| **Wilo: guía** | Respuestas con fuentes citadas, entidades y mapa, en el idioma de la pregunta | `validated` (S, P, E2E) | #33 | `POST /guide/query`, `POST /guide/ask` | `test_wilo_grounding.py`. 16 de 18 escenarios con audio real correctos en lo semántico ([escenarios](WILO_DEMO_SCENARIOS.md)) | Generación de 20 a 37 s. Las correcciones de 08-ES no se revalidaron en vivo | Giuseppe | Sí |
| **Wilo: tiempo real** | Proxy WebSocket con parciales que reemplazan al texto anterior y un texto final | `implemented` (S) | #33 | `WS /guide/voice/stream` | Protocolo probado con un upstream simulado. El tiempo real directo contra Meta se midió en el evaluador (primera parcial a 1,3 s) | El proxy completo no se ha probado contra Meta | Giuseppe | Opcional |
| **Knowledge Atlas** | Snapshot versionado de parques, senderos, mapas, taxones y documentos | `validated` (S) | #33 | `/knowledge/status`, `/knowledge/search` | `test_snapshot_is_reproducible…`, contrato OpenAPI | Búsqueda por tokens. No es un catálogo exhaustivo | Giuseppe | Sí |
| **Atlas nacional de parques** | 46 parques CONAF con superficie, provincias, sectores, aviso de visita, acceso y conflictos de fuentes | `validated` (S) | #32, #33 | `GET /parks`, `/parks/{id}` | `test_sync_conaf_parks.py`, `test_wilo.py` | Datos de la ficha al 03-11. Sin apertura en vivo | Giuseppe | Sí |
| **Senderos CONAF** | 190 senderos revisados contra la ficha, 3 nombrados y 6 de una guía turística | `validated` (S) | #32 | `/parks/{id}/trails`, `/trails/{id}` | Conteo de etiquetas igual al de senderos en las 46 fichas | Sin geometría. 23 fichas no publican senderos | Giuseppe | Sí |
| **Recursos cartográficos** | Encuadre BCN de 33 parques y enlace a la ficha oficial | `implemented` (S) | #32, #33 | `/parks/{id}/map` | `test_map_returns_bbox…` | Sin límites ni trazados con licencia | Giuseppe | Sí, solo encuadre |
| **Biodiversidad multirreino** | 20 taxones de flora, fauna y hongos con fuentes y fotos con licencia | `implemented` (S) | #25, #29, #33 | `/taxa`, `/taxa/{id}` | `test_biodiversity*`, auditoría ([detalle](WILO_BIODIVERSITY_DEMO_AUDIT.md)) | No hay revisión de especialista | Giuseppe | Sí |
| **Elegibilidad de demo** | 13 `demo_ready`, 5 `educational_only`, 2 `excluded_from_demo`, y `collectible` | `implemented` (S) | #33 | `/taxa?demo_only=true`, `/taxa/{id}/eligibility` | `test_demo_layer…`, `test_incomplete_profile…` | Las decisiones son del agente | Giuseppe | Sí |
| **Conservación regional** | Categoría RCE por región, nunca una única nacional falsa | `validated` (S, P, E2E) | #25 | `/taxa/{id}/conservation` | Escenario 25-ES con audio real | Fichas MMA de 2019 como contexto | Giuseppe | Sí |
| **Identificación de conjunto abierto** | Muse Spark verifica entre las ocho especies arbóreas, o se abstiene | `validated` (P) | #22 | `POST /identify` | 56 casos congelados: los negativos aceptados bajaron de 25/37 a 3/37 ([informe](OPEN_SET_IDENTIFICATION_REPORT.md)) | Etiquetas débiles. Fauna y hongos no habilitados | Giuseppe | Sí, con advertencias |
| **Evaluación Muse Spark multirreino** | Pruebas con flora, fauna y hongos | `experimental` (P) | #25 | — | [MULTIKINGDOM_AI_EVALUATION.md](MULTIKINGDOM_AI_EVALUATION.md) | No separa especies de *Cyttaria* | Giuseppe | No |
| **SAM 3.1: imágenes** | Segmentación por concepto, caja o punto | `experimental` (P) | #19–#21, #28, #31 | Laboratorio `tools/meta_sam_api_lab` | IoU mediano 0,79–0,83 frente a referencias del agente, no de especialista ([informe](SAM31_EXTENDED_RESEARCH_REPORT.md)) | No identifica la especie | Giuseppe | Video y capturas privadas |
| **SAM 3.1: video y tracking** | Seguimiento con correcciones | `experimental` (P) | #28, #31 | Laboratorio | Queltehue: 9/9 frames con IoU 0,89 frente a referencias propias | Pocos videos y referencias del agente | Giuseppe | Privado |
| **Historial del laboratorio** | 466 resultados históricos contabilizados por la infraestructura de workers | `experimental` | PR #30 (fuera de `main`) | — | Descripción del PR #30 | Sin integrar | Codex / Giuseppe | No |
| **Workers de investigación** | Colas, leases, reconciliación y autorización financiera | `blocked` | PR #30 (borrador) | — | 297 pruebas del PR. Faltan pruebas integrales de reintentos, SSE, descarga y cleanup | El propio PR dice «No fusionar» | Codex | No |
| **Contexto forestal** | Composición de polígonos de catastro alrededor de un punto | `validated` (DB) | #16, #18 | `/context/point`, `/context/area`, `/layers` | PostGIS en CI ([informe](FOREST_CONTEXT_REPORT.md)) | Composición del polígono, no la especie del individuo | Giuseppe | Sí |
| **CHMv2** | Estadísticas de altura de dosel en una ventana | `experimental` | #13, #16 | `/forest/sources`, `/forest/analyze*` | Ventana real pequeña | Requiere raster local. No mide crecimiento | Giuseppe | No |
| **Capturas y colección** | Capturas privadas, idempotencia, retención y borrado | `validated` (DB) | #18, #26 | `/captures/*`, `/identifications/{id}` | 12/12 pruebas PostGIS de integración | Identidad de demo, sin login real | Giuseppe / José | Sí |
| **Expediciones** | Expedición de referencia a Puyehue | `implemented` (S) | #18 | `/expeditions`, `/expeditions/{id}` | `test_expeditions.py` | Una sola expedición | Giuseppe | Sí |
| **Frontend web** | Inicio, identificar, especies, atlas y proyecto (Next.js) | `implemented` (UI) | #23, #27 | Consume `/species`, `/identify`, `/forest/sources` | CI web: lint, typecheck, Vitest, build y Playwright | Aún no consume `/parks`, `/taxa` ni Wilo | José | Sí |
| **Frontend móvil** | Atlas, identificar, observaciones y especies (Expo) | `implemented` (UI) con datos locales | #14 | Datos locales; la API está por conectar | Lint y typecheck del workspace | No llama a la API | José | Opcional |
| **Interfaz de Wilo** | Micrófono, transcripción editable, respuesta, fuentes y mapa | `future` | — | [WILO_VOICE_API_HANDOFF.md](WILO_VOICE_API_HANDOFF.md) | — | Pendiente de José | José | Por backend o API |
| **Despliegue** | Docker Compose local y CI | `implemented` | #12, #15 | `compose.yaml` | CI compila los contenedores | **No hay despliegue público** | Giuseppe | Local |

## Integraciones comprobadas en el mismo código

Estas pruebas se ejecutaron sobre `main` después de integrar #32 y #33. Los resultados por commit están en [RELEASE_READINESS_2026-11-04.md](RELEASE_READINESS_2026-11-04.md).

- **Contrato.** `docs/api/openapi.json` y los ejemplos se regeneran y comparan en CI (`test_openapi_contract.py`).
- **Consumo externo.** `scripts/frontend_contract_smoke.py` usa solo la biblioteca estándar y no importa el backend. Recorre parques, Puyehue, senderos, mapa, taxón, elegibilidad, Wilo en mock y la respuesta 401.
- **Audio real de punta a punta.** Audio → Voice → Spark → herramientas → Atlas → `WiloAnswer`, con 18 casos ejecutados el 03-11.
