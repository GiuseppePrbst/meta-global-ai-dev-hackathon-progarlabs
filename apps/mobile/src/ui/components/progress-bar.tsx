import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { radius, useTheme } from '@/ui/tokens/theme';

type ProgressBarProps = {
  value: number;
  max: number;
  /** Etiqueta accesible: qué avanza y cuánto, p. ej. «Guía de campo, 4 de 8». */
  label: string;
  style?: StyleProp<ViewStyle>;
};

/** Riel gris con relleno lima; nunca pasa del máximo. */
export function ProgressBar({ value, max, label, style }: ProgressBarProps) {
  const { color } = useTheme();
  const share = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: Math.min(value, max) }}
      style={[styles.rail, { backgroundColor: color.surfaceMuted }, style]}>
      <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: color.lime }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  rail: { height: 10, borderRadius: radius.full, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
});
