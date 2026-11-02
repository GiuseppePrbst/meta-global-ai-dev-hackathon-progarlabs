---
version: 1
slug: "src-app"
primary_target: "src/app"
related_targets: ["src/app/(tabs)/species.tsx","src/app/(tabs)/observations.tsx","src/app/(tabs)/identify.tsx","src/app/species/[id].tsx","src/ui/components"]
---

# Rediseño playful de toda la app (álbum de campo)

Modo: Operate (app nativa Android, Expo). Alcance: lenguaje visual de todas las pestañas, la ficha y los componentes de `src/ui`. Pedido por la persona responsable el 30-10-2026: más playful y con componentes de gamificación (referencia Dribbble «Recyclean»), manteniendo la guía de campo de acuarela, las ilustraciones y la misma paleta. Observaciones será una guía que la persona completa con fotos de especies; esa funcionalidad NO se construye aún.

Decisiones confirmadas: catálogo como álbum de cromos en grilla de 2 columnas; piezas de gamificación en estado cero honesto (valores reales, p. ej. «0 de 8», con cinta «No implementado»), sin puntos ni logros inventados.

## Direction contract

THESIS: La guía de campo de acuarela se vuelve un álbum de cromos por completar. Rechaza la lista de filas con filetes finos y los paneles planos de app de catálogo: cada especie es un cromo pegado con canto de cartón, y cada vacío es un hueco punteado que invita a llenarlo.

OWN-WORLD: Misma paleta (verde bosque, lima, menta, copihue único, papel frío con grano). Cromos blancos de radio 24 con contorno de tinta `leafInk` de 2 dp y canto inferior de 4 dp en tinta que se hunde al tocar; botones en píldora con el mismo canto; barra de progreso con aguada lima dentro de un contorno de tinta; huecos punteados con la silueta de la hoja; cintas de estado más gruesas. Bricolage 800 también en botones y cifras.

STORY: La persona ve un álbum de especies que existe y una guía propia vacía (0 de N) que se llenará fotografiando; entiende qué falta, qué es demostración y qué todavía no funciona, y abre una ficha.

FIRST VIEWPORT: Especies: banda pintada con título, recuento y búsqueda; bajo el filo, aviso de demostración y la grilla 2×N de cromos (lámina sobre aguada, N.º a mano en copihue, nombre, científico, cinta Provisional). Registro: banda, tarjeta «Tu guía de campo» con barra 0 de N y cinta No implementado, grilla de huecos punteados, botón con canto.

FORM: Álbum de cromos sobre el cuaderno de acuarela, dirección fijada por la persona; 1.º de la lista. No se ejecutó el sorteo (concept-seed) porque la dirección venía fijada: seed: none (sorteo omitido, dirección fijada por la persona)

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance

Señal interactiva: el canto de tinta que se hunde al presionar cromos y botones (solo lo que se toca lleva canto; las tarjetas quietas solo contorno), y el ícono de navegación que rebota al activarse; con movimiento reducido, sin rebote.
