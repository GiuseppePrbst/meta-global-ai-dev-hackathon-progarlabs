---
name: Bosque Vivo Chile
description: Álbum de cromos sobre un cuaderno de campo de acuarela para descubrir la flora del entorno de Puyehue con evidencia visible.
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
  surfaceContainer: "#E4EDDA"
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
  headlineSmall:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "24px"
    fontWeight: 700
    lineHeight: "30px"
    letterSpacing: "-0.2px"
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
  titleSmall:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "16px"
    fontWeight: 700
    lineHeight: "20px"
  button:
    fontFamily: "Bricolage Grotesque, sans-serif"
    fontSize: "16px"
    fontWeight: 800
    lineHeight: "20px"
    letterSpacing: "0.1px"
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
  tape: "3px"
  label: "4px"
  sm: "8px"
  lg: "20px"
  card: "24px"
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
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "48px"
  species-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.titleMedium}"
    rounded: "{rounded.card}"
    padding: "8px"
  guide-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.headlineSmall}"
    rounded: "{rounded.card}"
    padding: "16px"
  progress-meter-fill:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.leafInk}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    height: "20px"
  sticker-slot:
    textColor: "{colors.accent}"
    typography: "{typography.handBold}"
    rounded: "{rounded.lg}"
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
    padding: "4px 10px"
  tag-not-implemented:
    backgroundColor: "{colors.demo}"
    textColor: "{colors.onDemo}"
    typography: "{typography.labelMedium}"
    rounded: "{rounded.tape}"
    padding: "4px 10px"
  status-banner:
    backgroundColor: "{colors.demo}"
    textColor: "{colors.onDemo}"
    typography: "{typography.bodyMedium}"
    rounded: "{rounded.lg}"
    padding: "12px 16px 12px 12px"
  provenance-label:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.label}"
    padding: "16px"
  chip-map:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    typography: "{typography.titleSmall}"
    rounded: "{rounded.full}"
    padding: "0 12px"
    height: "40px"
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
    backgroundColor: "{colors.navIndicator}"
    textColor: "{colors.onNavIndicator}"
    typography: "{typography.labelLarge}"
    rounded: "{rounded.full}"
    height: "48px"
  map-card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.onSurface}"
    rounded: "{rounded.lg}"
    padding: "16px"
---

# Design System: Bosque Vivo Chile

## Overview

**Creative North Star: "Álbum de cromos sobre el cuaderno de acuarela"**

La app sigue siendo un cuaderno pintado en terreno: papel de acuarela blanco frío con grano, bandas de aguada verde bosque cuyo filo mojado cae sobre el contenido, hojas entintadas a pulso con una aguada que no calza del todo con la tinta, y etiquetas pegadas con cinta. Sobre ese cuaderno, la persona responsable pidió el 30-10-2026 un lenguaje más juguetón de álbum de cromos, con la misma paleta, las mismas láminas y las mismas fuentes: cada especie es un cromo de cartón blanco con contorno de tinta, cada vacío es un hueco punteado que espera su cromo, y lo que se puede tocar tiene grosor. Este paso evoluciona el mundo fijado el 28-10-2026; no lo reemplaza. El código actual lo materializa en `src/ui/tokens/theme.ts` (tokens `radius.card` y `stroke`), `src/ui/components/ledge.tsx`, `progress-meter.tsx`, `sticker-slot.tsx`, `src/features/catalog/species-card.tsx` y `src/features/observations/guide-preview.tsx`, además de las piezas de acuarela de siempre (`src/ui/art/watercolor.tsx`, `src/ui/art/paper.tsx`, `src/features/species-art/leaf-plate.tsx`). Los componentes reutilizables están en `src/ui/components/` y se importan desde `@/ui`.

