import { StyleSheet, type TextProps, View } from 'react-native';
import Animated, { type AnimatedProps } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BandBackground } from '@/ui/art/band-background';
import { BAND_EDGE } from '@/ui/art/watercolor';
import { BackIcon } from '@/ui/components/icons';
import { IconButton } from '@/ui/components/icon-button';
import { useLayoutSize } from '@/ui/hooks/use-layout-size';
import { space, type, useTheme } from '@/ui/tokens/theme';

/** Alto de la barra bajo la barra de estado, sin contar el filo mojado. */
export const APP_BAR_HEIGHT = 64;

type AppBarProps = {
  title: string;
  /** Semilla de la banda pintada: la misma pantalla, la misma banda. */
  seed: number;
  backLabel: string;
  onBack: () => void;
  /** Estilo animado del título, p. ej. para que aparezca al hacer scroll. */
  titleStyle?: AnimatedProps<TextProps>['style'];
};

/**
 * Barra superior de una pantalla apilada: banda de aguada flotante con volver y título. El contenido
 * pasa por debajo y debe dejar libre arriba `insets.top + APP_BAR_HEIGHT + BAND_EDGE`.
 */
export function AppBar({ title, seed, backLabel, onBack, titleStyle }: AppBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height, onLayout } = useLayoutSize();

  return (
    <View style={[styles.bar, { paddingTop: insets.top }]} onLayout={onLayout}>
      <BandBackground seed={seed} width={width} height={height} />
      <IconButton label={backLabel} onPress={onBack} on="band">
        <BackIcon color={color.onTopBar} />
      </IconButton>
      <Animated.Text style={[type.titleMedium, styles.title, { color: color.onTopBar }, titleStyle]} numberOfLines={1}>
        {title}
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: APP_BAR_HEIGHT + BAND_EDGE,
    paddingBottom: BAND_EDGE,
    paddingHorizontal: space.xs,
    gap: space.xs,
  },
  title: { flex: 1, paddingRight: space.lg },
});
