---
name: Bosque Vivo Chile
description: Cuaderno de campo de acuarela para descubrir la flora del entorno de Puyehue con evidencia visible.
colors:
  topBar: "#0B5A33"
  topBarGlaze: "#1C8044"
  topBarEdge: "#053B20"
  onTopBar: "#FFFFFF"
  onTopBarVariant: "#D2F09E"
  primary: "#0B5A33"
  onPrimary: "#FFFFFF"
  lime: "#B9E24C"
  navIndicator: "#C3E86A"
  onNavIndicator: "#0F2418"
  accent: "#C7361F"
  onAccent: "#FFFFFF"
  provisional: "#D6EE8C"
  onProvisional: "#1F3308"
  demo: "#D2EFE3"
  onDemo: "#0A4430"
  background: "#EFF5F3"
  surface: "#FFFFFF"
  leafInk: "#0E3F25"
  onSurface: "#0F2418"
  onSurfaceVariant: "#3A5244"
  outline: "#5E7A68"
  outlineVariant: "#C9D8C6"
typography:
  headlineLarge:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "36px"
    fontWeight: 800
    lineHeight: "42px"
    letterSpacing: "-0.6px"
  headlineMedium:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "32px"
    fontWeight: 800
    lineHeight: "38px"
    letterSpacing: "-0.5px"
  titleLarge:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "22px"
    fontWeight: 700
    lineHeight: "28px"
    letterSpacing: "-0.2px"
  titleMedium:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "19px"
    fontWeight: 600
    lineHeight: "24px"
  scientific:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "15px"
    fontWeight: 400
    lineHeight: "20px"
  scientificLarge:
    fontFamily: "Literata, Georgia, serif"
    fontSize: "19px"
    fontWeight: 400
    lineHeight: "26px"
  handBold:
    fontFamily: "Kalam, cursive"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "22px"
  bodyLarge:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  bodyMedium:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  labelLarge:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
    letterSpacing: "0.1px"
  labelMedium:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.4px"
  labelSmall:
    fontFamily: "Roboto, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0.4px"
rounded:
  tape: "2px"
  label: "4px"
  sm: "8px"
  lg: "20px"
  full: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  band-edge: "18px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.onPrimary}"
    typography: "{typography.labelLarge}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  search-field:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.bodyLarge}"
    rounded: "{rounded.full}"
    padding: "0 4px 0 16px"
    height: "56px"
  tag-provisional:
    backgroundColor: "{colors.provisional}"
    textColor: "{colors.onProvisional}"
    typography: "{typography.labelMedium}"
    rounded: "{rounded.tape}"
    padding: "3px 10px"
  tag-not-implemented:
    backgroundColor: "{colors.demo}"
    textColor: "{colors.onDemo}"
    typography: "{typography.labelMedium}"
    rounded: "{rounded.tape}"
    padding: "3px 10px"
  status-banner:
    backgroundColor: "{colors.demo}"
    textColor: "{colors.onDemo}"
    typography: "{typography.bodyMedium}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  provenance-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.label}"
    padding: "16px"
  navigation-bar:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurfaceVariant}"
    typography: "{typography.labelMedium}"
    height: "80px"
  navigation-item-active:
    backgroundColor: "{colors.navIndicator}"
    textColor: "{colors.onSurface}"
    width: "72px"
    height: "40px"
  segmented-switch-selected:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.primary}"
    typography: "{typography.labelLarge}"
    rounded: "{rounded.full}"
    height: "48px"
  map-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.lg}"
    padding: "16px"
  species-row:
    textColor: "{colors.onSurface}"
    typography: "{typography.titleMedium}"
    padding: "12px 16px"
    height: "96px"
---

# Design System: Bosque Vivo Chile

## Overview

**Creative North Star: "Cuaderno de campo de acuarela"**