La pintura es generada en código, no rasterizada: cada mancha (`Wash`) y cada banda (`PaintedBand`) es SVG determinista a partir de una semilla (`seedOf(id)` o `seedOf(title)`), así que la misma especie o pestaña muestra siempre la misma mancha. El único ráster es la tesela de grano de 192 px (`assets/images/paper-grain.png`, generada por `scripts/paper-grain.py`, semilla fija), que la app tiñe. Bajo la acuarela y los cromos se conserva la estructura de Material 3: barra de navegación de 80 dp con indicador, áreas de toque de 48 dp, escala tipográfica headline/title/body/label y roles `on*`.

La densidad es de lectura en exterior: cromos en dos columnas, áreas de toque de 48 dp, alto contraste sobre papel claro y verdes intensos con un solo acento cálido. La gamificación es honesta: el avance muestra el valor real (hoy «0 de 8»), sin puntos, rachas ni logros inventados, y lo que no existe lleva la cinta «No implementado». La incertidumbre se muestra como estado con texto, nunca como adorno.

Límite honesto: este sistema se verificó solo en Expo web, en Chromium sin interfaz a 412x892 (capturas `redesign-*.png` en `.impeccable/review/`); todavía no se ha visto en un dispositivo ni en un emulador Android, donde el grano teselado, las veladuras SVG, el `android_ripple` dentro de piezas con canto, el borde punteado de los huecos y el salto del ícono de navegación deben confirmarse.

**Key Characteristics:**
- Papel de acuarela frío con grano; sin tarjetas con foto.
- Bandas de aguada verde con filo mojado en todas las barras superiores.
- Cromos blancos de radio 24 con contorno de tinta de 2 dp; lo que se toca tiene canto de 4 dp que se hunde.
- Huecos punteados con la silueta tenue de la hoja para lo que todavía falta.
- Tinta y aguada fuera de registro como firma de cada lámina de especie.
- Un solo acento cálido (copihue) para marcas puntuales.
- Estados con texto y forma (cinta con filo, círculo abierto, guion, ícono), nunca solo color.
- Gamificación con valores reales (la guía de prueba se rotula), sin puntos ni logros.
- Estructura Material 3 intacta bajo la piel de acuarela; solo tema claro.

## Colors

Verdes intensos de bosque, musgo y lima sobre papel blanco frío, con un solo rojo copihue y la tinta de hoja como contorno de todas las piezas del álbum. Los valores del frontmatter son el único tema que tiene la app: `useTheme` (`src/ui/tokens/theme.ts`) siempre devuelve la paleta clara, porque el cuaderno se lee sobre papel sin importar el tema del sistema.

### Primary
- **Verde bosque de aguada** (`topBar` / `primary`): base de las bandas superiores pintadas y cara del botón principal.
- **Veladura de hoja** (`topBarGlaze`): veladuras más claras dentro de la banda; también tiñe el mapa.
- **Filo seco** (`topBarEdge`): pigmento acumulado en el borde mojado de la banda, canto del botón principal y contorno de las piezas blancas que viven dentro de la banda (búsqueda, burbuja de volver).
- **Lima brote** (`onTopBarVariant`): subtítulos y borde del interruptor segmentado sobre la banda.

### Secondary
- **Lima de aguada** (`lime`): aguada detrás de las portadas pintadas, cinta translúcida de la etiqueta de procedencia, marca de nota sin número en la ficha y relleno de la barra de avance cuando hay avance.
- **Lima indicador** (`navIndicator`): mancha del destino activo en la barra de navegación y pulgar del interruptor segmentado sobre la banda (con texto `onNavIndicator`).

### Tertiary
- **Copihue** (`accent`): el único acento cálido. Número de lámina a mano («N.º 01») en cromos y huecos, insignia numerada de rasgo en la ficha, anillo de la lupa, puntos de observación sin verificar en el mapa y el visor ilustrado de Identificar.

