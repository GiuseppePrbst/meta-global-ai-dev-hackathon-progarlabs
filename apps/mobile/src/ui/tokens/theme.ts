import {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
} from '@expo-google-fonts/bricolage-grotesque';
import { Kalam_400Regular, Kalam_700Bold } from '@expo-google-fonts/kalam';
import { Literata_400Regular_Italic } from '@expo-google-fonts/literata';
import type { TextStyle, ViewStyle } from 'react-native';

// Cuaderno de campo de acuarela: papel blanco frío, aguadas de verdes intensos y un solo acento
// cálido (copihue). Roles al estilo Material 3; ver DESIGN.md.
const light = {
  // Papel de acuarela blanco frío: el azul no queda bajo el rojo.
  background: '#EFF5F3',
  grain: '#0F2418',
  grainOpacity: 0.35,
  surface: '#FFFFFF',
  surfaceContainer: '#E4EDDA',
  onSurface: '#0F2418',
  onSurfaceVariant: '#3A5244',
  outline: '#5E7A68',
  outlineVariant: '#C9D8C6',
  // Banda de aguada de las barras superiores: base, veladura más clara y borde donde se seca el pigmento.
  topBar: '#0B5A33',
  topBarGlaze: '#1C8044',
  topBarEdge: '#053B20',
  onTopBar: '#FFFFFF',
  onTopBarVariant: '#D2F09E',
  searchField: '#FFFFFF',
  onSearchField: '#0F2418',
  onSearchFieldVariant: '#3A5244',
  ripple: 'rgba(11, 90, 51, 0.14)',
  // Ripple sobre la banda verde de las barras superiores.
  onTopBarRipple: 'rgba(255, 255, 255, 0.2)',
  leafInk: '#0E3F25',
  lime: '#B9E24C',
  // Aguada grande de fondo detrás de las ilustraciones.
  backdrop: '#B9E24C',
  accent: '#C7361F',
  onAccent: '#FFFFFF',
  provisional: '#D6EE8C',
  onProvisional: '#1F3308',
  // Aviso de demostración o «no implementado»: menta fría, distinta de la cinta lima de provisional.
  demo: '#D2EFE3',
  onDemo: '#0A4430',
  navBar: '#FFFFFF',
  navIndicator: '#C3E86A',
  onNavIndicator: '#0F2418',
  navIconFill: 'rgba(11, 90, 51, 0.22)',
  segmentSelected: '#FFFFFF',
  onSegmentSelected: '#0B5A33',
  primary: '#0B5A33',
  onPrimary: '#FFFFFF',
  scrim: 'rgba(15, 36, 24, 0.22)',
  washOpacity: 0.5,
};

export type Palette = typeof light;
/** Nombre de un color de la paleta (excluye las opacidades numéricas). */
export type ColorToken = { [K in keyof Palette]: Palette[K] extends string ? K : never }[keyof Palette];
export type Theme = { scheme: 'light' | 'dark'; color: Palette };

// La app es siempre clara: el cuaderno de campo se lee sobre papel, sin importar el tema del sistema.
export function useTheme(): Theme {
  return { scheme: 'light', color: light };
}

export const fonts = {
  BricolageGrotesque_600SemiBold,
  BricolageGrotesque_700Bold,
  BricolageGrotesque_800ExtraBold,
  Kalam_400Regular,
  Kalam_700Bold,
  Literata_400Regular_Italic,
};

// Escala tipográfica Material: Bricolage Grotesque para títulos, Literata cursiva para nombres
// científicos (convención botánica), Kalam para anotaciones a mano breves, Roboto (sistema) para la UI.
export const type = {
  headlineLarge: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 36, lineHeight: 42, letterSpacing: -0.6 },
  headlineMedium: { fontFamily: 'BricolageGrotesque_800ExtraBold', fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  headlineSmall: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 24, lineHeight: 30, letterSpacing: -0.2 },
  titleLarge: { fontFamily: 'BricolageGrotesque_700Bold', fontSize: 22, lineHeight: 28, letterSpacing: -0.2 },
  titleMedium: { fontFamily: 'BricolageGrotesque_600SemiBold', fontSize: 19, lineHeight: 24 },
  scientific: { fontFamily: 'Literata_400Regular_Italic', fontSize: 15, lineHeight: 20 },
  scientificLarge: { fontFamily: 'Literata_400Regular_Italic', fontSize: 19, lineHeight: 26 },
  hand: { fontFamily: 'Kalam_400Regular', fontSize: 16, lineHeight: 22 },
  handBold: { fontFamily: 'Kalam_700Bold', fontSize: 16, lineHeight: 22 },
  bodyLarge: { fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontSize: 14, lineHeight: 20 },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '600', letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 0.4 },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.4 },
  // Versalitas de guía impresa: rótulos cortos en mayúsculas espaciadas.
  overline: { fontSize: 12, lineHeight: 16, fontWeight: '600', letterSpacing: 1.2, textTransform: 'uppercase' },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 20, full: 999 };

// Sombras de lo que flota sobre el papel o el mapa; el color va aparte (`shadowColor: color.scrim`).
export const elevation = {
  /** Chips y controles sobre el mapa. */
  raised: { elevation: 2, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 1, shadowRadius: 3 },
  /** Papeleta dejada sobre el mapa. */
  floating: { elevation: 3, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 1, shadowRadius: 6 },
  /** Lupa sobre la lámina. */
  lens: { elevation: 8, shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.25, shadowRadius: 12 },
} satisfies Record<string, ViewStyle>;
