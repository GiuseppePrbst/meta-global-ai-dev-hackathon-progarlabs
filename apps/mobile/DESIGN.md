---
name: Bosque Vivo Chile
description: Guía de naturaleza contemporánea de alto contraste para descubrir la flora del entorno de Puyehue sin confundir demostración con registro real.
colors:
  background: "#F6F7F2"
  surface: "#FFFFFF"
  surface-muted: "#ECEFE6"
  on-surface: "#121A14"
  on-surface-variant: "#4C5A4F"
  outline: "#7C887E"
  outline-variant: "#E1E5DA"
  dark: "#111A14"
  dark-surface: "#1B2620"
  dark-surface-high: "#26332B"
  on-dark: "#F2F5EC"
  on-dark-variant: "#A8B5A9"
  dark-outline: "rgba(242, 245, 236, 0.14)"
  dark-scrim: "rgba(17, 26, 20, 0.82)"
  locked-tile: "#3B423C"
  locked-ink: "#252B26"
  lime: "#C9EA6A"
  on-lime: "#1A2A0C"
  lime-soft: "#E5F3B8"
  on-lime-soft: "#3D5810"
  provisional: "#FBE9C4"
  on-provisional: "#734606"
  demo: "#E8E3F7"
  on-demo: "#4A3A8A"
  wilo: "#8E4EC0"
  wilo-deep: "#61239C"
  error: "#B3261E"
typography:
  display:
    fontFamily: "Figtree"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "38px"
    letterSpacing: "-0.6px"
  headline:
    fontFamily: "Figtree"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "30px"
    letterSpacing: "-0.3px"
  title-large:
    fontFamily: "Figtree"
    fontSize: "20px"
    fontWeight: 500
    lineHeight: "26px"
    letterSpacing: "-0.2px"
  title-medium:
    fontFamily: "Figtree"
    fontSize: "17px"
    fontWeight: 700
    lineHeight: "22px"
    letterSpacing: "-0.1px"
  title-small:
    fontFamily: "Figtree"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: "20px"
  body-large:
    fontFamily: "Figtree"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "24px"
  body-medium:
    fontFamily: "Figtree"
    fontSize: "14px"
    fontWeight: 400
    lineHeight: "20px"
  body-small:
    fontFamily: "Figtree"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  label-large:
    fontFamily: "Figtree"
    fontSize: "14px"
    fontWeight: 600
    lineHeight: "20px"
  label-medium:
    fontFamily: "Figtree"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "0.1px"
  label-small:
    fontFamily: "Figtree"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: "14px"
    letterSpacing: "0.2px"
  tag:
    fontFamily: "Figtree"
    fontSize: "10px"
    fontWeight: 800
    lineHeight: "14px"
    letterSpacing: "0.6px"
  button:
    fontFamily: "Figtree"
    fontSize: "15px"
    fontWeight: 700
    lineHeight: "20px"
  number:
    fontFamily: "Figtree"
    fontSize: "24px"
    fontWeight: 800
    lineHeight: "28px"
    letterSpacing: "-0.4px"
    fontFeature: "tnum"
  scientific:
    fontFamily: "Figtree Italic"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: "18px"
  scientific-large:
    fontFamily: "Figtree Italic"
    fontSize: "17px"
    fontWeight: 400
    lineHeight: "24px"
rounded:
  sm: "8px"
  md: "14px"
  lg: "20px"
  xl: "28px"
  full: "999px"
