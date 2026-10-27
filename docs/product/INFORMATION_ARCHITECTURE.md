# Arquitectura de información

| Ruta | Pregunta que resuelve | Contenido y siguientes pasos |
| --- | --- | --- |
| `/` | ¿Qué puedo descubrir aquí? | Propuesta, estado de la base y acceso a identificar, especies y atlas. |
| `/identificar` | ¿Qué puedo aprender de esta foto? | Foto, preview, confirmaciones, petición, candidato/abstención/error y borrador. En base actual, mock explícito. |
| `/especies` | ¿Qué especies forman el catálogo? | Filtro, fichas, nombre científico/común, provisionalidad y fuente; API o fallback demo visible. |
| `/atlas` | ¿Cómo se relaciona con el territorio? | Mapa, contexto de Puyehue, fuente CHMv2 y estados de datos. No límites/rutas oficiales inventados. |
| `/proyecto` | ¿Quién lo construye y qué está listo? | ProGarLabs, alcance, limitaciones, privacidad y desarrollo de hackatón. |

Las entidades compartidas son **especie**, **observación**, **resultado de identificación**, **área** y **fuente/capa**. El ID de especie enlaza servicios y fichas; la procedencia viaja con el dato. Una observación puede carecer de coordenadas o confirmación taxonómica; no convertir ausencia en cero ni en certeza.

Navegación principal consistente; mensajes de estado conservan acceso a fichas aunque falle API/mapa. «Dato demo», «provisional», «estimado», «no configurado» y «no implementado» son estados distintos y visibles. Mostrar atlas sin puntos mediante un estado vacío, sin fabricar individuos para poblarlo.

Producto define agrupación y lenguaje de necesidades; José decide interacción/componentes; Giuseppe revisa entidades/contratos y trazabilidad. El diseño empresarial de Fabiana no implica una contribución competitiva autorizada.
