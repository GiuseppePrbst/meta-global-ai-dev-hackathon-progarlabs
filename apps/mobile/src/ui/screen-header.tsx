import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

import { space, type, useTheme } from '@/ui/theme';
import { BAND_EDGE, PaintedBand, seedOf } from '@/ui/watercolor';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  /** Ilustración decorativa detrás del título, bajo la barra de estado. */
  cover?: React.ReactNode;
  children?: React.ReactNode;
};

/**
 * Encabezado de las pestañas principales: una banda de aguada verde cuyo filo mojado cae
 * `BAND_EDGE` sobre el contenido de abajo, que debe dejar ese margen libre arriba.
 */
export function ScreenHeader({ title, subtitle, cover, children }: ScreenHeaderProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const [size, setSize] = useState({ width: 0, height: 0 });

  return (
    <View
      style={[styles.bar, { paddingTop: insets.top + space.lg }]}
      onLayout={({ nativeEvent: { layout } }) => setSize({ width: layout.width, height: layout.height })}>
      <Svg width={size.width} height={size.height} style={StyleSheet.absoluteFill} accessible={false}
        pointerEvents="none">
        <PaintedBand seed={seedOf(title)} width={size.width} height={size.height} color={color.topBar}
          glaze={color.topBarGlaze} edge={color.topBarEdge} paper={color.background} />
      </Svg>
      {cover ? (
        <View style={[StyleSheet.absoluteFill, { top: insets.top, bottom: BAND_EDGE }]} pointerEvents="none"
          accessible={false} importantForAccessibility="no-hide-descendants">
          {cover}
        </View>
      ) : null}
      <Text style={[type.headlineLarge, { color: color.onTopBar }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[type.bodyMedium, styles.subtitle, { color: color.onTopBarVariant }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    zIndex: 2,
    overflow: 'hidden',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg + BAND_EDGE,
    marginBottom: -BAND_EDGE,
    gap: space.xs,
  },
  subtitle: { fontWeight: '500' },
});