La app se lee como un cuaderno pintado en terreno: papel de acuarela blanco frío con grano, bandas de aguada verde bosque cuyo filo mojado cae sobre el contenido, hojas entintadas a pulso con una aguada que no calza del todo con la tinta, y etiquetas pegadas con cinta. Este mundo reemplaza al herbario gris-verde de filetes finos que lo precedió; lo fijó la persona responsable el 28-10-2026 y el código actual lo materializa en `src/ui/theme.ts`, `src/ui/watercolor.tsx`, `src/ui/paper.tsx` y `src/features/catalog/leaf-plate.tsx`.

La pintura es generada en código, no rasterizada: cada mancha (`Wash`) y cada banda (`PaintedBand`) es SVG determinista a partir de una semilla (`seedOf(id)` o `seedOf(title)`), así que la misma especie o pestaña muestra siempre la misma mancha. El único ráster es la tesela de grano de 192 px (`assets/images/paper-grain.png`, generada por `scripts/paper-grain.py`, semilla fija), que la app tiñe según el tema. Bajo la acuarela se conserva la estructura de Material 3: barra de navegación de 80 dp con indicador, botones en píldora de 48 dp, escala tipográfica headline/title/body/label y roles `on*`.

La densidad es de lectura en exterior: filas de 96 dp, áreas de toque de 48 dp, alto contraste sobre papel claro y verdes intensos con un solo acento cálido. La incertidumbre se muestra como estado con texto, nunca como adorno.

Límite honesto: este sistema se verificó solo en Expo web (capturas a 412x892 en `.impeccable/review/`); todavía no se ha visto en un Android físico, donde el grano teselado, las veladuras SVG y el `android_ripple` deben confirmarse.

**Key Characteristics:**
- Papel de acuarela frío con grano teñido por tema; sin tarjetas con foto.
- Bandas de aguada verde con filo mojado en todas las barras superiores.
- Tinta y aguada fuera de registro como firma de cada lámina de especie.
- Un solo acento cálido (copihue) para marcas puntuales.
- Estados con texto y forma (cinta, círculo abierto, guion, ícono), nunca solo color.
- Estructura Material 3 intacta bajo la piel de acuarela; tema claro y oscuro.

## Colors

Verdes intensos de bosque, musgo y lima sobre papel blanco frío, con un solo rojo copihue. Los valores del frontmatter son el tema claro; el tema oscuro vive en `theme.ts` (`dark`) y en el sidecar `.impeccable/design.json`.

### Primary
- **Verde bosque de aguada** (`topBar` / `primary`): base de las bandas superiores pintadas y relleno de los botones principales. En oscuro, `primary` pasa a lima para mantener contraste sobre fondo nocturno, mientras la banda conserva un verde profundo.
- **Veladura de hoja** (`topBarGlaze`): veladuras más claras dentro de la banda; también tiñe el mapa.
- **Filo seco** (`topBarEdge`): pigmento acumulado en el borde mojado de la banda (trazos de 9 px al 28 % y 3 px al 45 %).
- **Lima brote** (`onTopBarVariant`): subtítulos y borde del interruptor segmentado sobre la banda.

### Secondary
- **Lima de aguada** (`lime`): aguada detrás de las portadas pintadas (catálogo, atlas), cinta translúcida de la etiqueta de procedencia y marca de nota sin número en la ficha.
- **Lima indicador** (`navIndicator`): mancha de acuarela del destino activo en la barra de navegación.

### Tertiary
- **Copihue** (`accent`): el único acento cálido. Número de lámina a mano («N.º 01»), insignia numerada de rasgo en la ficha, anillo de la lupa, puntos de observación sin verificar en el mapa y el visor ilustrado de Identificar.

### Neutral
- **Papel frío** (`background`): suelo de todas las pantallas, siempre bajo el grano (`grain` al 35 % en claro, 22 % en oscuro).
- **Hoja blanca** (`surface`): etiqueta de procedencia, campo de búsqueda, barra de navegación, tarjetas y controles flotantes sobre el mapa.
- **Tinta de hoja** (`leafInk`): trazo de las láminas, borde de la etiqueta de procedencia y cursor del campo de búsqueda.
- **Texto** (`onSurface`, `onSurfaceVariant`): texto principal y secundario.
- **Contornos** (`outline`, `outlineVariant`): ilustraciones de estado vacío; separadores y bordes finos.

