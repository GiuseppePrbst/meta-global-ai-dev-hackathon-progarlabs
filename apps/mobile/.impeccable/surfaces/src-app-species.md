---
version: 1
slug: "src-app-species"
primary_target: "src/app/species"
related_targets: ["src/app/species/[id].tsx"]
---

# Especies: lista y ficha

Modo: Operate. Pestaña Especies (catálogo) y ficha `species/[id]`. Datos mock locales; sin backend todavía.

Audiencia: turista adulto en terreno y adulto que aprende botánica. Tarea: recorrer el catálogo, distinguir especies por rasgos y abrir la ficha con estado y procedencia. Restricciones: todo es provisional; los rasgos son texto de demostración rotulado; la lámina es ilustración conceptual rotulada; sin fotos, métricas ni coordenadas.

Rediseño 28-10-2026 pedido por la persona: más lúdico, más contraste, elementos de acuarela; alcance toda la app; cuaderno de campo en vez de herbario serio; paleta de verdes intensos con un solo acento cálido.

## Direction contract

THESIS: El catálogo como cuaderno de campo de acuarela: cada especie es una página pintada en terreno, tinta suelta sobre una aguada verde que no calza del todo. Rechaza el herbario gris-verde de filetes finos y la grilla de tarjetas con foto.

OWN-WORLD: Papel de acuarela blanco frío, bandas de aguada verde bosque profundo con borde mojado irregular, verdes intensos (musgo, hoja, lima) y un solo acento cálido copihue. Bricolage Grotesque ExtraBold para títulos, Literata cursiva para nombres científicos, Kalam para anotaciones a mano cortas, Roboto para la UI. Etiquetas como cinta adhesiva.

STORY: La persona ve ocho especies pintadas, todas con cinta «Provisional», las distingue por forma de hoja y mancha, abre una ficha, lee notas de terreno rotuladas como borrador y encuentra la etiqueta de procedencia pegada con cinta.

FIRST VIEWPORT: Lista: banda de aguada verde con borde mojado, «Especies» en blanco 36 sp, hojas pintadas a la derecha, búsqueda blanca; aviso de demostración; filas de 96 dp con mancha de color y hoja entintada 64 dp, nombre, científico en cursiva, cinta Provisional, número a mano. Ficha: lámina grande con aguada desfasada, nombre, estado, notas, etiqueta con cinta.

FORM: Cuaderno de campo de acuarela, fijado por la persona. Firma: tinta y aguada fuera de registro en cada lámina. seed: none (direction pinned by user)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