spacing:
  xxs: "2px"
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
  xxl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.on-lime}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "52px"
  button-soft:
    backgroundColor: "{colors.lime-soft}"
    textColor: "{colors.on-lime-soft}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "40px"
  button-dark:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "52px"
  button-ghost:
    textColor: "{colors.on-dark}"
    typography: "{typography.button}"
    rounded: "{rounded.full}"
    padding: "0 24px"
    height: "52px"
  chip-filter:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  chip-filter-on-dark:
    backgroundColor: "{colors.dark-scrim}"
    textColor: "{colors.on-dark}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  chip-filter-selected:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.on-lime}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "0 16px"
    height: "36px"
  pill-tab:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "44px"
  pill-tab-selected:
    backgroundColor: "{colors.lime}"
    textColor: "{colors.on-lime}"
    typography: "{typography.label-large}"
    rounded: "{rounded.full}"
    padding: "0 18px"
    height: "44px"
  tag-lime:
    backgroundColor: "{colors.lime-soft}"
    textColor: "{colors.on-lime-soft}"
    typography: "{typography.tag}"
    rounded: "6px"
    padding: "2px 7px"
  tag-provisional:
    backgroundColor: "{colors.provisional}"
    textColor: "{colors.on-provisional}"
    typography: "{typography.tag}"
    rounded: "6px"
    padding: "2px 7px"
  tag-demo:
    backgroundColor: "{colors.demo}"
    textColor: "{colors.on-demo}"
    typography: "{typography.tag}"
    rounded: "6px"
    padding: "2px 7px"
  tag-neutral:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface-variant}"
    typography: "{typography.tag}"
    rounded: "6px"
    padding: "2px 7px"
  tag-dark:
    backgroundColor: "{colors.dark-surface-high}"
    textColor: "{colors.on-dark}"
    typography: "{typography.tag}"
    rounded: "6px"
    padding: "2px 7px"
  status-banner:
    backgroundColor: "{colors.demo}"
    textColor: "{colors.on-demo}"
    typography: "{typography.body-small}"
    rounded: "{rounded.md}"
    padding: "10px 12px"
  search-field:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-large}"
    rounded: "{rounded.full}"
    padding: "0 2px 0 16px"
    height: "48px"
  icon-button:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.full}"
    size: "44px"
  icon-button-on-map:
    backgroundColor: "{colors.dark-scrim}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.full}"
    size: "44px"
  navigation-bar:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.on-dark-variant}"
    typography: "{typography.label-medium}"
    height: "68px"
  navigation-item-active:
    backgroundColor: "{colors.dark-surface-high}"
    textColor: "{colors.lime}"
    typography: "{typography.label-medium}"
    rounded: "16px"
    width: "64px"
    height: "32px"
  card-light:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: "8px"
  card-dark:
    backgroundColor: "{colors.dark}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.lg}"
    padding: "16px"
  card-map:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.on-dark}"
    rounded: "{rounded.xl}"
    padding: "12px"
  sheet:
    backgroundColor: "{colors.dark-surface}"
    textColor: "{colors.on-dark}"
    typography: "{typography.title-large}"
    rounded: "{rounded.xl}"
    padding: "0 24px"
  progress-bar:
    backgroundColor: "{colors.surface-muted}"
    textColor: "{colors.lime}"
    rounded: "{rounded.full}"
    height: "10px"
---

# Design System: Bosque Vivo Chile

## Overview

**Creative North Star: "La guía de bosque nocturno"**

Una guía de naturaleza contemporánea de alto contraste. El bosque casi negro es el fondo del mapa, de la barra de navegación y de las cifras; un fondo claro casi blanco sostiene la lectura en Especies, Diario y la ficha. Entre los dos, la lima es la única señal de lo activo: el chip encendido, el botón primario, el sendero, el check de lo descubierto y el avance. Reemplaza por completo al cuaderno de campo de acuarela anterior; no quedan bandas pintadas, cromos con canto ni grano de papel.

La densidad es la de una app Android nativa con Material 3 como esqueleto: píldoras de 36 a 52 dp, áreas de toque de 48 dp, tarjetas de radio 20 con filete fino y una sola familia, Figtree, en todo. La personalidad viene de la tensión oscuro/claro y de la lima, no de ornamento. Las fotos de referencia y las siluetas de especies son la única imagen; los íconos son de trazo propio, 24 dp, trazo 1,8 con extremos redondeados.

La honestidad de los datos es parte visual del sistema: todo lo sintético, de demostración o no implementado lleva una etiqueta de texto en violeta suave donde aparece, y ningún estado se comunica solo con color.

**Key Characteristics:**
- Un contraste claro/oscuro por pantalla: mapa, navegación y cifras oscuros; pantallas de lectura claras. Modo oscuro opcional (Ajustes → Apariencia, guardado en el dispositivo): las superficies de lectura pasan a bosque nocturno y los pares suaves (`limeSoft`, `provisional`, `demo`) se invierten; las piezas oscuras (mapa, navegación, cifras) se aclaran para destacar sobre el fondo; lima y metales no cambian. Por defecto, claro.
- Lima (`lime`) como única señal de lo activo, siempre con texto verde oscuro encima.
- Cuatro tonos con significado fijo: lima (activo/descubierto), ámbar (provisional), violeta (demostración/sintético/no implementado), rojo (error).
- Figtree en todo; 800 en títulos y cifras, cursiva para nombres científicos.
- Formas en píldora y círculo para lo que se toca; radio 20 para tarjetas, 28 para lo que flota sobre el mapa.

