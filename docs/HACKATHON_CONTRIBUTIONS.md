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
