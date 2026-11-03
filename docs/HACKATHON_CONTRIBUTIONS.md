# Trazabilidad de contribuciones

Ventana declarada de construcción: 26 de octubre–4 de noviembre de 2026. Bootstrap iniciado el 27 de octubre. Este registro separa trabajo nuevo, dependencias y antecedentes; los commits y el [informe](BOOTSTRAP_REPORT.md) proporcionan evidencia técnica.

## Trabajo nuevo de inicialización

| Componente | Trabajo realizado durante el bootstrap | Evidencia / límites |
| --- | --- | --- |
| Repositorio y operación | Gobernanza, README, configuración, CI y procedimiento Git | Diff/commits y reporte de validación. No acredita despliegue productivo. |
| Web | Shell Next.js, rutas, componentes, fixtures y pruebas | `apps/web/`; contenido demo señalado. |
| API, IA y GIS | FastAPI, modelos/contratos, catálogo provisional, clientes desacoplados, mocks y base PostGIS/GIS | `services/`, `data/synthetic/`; no evaluación ni inferencia real acreditada. |
| Producto y ciencia | Visión, journeys, prioridades, fuentes, protocolos y roadmap | `docs/`, `evaluations/`; hipótesis pendientes de investigación humana. |

El bootstrap se desarrolló con asistencia de un agente de código dirigido por el usuario. La cuenta humana verificada que ejecuta los commits figura en Git; no se atribuye implementación manual a otra persona, ni se insertan autores de bots o identidades ficticias. La autoría de un commit no equivale a la responsabilidad funcional de un módulo.

## Material y conocimiento preexistentes

- Next.js, React, Tailwind, MapLibre, FastAPI, Pydantic, PostgreSQL/PostGIS, clientes y herramientas de prueba son dependencias de terceros; sus licencias y versiones se conservan en los manifests/locks. No se presentan como inventos del equipo.
- Muse Spark, SAM 3.1, DINOv3 y CHMv2 son herramientas/productos de Meta y colaboradores. No se entrenaron ni crearon aquí; las llamadas reales y resultados deben registrarse cuando existan.
- Nombres de especies, visión y responsabilidades provienen del encargo de ProGarLabs. No equivalen a investigación de usuarios, taxonomía validada ni observaciones de terreno nuevas.
- La marca y experiencia empresarial de ProGarLabs son antecedentes; ningún proyecto Hepta, imagen privada, dato LiDAR ni derivado fue autorizado para esta entrega.

Fabiana mantiene su rol empresarial de Product Designer, pero **no se le atribuyen contribuciones competitivas ni admisión**. Antes de incorporar cualquier aporte directo suyo registrar autorización del organizador, alcance y fecha.

## Registro para cada incorporación posterior

En cada PR indicar fecha, autor real, tarea, archivos, pruebas ejecutadas, trabajo nuevo frente a reutilizado, fuentes/licencias y permisos. Para IA añadir modelo/versión, modo real/mock, prompt versionado, métricas y evidencia sin secretos. Para dataset añadir manifiesto y validación. Si se reutiliza código anterior al evento, identificar origen/commit y explicar qué se añadió durante la hackatón.

Antes de enviar, el representante admitido revisa historial, derechos, integrantes, formulario y video. El cumplimiento final de la competencia sigue pendiente; ver [SOURCES.md](SOURCES.md).

## Fundación GIS/ML — 27 de octubre de 2026

Trabajo nuevo asistido por agente, dirigido por el usuario: taxonomía GBIF trazable,
validación de imágenes, Muse estructurado integrado con controles de desarrollo, parser
SAM oficial y segmentación opcional, evaluación A/B reproducible y proveedor raster local
con tests sintéticos y ventana CHMv2 real pequeña. Rama feat/gis-ml-foundation derivada
del bootstrap; cuenta humana verificada GiuseppePrbst. No se atribuye autoría a José ni
contribuciones competitivas a Fabiana. [Evidencia y límites](GIS_ML_REPORT.md).

Reutilizado: todo el bootstrap d15d1aa, clientes HTTP, contratos GeoJSON, PostGIS, frontend;
GBIF Backbone y CHMv2 son productos preexistentes de terceros, no datos recolectados aquí.
Meta muse-spark-1.3/sam-3.1 y meta-sam-parser 0.1.0 son productos/dependencias preexistentes.
Se ejecutaron llamadas reales sobre dibujo sintético y una ventana raster abierta; no se
entrenó modelo ni descargaron pesos. Cero fotos botánicas etiquetadas evaluadas.
El historial técnico no acredita por sí solo admisión ni elegibilidad competitiva.

## Contexto forestal verificable — 27 de octubre de 2026