## Colors

Dos campos neutros verdes (bosque casi negro y blanco cálido) y una lima eléctrica como acento único, más tres tonos de estado que nunca hablan sin texto.

### Primary
- **Lima de brote** (`lime`): chips y pestañas activas, botón primario, sendero sobre el mapa, marcador seleccionado, check de especie descubierta, relleno de la barra de progreso, ícono y texto del destino activo de la navegación, íconos de las cifras. Siempre lleva encima **Verde musgo profundo** (`on-lime`).
- **Lima suave** (`lime-soft`) con **Verde helecho** (`on-lime-soft`): acción secundaria dentro de una tarjeta («Ver ficha»), etiqueta de grupo («Árbol») y fondo de íconos de rasgos en la ficha.

### Tertiary (tonos de estado)
- **Ámbar de borrador** (`provisional` / `on-provisional`): etiqueta «Provisional» de los datos botánicos aún sin validar por especialista.
- **Lavanda de demostración** (`demo` / `on-demo`): reservado para lo de demostración, sintético o no implementado: «Datos de demostración», «Sintética», la etiqueta de capacidad pendiente y el aviso `StatusBanner` sobre claro. Es un cuarto tono deliberado, distinto de la lima y del ámbar, para que los datos de demostración nunca se confundan con registros reales ni con lo activo o lo provisional.
- **Rojo de error** (`error`): fallos.

### Neutral
- **Bosque nocturno** (`dark`): fondo del mapa, barra de navegación, tarjeta de cifras del diario, insignias ganadas, hero de la ficha y la tarjeta de capacidad pendiente.
- **Corteza oscura** (`dark-surface`) y **Corteza alta** (`dark-surface-high`): tarjetas y hojas sobre el mapa; miniaturas y etiqueta oscura.
- **Niebla clara** (`on-dark`) y **Liquen** (`on-dark-variant`): texto principal y secundario sobre oscuro.
- **Filete nocturno** (`dark-outline`) y **Velo de bosque** (`dark-scrim`): bordes sobre oscuro y fondo translúcido de botones, chips y avisos que flotan sobre el mapa.
- **Papel claro** (`background`), **Blanco** (`surface`) y **Gris salvia** (`surface-muted`): fondo de lectura, tarjetas, y chips sin elegir/búsqueda/riel de progreso.
- **Tinta de bosque** (`on-surface`), **Musgo gris** (`on-surface-variant`), **Contorno** (`outline`) y **Filete claro** (`outline-variant`): texto, texto secundario, íconos apagados y bordes de tarjetas.
- **Cuadro bloqueado** (`locked-tile`) y **Silueta bloqueada** (`locked-ink`): especie aún no descubierta en la grilla del diario.

### Named Rules
**The One Signal Rule.** La lima solo marca lo activo, lo primario o lo ya descubierto. No se usa como decoración ni como fondo de sección.

**The Lavender Truth Rule.** Lo de demostración, sintético o no implementado lleva texto sobre `demo` / `on-demo` donde aparece. Ese tono no se reutiliza para otra cosa, y lo demostrativo no se pinta en lima ni en ámbar.

**The Words First Rule.** Ningún estado depende solo del color: las etiquetas dicen su estado con texto, las especies descubiertas llevan check y las bloqueadas candado y «Por descubrir».

## Typography

**Display Font:** Figtree (cargada con `@expo-google-fonts/figtree`, pesos 400, 400 cursiva, 500, 600, 700 y 800)
**Body Font:** Figtree
**Label/Mono Font:** Figtree (cifras con `tabular-nums`)

**Character:** Una sans geométrica y amable usada en todo, con contraste fuerte de peso: 800 apretado en títulos y cifras, 400 abierto en el cuerpo. El peso va en el nombre de la familia, no en `fontWeight`.