### Neutral
- **Papel frío** (`background`): suelo de todas las pantallas, siempre bajo el grano (`grain` al 35 %), y ventana donde se pinta la lámina dentro del cromo y de la tarjeta de misión.
- **Hoja blanca** (`surface`): cara de cromos y tarjetas, etiqueta de procedencia, campo de búsqueda, barra de navegación, burbujas de ícono y controles flotantes del mapa.
- **Hoja verdosa** (`surfaceContainer`): pulgar del interruptor discreto Lámina/Foto y fondo de un hueco mientras se presiona.
- **Tinta de hoja** (`leafInk`): contorno y canto de cromos y tarjetas, contorno de la barra de avance, del chip y de los controles del mapa, trazo de las láminas, borde de la etiqueta de procedencia y cursor del campo de búsqueda.
- **Texto** (`onSurface`, `onSurfaceVariant`): texto principal y secundario.
- **Contornos** (`outline`, `outlineVariant`): `outline` traza el punteado de los huecos y la silueta tenue de la hoja que falta (sobre aguada `outlineVariant`); `outlineVariant` queda para el borde superior de la barra de navegación, separadores y filetes finos.

### Colores de estado
- **Provisional** (`provisional` / `onProvisional`): cinta lima del estado taxonómico.
- **Demostración o no implementado** (`demo` / `onDemo`): menta fría, distinta de la cinta lima, para el aviso de datos de demostración y la cinta «No implementado».

### Aguadas por especie
`leaf-plate.tsx` asigna a cada especie un verde propio para su aguada (`speciesWash`, de `#1E8A6A` a `#A4BF22`, con `#3E9B3A` por defecto). Ese color solo ayuda a distinguir láminas de un vistazo; no codifica ningún dato botánico.

### Named Rules
**The Una Sola Voz Cálida Rule.** El copihue es el único color cálido y marca puntos concretos (número de lámina, marcador, anillo, observación sin verificar). Nunca rellena superficies, bandas, cromos ni botones.

**The Texto y Forma Rule.** Cada estado lleva texto y una forma propia: círculo abierto para provisional o sin verificar, guion para no implementado, ícono de información para demostración. El color refuerza; nunca es la única señal.

**The Aguada No Es Dato Rule.** Los verdes por especie y las manchas decorativas no codifican información. Si un color tiene que significar algo, se rotula.

## Typography

**Display Font:** Bricolage Grotesque (600, 700, 800)
**Body Font:** Roboto (fuente del sistema en Android; system-ui en web)
**Scientific Font:** Literata Italic 400
**Hand Font:** Kalam Bold 700

**Character:** Una grotesca ancha y enérgica para títulos, botones y cifras, cursiva de libro para los nombres científicos según la convención botánica, una letra a mano breve para los números del álbum y las anotaciones del cuaderno, y Roboto para el texto corrido y los rótulos funcionales.

### Hierarchy
- **headlineLarge** (800, 36/42, -0.6): título de cada pestaña principal, en blanco sobre la banda.
- **headlineMedium** (800, 32/38, -0.5): nombre común en la ficha de especie.
- **headlineSmall** (700, 24/30, -0.2): título de la tarjeta «Tu guía de campo».
- **titleLarge** (700, 22/28, -0.2): encabezados de sección, título de la tarjeta de misión pendiente y título de la barra de la ficha.
- **titleMedium** (600, 19/24): nombre común en el cromo.
- **titleSmall** (700, 16/20): rótulo de la barra de avance, título de la tarjeta de guía en la ficha y recuento del chip del mapa.
- **button** (Bricolage 800, 16/20, 0.1): texto de botones y cifra de avance («0 de 8», con cifras tabulares).
- **scientific / scientificLarge** (Literata cursiva 400, 15/20 y 19/26): solo nombres científicos.
- **handBold** (Kalam 700, 16/22): número de lámina en cromos y huecos, fecha de la papeleta del mapa y sello al pie de la etiqueta de procedencia.
- **Versalitas** (`labelMedium` en mayúsculas, espaciado 1,2): familia y rótulos de rasgos en la ficha, como en una guía impresa.
- **bodyLarge / bodyMedium** (400, 16/24 y 14/20): texto corrido, avisos, subtítulos.
- **labelLarge / labelMedium / labelSmall** (600/600/500; 14/20, 12/16, 11/16): segmentos, cintas de estado (a 800), rótulos de navegación, atribución y pie de fuente. El rótulo del destino activo pasa a Bricolage 800.

