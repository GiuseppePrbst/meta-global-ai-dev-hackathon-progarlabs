import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

import { easeOutExpo } from '@/ui/tokens/motion';
import { radius, useTheme } from '@/ui/tokens/theme';

type ProgressBarProps = {
  value: number;
  max: number;
  /** Etiqueta accesible: qué avanza y cuánto, p. ej. «Guía de campo, 4 de 8». */
  label: string;
  /** Llena el riel desde cero al aparecer (y al cambiar el valor). Con movimiento reducido, no anima. */
  animateIn?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Riel gris con relleno lima; nunca pasa del máximo. */
export function ProgressBar({ value, max, label, animateIn = false, style }: ProgressBarProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const share = max > 0 ? Math.min(value / max, 1) : 0;
  const animate = animateIn && !reducedMotion;
  const fill = useSharedValue(animate ? 0 : share);

  useEffect(() => {
    fill.set(animate ? withDelay(150, withTiming(share, { duration: 900, easing: easeOutExpo })) : share);
  }, [animate, fill, share]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${fill.get() * 100}%` }));

  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
      style={[styles.rail, { backgroundColor: color.surfaceMuted }, style]}>
      <Animated.View style={[styles.fill, { backgroundColor: color.lime }, fillStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { height: 10, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