### Hierarchy
- **Display** (600, 32/38, −0,6): título de pestaña en `ScreenHeader` y nombre común en la ficha.
- **Headline** (600, 24/30): título sobre el mapa y de tarjetas oscuras destacadas.
- **Title** (500 en 20/26 para títulos de hojas y secciones; 700 en 17/22 y 15/20): hojas y secciones; nombre común en tarjetas; filas e insignias.
- **Body** (400; 16/24, 14/20, 13/18): campo de búsqueda, descripciones, notas y metadatos.
- **Label** (600/500; 14/20, 12/16, 11/14): chips, pestañas, navegación, rótulos de tablas y leyendas de cifras.
- **Tag** (800, 10/14, +0,6, mayúsculas): solo dentro de una `Tag` de estado o grupo.
- **Number** (800, 24/28, tabular): las cuatro cifras del diario.
- **Scientific** (400 cursiva, 13/18 y 17/24): nombre científico, siempre bajo el común.

### Named Rules
**The Botanical Italic Rule.** El nombre científico va siempre en cursiva (`scientific` o `scientific-large`) y nunca en otro estilo; la cursiva no se usa para nada más.

**The One Family Rule.** Figtree en toda la app, incluidos el mapa y los avisos. No se agrega otra familia.

## Layout

Pantallas de una columna a todo el ancho, con margen lateral de 16 dp (`lg`) y separación entre bloques de 12 a 24 dp. La escala es 2/4/8/12/16/24/32. Las cabeceras de pestaña respetan la barra de estado (inset superior + 12 dp) y ponen el título grande a la izquierda con botones de ícono a la derecha; debajo cuelgan búsqueda, chips o pestañas en píldora con scroll horizontal.

El mapa es a pantalla completa bajo la barra de estado, con título, botones redondos y chips de capas flotando arriba, y una tarjeta oscura anclada abajo sobre la navegación. Especies es una lista de tarjetas de espécimen separadas 16 dp: foto a sangre de 188 dp con el nombre encima y una franja inferior con silueta, familia y porte. El Diario apila pestañas, tarjeta de cifras, avance y una grilla de tres columnas (cuadros de proporción 0,86, separación 8 dp) que conserva el ancho en la última fila. La ficha abre con un hero oscuro y una hoja clara que lo monta con radio 28.

Todo lo tocable tiene al menos 48 dp de área (por tamaño o `hitSlop`).

## Elevation & Depth

Sistema plano por defecto en lo claro: las tarjetas se separan del fondo por el blanco sobre `background` y un filete de 1 dp (`outline-variant`), sin sombra. La profundidad aparece solo en lo que flota sobre el mapa o una foto, con sombra verde oscura (`shadow`, rgba(17, 26, 20, 0.18)) y la elevación Android correspondiente. Sobre oscuro, la jerarquía es tonal: `dark` → `dark-surface` → `dark-surface-high`.

### Shadow Vocabulary
- **card** (elevación 1; desplazamiento 0/1, radio 3): botones de ícono claros u oscuros que flotan sobre mapa o foto.
- **floating** (elevación 6; desplazamiento 0/4, radio 12): piezas flotantes mayores.
- **Marcador del mapa** (`box-shadow: 0 4px 12px rgba(0,0,0,0.45)`; seleccionado añade un halo lima de 6 px al 25 %): marcadores circulares sobre la teselas oscuras.

### Named Rules
**The Float-Only Shadow Rule.** Solo lleva sombra lo que flota sobre el mapa o una imagen. Las tarjetas sobre fondo claro usan filete, no sombra.

## Shapes

Lo que se toca es píldora o círculo: botones, chips, pestañas y búsqueda en radio completo; botones de ícono, marcadores y medallas en círculo. Las tarjetas usan radio 20 (`lg`), las fotos y cuadros dentro de ellas 14 (`md`), y lo que flota o sube desde abajo (tarjeta del mapa, hojas) 28 (`xl`). Las etiquetas de estado son rectángulos de radio 6, el único ángulo casi recto. Bordes de 1 dp o filete fino (`hairlineWidth`) para tablas y separadores. El sendero se dibuja con trazo redondeado de 4,5 px sobre un casing oscuro y un halo difuso.

## Components

