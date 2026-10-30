# Arquitectura y decisiones

## Estructura

| Área | Responsabilidad | Límite |
| --- | --- | --- |
| `apps/web/` | Next.js + TypeScript + Tailwind; navegación, fichas, captura local y MapLibre. Desde el 27-10-2026 queda congelada como banco de pruebas. | Sin claves Meta; fixtures identificados; no decide verdad taxonómica. |
| `apps/mobile/` | Expo/React Native + TypeScript; cliente de la demo: identificación, catálogo, registro y atlas 2D/3D. Plan en `apps/mobile/docs/`. | Sin claves Meta; foto sin EXIF y nunca persistida en servidor; ubicación opcional. |
| `services/api/` | FastAPI + Pydantic: HTTP, configuración, validación, catálogo y persistencia. | Valida toda entrada y expone OpenAPI. |
| `services/botanical-ai/` | Contratos, adaptador mock y cliente Meta desacoplado con timeout/errores. | La disponibilidad documental de modelos no prueba calidad ni acceso real. |
| `services/geospatial/` | GeoJSON, geometrías y contrato/pipeline CHMv2. | Dependencias GIS pesadas separadas del runtime mínimo. |
| `data/public/`, `data/synthetic/` | Registro de fuentes y fixtures pequeños. | No Hepta, imágenes privadas ni rasters globales. |
| `evaluations/` | Casos permitidos, metodología y resultados reproducibles. | Mocks y pruebas unitarias no son métricas del modelo. |

La web consume la API por HTTP. La API coordina catálogo, observaciones y adaptadores; PostgreSQL/PostGIS proporciona la persistencia espacial del entorno Compose. Los módulos IA/GIS permanecen paquetes locales, sin introducir colas, gateways ni microservicios adicionales. No se creó `packages/shared` sin una necesidad real: OpenAPI define el límite entre TypeScript y Python.

## Contratos

- `GET /health`: salud del proceso; `database: not_configured|not_checked` y `ai_provider` describen configuración, sin probar conexión ni inferencia.
- `GET /species`: ocho candidatos, `id`, `scientific_name`, `common_name`, estado taxonómico y procedencia. Una forma binomial válida no demuestra aceptación taxonómica.
- `POST /identify`: multipart `file`, `adult_confirmed`, `rights_confirmed`; JPEG/PNG/WebP de hasta 10 MiB validados en memoria. Mock devuelve `provider: mock` y abstención sin candidatos; Meta sin clave responde 503 y con clave 501 mientras falta el pipeline. Los clientes HTTP aislados no están conectados al endpoint.
- `GET/POST /observations`: PostgreSQL/PostGIS; JSON con `species_id` opcional, `notes` y `location` Point opcional WGS84. Sin configuración/conexión devuelve 503. Validar longitud/latitud y no convertir automáticamente una sugerencia IA en identificación confirmada. La web guarda solo un borrador local: todavía no conecta este flujo de persistencia.
- `GET /forest/sources` expone procedencia/licencia CHMv2; `POST /forest/analyze` acepta `source_id: chmv2` y `area: Polygon`, pero responde 501 sin raster configurado.
- GeoJSON usa orden `[longitud, latitud]`; todo fixture se rotula sintético. Alturas: metros estimados, nodata y procedencia explícitos.

## Decisiones del bootstrap

1. **Monorepo pequeño:** permite trabajar a José en web y a Giuseppe en servicios con un contrato revisable. Reconsiderar separación de repositorios solo si aparecen equipos/ciclos independientes.
2. **API ligera:** Pydantic valida HTTP y el dominio; GIS/ML pesado va en entornos separados. Evita que instalar la API requiera GPU o GDAL completo.
3. **Mock por defecto:** sin credenciales ni datos autorizados no se llama a Meta. El mock permite probar navegación y abstención, nunca simula evidencia científica.
4. **PostGIS en Compose:** prepara geometrías y persistencia sin añadir un servicio de mapas propio. El entorno local no se expone a internet.
5. **Sin raster masivo ni pesos:** el pipeline seleccionará ventanas y recursos versionados tras validar derechos y cobertura.
6. **Licencia del código pendiente de decisión de ProGarLabs:** repositorio público no equivale a licencia permisiva. Las licencias de dependencias/datos conservan sus obligaciones.
7. **App móvil como cliente de la demo (27-10-2026):** el uso en terreno con cámara y conectividad irregular es el recorrido central; una app Expo reemplaza a la web como interfaz de la entrega y revierte la restricción «no app nativa» de la priorización. Reconsiderar si el 31-10 el recorrido de descubrimiento no funciona en un Android físico. Ver [ADR 0001](../apps/mobile/docs/adr/0001-app-movil-como-cliente-de-la-demo.md).
8. **Atlas móvil con MapLibre GL JS en un Expo DOM component (27-10-2026):** MapLibre Native no soporta terreno 3D; el mismo motor da 2D garantizado y 3D opcional. Reconsiderar si el spike 3D falla y el 3D se abandona. Ver [ADR 0002](../apps/mobile/docs/adr/0002-atlas-con-maplibre-gl-js-en-dom-component.md).

