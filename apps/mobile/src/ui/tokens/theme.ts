import {
  Figtree_400Regular,
  Figtree_400Regular_Italic,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
} from '@expo-google-fonts/figtree';
import { useSyncExternalStore } from 'react';
import type { TextStyle, ViewStyle } from 'react-native';

// Guía de naturaleza contemporánea: bosque casi negro para el mapa, la navegación y las cifras;
// fondo claro casi blanco para leer; lima como única señal de lo activo. Ver DESIGN.md.
/** Paleta clara; se exporta para lo que no sigue el tema, como el splash, que imita al nativo. */
export const lightPalette = {
  // Claro: catálogo, diario y ficha.
  background: '#F6F7F2',
  surface: '#FFFFFF',
  /** Chips sin elegir, campo de búsqueda y rieles de progreso sobre fondo claro. */
  surfaceMuted: '#ECEFE6',
  onSurface: '#121A14',
  onSurfaceVariant: '#4C5A4F',
  outline: '#7C887E',
  outlineVariant: '#E1E5DA',

  // Oscuro: mapa, barra de navegación y tarjeta de cifras.
  dark: '#111A14',
  darkSurface: '#1B2620',
  darkSurfaceHigh: '#26332B',
  onDark: '#F2F5EC',
  onDarkVariant: '#A8B5A9',
  darkOutline: 'rgba(242, 245, 236, 0.14)',
  /** Cuadro de una especie aún no descubierta en el diario, y su silueta. */
  lockedTile: '#3B423C',
  lockedInk: '#252B26',
  /** Velo detrás de las piezas que flotan sobre el mapa. */
  darkScrim: 'rgba(17, 26, 20, 0.82)',
  /** Veladura verde sobre las teselas del mapa base. */
  mapTint: '#0E2416',
  /** Fondo que oscurece la pantalla bajo una hoja modal o el texto sobre una foto. */
  scrim: 'rgba(0, 0, 0, 0.45)',

  // Lima: lo activo, lo primario y lo ya descubierto. Siempre con texto verde oscuro encima.
  lime: '#C9EA6A',
  onLime: '#1A2A0C',
  limeSoft: '#E5F3B8',
  onLimeSoft: '#3D5810',
  /** Relleno translúcido del ícono del destino activo en la barra de navegación. */
  limeTint: 'rgba(201, 234, 106, 0.22)',

  // Estados con texto propio, nunca solo color.
  provisional: '#FBE9C4',
  onProvisional: '#734606',
  demo: '#E8E3F7',
  onDemo: '#4A3A8A',

  // Wilo, la mascota: su morado (muestreado del arte) solo en su marca, el splash y el nombre WiloQuest.
  wilo: '#8E4EC0',
  wiloDeep: '#61239C',

  // Metales de los niveles del perfil: solo en sus medallas (degradado claro → profundo), siempre
  // con el nombre del nivel escrito.
  bronze: '#E2A36C',
  bronzeDeep: '#9A5527',
  silver: '#EEF1EE',
  silverDeep: '#97A39B',
  gold: '#F6D77C',
  goldDeep: '#C08A1E',
  onMetal: '#2A1C0C',
  /** Fondo de la miniatura de un logro en el historial. */
  goldSoft: '#FBEBC3',

  ripple: 'rgba(18, 26, 20, 0.10)',
  onDarkRipple: 'rgba(242, 245, 236, 0.16)',
  shadow: 'rgba(17, 26, 20, 0.18)',
};

export type Palette = typeof lightPalette;
export type ColorToken = keyof Palette;
export type ColorScheme = 'light' | 'dark';
export type Theme = { scheme: ColorScheme; color: Palette };