### Buttons
Píldoras macizas y directas.
- **Shape:** píldora (radio completo), 52 dp de alto; 40 dp en tarjetas (`compact`, toque de 48).
- **Primary:** lima con texto `on-lime`, la acción del paso («Iniciar sendero»). Puede llevar al final una burbuja circular `on-lime` con chevron.
- **Soft:** lima suave con texto `on-lime-soft`, la acción de una tarjeta («Ver ficha» con chevron).
- **Dark / Ghost:** bosque sobre claro como secundaria fuerte; contorno `dark-outline` sobre oscuro.
- **Pressed:** ripple Android en primer plano y opacidad 0,88.
- **Text button:** etiqueta subrayada sin relleno, 48 dp de alto, para enlaces.
- **Icon button:** círculo de 44 dp (toque 48) en cuatro aspectos: solo ícono, blanco con filete, velo oscuro sobre el mapa, gris claro en cabecera. Siempre con etiqueta accesible.

### Chips
- **Style:** píldora de 36 dp, `label-large`; sin elegir en `surface-muted` sobre claro o `dark-scrim` con `dark-outline` sobre el mapa.
- **State:** elegido en lima con texto `on-lime`. Los chips de capas del mapa conservan siempre su ícono; el estado activo es el relleno lima sólido frente al contorno translúcido. Estado anunciado con `accessibilityState.selected`.

### Pill Tabs
Pestañas internas de pantalla (Diario): píldoras de 44 dp, blancas con filete `outline-variant`; la activa en lima.

### Tags
Etiqueta corta de grupo o estado, `tag` en mayúsculas sobre radio 6: lima suave (grupo), ámbar (provisional), lavanda (demostración/sintética/pendiente), gris (neutra), oscura (sobre el mapa, p. ej. «Sin verificar»). Siempre con texto; el color solo acompaña.

### Cards / Containers
- **Corner Style:** 20 dp en tarjetas claras y oscuras; 28 dp en la tarjeta del mapa y las hojas.
- **Background:** `surface` con filete `outline-variant` en lectura; `dark` para cifras, insignias ganadas y especie ya en la guía; `dark-surface` con `dark-outline` sobre el mapa.
- **Shadow Strategy:** ver Elevation & Depth; solo la tarjeta del mapa flota.
- **Internal Padding:** 12 dp en la franja de la tarjeta de especie, 12 dp en filas y tarjetas del mapa, 24 dp en la tarjeta de capacidad pendiente.

### Inputs / Fields
- **Style:** búsqueda en píldora `surface-muted` de 48 dp, lupa a la izquierda, `body-large`, cursor `on-surface` y selección `on-lime-soft`.
- **Clear:** botón de ícono con cruz cuando hay texto.

### Navigation
Barra Material 3 en `dark`, respetando el inset inferior, con cinco destinos (Identificar, Mapa, Especies, Diario, Perfil). Ítems de 68 dp; el activo enciende ícono y rótulo en lima, rellena la forma del ícono con lima al 22 %, sin indicador de fondo. Los inactivos en `on-dark-variant`. Al presionar, una píldora `on-dark-ripple` de todo el alto de los ítems (sobresale 8 dp por lado, a 4 dp de los bordes de la barra) marca el destino; al deslizar sigue al dedo con un resorte suave y la pestaña cambia recién al soltar. Con movimiento reducido la píldora aparece y se mueve sin animar.

### Status Banner y Sheet
- **Status banner:** aviso no bloqueante, radio 14, ícono de información; lavanda sobre claro, velo oscuro con filete sobre el mapa.
- **Sheet:** hoja inferior `dark-surface` de radio 28, asa de 36 × 4, título `title-large` y botón de cierre; Atrás y tocar fuera la cierran.

### Mapa oscuro (componente insignia)
Teselas OSM oscurecidas por pintura raster (saturación −0,35, contraste 0,3, brillo invertido 0,72→0,08, tono rotado 180°) bajo una veladura verde al 22 %. El sendero lima se dibuja al cargar (halo de 14 px difuminado, casing oscuro de 8 px, línea de 4,5 px) y los marcadores son círculos de 40 dp (observaciones) o 44 dp (paradas) en velo oscuro con borde claro de 2 px; inicio y fin con borde lima; el seleccionado se llena de lima y crece a 1,14. Los marcadores entran con un pop de 420 ms. La tarjeta inferior del sendero lleva a la izquierda, a todo su alto, una foto de referencia del entorno (no del trazado), indica «Trazado sintético: no es un sendero real ni sirve para orientarse» y ofrece «Iniciar sendero» y «Ver otros senderos» (hoja que declara el catálogo pendiente), y el recorrido por paradas lleva «Recorrido de demostración · sin GPS». Con movimiento reducido, nada se anima.

