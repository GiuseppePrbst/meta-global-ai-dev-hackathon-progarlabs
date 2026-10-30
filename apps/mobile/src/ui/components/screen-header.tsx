import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BandBackground } from '@/ui/art/band-background';
import { BAND_EDGE, seedOf } from '@/ui/art/watercolor';
import { Text } from '@/ui/components/text';
import { useLayoutSize } from '@/ui/hooks/use-layout-size';
import { space } from '@/ui/tokens/theme';

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
  const insets = useSafeAreaInsets();
  const { width, height, onLayout } = useLayoutSize();

  return (
    <View style={[styles.bar, { paddingTop: insets.top + space.lg }]} onLayout={onLayout}>
      <BandBackground seed={seedOf(title)} width={width} height={height} />
      {cover ? (
        <View style={[StyleSheet.absoluteFill, { top: insets.top, bottom: BAND_EDGE }]} pointerEvents="none"
          accessible={false} importantForAccessibility="no-hide-descendants">
          {cover}
        </View>
      ) : null}
      <Text variant="headlineLarge" tone="onTopBar" accessibilityRole="header">
        {title}
      </Text>
      <Text variant="bodyMedium" tone="onTopBarVariant" style={styles.subtitle}>{subtitle}</Text>
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
