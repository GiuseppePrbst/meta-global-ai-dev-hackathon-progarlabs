---
version: 1
slug: "src-app-species"
primary_target: "src/app/species"
related_targets: ["src/app/species/[id].tsx"]
---

# Especies: lista y ficha

Modo: Operate. Pestaña Especies (catálogo) y ficha `species/[id]`. Datos mock locales; sin backend todavía.

Audiencia: turista adulto en terreno y adulto que aprende botánica. Tarea: recorrer el catálogo, distinguir especies por rasgos y abrir la ficha con estado y procedencia. Restricciones: todo es provisional; los rasgos son texto de demostración rotulado; la lámina es ilustración conceptual rotulada; sin fotos, métricas ni coordenadas. Referencia visual dada por la persona: branch-forest.vercel.app (gramática de lámina científica, solo referencia).

## Direction contract

THESIS: El catálogo como herbario de terreno: cada especie es un pliego con su lámina y su etiqueta de procedencia. Rechaza la grilla de tarjetas con foto y la etiqueta de especie aislada.

OWN-WORLD: Suelo liquen verde-gris (claro) o sotobosque (oscuro), papel de pliego, tinta verde bosque. Literata para nombres (científico en cursiva, convención botánica), Roboto para la UI. Filetes de 1 px, láminas de hoja de trazo fino, estado provisional en ámbar tierra con texto.

STORY: La persona ve ocho especies, todas provisionales, las distingue por forma de hoja, abre una ficha, lee rasgos rotulados como borrador y encuentra la fuente junto al dato.

FIRST VIEWPORT: Lista: barra superior verde bosque con «Especies» y conteo, aviso de datos de demostración, búsqueda, filas de 88 dp con lámina 56 dp, nombre común, científico en cursiva, etiqueta Provisional, número de pliego. Ficha: lámina grande sobre papel con rótulo, nombre, estado, rasgos, etiqueta de herbario.

FORM: Herbario / lámina naturalista, fijado por la referencia de la persona; firma: la etiqueta de herbario como bloque de procedencia. seed: none (direction pinned by user reference)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