### Named Rules
**The Cuatro Voces Rule.** Bricolage titula, rotula los botones y pone las cifras del álbum (avance, recuento, destino activo); Literata cursiva solo nombra especies; Kalam solo anota y numera; Roboto lleva el texto corrido, los avisos, las cintas y los rótulos funcionales. Ninguna voz invade el rol de otra.

**The Mano Breve Rule.** Kalam se usa en anotaciones y números de una o pocas palabras; nunca en párrafos, botones ni datos de procedencia.

## Layout

Pantallas de una columna con margen lateral de 16 dp (`space.lg`), escala de espaciado 4/8/12/16/24/32. Cada pestaña principal abre con `ScreenHeader`: la banda pintada ocupa el área segura superior, el título, el subtítulo y opcionalmente un control (búsqueda, interruptor Mapa/Lista); a la derecha, una portada ilustrada decorativa que no recibe accesibilidad.

La banda termina en un filo mojado de 18 dp (`BAND_EDGE`) que se superpone al contenido: el encabezado usa `marginBottom: -18` y el contenido que sigue deja `paddingTop` de al menos 18 dp (las pantallas con tarjetas dejan `BAND_EDGE + 16`). Áreas de toque mínimas de 48 dp; barra de navegación de 80 dp más el inset inferior.

El catálogo es un álbum de dos columnas (`numColumns={2}`): 16 dp de margen lateral, 12 dp entre columnas y entre filas, y los dos cromos de una fila miden lo mismo; el aviso de demostración va arriba, a ancho completo. Registro apila la tarjeta de la guía y el botón a ancho completo, separados por 24 dp. Dentro de la guía, los huecos van en filas de cuatro con 8 dp de separación; la última fila incompleta conserva el ancho de cada hueco.

La ficha de especie es una entrada de guía de campo: lámina cuadrada a ancho completo y su leyenda; nombre común, científico y familia en versalitas cerrados por un filete de tinta (`leafInk`, 1,5 px); estado; la tarjeta de la guía («En tu guía» con su cromo y la fecha, o «Aún no está en tu guía» con su hueco); rasgos como lista impresa (rótulo en versalitas `labelMedium` en `leafInk` sobre el texto, entre filetes finos `outlineVariant`, con la insignia copihue «1» en el rasgo señalado en la lámina) y, al final, la etiqueta de procedencia al 92 % del ancho alineada a la derecha.

### Named Rules
**The Filo Mojado Rule.** Todo contenido bajo una banda pintada reserva `BAND_EDGE` (18 dp) arriba; nada importante queda bajo el filo.

## Elevation & Depth

Sistema plano por capas de pigmento y de cartón. La profundidad la dan las veladuras translúcidas que se oscurecen al cruzarse, el filo de la banda, el grano del papel y el grosor de las piezas del álbum, no las sombras. Las sombras existen solo en lo que flota sobre el mapa o sobre la lámina, como en Material 3.

### Canto (grosor, no sombra)
- **Canto** (`stroke.ledge`, 4 dp, del mismo color que el contorno, sin desenfoque ni desplazamiento lateral): franja sólida que asoma bajo la cara de una pieza que se puede tocar. Al presionar, la cara baja 4 dp y lo tapa; al soltar, vuelve. Lo dibuja solo `Ledge` cuando recibe `onPress`.
- **Contorno de tinta** (`stroke.ink`, 2 dp): borde de cromos, tarjetas, barra de avance, huecos, chip y controles del mapa.

### Shadow Vocabulary
- **Flotante sobre mapa, bajo** (`elevation: 2`, `shadowOffset 0/1`, `shadowRadius 3`, color `scrim`): chip de recuento y grupos de controles del mapa.
- **Tarjeta sobre mapa** (`elevation: 3`, `shadowOffset 0/2`, `shadowRadius 6`, color `scrim`): papeleta de la observación seleccionada.
- **Lupa** (`elevation: 8`, `shadowOffset 0/6`, `shadowRadius 12`, opacidad 0.25, color `onSurface`): lupa circular sobre la lámina de la ficha.