Las versiones exactas están en los lockfiles; el frontend inicial usa Next.js 16.4.3, React 19.3.1, Tailwind 4.3.3 y MapLibre 6.16.0. El entorno de referencia usa Node 24 LTS/Python 3.12. PostgreSQL 18/PostGIS 3.6 sigue la [imagen oficial recomendada](https://github.com/postgis/docker-postgis) consultada el 27-10-2026; la [dependencia por healthcheck](https://docs.docker.com/compose/how-tos/startup-order/) evita iniciar API antes de la base lista.

## Evolución y riesgo

Antes de IA real: confirmar modelo/endpoint habilitado, condiciones Standard/Contributor, consentimiento, retirada de EXIF y límites de tamaño; ejecutar pruebas de contrato con mocks y una prueba autorizada. Antes de datos reales: [gobernanza](DATA_GOVERNANCE.md), taxonomía y licencia. Antes de exposición pública: autenticación, retención/borrado, límites de petición, migraciones y backups. No se incluyen predicciones de crecimiento, invasoras ni riesgo eléctrico en la ruta crítica.

Registrar aquí fecha, problema, opción elegida, motivo y criterio para reconsiderar cualquier decisión transversal nueva; una decisión reversible pequeña puede documentarse en el PR.

## Fundación GIS/ML, 27-10-2026

Estado vigente sobre el bootstrap: [reporte GIS/ML](GIS_ML_REPORT.md) y
[contratos para José](API_INTEGRATION.md). Las descripciones 501 de Meta del bootstrap
son históricas: ahora el proveedor habilitado ejecuta Muse con JSON Schema por Chat
Completions, validación Pydantic contra catálogo y SAM opcional por Responses.
Se reutiliza el cliente; no se añadió SDK ML/GPU. Parser oficial meta-sam-parser 0.1.0.

Taxonomía: campos aditivos aceptados por GBIF, separados de procedencia/estado provisional
histórico y rasgos pendientes. Snapshot reproducible CC BY 4.0; no se valida presencia.

Privacidad: imágenes verificadas/orientadas/re-encodeadas sin metadata en memoria.
Meta exige clave, habilitación, bearer de desarrollo y separación entre derechos locales
y permiso de transferencia externa. Una identificación cada 60 s por proceso; sin reintentos.
Mock y GIS funcionan independientemente de Meta. Autenticación por usuario, límite global
y política de observaciones siguen siendo requisitos para publicación.

Raster: extra opcional rasterio/pyproj, sin GeoPandas ni pesos. Solo ventanas locales
revisadas por manifiesto/hash en API, nunca URLs de usuario. La adquisición remota está
en un script con un único COG fijo permitido. Plazo cooperativo 10 s, 1 km², 100000 píxeles,
una lectura por proceso, archivos 64 MiB. El plazo no interrumpe I/O bloqueada.
Se excluyen ceros ambiguos CHMv2 y se declara sesgo potencial; fixture mantiene cero válido.
Periodo global no sustituye fecha de adquisición del tile. Revisar aislamiento de proceso
y nodata antes de ampliar proveedores. OpenAPI añade CanopyStatistics y campos de trazabilidad.

## Contexto forestal auditable, 27-10-2026

[Informe del incremento](FOREST_CONTEXT_REPORT.md). Se agrega almacenamiento PostGIS en
context_layers/context_features con migración 002 reversible, GiST y geometría MultiPolygon
4326. No se modifica observations. Ingesta local por hash/ID, fuentes originales fuera de Git.
PostGIS selecciona candidatos por intersección; el módulo GIS compartido calcula contexto
y superficies EPSG:32718. API point/area y QA offline usan el mismo motor. Por fuente,
la cobertura usa unión; solapamiento separado. Los atributos originales nunca se sustituyen
por códigos supuestos ni se convierten en etiquetas individuales. Taxonomía versionada
por catálogo/sinónimos exactos, dejando fuera de catálogo/ambiguos unresolved.

Se mantiene el raster histórico por centro. La ruta adicional forest/analyze/weighted
intersecta huellas nativas con AOI en CRS métrico local; añade fracciones de área válida,
nodata y ceros ambiguos, y fechas de adquisición independientes de publicación/modelo.
Los Parquet estáticos se unen por quadkey único, no por una API STAC supuesta.

Extra data opcional: Fiona/PyArrow para investigar SHP/Parquet; no entran al runtime mínimo.
Versiones exactas en uv.lock. No se agregan modelos ni microservicios. Los límites de tiempo
raster siguen siendo cooperativos; no se presenta este incremento como despliegue público.
Reconsiderar worker aislado antes de exponerlo. Contexto es informativo hasta evaluar A/B/D/E.
# Consolidación backend, 29-10-2026

Sobre main integrado (#15/#16), `SERVICE_MODE=demo` autoriza por credencial individual
antes de procesar cuerpos privados/costosos. Local conserva mocks y desarrollo en loopback.
PostgreSQL es la fuente de verdad de reservas diarias UTC: advisory lock transaccional,
concurrencia global, límites por identidad y reservas no reembolsables con TTL de concurrencia.
Sin estado disponible falla cerrado. No se agregó Redis ni otro servicio.
Migración 003 añade ledger/propietario/precisión; rollback protege propietarios privados.
Observaciones demo se filtran por propietario/retención; eliminación específica autenticada.
La precisión opcional no determina exactitud de ubicación de objetos visibles.

Raster conserva algoritmos históricos/ponderados dentro de proceso spawn descartable con
timeout efectivo; admisión PostgreSQL compartida en demo y semáforo padre por proceso.
Fuente/ruta/hash y límites se validan en el hijo. No se acepta URL/ruta del solicitante.
Muse mantiene Chat Completions estructurado, SAM Responses y parser oficial; autorización y
reserva preceden la decodificación. Uso/latencia/modelo/prompt y correlation ID sin contenido
sensible. El catálogo conserva estados pendientes y contexto espacial separado de evidencia visual.

Evidencia, contratos y límites operativos en
[BACKEND_META_CONSOLIDATION_REPORT](BACKEND_META_CONSOLIDATION_REPORT.md).
Allowlist de demo y presupuesto de unidades no equivalen a identidad/billing productivos.

## Expediciones y voz, 29-10-2026

Se conserva FastAPI/PostGIS y el cliente Meta. `/identify` acepta una primaria y hasta dos
vistas adicionales del mismo ejemplar; estados previos se conservan y la recomendación
adaptativa se añade como campo. SAM opcional afecta solo primaria. Sin clasificador nuevo,
pesos, SDK o dependencias adicionales. Prompt `botanical-multiview-v3`; JSON Schema estricto
y validación local mantienen el catálogo cerrado. Rasgos breves `source_checked` referencian
fuentes botánicas propias de cada especie; no equivalen a revisión humana de una observación.

Voz usa WAV efímero, `muse-voice-transcribe-1.0`, multipart ASR oficial, y Muse 1.3 con
herramientas locales de lectura. Un turno de herramientas (máximo cuatro) y un turno final
estructurado; sin sesión persistente, SQL del modelo ni TTS obligatorio. Referencias se
validan contra consultas ejecutadas; su pertinencia científica requiere evaluación humana.
Identidad obligatoria aun en local para guía/capturas; reservas de voz/guía en ledger
compartido aun en local Meta. Las nuevas reservas empiezan en cero y fallan cerrado.

Captura es una observación existente ampliada, no otro hallazgo duplicado. Migración 004
añade evidencia de identificación por propietario, vínculo, idempotencia transaccional y
metadatos de expedición. ID de captura = ID de observación. Especie seleccionada debe estar
en candidatos del resultado almacenado; ninguna entrada permite verificar taxonomía.
Rollback bloqueado si puede perder datos. Evidencia/colecciones privadas, retención y
borrado propios; rutas locales heredadas ya no exponen observaciones con dueño.

La referencia Puyehue reutiliza BCN 2826/capa y hash auditados; sin referencia coincidente,
el estado espacial es `not_checked`. No se crea ruta o punto de ejemplar. El guía puede
consultar contexto de captura propia en backend y enviar solo resultados sin coordenadas
ni atributos crudos. CHMv2/worker/algoritmos existentes se conservan; las herramientas no
generan estadísticas raster nuevas. Rutas y observaciones públicas sin fuente revisada
responden `unavailable`, sin fabricar bases de datos.

Contratos: [API_INTEGRATION](API_INTEGRATION.md), operación: [VOICE_GUIDE](VOICE_GUIDE.md)
y [CAPTURE_DOMAIN](CAPTURE_DOMAIN.md). Reconsiderar la orquestación solo cuando la evaluación
muestre que cuatro lecturas o una planificación son insuficientes. No agregar conversación
continua ni investigación privada a la ruta crítica. [Evidencia y límites](META_EXPEDITIONS_REPORT.md).

## Decisión 2026-10-30 — laboratorio privado SAM alojado

`tools/meta_sam_api_lab` es independiente de web/móvil y OpenAPI del producto. Reutiliza
MetaResponsesClient, prepare_image, meta-sam-parser 0.1.0 y ExecutionStore. Amplía el
transporte existente con input_video, metadata, callback SSE y GET/DELETE Files; mantiene
los valores por defecto de sus callers. Rechaza rechazo/incompleto antes de interpretar
vacío como resultado válido. Sin nuevo SDK, dependencia, checkpoint o inferencia local.

Un límite acumulado optativo `budget_lifetime_units` suma todas las reservas bajo el
lock PostgreSQL existente, incluso días anteriores y errores. Cero por defecto conserva
el presupuesto diario previo. El laboratorio lo exige y usa un schema privado persistente;
no una base reiniciable ni devoluciones que eludan el techo autorizado. Datos/resultados
fuera de Git; visor loopback con Host/Origin y proyección sin secretos. Files expira en
3600 s y se elimina en finally; CLI cleanup reintenta pendientes sin inferencia.
Cajas se validan con utilidades oficiales antes de reserva/upload. Renderizado conserva
revisión más reciente por objeto/frame y usa geometría del medio preparado.

Implementado y probado: una máscara real de imagen, dos solicitudes de video sin
coincidencias, visor y limpieza de tres uploads. No implementado como capacidad validada:
tracking positivo, métricas humanas, georreferenciación o medición física. Muse explícito
sobre tres keyframes no es anotación de verdad. [Informe](META_SAM_API_RESEARCH.md).

## Decisión 2026-10-30 — prompts espaciales y registro botánico

- Una sola ruta de validación (`lab.plan_request`) para vista previa, CLI y envío. Concepto
  y objetos espaciales son excluyentes. El texto lo genera `build_object_prompt` del parser
  oficial (0.1.0); los floats se convierten con `floor/ceil` y las coordenadas fuera del
  medio se rechazan. Imagen sin `propagation_direction`; `include_confidence` como cadena.
- Las correcciones son experimentos nuevos con `parent_experiment_id`; el directorio de
  salida debe ser nuevo. Las revisiones humanas se guardan como `review-<UTC>.json`
  separados y nunca editan `result.json`.
- La geometría del visor vive en `geometry.js`, puro y probado en Node y Chromium.
  `getBoundingClientRect` absorbe escalado CSS y zoom; los insets y `object-fit: contain`
  se descuentan explícitamente.
- Resolución de video parametrizada (640/960/1280) con el mismo intervalo, FPS y
  duración. La tarifa SAM es por frame y no depende de la resolución.
- `evaluations/botanical_registry.py` consulta GBIF con la taxonomía COL XR
  (`checklistKey 7ddf754f-…`) y Commons. Las claves del Backbone histórico se conservan en
  `species.json` y se cruzan en `evaluations/botanical/gbif-colxr-crosswalk.json`; no se
  reemplazan. El estado de etiqueta nunca supera `metadata_checked` sin revisor humano.
- Métricas Pillow (`metrics.py`), sin dependencias nuevas; `summarize` añade
  `by_photo_type`. Sin inferencia local ni nuevos SDK.
[Investigación](SAM_SPATIAL_RESEARCH.md) · [Datasets](BOTANICAL_DATASETS.md) ·
[Evaluación](BOTANICAL_EVALUATION.md).

## Decisión 2026-10-30 — identificación de conjunto abierto

- `Identification` añade campos opcionales: `catalog_assessment`, `acceptance`,
  `accepted_species_id`, `exploratory_candidates`, `similar_out_of_catalog` y `strategy`.
  `status`, `candidates` y los códigos HTTP no cambian. Una hipótesis no aceptada nunca va
  en `candidates`: un cliente antiguo ve una abstención y la captura no puede usar esa
  especie, porque `capture_store` exige que esté en `candidates`.
- Estrategias en `bosque_ai.open_set`:
  - `baseline`: prompt, esquema y tope de 1200 tokens previos, intactos.
  - `abstain`: reglas de conjunto abierto, tope de 1600 tokens.
  - `comparators`: añade 6 comparadores externos con fuente, cargados desde
    `resources/comparators.json` y validados contra el catálogo.
  - `verify`: segunda llamada solo si hay candidato aceptado, con los comparadores
    pertinentes a ese candidato. Es una comprobación del mismo modelo, no una validación
    independiente.
- Aceptación selectiva determinista: `supported_candidate`, al menos un rasgo observado y
  ninguna contradicción para el candidato.
- `/identify` usa `IDENTIFY_STRATEGY` (por defecto `verify`, v2, desde la evaluación del 30-10-2026), sin endpoints nuevos.
- Los comparadores no son especies coleccionables y su loader rechaza duplicados del catálogo.
