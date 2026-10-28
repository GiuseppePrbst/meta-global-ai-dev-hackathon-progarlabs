---
version: 1
slug: "src-app-tabs-atlas-tsx"
primary_target: "src/app/(tabs)/atlas.tsx"
related_targets: ["src/app/(tabs)/_layout.tsx","src/map/atlas-map.tsx"]
---

# Atlas y navegación principal

Modo: Operate. Pestaña Atlas (mapa 2D de referencia + lista textual equivalente) y barra de navegación de cuatro pestañas. Identificar y Registro son pestañas «No implementado» hasta que existan.

Audiencia: turista adulto en terreno y adulto que aprende botánica. Tarea: ubicarse en el entorno de Puyehue, ver que todavía no hay observaciones y saber de dónde viene el mapa. Restricciones: sin observaciones de ejemplo ni coordenadas inventadas; el encuadre CONAF no es límite oficial; no es guía de rutas; atribución OSM visible; 3D fuera hasta el spike y las licencias.

## Direction contract

THESIS: El Atlas como pliego cartográfico del mismo herbario: el mapa base teñido hacia el liquen, la procedencia en etiqueta de herbario y la ausencia de datos dicha con texto. Rechaza el mapa de app genérico a todo color y el pin decorativo.

OWN-WORLD: Hereda el mundo de Especies: barra verde bosque con portada entintada (aquí curvas de nivel abstractas, no relieve real), papel liquen, Literata para títulos, Roboto para la UI, filetes de 1 px. Mapa OSM desaturado (claro) o invertido y tonalizado (oscuro).

STORY: La persona abre Atlas, las curvas de nivel se entintan mientras el mapa baja de la escala regional al encuadre de Puyehue, lee «Sin observaciones cargadas», cambia a Lista y encuentra la explicación y la etiqueta de procedencia del mapa base.

FIRST VIEWPORT: Barra con «Atlas», subtítulo de referencia y botones segmentados Mapa/Lista; mapa a sangre con chip de estado, controles de zoom y encuadre a la derecha, escala abajo a la izquierda y atribución abajo a la derecha; barra de navegación Material 3.

FORM: Herbario / lámina naturalista, extendido a cartografía. seed: none (hereda la dirección fijada en Especies)

FINISH: verificado en web (Chromium headless, 412×892, claro y oscuro); pendiente verificación en Android físico/emulador y DESIGN.md.