Incremento nuevo asistido por agente para Giuseppe: adquisición pública acotada, perfiles
reales de piloto CONAF/BCN, contratos de contexto point/area, migración/store PostGIS,
resolución taxonómica parcial, lectura de índices temporales CHMv2 y ponderación por huella.
Se preservan clientes Meta, catálogo, observaciones y frontend. Cero modelos entrenados,
fotos humanas evaluadas o llamadas Meta nuevas. Trabajo previo #13 y Research Pack son
antecedentes; el ZIP se verificó y sus tests se ejecutaron aparte, no se copió a ciegas.
Fiona/PyArrow/Shapely/PostGIS y los datasets son dependencias/productos preexistentes.

Se preparó PR de reconciliación #15 porque el merge de #13 a bootstrap no había llegado
a main. Sin merge automático ni cambios a PR ajenos. Informe, fuentes, comandos y límites
en [FOREST_CONTEXT_REPORT](FOREST_CONTEXT_REPORT.md). Autor/committer humano verificado
GiuseppePrbst; no se atribuye implementación a José ni contribución competitiva a Fabiana.
# Incremento del 29-10-2026

GiuseppePrbst autorizado/verificado, asistencia de Codex: consolidación explícitamente
autorizada #15/#16 con merge commits y CI combinado, ingesta PostGIS real sobre recorte
preexistente, controles de demo/presupuesto/privacidad y aislamiento raster; no frontend/móvil.
Código nuevo y dependencias/datasets preexistentes diferenciados en
[reporte de consolidación](BACKEND_META_CONSOLIDATION_REPORT.md).
PostgreSQL/PostGIS de prueba instalado en WSL con autorización específica del usuario.
Dos llamadas nuevas autorizadas a Meta sobre dibujo generado; ninguna foto privada transferida.
No hay conjunto botánico evaluable ni métricas de calidad; Fabiana mantiene rol empresarial
sin atribución de participación competitiva no confirmada. Git/CI no acreditan elegibilidad.

## Expediciones GIS/ML — 29-10-2026

Trabajo nuevo dirigido por Giuseppe con asistencia de Codex: evolución multivista, adaptación
STT documentada, herramientas botánicas de lectura con límites y referencias, evidencia
privada, capturas sobre observations, colección/idempotencia, migración 004, tests y contratos.
Rama `feat/meta-expeditions-gis-ml` basada en #17 abierto, sin merge. Web/móvil no modificados.
Sin atribución a José ni entregables competitivos de Fabiana. Identidad humana verificada
antes de escrituras; no autores de agentes ni coautores ficticios.

Reutilizado: commit `7c9c2cec22eef489c08ca1ef243c229a961a268a`, cliente httpx y parser SAM,
Pydantic/FastAPI/PostGIS, ledger/observaciones/contexto/worker, catálogo y GBIF previos.
Hechos morfológicos resumidos desde referencias botánicas preexistentes; fuentes/derechos en
DATASET_LICENSES. No se crearon datos de campo ni modelos; ningún audio real, fotografía
externa, video, peso o dato Hepta se incorporó. No se hizo una nueva llamada pagada.
Evaluación botánica n=0 y métricas nulas; mocks no se presentan como calidad científica.
Ventana declarada del evento 26-10–04-11-2026; Git no determina elegibilidad.
[Informe y validaciones](META_EXPEDITIONS_REPORT.md).

## SAM API Visual Lab — 30-10-2026

Trabajo nuevo dirigido por Giuseppe con asistencia de Codex: laboratorio hosted-only,
preparación segura ZIP/FFmpeg, Files/SSE/parser, renderizador y visor independiente,
límite acumulado optativo, tests sintéticos y documentación. Se ejecutaron seis
solicitudes SAM completadas y tres intentos Muse, más un ensayo espacial abortado
localmente antes de Responses. Una máscara real de fotografía; cero tracks reales.
Sin modificaciones web/móvil ni atribuciones a José o Fabiana.

Preexistentes: rama #18, cliente Meta/ledger/PostGIS, parser 0.1.0, Pillow/FastAPI y
modelos alojados de Meta; fotos/video de terceros con permiso privado específico,
no datos creados para el hackathon ni autorizados para publicación. FFmpeg es herramienta
de preparación. No entrenamiento/calibración ni nuevas dependencias ML. Preparación
local SAM 2 de la misión anterior fue cancelada y sus pesos/torch retirados al cambiar
el mandato; nunca hubo inferencia local. Ventana declarada 26-10–04-11-2026; fuentes,
permisos y elegibilidad requieren revisión humana. Git no acredita admisión competitiva.

## SAM espacial y registro botánico — 30-10-2026