### Named Rules
**The Papel Plano Rule.** El canto inferior de tinta es el grosor de una pieza que se puede presionar, no una sombra: solo lo llevan los cromos y botones que se tocan, y desaparece al hundirse. Las tarjetas quietas (guía, misión pendiente, guía en la ficha) solo llevan el contorno de tinta de 2 dp. Lo pintado o pegado sobre el papel (tarjetas, etiqueta, cintas, avisos, huecos) no lleva sombra; la sombra queda reservada a lo que flota sobre el mapa y a la lupa.

**The Hueco Sin Grosor Rule.** Un hueco del álbum es una ausencia, no una pieza: contorno punteado y sin canto aunque se pueda tocar; al presionarlo solo se rellena de `surfaceContainer`.

## Shapes

Dos familias. La pintada es orgánica: manchas de contorno irregular (elipse deformada por armónicos 2, 3 y 5), bandas de borde ondulado y hojas con mitades desiguales y contorno repasado. La del álbum es redonda y gruesa: cromos y tarjetas de 24 dp (`card`) con contorno de 2 dp, y la ventana de papel interior con 16 dp (24 menos su relleno de 8) para que siga la curva; píldoras (`full`) para botones, búsqueda, chip, interruptor y barra de avance; 20 dp (`lg`) para avisos, huecos punteados y controles flotantes; 8 dp (`sm`) para la atribución del mapa. Las piezas pegadas casi no tienen radio: cinta de 3 dp con filo de 1,5 px en el color de su texto y giro de -2° o 1,5°; etiqueta de procedencia de 4 dp con borde de 1,5 px en tinta y dos trozos de cinta lima a ±22-24°. Los íconos que viven sobre color (volver en la banda, información en el aviso) van dentro de una burbuja blanca circular. Los marcadores de estado son círculos abiertos (9 a 14 px) o guiones.

## Components

### Buttons
Píldora con canto: se hunde al tocarla, como un cromo de cartón.
- **Shape:** píldora (`full`) con contorno de 2 dp; cara de 48 dp de alto mínimo y 24 dp de padding horizontal, más 4 dp de canto (52 dp en total).
- **Primary:** cara `primary`, contorno y canto `topBarEdge`, texto `onPrimary` en `button` (Bricolage 800); ícono opcional delante con 8 dp de separación. En Registro y en la tarjeta de misión ocupa todo el ancho.
- **Pressed:** la cara baja 4 dp sobre el canto, sin transición; ripple `ripple` en Android.
- **Tonal:** la API ofrece cara `lime` con canto `leafInk`, pero ninguna pantalla lo usa todavía; no es patrón hasta que una pantalla lo necesite.
- **Text action** (`TextButton`): `labelLarge` en `primary`, chevron opcional, alto mínimo 48 dp (tarjeta del mapa, fuente de la foto de referencia).
- **Icon button:** 48x48, ripple sin borde de radio 24. En la barra de la ficha, la flecha de volver va en una burbuja blanca de 40 dp con contorno de 2 dp `topBarEdge` y la flecha en `leafInk`.

### Cards / Containers
- **Cromo de especie** (`SpeciesCard`): cara `surface`, radio 24, contorno y canto `leafInk`, relleno de 8 dp. Arriba, una ventana de papel `background` de 128 dp de alto con la mancha de la especie al 28 % y la lámina de 108 dp; el número a mano en copihue en su esquina superior izquierda. Debajo, nombre común (`titleMedium`, hasta dos líneas), científico (`scientific`, hasta dos líneas) y la cinta Provisional pegada al pie. Toda la pieza abre la ficha. Entra escalonada solo al abrir el catálogo (340 ms, 80 ms + 55 ms por cromo).
- **Tarjeta quieta** (`Ledge` sin `onPress`): cara `surface`, radio 24, contorno de 2 dp `leafInk`, sin canto. La usan la guía de campo, la misión pendiente (ilustración sobre aguada en una ventana `background` con la cinta en la esquina, separada del texto por un filete de 2 dp en tinta) y la guía en la ficha (hueco de 84 dp, `titleSmall`, cuerpo y cinta).
- **Shadow Strategy:** ninguna; ver The Papel Plano Rule.