// Modo oscuro: las superficies de lectura pasan a bosque nocturno y los tokens `dark*` (mapa, barra de
// navegación, cifras) se aclaran para destacar sobre él; el lima y los metales no cambian. Los pares
// suaves (limeSoft, provisional, demo) se invierten: fondo profundo y texto claro, para que sigan
// leyéndose también como texto suelto.
const darkPalette: Palette = {
  ...lightPalette,
  background: '#0B120D',
  surface: '#162019',
  surfaceMuted: '#212C24',
  onSurface: '#ECF0E6',
  onSurfaceVariant: '#A8B5A9',
  outline: '#7F8C81',
  outlineVariant: '#2A362D',

  // Las piezas oscuras (tarjeta de nivel, cifras, medallas) se elevan sobre el fondo nocturno; con
  // sus tonos claros quedarían casi del mismo color que la pantalla.
  dark: '#223127',
  darkSurface: '#2B3B30',
  darkSurfaceHigh: '#37493C',
  darkOutline: 'rgba(242, 245, 236, 0.18)',
  darkScrim: 'rgba(34, 49, 39, 0.86)',

  limeSoft: '#2D3B14',
  onLimeSoft: '#D2EC8A',

  provisional: '#3A2C10',
  onProvisional: '#F2C77A',
  demo: '#29233F',
  onDemo: '#CDC2F4',

  goldSoft: '#3A3016',

  ripple: 'rgba(236, 240, 230, 0.12)',
  shadow: 'rgba(0, 0, 0, 0.55)',
};

const themes: Record<ColorScheme, Theme> = {
  light: { scheme: 'light', color: lightPalette },
  dark: { scheme: 'dark', color: darkPalette },
};

// Esquema activo como estado de módulo: los componentes leen el tema con `useTheme` y se re-renderizan al
// cambiarlo. La preferencia de la persona (y su persistencia) vive fuera de `ui/`, que solo la aplica.
let scheme: ColorScheme = 'light';
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
const getTheme = () => themes[scheme];

/** Cambia el esquema de color de toda la app. */
export function setColorScheme(next: ColorScheme) {
  if (next === scheme) return;
  scheme = next;
  listeners.forEach((listener) => listener());
}

/** Tema activo; la referencia es estable mientras no cambie el esquema. */
export function useTheme(): Theme {
  return useSyncExternalStore(subscribe, getTheme, getTheme);
}

export const fonts = {
  Figtree_400Regular,
  Figtree_400Regular_Italic,
  Figtree_500Medium,
  Figtree_600SemiBold,
  Figtree_700Bold,
  Figtree_800ExtraBold,
};

const regular = 'Figtree_400Regular';
const medium = 'Figtree_500Medium';
const semibold = 'Figtree_600SemiBold';
const bold = 'Figtree_700Bold';
const heavy = 'Figtree_800ExtraBold';
const italic = 'Figtree_400Regular_Italic';

// Escala tipográfica Material sobre Figtree; el peso va en la familia, no en fontWeight.
export const type = {
  display: { fontFamily: semibold, fontSize: 32, lineHeight: 38, letterSpacing: -0.6 },
  headline: { fontFamily: semibold, fontSize: 24, lineHeight: 30, letterSpacing: -0.3 },
  titleLarge: { fontFamily: medium, fontSize: 20, lineHeight: 26, letterSpacing: -0.2 },
  titleMedium: { fontFamily: bold, fontSize: 17, lineHeight: 22, letterSpacing: -0.1 },
  titleSmall: { fontFamily: bold, fontSize: 15, lineHeight: 20 },
  bodyLarge: { fontFamily: regular, fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontFamily: regular, fontSize: 14, lineHeight: 20 },
  bodySmall: { fontFamily: regular, fontSize: 13, lineHeight: 18 },
  labelLarge: { fontFamily: semibold, fontSize: 14, lineHeight: 20 },
  labelMedium: { fontFamily: semibold, fontSize: 12, lineHeight: 16, letterSpacing: 0.1 },
  labelSmall: { fontFamily: medium, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
  /** Etiquetas de grupo y estado: versalitas cortas. */
  tag: { fontFamily: heavy, fontSize: 10, lineHeight: 14, letterSpacing: 0.6, textTransform: 'uppercase' },
  button: { fontFamily: bold, fontSize: 15, lineHeight: 20 },
  /** Cifras del diario. */
  number: { fontFamily: heavy, fontSize: 24, lineHeight: 28, letterSpacing: -0.4, fontVariant: ['tabular-nums'] },
  /** Nombre científico: cursiva, como manda la convención botánica. */
  scientific: { fontFamily: italic, fontSize: 13, lineHeight: 18 },
  scientificLarge: { fontFamily: italic, fontSize: 17, lineHeight: 24 },
} satisfies Record<string, TextStyle>;

export const space = { xxs: 2, xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 14, lg: 20, xl: 28, full: 999 };

/** Sombras de lo que flota; el color va con `shadowColor: color.shadow`. */
export const elevation = {
  card: { elevation: 1, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3 },
} satisfies Record<string, ViewStyle>;
