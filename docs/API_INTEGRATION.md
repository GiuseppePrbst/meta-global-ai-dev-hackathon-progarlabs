# Integración API GIS/ML para José

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
