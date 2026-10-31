# Integración API GIS/ML para José

Estado más reciente: [conjunto abierto, `verify` por defecto](#identificación-de-conjunto-abierto--contrato-para-josé-30-10-2026). Qué consumir hoy y qué depende de backend posterior: [propuesta futura, 31-10-2026](#propuesta-futura--gemelo-digital-y-catálogo-multirreino-31-10-2026).

Fuente de verdad: `/openapi.json` y `/docs` del proceso FastAPI. Evolución aditiva, sin
migración destructiva ni cambios visuales. API local en loopback; no desplegar observaciones
privadas ni token compartido sin autenticación por usuario, visibilidad, retención y límites globales.

| Método / ruta | Entrada / resultado |
| --- | --- |
| GET `/species` | Array de ocho Species; conserva IDs, nombres, common_name, taxonomic_status y provenance |
| GET `/species/{species_id}` | Species o 404 |
| POST `/identify` | Multipart file, adult_confirmed, rights_confirmed; Identification o error explícito |
| GET `/observations` | limit 1–100; lista persistida, 503 sin PostGIS |
| POST `/observations` | species_id opcional, notes, location Point opcional; 201 o error |
| GET `/forest/sources` | Lista; `ready` solo con manifiesto/raster revisado y extra instalado |
| POST `/forest/analyze` | source_id chmv2, area Polygon WGS84; CanopyStatistics o 501/503/422 |

Species conserva estado histórico provisional. Nuevos `taxonomy.status: ACCEPTED` y
`verification_status: source_checked` significan contraste con GBIF; no validan los rasgos
ni presencia local. Conservación es nula; natividad y morfología siguen pendientes.

Ejemplo de los campos taxonómicos nuevos (extracto, no reemplaza Species):

```json
{"id":"nothofagus-dombeyi","accepted_name":"Nothofagus dombeyi","family":"Nothofagaceae","genus":"Nothofagus","native_status":"pending","morphology":[],"conservation_status":null}
```

Identificación exitosa **de contrato**, no un resultado científico observado:

```json
{"status":"candidates","provider":"meta","model":"muse-spark-1.3","candidates":[{"species_id":"nothofagus-dombeyi","evidence":"Ejemplo sintético de contrato; no evidencia botánica"}],"message":"Requiere revisión humana","limitations":["Ejemplo de integración"],"execution_status":"completed","latency_ms":1,"segmentation_status":"disabled","stage_latency_ms":{}}
```

Abstención mock (continúa funcionando sin clave):

```json
{"status":"insufficient_evidence","provider":"mock","model":null,"candidates":[],"message":"Modo demostración: imagen recibida sin inferencia. No hay evidencia de IA para proponer una especie.","limitations":[],"latency_ms":null,"execution_status":"mock","segmentation_status":"disabled","stage_latency_ms":{}}
```

Una abstención real mantiene `provider: meta`, modelo y `execution_status: completed`.
La prueba real quedó en [la evidencia](../evaluations/meta-access-2026-10-27.json).
Un error Meta nunca produce Identification ni una abstención ficticia.

| HTTP / caso | Ejemplo JSON |
| --- | --- |
| 422 imagen ilegible | `{"detail":"Imagen inválida o demasiado grande para decodificar"}` |
| 415 MIME no admitido | `{"detail":"Formato no admitido: utiliza JPEG, PNG o WebP"}` |
| 413 archivo grande | `{"detail":"La imagen supera el límite de 10 MiB"}` |
| 503 Meta sin clave | `{"detail":"Meta no configurado: falta MODEL_API_KEY"}` |
| 501 Meta deshabilitado | `{"detail":"Meta deshabilitado: requiere habilitación y controles de acceso"}` |
| 401 sin token | `{"detail":"Se requiere autorización para usar Meta"}` |
| 429 consumo | `{"detail":"Límite de consumo Meta; intenta más tarde"}` |
| 502 proveedor | `{"detail":"Proveedor Meta no disponible o respuesta inválida"}` |
| 503 DB sin configurar | `{"detail":"Persistencia no configurada: requiere PostgreSQL/PostGIS"}` |
| 503 DB inaccesible | `{"detail":"PostgreSQL/PostGIS no disponible"}` |
| 501 raster sin configurar | `{"detail":"CHMv2 no configurado: falta seleccionar y validar una fuente COG permitida."}` |
| 503 raster inválido | `{"detail":"Raster o manifiesto no disponible o no validado"}` |
| 422 fuera de cobertura | `{"detail":"Polígono sin intersección raster"}` |
| 422 solo nodata | `{"detail":"No hay píxeles válidos en el polígono"}` |

Validaciones Pydantic estructurales usan el array estándar `detail` de FastAPI.

Observación sin identificación, ubicación omitida por privacidad:

```json
{"species_id":null,"notes":"Pendiente de revisión"}
```

La respuesta 201 añade UUID, created_at y verification_status unverified. Punto opcional:
`{"type":"Point","coordinates":[0,0]}` es solo ejemplo sintético, nunca observación real.

Solicitud forestal sintética de contrato:

```json
{"source_id":"chmv2","area":{"type":"Polygon","coordinates":[[[0,0],[0.0001,0],[0.0001,0.0001],[0,0.0001],[0,0]]]}}
```

Para la ventana real usar `area` del [registro público](../data/public/chmv2-window-2026-10-27.json).
Ejemplo observado de respuesta 200 (campos principales):

```json
{"source_id":"chmv2","source_version":"v2-ml3; source.coop 2026-06","valid_pixels":4096,"min_height_m":4,"mean_height_m":12.476806640625,"max_height_m":25,"estimated":true,"queried_area_m2":3356.4063605070114,"coverage_area_m2":3356.4063605070114,"unit":"m","source_crs":"EPSG:3857","period":"Collection 2005-03-15/2020-08-31; tile acquisition not verified","limitations":["Altura estimada; adquisición del tile pendiente"]}
```

Configuración real local: AI_PROVIDER=meta, META_ENABLED=true, MODEL_API_KEY y
META_ACCESS_TOKEN solo en backend; META_MODEL configurable. El cliente autorizado
envía `Authorization: Bearer ...`; no incluir token ni clave en NEXT_PUBLIC_. SAM_ENABLED
es false por defecto; al activarlo añade una solicitud por imagen. Límite por proceso:
una identificación por 60 s; con SAM pueden ser dos llamadas y hasta dos timeouts.
No es un control de presupuesto distribuido. Proceso forestal independiente de Meta.

Tarea de integración José: mostrar candidatos/evidencias y limitaciones sin porcentajes,
distinguir abstención/error y mostrar fuente/periodo/cobertura de alturas. El selector de
atlas actual aún no envía polígonos al endpoint. No se modificó su implementación.

## Contexto auditado y alturas ponderadas (incremento 27-10-2026)

Los endpoints anteriores mantienen sus tipos/campos; forest/analyze conserva Polygon y
selección por centro. Las rutas nuevas son aditivas y sus esquemas completos están en
OpenAPI. Requieren ingesta de capas en PostGIS o raster revisado, no se cargan datos
automáticamente. [Informe y QA real](FOREST_CONTEXT_REPORT.md). No hay cambios de UI.

| Ruta | Entrada y estados |
| --- | --- |
| GET /layers | ContextLayer[]; [] si no hay fuentes registradas; 503 sin DB/migración |
| POST /context/point | location Point WGS84, accuracy_m opcional null o 0–200; ContextResponse |
| POST /context/area | area Polygon/MultiPolygon WGS84, hasta 1 km² y 20000 posiciones; ContextResponse |
| POST /forest/analyze/weighted | source_id chmv2 y area Polygon/MultiPolygon; WeightedStatistics |

Point válido de referencia del atlas, sin exactitud GPS afirmada:

```json
{"location":{"type":"Point","coordinates":[-72.08333333333333,-40.68333333333333]},"accuracy_m":null}
```

Ejemplo AOI pequeño (solo contrato; no límite oficial):

```json
{"area":{"type":"Polygon","coordinates":[[[-72.084,-40.684],[-72.082,-40.684],[-72.082,-40.682],[-72.084,-40.682],[-72.084,-40.684]]]}}
```

ContextResponse contiene status matched/no_coverage, forest_context[], protected_context[],
source_refs[], coverage[], query_area_m2, accuracy_m, analysis_crs, taxonomy_version,
quality_flags y limitations. Cada match conserva source_id/feature_id, attributes_raw,
attributes normalizados, predominant_species[], point_on_boundary y área/fracción cuando
corresponde. Un taxón unresolved tiene accepted_taxon_id=null; no se elimina del contexto.
Las especies predominantes nunca son identificación de la foto ni labels de entrenamiento.

Ejemplo de elemento taxonómico real observado en el motor offline:

```json
{"scientific_name_raw":"Laurelia philippiana","accepted_taxon_id":"laureliopsis-philippiana","resolution":"catalog_match"}
```

Punto en frontera puede tener varios matches; quality_flags incluye point_on_boundary
y multiple_matches. Capas solapadas usan unión por fuente y reportan overlap_excess_m2.
No sumar coberturas forestales/protegidas entre sí. No mostrar no_coverage como sin bosque,
sin especies o sin protección. accuracy_m null significa incertidumbre no proporcionada.

ContextLayer informa productor/distribuidor, versión, fecha, licencia, hash del recorte,
source_crs, storage_crs EPSG:4326 y estados separados de derechos/geometría/taxonomía.
Ready se refiere a disponibilidad local, no a autorización de despliegue público: CONAF
conserva redistribution_pending; BCN sigue siendo referencial. `altura` sigue como
height_class_raw; superf_ha del padre no es superficie del AOI.

Sin cobertura en punto: status no_coverage, listas de matches vacías y limitación explícita.
Sin cobertura en AOI: cada fuente tiene fraction=0 y union_area_m2=0; no ausencia ecológica.
Sin DB: 503 detail Contexto no configurado: requiere PostGIS y migración 002. Sin tablas o
conexión: 503 detail Capas de contexto no disponibles. Geometría/precisión inválida: 422.

Weighted usa el area del JSON anterior añadiendo source_id chmv2. Devuelve status
ok/no_coverage/no_valid_data, método pixel_footprint_area, estimated=true, áreas AOI/raster/
válida/nodata/cero ambiguo, coverage_fraction y ambiguous_fraction con denominador explícito,
píxeles válidos, mean/min/max_height_m y source_acquisition_start/end/acquisition_reason.
Fechas conocidas del tile 2102332230: 2013-09-16/2018-09-15, intervalo de seis adquisiciones.
No es fecha por píxel. Con todo cero ambiguo, mean/min/max=null y status no_valid_data;
no mostrar altura 0. Sin fechas verificadas, ambas null y razón explícita.

El raster sin configurar responde 501; manifiesto/raster inválido 503; límites 422.
[Resultados reales ponderados](../data/public/chmv2-weighted-2026-10-27.json).

Tarea de José: estados de carga/error/no_coverage, procedencia/antigüedad, matches ambiguos
y cobertura por fuente. Antes de producción: identidad por usuario, privacidad de observaciones,
presupuesto global y worker con cancelación efectiva. No colocar tokens compartidos en la app.
# Consolidación de demo — 29-10-2026

Esta sección actualiza los requisitos de acceso de las rutas descritas abajo; OpenAPI del
proceso configurado sigue siendo la fuente técnica. SERVICE_MODE=local mantiene desarrollo
aislado. SERVICE_MODE=demo exige `Authorization: Bearer <credencial individual de demo>`
para identify, observaciones, layers, context y forest/analyze (ambas variantes).
health, species y forest/sources conservan acceso de lectura. La clave Meta nunca llega al cliente.
La allowlist de demo no representa login productivo. No guardar credenciales en NEXT_PUBLIC_*.

| Operación | Autorización / política de datos / errores adicionales |
| --- | --- |
| POST /identify | Identidad antes de leer multipart en demo, edad/derechos, presupuesto global antes de decodificar; 401, 429, 503, 502; no persiste foto |
| GET /observations | En demo devuelve solo propias no vencidas; antiguas sin dueño ocultas; 401/503 |
| POST /observations | Propietario asignado por servidor, no por JSON; privada por defecto en demo; 401/422/503 |
| DELETE /observations/{observation_id} | UUID, sin body; solo propietario demo; 204 sin contenido, 401/404/422/503 |
| GET /layers, POST /context/point, POST /context/area | Identidad demo; no exportan geometrías fuente; atributos pueden tener derechos pendientes |
| POST /forest/analyze, POST /forest/analyze/weighted | Identidad demo y admisión global; worker aislado; 429/503 al limitar/fallar/agotarse plazo |

Observation/Create conserva todos sus campos y añade `accuracy_m: number | null`, opcional,
finito, 0–200 m y solo con location. No inferir precisión a partir de una coordenada de dron.
Ejemplo válido (coordenada sintética para contrato):

```json
{"species_id":null,"notes":"Ejemplo sintético","location":{"type":"Point","coordinates":[0,0]},"accuracy_m":12}
```

Para relacionar una observación con contexto, enviar su Point y precisión declarada a
`/context/point`; conservar en el consumidor source_refs, hashes/versión y quality_flags.
La respuesta no asigna etiquetas ni modifica la especie de la observación. Con location=null
no se solicita contexto espacial. Para un AOI, contexto y alturas son consultas independientes.

Identification añade campos opcionales compatibles con consumidores TypeScript existentes:

```typescript
type ExecutionMetadata = {
  correlation_id?: string | null;
  prompt_version?: string | null;
  usage?: Record<string, number>;
  stage_usage?: Record<string, Record<string, number>>;
};
```

Ejemplo de ampliación de una abstención real técnicamente completada:

```json
{"status":"insufficient_evidence","provider":"meta","model":"muse-spark-1.3","candidates":[],"message":"Se requiere otra fotografía","limitations":["Rasgos insuficientes"],"execution_status":"completed","segmentation_status":"error","prompt_version":"botanical-visible-v2","usage":{"prompt_tokens":10},"stage_usage":{"identification":{"prompt_tokens":10}}}
```

SAM puede fallar y Muse completar; mostrar limitación de segmentación. Si Muse falla,
HTTP 502 `{"detail":"Proveedor Meta no disponible o respuesta inválida"}`; nunca una
abstención simulada. 401 identidad requerida, 429 límite global/identidad, 503 ledger/DB
no disponible. El body puede ser `detail` string o lista de validación Pydantic (422).
Header `X-Correlation-ID` sirve para soporte sin fotos, ubicaciones o texto privado.
Mock mantiene provider=mock, execution_status=mock y cero candidatos/métricas científicas.

Límites de demo son diarios UTC y compartidos por PostgreSQL, no por pestaña/proceso.
Una reserva cobrada no se devuelve en error; expiración recupera solo concurrencia.
No mostrar contadores de tokens como dólares facturados ni puntajes como probabilidades.
El borrado devuelve el mismo 404 para ID ajeno o inexistente. Retención visible predeterminada:
30 días; purga física requiere operación de mantenimiento. No hay feed de observaciones públicas.

Diff de contrato verificado: cero rutas/campos eliminados y cero campos requeridos nuevos
en los modelos previos. Los ejemplos son contratos, no mediciones botánicas.
Los resultados técnicos reales y limitaciones están en
[el reporte de consolidación](BACKEND_META_CONSOLIDATION_REPORT.md).

## Expediciones, multivista y voz — 29-10-2026

Contratos implementados en OpenAPI runtime. Web/móvil no modificados. Guías operativas:
[voz](VOICE_GUIDE.md), [capturas/privacidad](CAPTURE_DOMAIN.md), [reporte](META_EXPEDITIONS_REPORT.md).
[20 ejemplos JSON completos](../evaluations/expeditions-contract-examples.json) son **sintéticos**,
validados por tests; no resultados reales de identificación/transcripción ni precisión botánica.
Incluyen los 16 escenarios requeridos, reintento idéntico y errores STT/tool/LLM separados.

### Identificación compatible

POST `/identify` conserva multipart requerido `file`, `adult_confirmed`, `rights_confirmed`.
Añade `additional_files` repetible (0–2), `views` repetible opcional (uno por imagen en orden)
y `use_segmentation` opcional. Las imágenes son del mismo ejemplar y producen UNA identificación.
Tipos de vista: `whole_tree`, `leaf`, `bark`, `flower`, `fruit`, `unspecified`.
JPEG/PNG/WebP, 10 MiB por imagen y 20 MiB originales por intento; cada una se valida/re-encodea
sin metadata. SAM procesa solo la foto primaria: prompt corto según vista y parser oficial.
`use_segmentation: false` desactiva SAM; true exige `SAM_ENABLED`, 422 si falta habilitación.
La omisión conserva configuración anterior. Máscaras ausentes/error conservan el original;
no se afirma que B mejore A. Las otras vistas permanecen originales preparadas.

`status` conserva exactamente `candidates | insufficient_evidence`. La nueva información es
aditiva: `observed_traits`, `missing_traits`, `recommended_next_photo` (enum de OpenAPI o null),
`evidence_status: candidates | insufficient_evidence | additional_photo_requested`,
`identification_id` nullable, `sources` y `candidates[].contradictory_evidence`.
No convertir contradicciones o candidatos en probabilidades. `prompt_version` ahora es
`botanical-multiview-v3`. HTTP 502 es `provider_error`; 413/415/422 son `validation_error` de
UI, no nuevos valores incompatibles de `status`. 401/429/503 conservan semántica anterior.

En modo demo, el resultado se guarda con propietario y retención en PostGIS (migración 004).
Sin DB disponible falla 503, incluso mock autenticado. Local anónimo sigue sin persistir.
`rights_confirmed` de identificación mantiene el consentimiento existente para la operación
configurada: obtener permiso de transferencia antes de elegir proveedor Meta y nunca usar Hepta.
Cada reserva de identificación debe cubrir hasta tres imágenes y SAM opcional.

El catálogo conserva ocho IDs. Añade `trait_sources`, `trait_source_accessed_at` y permite
`trait_validation_status: source_checked`: referencia bibliográfica comprobada automáticamente,
sin revisión humana ni presencia de campo. `morphology` contiene resúmenes breves de hechos,
con fuentes distintas de GBIF. Conservación/natividad no se inventan ni se deducen de estos rasgos.

### Rutas nuevas

En demo se usa Bearer individual para todas estas rutas. En local también es obligatorio
para `/captures/*`, `/guide/*` y DELETE `/identifications/*`; expediciones son de lectura local.
La identidad se asigna en servidor, nunca en JSON. Nunca entregar `MODEL_API_KEY` al cliente.

| Ruta | Entrada | Éxito | Errores y límites |
| --- | --- | --- | --- |
| GET `/expeditions` | Ninguna | 200 `Expedition[]` | 401 en demo; catálogo de una referencia |
| GET `/expeditions/{id}` | `puyehue` | 200 `Expedition` | 404 desconocida; no garantiza rutas/acceso |
| POST `/captures/attempts` | `CaptureAttempt` | 201 `Capture`; 200 reintento idéntico | 401/404/409/410/422/503; sin foto ni llamada Meta |
| GET `/captures/me` | `limit` 1–100; `offset` 0–100000 | 200 `Collection` | 401/422/503; privada, totales completos y página |
| GET `/captures/{id}` | UUID | 200 `Capture` | 401/404/422/503; ajena/expirada/ausente indistinguibles |
| DELETE `/captures/{id}` | UUID, sin body | 204 | 401/404/422/503; elimina observación y evidencia propias |
| DELETE `/identifications/{id}` | UUID, sin body | 204 | 401/404/422/503; elimina evidencia y captura propia vinculada |
| POST `/guide/transcribe` | Multipart `file`, `adult_confirmed`, `rights_confirmed`; `external_processing_confirmed` para Meta | 200 `Transcription` | 401/413/415/422/429/502 `stt_error`/503; WAV 3 MiB, 60 s |
| POST `/guide/query` | `GuideQuery` | 200 `GuideAnswer` | 401/422/429/502 `tool_error` o `llm_error`/503; pregunta hasta 2000 caracteres |

Entrada completa para captura sin ubicación (UUID de ejemplo; usar el devuelto por servidor):

```json
{"identification_id":"00000000-0000-4000-8000-000000000001","idempotency_key":"example-key-1","expedition_id":"puyehue","species_id":null,"observed_at":"2026-10-29T12:00:00Z","location":null,"location_consent":false,"accuracy_m":null}
```

Para ubicación agregar Point `[longitud,latitud]` válido y consentimiento; precisión solo con
Point. Fechas deben tener zona y no ser futuras. `owner_id`, `verified`, visibilidad pública,
rutas de imagen y campos extra son rechazados. Capturas fuera de referencia o GPS >50 m se
señalan sin invalidar automáticamente. Progreso educativo cuenta registros, no certifica especies.

Entrada completa de consulta (transcripción revisada o texto escrito):

```json
{"question":"¿Cómo distingo coigüe de lenga?","adult_confirmed":true,"external_processing_confirmed":true,"capture_id":null}
```

`capture_id` propio opcional permite consultar contexto en backend. No se envían UUID ni
coordenadas al modelo. Sin ubicación/cobertura se devuelve evidencia ausente, no ausencia
ecológica. El guía no calcula alturas ni inventa resultados raster; las rutas forestales
existentes conservan metadatos temporales y worker. Texto listo para narración, no audio TTS.
Mostrar `sources`, `limitations`, `insufficient_evidence` y provider/execution_status.
No reproducir nombres de herramientas como contenido principal de UI.

Errores de proveedor son sanitizados; validar también `detail` lista estándar de FastAPI.
Permisos y presupuesto son independientes. Configuración/cargos/latencia real requieren una
prueba posterior autorizada. Ni CI ni transporte mock validan una transcripción española real.

## Selección asistida de un árbol — propuesta para José, 30-10-2026

**No implementado en el producto ni en OpenAPI**; propuesta basada en el laboratorio
privado (`tools/meta_sam_api_lab`). No cambia `apps/web`, `apps/mobile` ni las rutas
actuales. La efectividad de SAM con cajas sobre árboles **no se ha medido** con API real
([SAM_SPATIAL_RESEARCH.md](SAM_SPATIAL_RESEARCH.md)): se recomienda esperar esa evidencia.

Recorrido sugerido para la captura:

1. **Seleccionar**: la persona dibuja una caja sobre el árbol o toca un punto. Puede
   añadir un punto negativo para excluir el fondo. La UI convierte puntero → píxeles de
   la imagen *preparada* con la misma lógica de `geometry.js` (insets, `object-fit`,
   zoom) y envía floats. El backend aplica `floor/ceil` y el builder oficial.
2. **Obtener máscara**: una solicitud SAM espacial (nunca concepto + caja). La respuesta
   puede ser vacía (`no_matches`): mostrar «no se pudo delimitar» y permitir reintentar
   la selección manualmente, sin reintentos automáticos.
3. **Confirmar la instancia**: mostrar máscara y contorno. La persona confirma o corrige.
   Una corrección crea una solicitud nueva vinculada al resultado anterior.
4. **Identificar**: el recorte confirmado alimenta el experimento B existente; la foto
   original se conserva. Las vistas adicionales siguen siendo del mismo ejemplar.
5. **Incertidumbre**: la confianza de SAM, si se solicita (`include_confidence`), es del
   modelo y no es probabilidad de especie. Mostrar candidatos, evidencia, rasgos
   faltantes, abstención y la foto recomendada, igual que en la identificación actual.

Forma orientativa de un contrato futuro (a decidir con José; no existe hoy):

```json
{"selection":{"prepared_size":[1280,720],"objects":[{"id":1,"prompts":[{"frame":0,"box":[412.5,96.0,780.2,690.0],"points":[{"x":500,"y":300,"label":"negative"}]}]}]},
 "result":{"status":"completed|no_matches|provider_error","masks":1,"confidence":null}}
```

Coste orientativo: USD 0,0025 por imagen (tarifa Standard consultada) más la reserva del
ledger. Requiere consentimiento de procesamiento externo y derechos de la imagen,
como la identificación actual.

## Identificación de conjunto abierto — contrato para José, 30-10-2026

**Compatible hacia atrás.** No cambian `status`, `candidates` ni los códigos HTTP. Se
añaden campos opcionales con valores por defecto seguros. Un cliente que los ignore sigue
funcionando y, si no hay candidato aceptado, verá `status: "insufficient_evidence"` con
`candidates: []`: es decir, una abstención y nunca una especie dudosa. La estrategia
activa la define el backend (`IDENTIFY_STRATEGY`): por defecto **`verify`** (v2), tras la
evaluación del 30-10-2026. Con `baseline` los campos nuevos valen `not_assessed` /
`not_applicable`. Esperar más abstenciones que antes: el sistema prefiere no identificar
a identificar mal. En la evaluación, 3/37 negativos aceptados frente a 25/37, y 8/19
positivos correctos aceptados frente a 10/19. Con 3 fotos del mismo ejemplar `verify`
tendió a abstenerse (n pequeño), así que conviene pedir **una** foto adicional concreta
según `recommended_next_photo`.

| Campo nuevo | Valores | Qué significa para la UI |
| --- | --- | --- |
| `catalog_assessment` | `supported_candidate`, `insufficient_evidence`, `out_of_catalog_suspected`, `non_diagnostic_photo`, `not_assessed` | Estado científico, distinto de `execution_status` |
| `acceptance` | `accepted`, `not_accepted`, `not_applicable` | `accepted` = presentable como candidato. **Nunca** significa verificado |
| `accepted_species_id` | ID del catálogo o `null` | Igual al primer candidato cuando `accepted` |
| `exploratory_candidates` | hasta 3 | Hipótesis no aceptadas. **No** mostrarlas como identificación ni permitir capturarlas como esa especie |
| `similar_out_of_catalog` | hasta 3 nombres | Posibles especies fuera del catálogo, sin certeza |
| `strategy` | `abstain`, `comparators`, `verify` o `null` | Trazabilidad |

Captura: `POST` de captura solo acepta `species_id` presente en `candidates`. Con
abstención, la captura se registra sin especie (`capture_status: "registered"`, pendiente
de identificación) y `taxonomic_verification_status` sigue `unverified`.

Campos comunes omitidos en los ejemplos: `usage`, `stage_usage`, `latency_ms`,
`prompt_version`, `correlation_id`, `sources`.

1. **Candidato aceptado** — mostrar la especie como *candidata*, la evidencia y el botón de
   captura con especie sugerida.
```json
{"status":"candidates","provider":"meta","model":"muse-spark-1.3","execution_status":"completed","catalog_assessment":"supported_candidate","acceptance":"accepted","accepted_species_id":"eucryphia-cordifolia","candidates":[{"species_id":"eucryphia-cordifolia","evidence":"Hojas opuestas; envés más claro","contradictory_evidence":[]}],"exploratory_candidates":[],"observed_traits":["hoja opuesta","envés claro"],"missing_traits":["flor"],"recommended_next_photo":null,"similar_out_of_catalog":[],"message":"Candidato compatible con los rasgos visibles; no es una verificación taxonómica.","limitations":["Una sola foto"],"evidence_status":"candidates","strategy":"comparators"}
```
2. **Evidencia insuficiente** — «No hay evidencia suficiente»; ofrecer la foto pedida y la
   captura sin especie.
```json
{"status":"insufficient_evidence","provider":"meta","model":"muse-spark-1.3","execution_status":"completed","catalog_assessment":"insufficient_evidence","acceptance":"not_accepted","accepted_species_id":null,"candidates":[],"exploratory_candidates":[{"species_id":"nothofagus-dombeyi","evidence":"Hoja simple aserrada","contradictory_evidence":[]}],"observed_traits":["hoja simple"],"missing_traits":["forma completa de la hoja"],"recommended_next_photo":"complete_leaf","similar_out_of_catalog":[],"message":"Rasgos compatibles pero insuficientes.","limitations":[],"evidence_status":"additional_photo_requested","strategy":"comparators"}
```
3. **Posible especie fuera del catálogo** — «Podría no ser ninguna de las 8 especies del
   piloto». Mencionar `similar_out_of_catalog` como posibilidad, nunca como identificación.
```json
{"status":"insufficient_evidence","provider":"meta","model":"muse-spark-1.3","execution_status":"completed","catalog_assessment":"out_of_catalog_suspected","acceptance":"not_accepted","accepted_species_id":null,"candidates":[],"exploratory_candidates":[{"species_id":"nothofagus-pumilio","evidence":"Hoja caduca pequeña","contradictory_evidence":["margen irregularmente dentado"]}],"observed_traits":["margen irregularmente dentado"],"missing_traits":[],"recommended_next_photo":null,"similar_out_of_catalog":["Nothofagus antarctica"],"message":"Los rasgos visibles no coinciden con lenga; podría ser una especie fuera del catálogo.","limitations":["Sin certeza sobre la especie externa"],"evidence_status":"insufficient_evidence","strategy":"verify"}
```
4. **Foto no diagnóstica, pide otra** — explicar qué foto tomar (`recommended_next_photo`),
   recordando no dañar la planta ni salir del sendero.
```json
{"status":"insufficient_evidence","provider":"meta","model":"muse-spark-1.3","execution_status":"completed","catalog_assessment":"non_diagnostic_photo","acceptance":"not_accepted","accepted_species_id":null,"candidates":[],"exploratory_candidates":[],"observed_traits":[],"missing_traits":["hoja","corteza"],"recommended_next_photo":"closer_view","similar_out_of_catalog":[],"message":"La foto muestra el bosque a distancia; acércate a una hoja.","limitations":[],"evidence_status":"additional_photo_requested","strategy":"abstain"}
```
5. **Multivista** — mismo contrato con hasta 3 fotos del **mismo** ejemplar
   (`additional_files`, `views`). Mostrar que el resultado combina las vistas.
```json
{"status":"candidates","provider":"meta","model":"muse-spark-1.3","execution_status":"completed","catalog_assessment":"supported_candidate","acceptance":"accepted","accepted_species_id":"laureliopsis-philippiana","candidates":[{"species_id":"laureliopsis-philippiana","evidence":"Margen fuertemente aserrado en la hoja; fruto visible en la segunda vista","contradictory_evidence":[]}],"exploratory_candidates":[],"observed_traits":["margen aserrado","hojas opuestas"],"missing_traits":[],"recommended_next_photo":null,"similar_out_of_catalog":[],"message":"Las tres vistas del mismo ejemplar son compatibles con tepa.","limitations":[],"evidence_status":"candidates","strategy":"comparators"}
```
6. **Error de proveedor** — HTTP 502 `{"detail":"Proveedor Meta no disponible o respuesta inválida"}`.
   Mostrar «No se pudo analizar»; **no** es una abstención y no se reintenta automáticamente.
7. **Presupuesto agotado** — HTTP 429 `{"detail":"Límite de consumo Meta; intenta más tarde"}`.
   Mostrar «Análisis no disponible por ahora»; permitir guardar la captura sin especie.
8. **Captura pendiente de identificación** — respuesta de captura sin especie:
```json
{"identification_id":"7b1f0c1e-0000-4000-8000-000000000000","species_id":null,"capture_status":"registered","taxonomic_verification_status":"unverified"}
```
Mostrarla en la colección como «pendiente de identificación». Un candidato aceptado
tampoco convierte la captura en un registro científico verificado.

## Propuesta futura — gemelo digital y catálogo multirreino, 31-10-2026

Contexto: [visión](PRODUCT_VISION_ECOSYSTEM.md), [piloto Puyehue](PILOT_PUYEHUE.md) y
[modelo de datos](ECOSYSTEM_DATA_MODEL.md). Esta sección **no cambia ningún endpoint ni
esquema**: las tablas de rutas anteriores siguen siendo la referencia de lo implementado, y
`/openapi.json` es la fuente de verdad.

### Implementado actualmente

| Capacidad | Rutas | Nota para la UI |
| --- | --- | --- |
| Catálogo de 8 árboles | GET `/species`, `/species/{id}` | Únicas especies con identificación evaluada. `conservation_status` es `null`: no mostrar categoría |
| Identificación vegetal open-set | POST `/identify` (`verify` por defecto) | Mostrar `acceptance`, `catalog_assessment` y `exploratory_candidates` como estados distintos; habrá abstenciones |
| Capturas y colección | POST `/captures/attempts`, GET `/captures/me`, GET o DELETE `/captures/{id}`, DELETE `/identifications/{id}` | Privadas; la sugerencia es siempre `unverified` |
| Expedición de referencia | GET `/expeditions`, `/expeditions/{id}` | `puyehue` fija; sin rutas ni GPS obligatorio |
| Contexto GIS | GET `/layers`, POST `/context/point`, `/context/area`, GET `/forest/sources`, POST `/forest/analyze`, `/forest/analyze/weighted` | Contexto posterior a la identificación; CHMv2 es altura estimada |
| Guía con herramientas | POST `/guide/query`, `/guide/transcribe` | Respuestas con fuentes; sin TTS ni reconocimiento de cantos |
| Observaciones heredadas | GET, POST `/observations`, DELETE `/observations/{id}` | Ruta local; las capturas usan `/captures` |

Para la pantalla Mapa de hoy:

- dibujar el límite de referencia y el contexto disponible;
- no dibujar senderos, puntos de fauna ni «hotspots»;
- no ofrecer filtros de fauna ni de hongos que filtren datos inexistentes. Si se muestran,
  van con estado vacío y rotulados «próximamente».

### Requiere desarrollo backend

Ninguna de estas rutas existe. La UI puede maquetar con estado vacío y la etiqueta «no
implementado», nunca con datos ficticios.

| Contrato | Entidad | Entrada | Salida | Fuente | Privacidad | Verificación | Fallback | Dependencias | Responsable funcional |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Catálogo multirreino | `Taxon` | `kingdom`, `group`, `park` | Taxones con `identification_capability` (`educational_catalog`, `visual_recognition_not_evaluated`, `evaluation_pending`, `identification_unavailable`, `candidate_identification`) | GBIF, COL XR, WFO, MycoBank, CONAF | Pública | `review_status` por taxón | Solo `/species` (8 árboles) | Reconciliación taxonómica | Giuseppe |
| Fichas enriquecidas | `SpeciesProfile`, `SpeciesTrait`, `TaxonMedia` | `taxon_id` | Descripción, rasgos, confundibles, hábitat, medios con licencia, fuente y fecha | Fuentes citadas por campo | Pública; medios solo con licencia compatible | `source_checked` o `specialist_reviewed` | Ficha mínima: nombre, reino, fuente | Revisión de licencias de medios | Giuseppe (contenido), José (UI) |
| Conservación regional | `ConservationAssessment` | `taxon_id`, `region?` | Lista de evaluaciones con ámbito; `applicable` solo si se conoce la región | [Nómina RCE](RCE_CONSERVATION_2026.md) con hash | Pública | `imported_unreviewed` o `reviewed` | «Sin clasificación RCE encontrada», nunca LC | ETL RCE y códigos regionales | Giuseppe |
| Parques y sectores | `ProtectedArea`, `Sector` | `park_id` | Límite, sectores, reglas con fecha de consulta y fuentes | CONAF, SBAP, SIMBIO, BCN | Pública | Fuente y fecha | Ficha textual del parque sin geometría | Licencia de la geometría | Giuseppe |
| Senderos | `OfficialTrail` | `park_id`, `sector_id?` | Solo senderos con geometría oficial; lista vacía si no hay | CONAF o SBAP | Pública | Fecha de verificación de acceso | Vacío, con mensaje «sin senderos verificados» | Fuente autorizada | Giuseppe |
| Especie–parque | `ParkSpeciesEvidence` | `park_id`, `evidence_type?` | Taxones por tipo de evidencia (1–7) | Ficha CONAF, GBIF filtrado | Sensibles generalizados | Por tipo | Solo tipo 1 (presencia oficial a escala de parque) | Política de sensibles | Giuseppe |
| Relaciones ecológicas | `EcologicalRelationship` | `taxon_id` | Tipo, objeto, cita y estado | Literatura citada | Pública | `documented` o `needs_review` | Ocultar la sección | Curaduría | Giuseppe |
| Expediciones configurables | `Expedition` | `park_id` | Retos tipados sin especies EN/CR ni GPS obligatorio | Contenido educativo revisado | Progreso privado | Revisión editorial | Expedición `puyehue` actual | Modelo de progreso | José (flujo), Giuseppe (contenido) |
| Identificación de fauna u hongos | — | Imagen | **No se ofrece** hasta tener un conjunto de evaluación propio | — | Igual que `/identify` | Evaluación independiente por reino | Registro sin taxón (`capture_status: registered`) | Dataset con licencia y protocolo | Giuseppe |

Las métricas de árboles **no** aplican a fauna ni a hongos. Cuando no hay contrato, la UI
registra el hallazgo sin taxón, con el flujo actual de capturas.