### Tarjeta de espécimen (Especies)
La foto de referencia ocupa todo el ancho (188 dp) bajo un degradado `dark` (35 % arriba, transparente al centro, 88 % abajo) para que el texto se lea sobre cualquier foto. Arriba a la izquierda, las etiquetas de grupo y estado y, si la especie ya está en la guía, el sello lima «En tu guía» con check. Arriba a la derecha flota el marcador: círculo de 44 dp en velo oscuro, lima con ícono `on-lime` si está guardada; salta al guardar y se encoge al quitar. Abajo, sobre la foto, el nombre común en `headline` `on-dark` y el científico en cursiva. La franja blanca inferior lleva la silueta de la especie en un círculo `lime-soft`, la familia (`label-medium`), el porte en dos líneas y un círculo `dark` con chevron lima. Toda la tarjeta es un solo enlace a la ficha; al presionarla se hunde un 1,5 % y la foto se acerca un 6 %. Las tarjetas entran en cascada (360 ms, 45 ms entre ellas, tope 12). Sin foto, la silueta grande en `dark-surface-high` sobre `dark`. Con movimiento reducido, nada se anima.

### Visor 3D
Pantalla completa sobre `dark` que entra desde abajo. El modelo se ilumina como bosque nocturno (cielo claro verdoso, luz principal cálida y un contorno lima detrás), apoyado sobre una sombra de contacto y un halo lima tenue que la niebla funde con el fondo. Al abrir, la cámara llega desde lejos y el modelo sube girando hasta asentarse (1,1 s, salida exponencial); luego gira solo, se detiene al tocarlo y retoma a los 3,5 s. Arrastrar gira, pellizcar acerca; sin desplazamiento lateral ni vista bajo el suelo. Arriba, botones de 44 dp en velo oscuro: cerrar a la izquierda y volver a la vista inicial a la derecha, con el nombre común y el científico al centro. Abajo, una nota en velo oscuro con la etiqueta lavanda «Modelo de prueba» que dice qué es el modelo, y la ayuda de gestos. Con movimiento reducido, nada gira ni entra animado. El botón «Modelo 3D» de la ficha lo abre.

### Guía del diario
Grilla de tres columnas: descubierta con foto, velo negro inferior, check lima y fecha; por descubrir con silueta en `locked-ink` sobre `locked-tile`, candado y «Por descubrir». Encima, la tarjeta oscura de cuatro cifras con filetes verticales y la etiqueta «Datos de demostración», y la barra de progreso (riel `surface-muted` de 10 dp, relleno lima, nunca pasa del máximo).

## Do's and Don'ts

### Do:
- **Do** dar a cada pantalla un solo contraste: mapa, navegación y cifras sobre `dark`; Especies, Diario y ficha sobre `background`.
- **Do** poner siempre texto `on-lime` (o `on-lime-soft`) sobre lima.
- **Do** etiquetar con texto en lavanda (`demo` / `on-demo`) todo dato sintético, de demostración o capacidad no implementada, justo donde aparece.
- **Do** mostrar check/candado en la guía, además del color.
- **Do** escribir el nombre científico en cursiva bajo el nombre común.
- **Do** usar íconos de trazo propio de 24 dp, trazo 1,8 y extremos redondeados, con etiqueta accesible en los botones de ícono.
- **Do** respetar el movimiento reducido: el sendero, los marcadores y el resaltado de presión de la navegación aparecen sin animar (fundidos de 160/120 ms donde haga falta).

### Don't:
- **Don't** usar la lima como decoración ni en más de un significado; si no está activo, primario o descubierto, no es lima.
- **Don't** pintar lo de demostración en lima o ámbar, ni usar la lavanda para otra cosa.
- **Don't** comunicar un estado solo con color.
- **Don't** añadir otros temas además de claro y oscuro, ni colores fuera de `useTheme`, ni mezclar fondos claro y oscuro como campo principal de una misma pantalla.
- **Don't** introducir otra familia tipográfica ni la cursiva fuera de los nombres científicos.
- **Don't** volver al mundo de acuarela: sin bandas pintadas, cromos con canto, papel con grano ni texturas.
- **Don't** poner sombra a tarjetas sobre fondo claro; el filete basta.