### Gamificación con valores reales
- **Medidor de avance** (`ProgressMeter`): rótulo en `titleSmall`, cifra en `button` `leafInk` con cifras tabulares, y una pista en píldora de 20 dp, blanca, con contorno de 2 dp en tinta. El relleno lima solo aparece si hay avance real y mide exactamente esa proporción, con un brillo blanco al 55 % a lo largo; en cero la pista queda vacía. Expone `progressbar` con mínimo, máximo, valor y texto.
- **Hueco** (`StickerSlot`): cuadrado de radio 20 con contorno punteado de 2 dp `outline`, número a mano en copihue arriba a la izquierda y la silueta de la hoja de la especie dibujada en `outline` sobre aguada `outlineVariant`, al 55 %. Si se puede tocar, abre la ficha de la especie que falta.
- **Cromo de la guía**: especie ya sumada a la guía personal (`GuideEntry`). Mismo cuadrado que el hueco, pero pieza pulsable: cara `surface`, radio 20, contorno de 2 dp `leafInk`, canto de 4 dp, lámina a color de 56 dp que se entinta al abrir y número a mano en copihue. Abre la ficha.
- **Guía de campo** (`GuidePreview`): tarjeta quieta con título `headlineSmall`, medidor «n de N» (especies del catálogo que están en la guía, `collectedCount`) y un cromo o un hueco por especie, en el orden del catálogo. Mientras la guía viene de `mock-guide.ts` lleva la cinta «Datos de prueba» (círculo abierto copihue sobre menta) y una nota que lo dice. La guía guarda especies ya identificadas, no borradores ni observaciones. No hay puntos, niveles ni logros.

### Chips
- **Recuento sobre mapa** (`Chip`): superficie blanca en píldora de 40 dp, contorno de 2 dp `leafInk`, sombra flotante baja, círculo abierto copihue de 12 px y `titleSmall`. Informa; no es un botón.

### Status tags (cinta)
Trozos de cinta adhesiva gruesa pegados a mano, con filo.
- **Provisional:** cinta `provisional` con filo de 1,5 px `onProvisional`, círculo abierto de 9 px y texto «Provisional» en `labelMedium` 800, girada -2°.
- **No implementado:** cinta `demo` con filo de 1,5 px `onDemo`, guion de 9x2 y texto, girada 1,5°.

### Status banner
- Aviso no bloqueante en `demo` con borde de 1,5 px `onDemo`, radio 20 dp, padding 12 a la izquierda y 16 a la derecha; el ícono de información de 20 px va en una burbuja blanca de 32 dp, centrado con el texto en `bodyMedium` 500.

### Inputs / Fields
- **Búsqueda** (`SearchField`): píldora blanca de 56 dp dentro de la banda, contorno de 2 dp `topBarEdge`; ícono de lupa, `bodyLarge`, cursor y selección en `leafInk`; botón de borrar de 48 dp cuando hay texto.

### Navigation
- **Barra:** Material 3, `navBar` con borde superior de 2 dp `outlineVariant`, cuatro destinos de 80 dp, rótulos `labelMedium`.
- **Indicador:** mancha de acuarela lima de 72x40 dp, distinta por destino (`seedOf(label)`), que se abre desde el centro en 260 ms con ease-out exponencial. El destino activo rellena el ícono con `navIconFill` y pone su rótulo en Bricolage 800.
- **Salto del ícono:** al activarse, el ícono sube 5 dp, crece al 116 % y gira -8° en 110 ms (ease-out cuadrático) y vuelve con un resorte (amortiguación 9, rigidez 260). Con movimiento reducido no hay salto ni apertura animada.
- **Interruptor segmentado sobre la banda:** píldora con borde de 2 dp `onTopBarVariant`; el pulgar `navIndicator` se desliza y el segmento elegido va en `onNavIndicator` a 800.

