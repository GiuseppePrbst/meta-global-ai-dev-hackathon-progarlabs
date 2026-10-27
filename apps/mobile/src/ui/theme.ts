import {
  Literata_400Regular_Italic,
  Literata_500Medium,
  Literata_600SemiBold,
} from '@expo-google-fonts/literata';
import { useColorScheme, type TextStyle } from 'react-native';

// Tokens provisionales (ver docs/ARQUITECTURA.md#diseño). Roles al estilo Material 3.
const light = {
  background: '#ECF0E8',
  surface: '#FAFBF6',
  surfaceContainer: '#E1E7DC',
  onSurface: '#17231C',
  onSurfaceVariant: '#45534A',
  outline: '#6F7E74',
  outlineVariant: '#C3CDC2',
  topBar: '#1E4733',
  onTopBar: '#F1F6EE',
  onTopBarVariant: '#BFD6C6',
  topBarLeafFill: 'rgba(241, 246, 238, 0.10)',
  searchField: '#F1F6EE',
  onSearchField: '#17231C',
  ripple: 'rgba(30, 71, 51, 0.12)',
  leafInk: '#24503A',
  leafFill: 'rgba(72, 128, 92, 0.14)',
  provisional: '#F5E6C8',
  onProvisional: '#6A4608',
  provisionalOutline: '#D8B878',
  demo: '#DCE6EE',
  onDemo: '#22425A',
};

type Palette = typeof light;

const dark: Palette = {
  background: '#0D1511',
  surface: '#151F19',
  surfaceContainer: '#1D2922',
  onSurface: '#E2EAE1',
  onSurfaceVariant: '#A8B7AB',
  outline: '#829386',
  outlineVariant: '#33423A',
  topBar: '#163126',
  onTopBar: '#E2EAE1',
  onTopBarVariant: '#9FBFAB',
  topBarLeafFill: 'rgba(226, 234, 225, 0.08)',
  searchField: '#22352B',
  onSearchField: '#E2EAE1',
  ripple: 'rgba(168, 213, 182, 0.16)',
  leafInk: '#A8D5B6',
  leafFill: 'rgba(168, 213, 182, 0.10)',
  provisional: '#3A2C10',
  onProvisional: '#F1D394',
  provisionalOutline: '#6E5520',
  demo: '#1A2B38',
  onDemo: '#B9D3E6',
};

export type Theme = { scheme: 'light' | 'dark'; color: Palette };

export function useTheme(): Theme {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { scheme, color: scheme === 'dark' ? dark : light };
}

export const fonts = { Literata_500Medium, Literata_600SemiBold, Literata_400Regular_Italic };

// Escala tipográfica Material: Literata para nombres de especie, Roboto (sistema) para la UI.
export const type = {
  headlineLarge: { fontFamily: 'Literata_600SemiBold', fontSize: 34, lineHeight: 40 },
  headlineMedium: { fontFamily: 'Literata_600SemiBold', fontSize: 28, lineHeight: 36 },
  headlineSmall: { fontFamily: 'Literata_600SemiBold', fontSize: 24, lineHeight: 32 },
  titleLarge: { fontFamily: 'Literata_600SemiBold', fontSize: 22, lineHeight: 28 },
  titleMedium: { fontFamily: 'Literata_500Medium', fontSize: 18, lineHeight: 24 },
  scientific: { fontFamily: 'Literata_400Regular_Italic', fontSize: 15, lineHeight: 20 },
  scientificLarge: { fontFamily: 'Literata_400Regular_Italic', fontSize: 18, lineHeight: 24 },
  bodyLarge: { fontSize: 16, lineHeight: 24 },
  bodyMedium: { fontSize: 14, lineHeight: 20 },
  labelLarge: { fontSize: 14, lineHeight: 20, fontWeight: '500', letterSpacing: 0.1 },
  labelMedium: { fontSize: 12, lineHeight: 16, fontWeight: '500', letterSpacing: 0.4 },
  labelSmall: { fontSize: 11, lineHeight: 16, fontWeight: '500', letterSpacing: 0.4 },
} satisfies Record<string, TextStyle>;

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, full: 999 };