### Colores de estado
- **Provisional** (`provisional` / `onProvisional`): cinta lima del estado taxonómico.
- **Demostración o no implementado** (`demo` / `onDemo`): menta fría, distinta de la cinta lima, para el aviso de datos de demostración y la cinta «todavía no».

### Aguadas por especie
`leaf-plate.tsx` asigna a cada especie un verde propio para su aguada (`speciesWash`, de `#1E8A6A` a `#A4BF22`, con `#3E9B3A` por defecto). Ese color solo ayuda a distinguir láminas de un vistazo; no codifica ningún dato botánico.

### Named Rules
**The Una Sola Voz Cálida Rule.** El copihue es el único color cálido y marca puntos concretos (número de lámina, marcador, anillo, observación sin verificar). Nunca rellena superficies, bandas ni botones.

**The Texto y Forma Rule.** Cada estado lleva texto y una forma propia: círculo abierto para provisional o sin verificar, guion para no implementado, ícono de información para demostración. El color refuerza; nunca es la única señal.

**The Aguada No Es Dato Rule.** Los verdes por especie y las manchas decorativas no codifican información. Si un color tiene que significar algo, se rotula.

## Typography

**Display Font:** Bricolage Grotesque (600, 700, 800)
**Body Font:** Roboto (fuente del sistema en Android; system-ui en web)
**Scientific Font:** Literata Italic 400
**Hand Font:** Kalam Bold 700

**Character:** Una grotesca ancha y enérgica para títulos, cursiva de libro para los nombres científicos según la convención botánica, una letra a mano breve para las anotaciones del cuaderno, y Roboto para toda la interfaz funcional.

### Hierarchy
- **headlineLarge** (800, 36/42, -0.6): título de cada pestaña principal, en blanco sobre la banda.
- **headlineMedium** (800, 32/38, -0.5): nombre común en la ficha de especie.
- **titleLarge** (700, 22/28, -0.2): encabezados de sección (notas de terreno, lista del atlas, pestañas pendientes).
- **titleMedium** (600, 19/24): nombre común en filas y tarjetas; título de la barra de la ficha.
- **scientific / scientificLarge** (Literata cursiva 400, 15/20 y 19/26): solo nombres científicos.
- **handBold** (Kalam 700, 16/22): número de lámina, fecha de la papeleta del mapa y sello al pie de la etiqueta de procedencia.
- **Versalitas** (`labelMedium` en mayúsculas, espaciado 1,2): familia y rótulos de rasgos en la ficha, como en una guía impresa.
- **bodyLarge / bodyMedium** (400, 16/24 y 14/20): texto corrido, avisos, subtítulos.
- **labelLarge / labelMedium / labelSmall** (600/600/500; 14/20, 12/16, 11/16): botones, segmentos, cintas de estado, rótulos de navegación, atribución y pie de fuente.

### Named Rules
**The Cuatro Voces Rule.** Bricolage solo titula, Literata cursiva solo nombra especies, Kalam solo anota y Roboto hace todo lo demás. Ninguna voz invade el rol de otra.

**The Mano Breve Rule.** Kalam se usa en anotaciones de una o pocas palabras; nunca en párrafos, botones ni datos de procedencia.

## Layout

Pantallas de una columna con margen lateral de 16 dp (`space.lg`), escala de espaciado 4/8/12/16/24/32. Cada pestaña principal abre con `ScreenHeader`: la banda pintada ocupa el área segura superior, el título, el subtítulo y opcionalmente un control (búsqueda, interruptor Mapa/Lista); a la derecha, una portada ilustrada decorativa (hojas entintadas o curvas de nivel) que no recibe accesibilidad.