Trabajo nuevo dirigido por Giuseppe con asistencia de Claude Code (Claude Opus 5.5):
prompts espaciales (cajas, puntos, multiobjeto, frames y correcciones) con el builder
oficial, vista previa obligatoria, geometría del visor, parametrización de resolución,
métricas de máscara y tracking, revisión humana privada, desglose por órgano, registro
botánico GBIF COL XR/Commons, tests y documentación. **Cero llamadas pagadas**. Clips de
resolución preparados localmente con FFmpeg sobre el video privado autorizado.

Preexistentes: PR #19 y su pila, parser 0.1.0, Pillow/FastAPI/Playwright, APIs públicas de
GBIF y Wikimedia, y datos de terceros (metadatos, autores y licencias por archivo). Las
miniaturas para hashing quedan fuera de Git y no se redistribuyen. Sin cambios en web o
móvil. Ninguna atribución a José ni a Fabiana.

## Campaña de validación Meta — 30-10-2026

Trabajo nuevo dirigido por Giuseppe con asistencia de Claude Code (Claude Opus 5.5).
Incluye:
- Techo de investigación de USD 50 por fases, con vista de costos.
- Corrección del truncamiento de Muse.
- Revisión taxonómica con COL XR y WFO.
- Benchmark Detectree2, driver botánico y propuestas Muse de copas.
- Inferencias reales: 133 solicitudes nuevas, costo estimado USD 0,818.

El agente inspeccionó visualmente medios Hepta y fotos botánicas con autorización del
propietario; sus anotaciones están etiquetadas como del agente. Preexistentes: datos
Hepta privados, Detectree2 (CC BY 4.0), fotos Pl@ntNet/Commons con licencia por archivo,
APIs GBIF/WFO y modelos alojados de Meta. Sin cambios web/móvil ni atribuciones a José o
Fabiana.

## Consolidación e identificación open-set — 30-10-2026

Giuseppe autorizó los merges secuenciales de #17 a #21 (merge commits, sin `--admin`;
`main` sin protección configurada). Trabajo nuevo con asistencia de Claude Code (Claude
Opus 5.5):
- Contrato y estrategias open-set.
- Comparadores con fuente.
- Conjunto independiente congelado.
- Métricas pareadas.
- Contratos para José.

La revisión visual de casos es del agente. Sin cambios web/móvil ni atribuciones a José o
Fabiana. Preexistentes: fotos Pl@ntNet/Commons con licencia por archivo, fichas de
Fundación Philippi, conifers.org y RHS, y modelos alojados de Meta.

## Alineación de producto y piloto Puyehue — 31-10-2026

Trabajo nuevo durante el evento:

- documentos [visión](PRODUCT_VISION_ECOSYSTEM.md), [piloto](PILOT_PUYEHUE.md),
  [RCE](RCE_CONSERVATION_2026.md) y [modelo](ECOSYSTEM_DATA_MODEL.md);
- actualizaciones del README, el roadmap, el backlog y los contratos.

Sin código de producto, migraciones ni endpoints. Material preexistente o de terceros
citado: ficha CONAF, SIMBIO, comunicado SBAP, nómina RCE del MMA (no versionada),
mycoBaseCL (preprint).

Redacción y análisis con asistencia de Claude (Anthropic) en una sesión local de
Giuseppe. Las decisiones de producto provienen del encargo de ProGarLabs. Fabiana García
figura como diseño de producto empresarial; no se le atribuyen entregables competitivos
mientras su admisión no esté confirmada.

### 31-10-2026 — backend multirreino y evaluación Meta (rama `feat/puyehue-biodiversity-meta-evaluation`)

Código nuevo durante el evento:

- catálogo multirreino tipado (`bosque_api/biodiversity.py`, `resources/taxa.json`);
- conservación RCE regional (`resources/conservation.json`, `evaluations/rce_import.py`);
- rutas `/taxa`, `/taxa/{id}`, `/taxa/{id}/conservation` y `/parks/{id}/biodiversity`;
- pipeline experimental de fauna y hongos (`bosque_ai/multikingdom.py`);
- registro de medios multirreino, priorización, conteo GBIF en Puyehue y campaña Meta
  (`evaluations/biodiversity_*.py`, `multikingdom_campaign.py`, `puyehue_occurrences.py`);
- tests nuevos y reportes en `docs/`.

Material de terceros usado sin versionar medios:

- metadatos de GBIF, iNaturalist, Pl@ntNet y Commons;
- la nómina RCE (solo hechos seleccionados);
- el polígono BCN (privado);
- es.wikipedia y el Atlas ROC (paráfrasis citadas).