### Banda pintada (signature)
`PaintedBand`: base sólida, cuatro pasadas al 40 % con filos distintos para que el borde sangre, dos veladuras recortadas dentro de la banda y el filo marcado en `topBarEdge`. Bajo el filo se pinta primero el color del papel para que el contenido que pasa por debajo no se transparente. Se usa en todos los encabezados de pestaña y en la barra de la ficha.

### Lámina de especie (signature)
`LeafPlate`: hojas dibujadas en tinta `leafInk` (trazo de 0,8 o 1,6 en miniatura) con mitades desiguales, nervio curvo y una segunda pasada fina corrida; debajo, tres pasadas de aguada en el verde de la especie, corridas, giradas y algo más anchas que la tinta (opacidad según `washOpacity`). Acepta tinta y aguada propias: en los huecos se dibuja tenue en `outline` sobre `outlineVariant`. Al abrirse, la tinta se dibuja en 900 ms con ease-out exponencial, tallo primero; la lámina grande de la ficha se entinta despacio, en 2000 ms a ritmo de pluma (`easePen`), y su línea guía con el «1» se traza al 85 % de ese tiempo, en 1100 ms; con movimiento reducido se dibuja estática. Siempre rotulada como ilustración conceptual, no fotografía.

### Foto de referencia pegada
`TapedPhoto`: en el mismo cuadrado que la lámina, una copia de papel fotográfico (borde `surface` de 7 dp, 14 dp abajo, filo fino `outlineVariant`, radio 1) girada entre -1,5° y -3,5° según la especie, sujeta con dos trozos de cinta lima a -38° y -34° en esquinas opuestas; sin sombra, porque está pegada. Al elegir «Foto» cae sobre la página (sube 28 dp girada 7° más y al 108 %, 560 ms ease-out exponencial) y después se aprietan las cintas (se estiran desde el 30 % de ancho, 260 ms, a los 380 y 480 ms). Con movimiento reducido, solo fundido. Las fotos son copias locales de desarrollo (`assets/images/reference/`), así que no hay estado de carga; cuando vengan del backend habrá que añadir carga y error. La leyenda cambia a «Foto de referencia, no tomada en Puyehue.», autor · licencia · Wikimedia Commons y el enlace «Ver fuente y licencia». La lámina sigue siendo la vista por defecto; al volver a ella se entinta de nuevo.

**Interruptor Lámina / Foto:** segmentado discreto para no competir con la lámina: píldora de 32 dp con filo de 1 px `outlineVariant`, junto al número de lámina y con 16 dp de aire sobre él y 12 dp bajo él; dos segmentos iguales con ícono de 14 px (hoja, foto) y `labelMedium` en `onSurfaceVariant`. El pulgar `surfaceContainer` se desliza en 280 ms y el segmento elegido va en `onSurface` a 800. El área de toque se extiende a 48 dp con `hitSlop`. Solo aparece si la especie tiene foto.

### Etiqueta de procedencia
Hoja blanca con borde de tinta, nombre en `scientificLarge`, filas clave/valor (`labelMedium` / `bodyMedium`), sello a mano al pie tras un filete punteado y dos trozos de cinta lima. La fuente vive junto al dato.

### Mapa
MapLibre con estilo teñido. Escala con borde de tinta de 2 px y cifras tabulares. Los grupos de controles (acercar/alejar, reencuadrar) son superficies blancas de radio 20 con contorno de 2 dp `leafInk`, separador interior de 2 dp `outlineVariant` y sombra flotante baja; flotan sobre el mapa, así que llevan sombra y no canto.

