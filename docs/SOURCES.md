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
| [Wikimedia Commons](https://commons.wikimedia.org/) (consulta 28-10-2026) | Ocho fotos de referencia con licencia CC0, CC BY o CC BY-SA, autor y página de archivo por foto, copiadas solo para desarrollo; detalle en [DATASET_LICENSES.md](DATASET_LICENSES.md#fotos-de-referencia-de-la-ficha-app-móvil). | Confirmar identificación de cada foto y reemplazarlas por las del backend. |
| [ProGarLabs](https://progarlabs.com/) | Empresa en Osorno y Fabiana/Giuseppe como cofundadores en la web pública. | No se verificó manual de marca ni HEX oficiales. La paleta del proyecto es una propuesta. |

Copernicus y NASA Earthdata son fuentes candidatas, todavía sin un recurso seleccionado ni licencia específica revisada. Ver [registro de licencias](DATASET_LICENSES.md).

## Infraestructura y encuadre cartográfico

- [Plan de manejo PN Puyehue, CONAF](https://www.conaf.cl/centro-documental/plan-de-manejo-del-pn-puyehue/): referencia del encuadre inicial usado por frontend. No se redistribuye el PDF ni se crea un polígono oficial a partir del rectángulo de visualización; la licencia de geometrías/rutas sigue pendiente.
- [Docker PostGIS oficial](https://github.com/postgis/docker-postgis): recomienda `18-3.6` para instalaciones nuevas y documenta el volumen `/var/lib/postgresql` en PostgreSQL 18+. No se migró una base existente.
- [Docker Compose: orden de inicio](https://docs.docker.com/compose/how-tos/startup-order/): `service_healthy` espera el healthcheck de dependencias, usado para base/API.
- [Gitleaks CLI](https://github.com/gitleaks/gitleaks) y [acción oficial](https://github.com/gitleaks/gitleaks-action): controles de secretos; los resultados realmente ejecutados, versiones y límites se registran en el informe. Un escaneo no acredita ausencia absoluta de datos sensibles.
