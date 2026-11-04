# Fuentes, verificación y decisiones pendientes

Consulta realizada el **27 de octubre de 2026** (fecha del cliente, America/Santiago). Solo se consultaron fuentes públicas; no se descargaron datasets raster, fotografías, pesos ni material restringido. Las URLs pueden cambiar y deben revisarse antes de la entrega.

## Competencia

Se abrió la [página oficial solicitada](https://cerebralvalley.ai/e/meta-ai-developer-hackathon/details). El lector web recibió un encabezado y un estado de carga. Se inspeccionó además su HTML público, que incluye el contenido del evento y un documento de términos/waiver fechado 25 de octubre de 2026. SHA-256 de la respuesta inspeccionada: `8c0b81fcb508b327bab2a0e0d5f272a8dc04a2b5ca4f639345fd61dd52efba87`; el HTML es dinámico, por lo que una nueva consulta puede producir otro hash. No se conserva ni redistribuye el documento legal completo.

La [página principal oficial](https://cerebralvalley.ai/e/meta-ai-developer-hackathon) confirma modalidad remota, inicio 26 de octubre, cierre **4 de noviembre de 2026 a las 21:00 ET**, Startup Track, tema Build for Your World y Muse/SAM 3.1 entre las herramientas. Para el cierre, ET corresponde a EST: 5 de noviembre 02:00 UTC, **4 de noviembre 23:00 en Santiago**. Mantener margen y revisar el portal el día de entrega.

El waiver incrustado exige admisión individual y un representante autorizado; permite una sola categoría por participante/proyecto. Explicita equipos de hasta cuatro para Indie; para Startup describe un representante que sea empleado activo autorizado. No se verificó en ese texto un máximo propio del Startup Track. Se mantiene internamente el límite conservador de cuatro solicitado por ProGarLabs y se pide confirmación final a los organizadores.

**Requisitos del encargo que se conservan como controles, sin atribuirles una verificación independiente en las fuentes accesibles:** repositorio público, una entrega por equipo, video de tres minutos y separación explícita del trabajo realizado durante la hackatón. Revisar el formulario autenticado y cualquier regla posterior antes de enviar. No se ha probado la elegibilidad personal de ningún miembro ni la recepción de créditos.

## Modelos y términos

- [Meta Model API: overview](https://dev.meta.ai/docs/overview) y [modelos](https://dev.meta.ai/docs/models): se verificó la existencia documental de Muse Spark y SAM 3.1. La disponibilidad para una cuenta, cuotas, nombres habilitados y calidad botánica requieren una prueba autorizada; la documentación no prueba una integración ejecutada.
- [Términos Meta Model API](https://dev.meta.ai/legal/terms-of-service), actualización visible 9 de octubre de 2026: revisar secciones 4–6 sobre derechos, retención y modalidades Contributor/Standard, y 10.1 sobre usuarios de al menos 18 años. No dirigir la integración a menores. ProGarLabs debe comprobar la modalidad efectiva y los derechos de entrada antes de enviar imágenes.
- [DINOv3 oficial](https://github.com/facebookresearch/dinov3): referencia de investigación opcional. No se descargaron pesos ni se conceden aquí derechos de redistribución; revisar licencia concreta del artefacto antes de usarlo.

## Datos y marca

| Fuente primaria | Qué se verificó | Qué queda pendiente |
| --- | --- | --- |
| [Registro oficial CHMv2 de Meta/WRI en AWS](https://registry.opendata.aws/dataforgood-fb-forestsv2/) | Producto versión 2, estimaciones desde imágenes, licencia CC BY 4.0 y atribución del proveedor. | Seleccionar tile/fecha, comprobar cobertura de Puyehue y evaluar error local. |
| [GBIF: términos](https://www.gbif.org/terms) | Licencias por dataset: CC0, CC BY o CC BY-NC. | IDs, DOI, licencia de cada registro/imagen y aceptación taxonómica de las ocho especies. |
| [WFO: términos](https://www.worldfloraonline.org/termsOfUse) | El índice oficial advierte licencias distintas por elemento; la apertura directa agotó tiempo. | Revalidar términos y registro taxonómico concreto antes de copiar contenido. |
| [MMA SIMBIO, Puyehue](https://simbio.mma.gob.cl/DPA/VistaImpresionComuna/217) | Fuente oficial candidata de contexto territorial. | Licencia y versión del recurso vectorial; no se copiaron geometrías ni se infirió presencia de ejemplares. |
| [ESA WorldCover: datos](https://esa-worldcover.org/en/data-access) | Productos 2020 v100 y 2021 v200; licencia CC BY 4.0 con atribución. | Selección y validación de cobertura; no tratar diferencia de algoritmos como cambio real sin análisis. |
| [OSM: licencia](https://www.openstreetmap.org/copyright) y [política de tiles](https://operations.osmfoundation.org/policies/tiles/) | ODbL para datos; servicio de tiles tiene obligaciones y capacidad propias. | Contratar/elegir proveedor adecuado si se usa un mapa base público en producción. |
| [EOxCloudless: licencia](https://cloudless.eox.at/documentation/license) y [uso/WMTS](https://cloudless.eox.at/documentation/usage) (consulta 02-11-2026) | Mosaico Sentinel-2 sin nubes por año (2017-2025), ~10 m; CC BY-NC-SA 4.0 no comercial; licencia comercial aparte; texto de atribución obligatorio. Teselas 3857 verificadas sobre Puyehue (HTTP 200, CORS abierto). | Confirmación de Giuseppe (regla RESTRICTED); proveedor con licencia comercial si el producto deja de ser demo no comercial. |
| [Wikimedia Commons](https://commons.wikimedia.org/) (consulta 28-10-2026 y 02-11-2026) | Diez fotos de referencia de especies (ocho árboles y dos hongos) y una del entorno de Puyehue para la tarjeta del sendero, con licencia CC0, CC BY o CC BY-SA, autor y página de archivo por foto, copiadas solo para desarrollo; detalle en [DATASET_LICENSES.md](DATASET_LICENSES.md#fotos-de-referencia-de-la-ficha-app-móvil). | Confirmar identificación de cada foto y reemplazarlas por las del backend. |
| [GBIF: *Cyttaria espinosae*](https://www.gbif.org/species/2580236) y [*Butyriboletus loyo*](https://www.gbif.org/species/7919198); Wikipedia en español: [Digüeñe](https://es.wikipedia.org/wiki/Cyttaria_espinosae) y [Loyo](https://es.wikipedia.org/wiki/Butyriboletus_loyo) (consulta 02-11-2026) | Nombre aceptado y familia (GBIF Backbone, CC BY 4.0); rasgos de la ficha resumidos de Wikipedia (CC BY-SA 4.0). Solo en el mock de la app móvil; la API no tiene hongos. | Validación micológica de los rasgos; incorporar hongos al contrato de la API. |
| [ProGarLabs](https://progarlabs.com/) | Empresa en Osorno y Fabiana/Giuseppe como cofundadores en la web pública. | No se verificó manual de marca ni HEX oficiales. La paleta del proyecto es una propuesta. |

Copernicus y NASA Earthdata son fuentes candidatas, todavía sin un recurso seleccionado ni licencia específica revisada. Ver [registro de licencias](DATASET_LICENSES.md).

## Infraestructura y encuadre cartográfico

- [Plan de manejo PN Puyehue, CONAF](https://www.conaf.cl/centro-documental/plan-de-manejo-del-pn-puyehue/): referencia del encuadre inicial usado por frontend. No se redistribuye el PDF ni se crea un polígono oficial a partir del rectángulo de visualización; la licencia de geometrías/rutas sigue pendiente.
- [Docker PostGIS oficial](https://github.com/postgis/docker-postgis): recomienda `18-3.6` para instalaciones nuevas y documenta el volumen `/var/lib/postgresql` en PostgreSQL 18+. No se migró una base existente.
- [Docker Compose: orden de inicio](https://docs.docker.com/compose/how-tos/startup-order/): `service_healthy` espera el healthcheck de dependencias, usado para base/API.
- [Gitleaks CLI](https://github.com/gitleaks/gitleaks) y [acción oficial](https://github.com/gitleaks/gitleaks-action): controles de secretos; los resultados realmente ejecutados, versiones y límites se registran en el informe. Un escaneo no acredita ausencia absoluta de datos sensibles.

## Fuentes consultadas para GIS/ML, 27-10-2026

- [GBIF Species API v1](https://techdocs.gbif.org/en/openapi/v1/species),
  [Backbone CC BY 4.0](https://www.gbif.org/dataset/d7dddbf4-2cf0-4f39-9b2a-bb099caae36c),
  [DOI](https://doi.org/10.15468/39omei). Se consultaron match y synonyms por los ocho IDs
  del snapshot; no se consultó una ficha WFO/MMA para validar rasgos.
- Meta [quickstart](https://dev.meta.ai/docs/quickstart), [modelos](https://dev.meta.ai/docs/models),
  [structured output](https://dev.meta.ai/docs/structured-output),
  [Responses](https://dev.meta.ai/docs/protocols/responses),
  [media segmentation](https://dev.meta.ai/docs/media-segmentation),
  [gramática SAM](https://dev.meta.ai/docs/sam/reading-segmentation),
  [parser oficial](https://dev.meta.ai/docs/sam/client-libraries). Schema por Chat Completions;
  SAM por Responses, nombres muse-spark-1.3/sam-3.1 verificados con llamadas reales.
- [AWS CHMv2](https://registry.opendata.aws/dataforgood-fb-forestsv2/),
  [repackaging cloud-native](https://source.coop/tge-labs/meta-chm-v2),
  [STAC collection](https://data.source.coop/tge-labs/meta-chm-v2/stac/collection.json),
  [COG utilizado](https://data.source.coop/tge-labs/meta-chm-v2/chm/2102332230.tif).
  CC BY 4.0, atribución Meta/WRI/Vantor y Taylor Geospatial;
  [Tolan et al.](https://arxiv.org/abs/2304.07213), [Brandt et al. CHMv2](https://arxiv.org/abs/2603.06382).
  CRS/escala/nodata observados por Rasterio; la fecha de modificación no prueba adquisición.
- [Fabric list tables](https://learn.microsoft.com/en-us/rest/api/fabric/lakehouse/tables/list-tables),
  [OneLake access](https://learn.microsoft.com/en-us/fabric/onelake/onelake-access-api).
  Se verificó sesión Azure y acceso local a esquema; no se publican IDs, URLs ni registros privados.

## Verificación de fuentes forestales, 27-10-2026

- [Catálogo MINAGRI](https://ide.minagri.gob.cl/descarga-de-capas-shp/planificacion-catastral/):
  cbn_10reg_2018, escala 1:50000, EPSG:32718 anunciado; archivo RAR demasiado grande para
  el límite, no verificado como SHP.
- [Servicio oficial CIREN/13](https://esri.ciren.cl/server/rest/services/USOS_DE_LA_TIERRA__CONAF/MapServer/13):
  metadatos/fields y features reales del piloto; latestWkid 3857, exportación WGS84 explícita.
- [Metadato legal CONAF](https://geoportal.cl/geoportal/catalog/42565/Servicio%20Web%20de%20Mapas%20-%20Usos%20de%20la%20Tierra%20%28CONAF%29):
  atribuir CONAF. No se interpreta como licencia CC ni permiso general de redistribución.
- [BCN catálogo y términos](https://www.bcn.cl/siit/mapas_vectoriales/index_html),
  [ZIP SNASPE](https://www.bcn.cl/obtienearchivo?id=repositorio%2F10221%2F10404%2F2%2FSnaspe.zip):
  descarga verificada, PRJ/CPG y QA piloto; atribución BCN, cartografía referencial de varias ediciones.
- [CHMv2 cloud-native](https://source.coop/tge-labs/meta-chm-v2),
  [acq_dates](https://data.source.coop/tge-labs/meta-chm-v2/acq_dates.parquet),
  [tiles](https://data.source.coop/tge-labs/meta-chm-v2/tiles.parquet): esquemas y hashes
  verificados, quadkey uno a uno, seis adquisiciones 2013-09-16/2018-09-15 para 2102332230.
  Son índices/catálogo estático, no API STAC search.
# Verificación de protocolo, 29-10-2026

Se consultaron [Chat Completions](https://dev.meta.ai/docs/cookbook/quickstart-chat-completions),
[JSON estructurado](https://dev.meta.ai/docs/cookbook/structured-output),
[bibliotecas SAM](https://dev.meta.ai/docs/sam/client-libraries) y
[precios/modos Meta](https://dev.meta.ai/docs/pricing-rate-limits).
Muse Spark 1.3 estándar: input USD 1,25/M y output 4,25/M; SAM imagen USD 2,50/1000.
Tarifas consultadas para estimar el smoke sintético; no son factura ni saldo observado.
No se activó Contributor mode. No se añadieron fuentes botánicas como verificadas sin consulta.
Manifiestos originales conservados; recibos de uso/ingesta real en
[backend-validation](../evaluations/backend-validation-2026-10-29.json).

# Fuentes del incremento Expediciones, 29-10-2026

Consultadas en esta misión: [Meta STT](https://dev.meta.ai/docs/speech-to-text),
[fundamentos de voz](https://dev.meta.ai/docs/cookbook/voice-api-fundamentals),
[tool/function calling](https://dev.meta.ai/docs/cookbook/tool-function-calling),
[Chat Completions](https://dev.meta.ai/docs/cookbook/quickstart-chat-completions).
ASR `muse-voice-transcribe-1.0`: archivos WAV mono PCM 16 bits 16/24 kHz, endpoint
multipart `/v1/asr/transcribe`; nuestro contrato reduce a 60 s/3 MiB. Muse `muse-spark-1.3`:
definiciones `tools.function`, argumentos JSON y retorno con `tool_call_id`.
Documentación consultada no demuestra acceso o créditos en esta sesión. No se realizaron
llamadas nuevas ni se asumió TTS. Referencias por especie en
[DATASET_LICENSES](DATASET_LICENSES.md); no se afirma validación humana de los rasgos.

## SAM API Visual Lab — consultado 30-10-2026

- [Ficha SAM 3.1](https://dev.meta.ai/models/sam-3-1),
  [overview](https://dev.meta.ai/docs/sam/overview) y
  [media segmentation](https://dev.meta.ai/docs/media-segmentation): modelo alojado.
- [Prompts](https://dev.meta.ai/docs/sam/segmenting): un concepto o modo espacial,
  Responses/SSE, file_id de video, máscara one_bit y cajas enteras del constructor.
- [Parser oficial](https://dev.meta.ai/docs/sam/client-libraries) y
  [cookbook](https://dev.meta.ai/docs/cookbook/sam-api-basics): parser imagen/video
  acumulativo; dependencia existente meta-sam-parser 0.1.0. No gramática manual.
- [Files](https://dev.meta.ai/docs/file-handling): purpose user_data, máximo proveedor
  1 GiB; expires_after created_at, 3600 a 2592000 s, y DELETE. El lab reduce a 20 MiB.
- [Precios](https://dev.meta.ai/docs/pricing-rate-limits): Standard SAM imagen
  USD 2,50/1000; video USD 0,20/1000 frames con mínimo 50 por solicitud; Muse 1.3
  USD 1,25/4,25 por millón de tokens entrada/salida. Consulta no equivale a factura.
- [Razonamiento](https://dev.meta.ai/docs/reasoning): minimal admitido, none no soportado;
  [Chat Completions](https://dev.meta.ai/docs/protocols/chat-completions). El ensayo none
  falló HTTP 400; se priorizó referencia sobre ejemplo abreviado. Tope de salida incluye
  razonamiento; primer intento de 1200 tokens incompleto.
- [Términos Meta](https://dev.meta.ai/legal/terms-of-service), actualización 09-10-2026,
  y [ZDR](https://dev.meta.ai/help/policies-and-privacy/zero-data-retention): Standard
  sin entrenamiento no implica retención cero; ZDR se habilita aparte y restringe Files.
- [Artículo SAM 3, actualizado a 3.1 el 27-03-2026](https://ai.meta.com/blog/segment-anything-model-3/):
  investigación preexistente del proveedor, no modelo entrenado en este proyecto.

Detalles privados de adquisición y respuestas no se publican en SOURCES. Derechos y
límites en DATASET_LICENSES/DATA_GOVERNANCE; resultados agregados en META_SAM_API_RESEARCH.

## Prompts espaciales y datasets botánicos — consultado 30-10-2026

- [SAM segmenting](https://dev.meta.ai/docs/sam/segmenting): sintaxis de caja/punto,
  `-` para negativos, `x2/y2` inclusivos, ≤16 objetos por solicitud y ≤16 seguidos por
  frame. Prompts en cualquier frame de video, solo frame 0 en imagen, nunca combinados
  con una frase (HTTP 400). `propagation_direction` both/forward/backward desde el primer
  frame con prompt; `backward` exige un frame > 0. Resultados posiblemente desordenados:
  indexar por marcador de frame. `include_confidence` como cadena `"true"`. Los prompts
  espaciales devuelven `one_bit`. Mínimo de facturación de 50 frames.
- [Parser 0.1.0](https://dev.meta.ai/docs/sam/client-libraries) instalado: builder con
  cajas semiabiertas enteras, IDs no negativos, un prompt por objeto y frame.
- [Precios](https://dev.meta.ai/docs/pricing-rate-limits): sin cambios respecto a la
  consulta anterior; 3000 solicitudes/minuto por equipo para sam-3.1.
- [Migración GBIF a COL XR](https://data-blog.gbif.org/post/catalogue-of-life-taxonomic-backbone/),
  checklist `7ddf754f-d193-4cc9-b351-99906754a03b`. APIs `api.gbif.org/v2/species/match`
  y `v1/occurrence/search?checklistKey=…`. Backbone histórico `d7dddbf4-2cf0-4f39-9b2a-bb099caae36c`.
- Pl@ntNet en GBIF: [verificadas](https://doi.org/10.15468/gtebaa)
  (`7a3679ef-5582-4aaa-81f0-8c2545cafc81`, v1.9) y
  [automáticas](https://doi.org/10.15468/mma2ec) (`14d5676a-2c54-4f94-9023-1e8dcd822aa0`).
  El medio declara licencia y órgano propios (`"autor (cc-by-sa)"`, `"…: leaf"`).
- [Wikimedia Commons API](https://commons.wikimedia.org/w/api.php): `categorymembers` +
  `imageinfo` (`extmetadata`, `sha1`). Licencia por archivo.
- iNaturalist Research-grade en GBIF (`50c9509d-…`): licencia del dataset CC BY-NC 4.0;
  sus registros no se incorporan como candidatas.
- Benchmarks aéreos: [CanopyRS/Detectree2](https://huggingface.co/datasets/CanopyRS/Detectree2)
  (CC BY 4.0, polígonos) y [NeonTreeEvaluation](https://github.com/weecology/NeonTreeEvaluation)
  (CC0, cajas). No descargados.

## Ecosistema y piloto Puyehue — consultado 31-10-2026

| Fuente | Uso | Pendiente |
| --- | --- | --- |
| [CONAF, PN Puyehue](https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/) | Superficie de 112.755 ha, sectores, ecosistemas, 8 árboles, fauna, reglas y horario | Senderos de Anticura no nombrados; reverificar antes de la demo |
| [CONAF, PN Puyehue](https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/) (reconsulta 03-11-2026) | Tarjeta del parque en el Atlas móvil: 112.755 ha, creación 1941 y deslindes de 1981, tres sectores, más de 130 aves, árboles por altitud, horario 9:00-17:30 y acceso por la ruta 215-CH; hechos redactados con palabras propias, sin copiar la ficha | La superficie de SIMBIO difiere (abajo); la tarjeta cita CONAF |
| [OSM, relación 4741077](https://www.openstreetmap.org/relation/4741077) (v17, consulta 03-11-2026) | Límite aproximado del parque dibujado en el mapa, simplificado a 169 vértices, ODbL | Capa oficial con licencia; detalle en [DATASET_LICENSES.md](DATASET_LICENSES.md) |
| [Wikimedia Commons, Puyehue National Park](https://commons.wikimedia.org/wiki/Category:Puyehue_National_Park) (03-11-2026) | Cinco fotos CC BY-SA 4.0 de la galería del parque | Reemplazar por fotos del backend |
| [SIMBIO 971](https://simbio.mma.gob.cl/CbaAP/Details/971) | Superficie de 102.521,7 ha (1994), ecosistemas, UICN II, administración CONAF | Conflicto de superficie con CONAF registrado |
| [SBAP, 16-06-2026](https://sbap.gob.cl/sala-de-prensa/noticias-y-comunicados/detalle/2026/06/16/traspaso-del-programa-de-%C3%A1reas-silvestres-de-conaf-al-servicio-se-realizar%C3%A1-a-partir-de-marzo-de-2027) | Traspaso anunciado «a partir de marzo de 2027» | No concluido |
| [Portal RCE](https://clasificacionespecies.mma.gob.cl/) y [DS 54/2025](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2026/03/DS_54_2025_MMA_oficializa_20_RCE-DO_5_3_2026.pdf) | Nómina, 20.º proceso, publicación en el DO el 05-03-2026 | Discrepancias de fecha registradas en [RCE](RCE_CONSERVATION_2026.md#versionado-y-discrepancias) |
| [Ficha 14.º proceso](https://clasificacionespecies.mma.gob.cl/procesos-de-clasificacion/14o-proceso-de-clasificacion-de-especies-2017-2018/listado-de-especies-y-fichas-finales-14o-proceso-rce/) | Olivillo VU norte / LC sur | — |
| [mycoBaseCL](https://doi.org/10.32942/X20T2N) | Catálogo de hongos de Chile, preprint v1 | Sin revisión por pares; licencia del dataset |

## Biblioteca multimedia — 02-11-2026

- **Wikimedia Commons** (medios enlazados en `taxa.json`): licencia por archivo, autor y URL
  de fuente conservados en cada registro. Consulta de licencias previa a la incorporación.
- **GBIF / iNaturalist** (medios enlazados en `taxa.json`): licencia del medio, no del registro;
  los registros NC o ND quedan fuera.
- **FFmpeg 8.1.1** (herramienta local, no redistribuida): normalización de rotación, clips sin
  audio y sin metadatos. Documentación de opciones: <https://ffmpeg.org/documentation.html>.
- **Pillow** (dependencia ya presente en `services/api`): lectura EXIF, orientación y escritura
  de derivados sin metadatos. Documentación: <https://pillow.readthedocs.io/>.
- **BCN SNASPE** (polígono simplificado, privado): comparación de ubicación para las fotos
  propias; sin redistribución.

## Atlas nacional de parques y senderos — consulta 03-11-2026

- [Archivo CONAF de parques nacionales](https://www.conaf.cl/tipo_parque/parque-nacional/) y sus 46 fichas: superficie, provincias, comunas, avisos de visita, accesos y 190 senderos de 23 fichas. Detalle y matriz en [data/public/conaf/README.md](../data/public/conaf/README.md).
- [BCN Mapoteca SNASPE](https://www.bcn.cl/siit/mapas_vectoriales/index_html): encuadres por parque.
- [SIT CONAF](https://sit.conaf.cl/): sin capa de senderos documentada; «todos los derechos reservados».
- [IDE MMA Biodiversidad](https://arcgis.mma.gob.cl/server/rest/services/IDE/Biodiversidad_IDE/MapServer): requiere token; no usado.
- Secundarias: [parquenacionalpuyehue.cl](https://parquenacionalpuyehue.cl/actividades-experiencia/) (seis candidatos de sendero, conflicto de superficie) y [parquesnacionaleschilenos.cl](https://parquesnacionaleschilenos.cl/) (directorio).

## Wilo y enriquecimiento del catálogo — consulta 03-11-2026

- Fichas MMA de especie clasificada (RCE), PDF de 2019: [*Dromiciops gliroides*](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Dromiciops_glirioides_P07.pdf), [*Leopardus guigna*](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Leopardus_guigna_P07.pdf) y [*Puma concolor*](https://clasificacionespecies.mma.gob.cl/wp-content/uploads/2019/10/Puma_concolor_P07.pdf).
- [Fundación R. A. Philippi, catálogo de flora](https://fundacionphilippi.cl/catalogo/) (ulmo, olivillo, tineo, tepa, mañío y coigüe de Magallanes), [UdeC Flora y fauna](https://florayfauna.udec.cl/nothofagus-dombeyi-mirb-oerst/) y [SIB Argentina](https://sib.gob.ar/especies/nothofagus-pumilio).
- [GBIF species API, nombres vernáculos en inglés](https://api.gbif.org/v1/species/): solo vocabulario de búsqueda y ASR (`resources/vernacular-en.json`).
- [Commons 156105289](https://commons.wikimedia.org/wiki/File:Digue%C3%B1e_con_apotecios_formados.jpg) (digüeñe, CC BY-SA 4.0).
- Meta: [speech-to-text](https://dev.meta.ai/docs/speech-to-text), [schemas](https://dev.meta.ai/docs/api-reference/voice/schemas), [transcribe](https://dev.meta.ai/docs/api-reference/voice/transcribe) y [pricing](https://dev.meta.ai/docs/pricing-rate-limits), consultados el 03-11. Límites observados en la API real: keywords de 30 caracteres o menos y 500 como máximo (ver [WILO_ASR_REAL_EVALUATION.md](WILO_ASR_REAL_EVALUATION.md)).

## Despliegue cloud: consulta del 03-11-2026

- Precios: Cloud Billing Catalog API (`cloudbilling.googleapis.com/v1/services/*/skus`, moneda CLP), con los SKU de Cloud SQL para PostgreSQL y de Cloud Run en `southamerica-west1` (Santiago).
- Capacidades: tiers de Cloud SQL (`gcloud sql tiers list`) y políticas efectivas de la organización (`gcloud resource-manager org-policies describe --effective`).
- Herramientas: Cloudflare Workers con dominios personalizados y reglas de límite de tasa (fase `http_ratelimit`, plan Free), desplegados con wrangler 4.146.0.

## Sesiones de beta cerrada: consulta del 04-11-2026

- [Cloudflare, HTTP headers: «CF-Connecting-IP in Worker subrequests»](https://developers.cloudflare.com/fundamentals/reference/http-headers/) (actualizado el 28-10-2026). En subpeticiones de un Worker a un origen fuera de Cloudflare, si se reenvían los encabezados originales sin cambios, `CF-Connecting-IP` conserva la IP del cliente. Lo usa el límite de canjes fallidos por IP; el Worker no se modificó.

## Login federado y cuotas: consulta del 04-11-2026

- [Firebase: Facebook Login en web](https://firebase.google.com/docs/auth/web/facebook-login):
  - App ID y App Secret en el proveedor;
  - redirección `PROYECTO.firebaseapp.com/__/auth/handler`;
  - Facebook exige HTTPS; con `localhost`, la app de Meta debe estar en modo desarrollo y solo funcionan cuentas de prueba.
- [Firebase: Limited Login en iOS](https://firebase.google.com/docs/auth/ios/facebook-login): credencial `OAuthProvider` `facebook.com` con `idToken` y `rawNonce`.
- [Límites de Firebase Auth](https://firebase.google.com/docs/auth/limits):
  - con Identity Platform en el plan sin costo (Spark), 3.000 usuarios activos diarios de Tier 1;
  - 100 cuentas por hora por IP.
- [Precios de Firebase](https://firebase.google.com/pricing): Identity Platform sin costo hasta 50.000 usuarios activos mensuales y luego tarifas de Google Cloud. Que la tarifa Tier 1 incluya Facebook lo indican guías de terceros, no Google.
- [Facebook Login, visión general](https://developers.facebook.com/docs/facebook-login/overview): `public_profile` y `email` no requieren App Review, y se exigen instrucciones o *callback* de eliminación de datos.
- [Niveles de acceso](https://developers.facebook.com/docs/graph-api/overview/access-levels):
  - el acceso estándar solo vale para usuarios con rol en la app;
  - el acceso avanzado sirve a cualquier usuario;
  - una app de consumo debe estar en modo Live;
  - el acceso avanzado puede exigir verificación del negocio.
- [Callback de eliminación de datos](https://developers.facebook.com/docs/development/create-an-app/app-dashboard/data-deletion-callback): basta con una URL de instrucciones o un *callback*. El `signed_request` se verifica con HMAC-SHA256 del App Secret.
- [Apple, App Review Guidelines 4.8](https://developer.apple.com/app-store/review/guidelines/): con login social, hace falta un login equivalente que limite los datos a nombre y correo, permita ocultar el correo y no rastree para publicidad sin consentimiento.
- [FAQ de Facebook Login sobre cuentas administradas de Meta](https://developers.facebook.com/documentation/facebook-login/managed-accounts/faq): el flujo de tokens es el mismo. No encontramos documentación oficial de un OAuth de la «Cuenta de Meta» para terceros.
- [Precios de Meta Model API](https://dev.meta.ai/docs/pricing-rate-limits), consultados el 04-11:
  - Muse Spark 1.3 estándar: USD 1,25 por millón de tokens de entrada y 4,25 por millón de salida;
  - Muse Voice Transcribe: USD 0,18 por hora;
  - SAM 3.1: USD 2,50 por 1.000 imágenes;
  - búsqueda web: USD 2,50 por 1.000.

  La página no informa créditos, su vencimiento ni restricciones geográficas.
- Dependencias nuevas:
  - backend: `pyjwt[crypto]` 2.15.1 (28-09-2026), que trae `cryptography` 50.0.2;
  - Wilo Lab: `firebase` 13.1.0 (21-10-2026). `npm audit` informa `@grpc/grpc-js` dentro de `@firebase/firestore`; Wilo Lab solo importa `firebase/app` y `firebase/auth`, y Firestore no entra en el bundle.

## Demostración pública: consulta del 04-11-2026

- [Cloudflare, HTTP headers](https://developers.cloudflare.com/fundamentals/reference/http-headers/): `CF-IPCountry` se retira en subpeticiones de Workers a orígenes que Cloudflare no proxifica, como `run.app`. Por eso el Worker envía `X-Bosque-Visitor-Country` desde `request.cf.country`.
- [Términos de Meta Model API](https://dev.meta.ai/legal/terms-of-service):
  - 10.1(i): no revender ni dar acceso mediante agregadores, gateways o proxies sin autorización escrita;
  - 10.1(v) y política geográfica;
  - 13.3: los créditos promocionales pueden expirar en el plazo indicado en la cuenta;
  - 17.2: la indemnización no cubre el uso mediante créditos promocionales.
- [Política de uso geográfico](https://dev.meta.ai/legal/geographic-use-policy), actualizada el 12-10-2026. Sección 3: territorios restringidos. No publica una lista de países habilitados.