**Hoja de observación (signature):** SVG de 48 px (área de toque completa) generado en `leafSvg` con la geometría de `leafPath` en `src/ui/art/brush.ts`, sembrado por el id (forma, asimetría e inclinación de ±40°): papel bajo tres veladuras verde oscuro (`leafInk`) al 20 % con filo seco, y encima la hoja entintada en `leafInk` al 88 % con contorno de 2,6 px, pecíolo y nervio central y nervaduras en papel claro. Es un signo del cuaderno, no la hoja de la especie observada. Al cargar el mapa las hojas caen de oeste a este cuando la cámara se posa (900 ms + 110 ms por hoja): bajan meciéndose (820 ms), la aguada florece en 760 ms, el contorno se entinta encima y luego el nervio. La caída ocurre una sola vez; los marcadores que se rehacen después aparecen quietos. Seleccionada, la hoja cambia sin animación: la aguada se abre al 130 % y un segundo contorno la rodea. Con movimiento reducido tampoco hay caída.

**Papeleta de observación:** hoja de libreta de campo dejada sobre el mapa: papel blanco con grano (`Paper` sobre `surface`), filo fino `outlineVariant`, radio de 2 dp, sombra de tarjeta sobre mapa y un trozo de cinta lima a -5°. Arriba, la lámina de la especie (52 dp) entintándose sobre su aguada (o el círculo abierto si no hay especie elegida), nombre común y científico; bajo ellos, la línea de cabecera de la libreta (1 px copihue al 45 %, de canto a canto). Debajo, renglones de 24 dp en `outlineVariant`: la cinta `SyntheticTag` y la fecha a mano (Kalam), la nota y, tras un renglón en blanco, la acción a la ficha. Entra subiendo 40 dp girada -4° hasta asentarse (420 ms, ease-out exponencial) y sale bajando 20 dp en 160 ms; con movimiento reducido, solo fundido. Si la hoja elegida queda bajo la papeleta, el mapa se desplaza para mostrarla.

## Do's and Don'ts

### Do:
- **Do** abrir cada pestaña principal con `ScreenHeader` y su banda pintada, y dejar `BAND_EDGE` (18 dp) libre bajo ella.
- **Do** poner toda pantalla sobre `Paper` para que el grano y el color de papel sigan el tema.
- **Do** sembrar cada mancha con `seedOf` de un identificador estable para que no cambie entre renders.
- **Do** construir cromos, tarjetas y botones con `Ledge`: radio 24 (`card`) o píldora, contorno de 2 dp (`stroke.ink`) y canto de 4 dp (`stroke.ledge`) solo si la pieza se toca.
- **Do** mostrar el avance con su valor real («0 de 8») y marcar con la cinta «No implementado» lo que todavía no funciona.
- **Do** representar lo que falta con un hueco punteado y la silueta tenue de la hoja, no con una pieza vacía con canto.
- **Do** acompañar cada estado con texto y forma: círculo abierto, guion o ícono, más su rótulo.
- **Do** reservar el copihue (`accent`) para marcas puntuales.
- **Do** respetar el movimiento reducido en el entintado, el indicador y el salto del ícono de navegación.
- **Do** mantener la estructura de Material 3: áreas de toque de 48 dp y barra de navegación de 80 dp.

### Don't:
- **Don't** usar el color como única señal de un estado (provisional, demostración, no implementado, sin verificar).
- **Don't** rellenar superficies, cromos o botones con copihue ni añadir un segundo acento cálido.
- **Don't** poner canto a una pieza que no se puede tocar, ni dibujarlo como sombra desplazada o difusa.
- **Don't** dar sombra a lo que está pintado o pegado sobre el papel; la sombra queda para lo que flota sobre el mapa y para la lupa.
- **Don't** inventar puntos, rachas, niveles o logros, ni dar a una barra de avance un relleno mínimo decorativo.
- **Don't** usar Kalam para párrafos, botones o datos de procedencia, ni Literata cursiva fuera de los nombres científicos.
- **Don't** presentar una lámina o portada pintada como fotografía o como paisaje real de Puyehue.
- **Don't** hacer que el verde de aguada de una especie signifique un dato botánico.
