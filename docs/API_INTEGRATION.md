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
