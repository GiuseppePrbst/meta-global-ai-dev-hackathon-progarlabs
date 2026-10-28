---
version: 1
slug: "src-app-tabs-atlas-tsx"
primary_target: "src/app/(tabs)/atlas.tsx"
related_targets: ["src/app/(tabs)/_layout.tsx","src/map/atlas-map.tsx","src/app/(tabs)/identify.tsx","src/app/(tabs)/observations.tsx"]
---

# Atlas y navegación principal

Modo: Operate. Pestaña Atlas (mapa 2D de referencia + lista textual equivalente), pestañas pendientes Identificar y Registro, y barra de navegación de cuatro pestañas.

Audiencia: turista adulto en terreno y adulto que aprende botánica. Tarea: ubicarse en el entorno de Puyehue, ver qué observaciones sintéticas hay y saber de dónde viene el mapa. Restricciones: observaciones sintéticas rotuladas; el encuadre CONAF no es límite oficial; no es guía de rutas; atribución OSM visible; 3D fuera hasta el spike y las licencias.

## Direction contract

THESIS: El Atlas como página de mapa del mismo cuaderno de campo: lomas pintadas en la portada, el mapa base teñido hacia los verdes, los puntos como gotas de tinta copihue. Rechaza el mapa genérico a todo color y el pin decorativo.

OWN-WORLD: Hereda Especies: banda de aguada verde profunda con borde mojado, papel blanco frío, verdes intensos y acento copihue, Bricolage Grotesque para títulos, Kalam para anotaciones, Roboto para la UI, etiquetas con cinta. La barra de navegación Material 3 marca el destino con una mancha de acuarela lima.

STORY: La persona abre Atlas, las lomas se pintan mientras el mapa baja al encuadre de Puyehue, ve las gotas de observaciones sintéticas, cambia a Lista y encuentra la explicación y la etiqueta de procedencia del mapa base.

FIRST VIEWPORT: Banda con «Atlas», subtítulo y segmentado Mapa/Lista; mapa a sangre con chip de estado, controles de zoom y encuadre a la derecha, escala abajo a la izquierda y atribución abajo a la derecha; barra de navegación con mancha lima en el destino activo.

FORM: Cuaderno de campo de acuarela extendido a cartografía. seed: none (direction pinned by user)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
