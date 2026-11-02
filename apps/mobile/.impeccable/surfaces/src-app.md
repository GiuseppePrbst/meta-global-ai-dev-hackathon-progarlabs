---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/app/(tabs)/species.tsx","src/app/(tabs)/observations.tsx","src/app/(tabs)/identify.tsx","src/app/(tabs)/atlas.tsx","src/app/species/[id].tsx","src/ui/components"]
---

# Rediseño de toda la app: guía de naturaleza moderna, oscura y lima

Modo: Operate (app nativa Android, Expo). Alcance: lenguaje visual de todas las pestañas, la ficha y los componentes de `src/ui`. Pedido por la persona responsable el 02-11-2026 con una imagen de referencia de tres pantallas (mapa, lista de especies, diario) y la instrucción «sigue completamente el lenguaje visual de la imagen». Reemplaza al álbum de cromos de acuarela anterior.

Decisiones confirmadas: 4 pestañas (Identificar · Mapa · Especies · Diario), sin Perfil. Mapa con un sendero de demostración sintético rotulado como mock; «Iniciar sendero» abre un recorrido por paradas sin GPS. Mapa satelital: solo se prepara el estilo oscuro sobre OSM; el proveedor satelital con licencia queda pendiente. Diario como la referencia (Descubrimientos, Senderos, Insignias; especies, senderos, km e insignias) con datos de demostración rotulados, sin GPS. Se abandona el lenguaje de acuarela.

## Direction contract

THESIS: Una guía de naturaleza contemporánea con alto contraste: el bosque oscuro como fondo del mapa y la lima como única señal de lo activo. Rechaza el cuaderno de acuarela con bandas pintadas y cromos con canto.

OWN-WORLD: Verde casi negro (#111A14, tarjetas #1B2620) para el mapa, la barra de navegación y la tarjeta de cifras; fondo claro casi blanco (#F6F7F2) con tarjetas blancas de radio 20 y filete fino para Especies y Diario; lima (#C9EA6A) en chips activos, botones primarios, sendero, check y barra de progreso, siempre con texto verde oscuro encima. Figtree en toda la app (800 en títulos, cursiva para nombres científicos). Íconos de trazo redondeado 1,8.

STORY: La persona ve dónde está el sendero de demostración y qué especies se observaron, recorre el catálogo con fotos de referencia y ve en su diario qué especies ya sumó y cuáles faltan, sin confundir datos de demostración con registros reales.

FIRST VIEWPORT: Mapa: título y botones redondos arriba, chips de capas, mapa oscuro a pantalla completa con sendero lima y marcadores circulares; tarjeta oscura inferior con el sendero y botón lima «Iniciar sendero». Especies: título grande, búsqueda, chips de familia, tarjetas horizontales con foto cuadrada, nombre, científico en cursiva, etiquetas, descripción y botón lima «Ver ficha». Diario: título, pestañas en píldora, tarjeta oscura de cuatro cifras, avance de la guía, chips y grilla 3 columnas con check o candado y silueta.

FORM: Lenguaje visual de la imagen de referencia, dirección fijada por la persona; 1.º de la lista. No se ejecutó el sorteo (concept-seed) porque la dirección venía fijada: seed:126250742fdc5553 (sorteo registrado después; la dirección sigue fijada por la persona y prevalece sobre el sorteo)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Señal interactiva: el sendero lima que se dibuja sobre el mapa oscuro al cargar, y el recorrido por paradas que lleva la cámara de parada en parada; con movimiento reducido, sin animación.