La banda termina en un filo mojado de 18 dp (`BAND_EDGE`) que se superpone al contenido: el encabezado usa `marginBottom: -18` y el contenido que sigue deja `paddingTop` de al menos 18 dp. Las filas de especie miden 96 dp con miniatura de 72 dp (lámina de 60 dp sobre mancha); las del atlas, 72 dp. Los separadores arrancan alineados con el texto, no con la miniatura. Áreas de toque mínimas de 48 dp; barra de navegación de 80 dp más el inset inferior.

La ficha de especie es una entrada de guía de campo, sin cajas: lámina cuadrada a ancho completo y su leyenda; nombre común, científico y familia en versalitas cerrados por un filete de tinta (`leafInk`, 1,5 px); estado; rasgos como lista impresa (rótulo en versalitas `labelMedium` en `leafInk` sobre el texto, entre filetes finos `outlineVariant`, con la insignia copihue «1» en el rasgo señalado en la lámina) y, al final, la etiqueta de procedencia al 92 % del ancho alineada a la derecha.

### Named Rules
**The Filo Mojado Rule.** Todo contenido bajo una banda pintada reserva `BAND_EDGE` (18 dp) arriba; nada importante queda bajo el filo.

## Elevation & Depth

Sistema plano por capas de pigmento. La profundidad la dan las veladuras translúcidas que se oscurecen al cruzarse, el filo de la banda y el grano del papel, no las sombras. Las sombras existen solo en elementos que flotan sobre el mapa o sobre la lámina, como en Material 3.

### Shadow Vocabulary
- **Flotante sobre mapa, bajo** (`elevation: 2`, `shadowOffset 0/1`, `shadowRadius 3`, color `scrim`): chip de recuento y grupos de controles del mapa.
- **Tarjeta sobre mapa** (`elevation: 3`, `shadowOffset 0/2`, `shadowRadius 6`, color `scrim`): papeleta de la observación seleccionada.
- **Lupa** (`elevation: 8`, `shadowOffset 0/6`, `shadowRadius 12`, opacidad 0.25, color `onSurface`): lupa circular sobre la lámina de la ficha.

### Named Rules
**The Papel Plano Rule.** Lo que está pintado o pegado sobre el papel (filas, etiqueta, cintas, avisos) no lleva sombra. La sombra queda reservada a lo que flota sobre un lienzo interactivo.

## Shapes

Dos familias. La pintada es orgánica: manchas de contorno irregular (elipse deformada por armónicos 2, 3 y 5), bandas de borde ondulado y hojas con mitades desiguales y contorno repasado. La funcional es Material 3: píldoras (`full`) para botones, búsqueda, chips e interruptor; 20 dp (`lg`) para avisos, tarjetas y controles flotantes; 8 dp (`sm`) para la atribución del mapa. Las piezas pegadas casi no tienen radio: cinta de 2 dp con giro de -2° o 1,5°, etiqueta de procedencia de 4 dp con borde de 1,5 px en tinta y dos trozos de cinta lima a ±22-24°. Los marcadores de estado son círculos abiertos (9 a 14 px) o guiones.

## Components

### Buttons
Píldora llena y directa: una acción clara por paso.
- **Shape:** píldora (`full`), alto mínimo de 48 dp, 24 dp de padding horizontal.
- **Primary:** `primary` con texto `onPrimary` en `labelLarge`; ripple con `ripple`.
- **Text action:** `labelLarge` en `primary` con chevron, alto mínimo 48 dp (tarjeta del mapa).
- **Icon button:** 48x48, ripple sin borde de radio 24.

### Chips
- **Recuento sobre mapa:** superficie blanca en píldora de 36 dp, borde fino `outlineVariant`, círculo abierto copihue de 12 px y `labelLarge`.

### Status tags (cinta)
Trozos de cinta adhesiva pegados a mano.
- **Provisional:** cinta `provisional` con círculo abierto de 9 px y texto «Provisional» en `labelMedium` 800, girada -2°.
- **No implementado:** cinta `demo` con guion de 9x2 y texto, girada 1,5°.