Inferencias reales con Meta Model API dentro del techo acumulado de USD 50.

Desarrollo con asistencia de Claude (Anthropic) en una sesión local de Giuseppe, que también
hizo la inspección visual de las fotos. **Esa inspección no es revisión de especialista.**

## Rediseño visual de la app móvil — 02-11-2026

Trabajo nuevo durante el evento, en `apps/mobile/` (rama `feat/ui-redesign`):

- nuevo lenguaje visual (verde casi negro, fondo claro, acento lima, Figtree) a partir de una
  imagen de referencia de tres pantallas aportada por José; reemplaza el cuaderno de acuarela;
- pestañas Identificar · Mapa · Especies · Diario; mapa oscuro con capas, sendero de
  demostración sintético y recorrido por paradas sin GPS; catálogo con filtros y guardadas
  en memoria; Diario con cifras, guía, recorridos e insignias derivadas, todo rotulado como
  demostración;
- lógica pura nueva con pruebas (`demo-trail`, `badges`, filtros del catálogo).

Dependencia de terceros añadida: `@expo-google-fonts/figtree` (Figtree, SIL OFL 1.1). Las
fotos de referencia de Wikimedia Commons ya estaban en el repositorio. El sendero, las
observaciones, los recorridos y la guía son datos sintéticos; no son registros de terreno.

Diseño e implementación con asistencia de Claude (Anthropic) en una sesión local de José,
quien fijó la dirección visual y el alcance. Sin verificación en Android físico en esta sesión.

## Biblioteca multimedia y medios propios — 02-11-2026

Trabajo nuevo en esta rama (`feat/biodiversity-content-media-enrichment`):

- contrato público de medios (`services/api/src/bosque_api/media.py`), dos endpoints y pruebas
  (`services/api/tests/test_media.py`);
- scripts privados de ingesta y preparación (`evaluations/content_library_ingest.py`,
  `evaluations/content_library_prepare.py`);
- documentación de arquitectura, matriz de contenido, contrato para el laboratorio SAM y
  lista de planos de demostración.

Preexistente y reutilizado: 20 taxones, 45 enlaces externos con licencia en `taxa.json`, la
nómina RCE y el polígono BCN. No se añadieron dependencias nuevas.

Medios propios: el ZIP de fotos aportado por el usuario tiene 83 fotografías y 2 videos. No
se publica ninguno. La autoría no está confirmada y **no se atribuye a ningún participante**
(la participación de quien aparece en el nombre del archivo no está confirmada). Las
inspecciones visuales son del agente; no son validación de especialista.

Asistencia: sesión de Claude Code con el modelo Claude Haiku 5.5 (Anthropic), iniciada por el
responsable del trabajo en esta rama. La decisión de alcance y la autorización de cada uso
quedan a cargo del titular de los datos.

### 03-11-2026: investigación ampliada de SAM 3.1 (rama `feat/sam31-extended-validation`)

**Código nuevo durante el evento:**

- autorización de créditos gratuitos en el ledger;
- referencias de máscara (GrabCut revisado) con métricas de máscara y de tracking;
- campaña v2 por hipótesis;
- asesor de fallos de Muse;
- correcciones de video;
- panel de métricas y galería editorial del visor;
- compositor con varios cortes.

**Inferencias reales** con créditos gratuitos de Meta, dentro de la autorización del
propietario.

**Medios:** solo públicos con licencia de Commons e iNaturalist.

**División del trabajo:** Opus (Meta Visual Intelligence) y Codex (Content & Media
Intelligence). Este incremento no modifica archivos de Codex.

Desarrollo con asistencia de Claude (Anthropic) en una sesión local de Giuseppe. Las
referencias son del agente, no de un especialista.

## Wilo voice y Knowledge Atlas — 03-11-2026

Código nuevo durante el evento:

- `atlas.py`, `atlas_build.py`, `demo.py`, `wilo.py` y las herramientas de Wilo;
- `language_hint` y las keywords dinámicas;
- grounding por afirmación;
- el proxy WebSocket;
- el parser CONAF revisado (PR #32);
- los evaluadores `evaluations/wilo_*.py`.

Datos públicos preexistentes, con su procedencia en [SOURCES.md](SOURCES.md):

- fichas CONAF, BCN SNASPE, RCE/MMA y GBIF;
- Philippi, UdeC, SIB y Commons.

Evaluación:

- 79 grabaciones reales del propietario, privadas y procesadas con su autorización;
- audio TTS sintético.

Dependencia nueva: `websockets==15.0.1`.

Desarrollo con asistencia de Claude (Anthropic) en una sesión local de Giuseppe. Las auditorías y referencias son del agente, no de un especialista.
