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