### Status banner
- Aviso no bloqueante en `demo`, radio 20 dp, padding 12/16, ícono de información de 20 px y `bodyMedium` 500.

### Inputs / Fields
- **Búsqueda:** píldora blanca de 56 dp dentro de la banda; ícono de lupa, `bodyLarge`, cursor y selección en `leafInk`; botón de borrar de 48 dp cuando hay texto.

### Navigation
- **Barra:** Material 3, `navBar` con borde superior fino, cuatro destinos de 80 dp, rótulos `labelMedium`.
- **Indicador:** mancha de acuarela lima de 72x40 dp, distinta por destino (`seedOf(label)`), que se abre desde el centro en 260 ms con ease-out exponencial; sin animación si el sistema pide movimiento reducido. El destino activo engruesa el rótulo a 800 y rellena el ícono con `navIconFill`.
- **Interruptor segmentado:** píldora con borde de 1,5 px `onTopBarVariant` sobre la banda; el pulgar blanco se desliza y el segmento elegido va en 800.

### Banda pintada (signature)
`PaintedBand`: base sólida, cuatro pasadas al 40 % con filos distintos para que el borde sangre, dos veladuras recortadas dentro de la banda y el filo marcado en `topBarEdge`. Bajo el filo se pinta primero el color del papel para que el contenido que pasa por debajo no se transparente. Se usa en todos los encabezados de pestaña y en la barra de la ficha.

### Lámina de especie (signature)
`LeafPlate`: hojas dibujadas en tinta `leafInk` (trazo de 0,8 o 1,6 en miniatura) con mitades desiguales, nervio curvo y una segunda pasada fina corrida; debajo, tres pasadas de aguada en el verde de la especie, corridas, giradas y algo más anchas que la tinta (opacidad según `washOpacity`). Al abrirse, la tinta se dibuja en 900 ms con ease-out exponencial, tallo primero; la lámina grande de la ficha se entinta despacio, en 2000 ms a ritmo de pluma (`easePen`, arranque y final suaves y avance parejo), y su línea guía con el «1» se traza al 85 % de ese tiempo, en 1100 ms; con movimiento reducido se dibuja estática. Siempre rotulada como ilustración conceptual, no fotografía.

### Foto de referencia pegada
`TapedPhoto`: en el mismo cuadrado que la lámina, una copia de papel fotográfico (borde `surface` de 7 dp, 14 dp abajo, filo fino `outlineVariant`, radio 1) girada entre -1,5° y -3,5° según la especie, sujeta con dos trozos de cinta lima a -38° y -34° en esquinas opuestas; sin sombra, porque está pegada. Al elegir «Foto» cae sobre la página (sube 28 dp girada 7° más y al 108 %, 560 ms ease-out exponencial) y después se aprietan las cintas (se estiran desde el 30 % de ancho, 260 ms, a los 380 y 480 ms). Con movimiento reducido, solo fundido. Las fotos son copias locales de desarrollo (`assets/images/reference/`), así que no hay estado de carga; cuando vengan del backend habrá que añadir carga y error. La leyenda cambia a «Foto de referencia, no tomada en Puyehue.», autor · licencia · Wikimedia Commons y el enlace «Ver fuente y licencia». La lámina sigue siendo la vista por defecto; al volver a ella se entinta de nuevo.

**Interruptor Lámina / Foto:** segmentado discreto para no competir con la lámina: píldora de 32 dp con filo de 1 px `outlineVariant`, junto al número de lámina y con 16 dp de aire sobre él y 12 dp bajo él; dos segmentos iguales con ícono de 14 px (hoja, foto) y `labelMedium` en `onSurfaceVariant`. El pulgar `surfaceContainer` se desliza en 280 ms y el segmento elegido va en `onSurface` a 800. El área de toque se extiende a 48 dp con `hitSlop`. Solo aparece si la especie tiene foto.

### Etiqueta de procedencia
Hoja blanca con borde de tinta, nombre en `scientificLarge`, filas clave/valor (`labelMedium` / `bodyMedium`), sello a mano al pie tras un filete punteado y dos trozos de cinta lima. La fuente vive junto al dato.

### Mapa
MapLibre con estilo teñido. Escala con borde de tinta de 2 px y cifras tabulares.

**Hoja de observación (signature):** SVG de 48 px (área de toque completa) generado en `leafSvg` con la geometría de `leafPath` en `src/ui/brush.ts`, sembrado por el id (forma, asimetría e inclinación de ±40°): papel bajo tres veladuras verde oscuro (`leafInk`) al 20 % con filo seco, y encima la hoja entintada en `leafInk` al 88 % con contorno de 2,6 px, pecíolo y nervio central y nervaduras en papel claro. Es un signo del cuaderno, no la hoja de la especie observada. Al cargar el mapa las hojas caen de oeste a este cuando la cámara se posa (900 ms + 110 ms por hoja): bajan meciéndose (820 ms), la aguada florece en 760 ms, el contorno se entinta encima y luego el nervio. Seleccionada, la aguada se abre al 130 %, un segundo contorno se dibuja alrededor (480 ms) y sale una onda de agua (900 ms); al pulsar, la hoja se encoge al 88 %. Con movimiento reducido no hay animaciones: los estados se aplican al instante.

**Papeleta de observación:** hoja de libreta de campo dejada sobre el mapa: papel blanco con grano (`Paper` sobre `surface`), filo fino `outlineVariant`, radio de 2 dp, sombra de tarjeta sobre mapa y un trozo de cinta lima a -5°. Arriba, la lámina de la especie (52 dp) entintándose sobre su aguada (o el círculo abierto si no hay especie elegida), nombre común y científico; bajo ellos, la línea de cabecera de la libreta (1 px copihue al 45 %, de canto a canto). Debajo, renglones de 24 dp en `outlineVariant`: la cinta `SyntheticTag` y la fecha a mano (Kalam), la nota y, tras un renglón en blanco, la acción a la ficha, todo con alto de línea de 24 para escribir sobre las líneas. Entra subiendo 40 dp girada -4° hasta asentarse (420 ms, ease-out exponencial) y sale bajando 20 dp en 160 ms; con movimiento reducido, solo fundido. Si la hoja elegida queda bajo la papeleta, el mapa se desplaza para mostrarla.

## Do's and Don'ts

### Do:
- **Do** abrir cada pestaña principal con `ScreenHeader` y su banda pintada, y dejar `BAND_EDGE` (18 dp) libre bajo ella.
- **Do** poner toda pantalla sobre `Paper` para que el grano y el color de papel sigan el tema.
- **Do** sembrar cada mancha con `seedOf` de un identificador estable para que no cambie entre renders.
- **Do** acompañar cada estado con texto y forma: círculo abierto, guion o ícono, más su rótulo.
- **Do** reservar el copihue (`accent`) para marcas puntuales.
- **Do** respetar el movimiento reducido en el entintado y en el indicador de navegación.
- **Do** mantener la estructura de Material 3: áreas de toque de 48 dp, barra de navegación de 80 dp y botones en píldora.

### Don't:
- **Don't** usar el color como única señal de un estado (provisional, demostración, no implementado, sin verificar).
- **Don't** rellenar superficies o botones con copihue ni añadir un segundo acento cálido.
- **Don't** usar Kalam para párrafos, botones o datos de procedencia, ni Literata cursiva fuera de los nombres científicos.
- **Don't** dar sombra a lo que está pintado o pegado sobre el papel; la sombra queda para lo que flota sobre el mapa y para la lupa.
- **Don't** presentar una lámina o portada pintada como fotografía o como paisaje real de Puyehue.
- **Don't** hacer que el verde de aguada de una especie signifique un dato botánico.
