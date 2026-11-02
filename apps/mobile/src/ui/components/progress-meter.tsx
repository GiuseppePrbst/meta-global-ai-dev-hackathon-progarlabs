import { type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';

import { Text } from '@/ui/components/text';
import { radius, space, stroke, useTheme } from '@/ui/tokens/theme';

type ProgressMeterProps = {
  label: string;
  value: number;
  max: number;
  /** Lectura del avance, p. ej. «0 de 8». */
  valueLabel: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * Avance de una colección: rótulo, cifra y una barra de tinta que se llena con aguada lima. Solo
 * muestra valores reales; en cero la barra queda vacía, sin un mínimo decorativo.
 */
export function ProgressMeter({ label, value, max, valueLabel, style }: ProgressMeterProps) {
  const { color } = useTheme();
  const share = max > 0 ? Math.min(Math.max(value / max, 0), 1) : 0;
  return (
    <View style={[styles.wrap, style]} accessible accessibilityRole="progressbar" accessibilityLabel={label}
      accessibilityValue={{ min: 0, max, now: value, text: valueLabel }}>
      <View style={styles.head}>
        <Text variant="titleSmall" style={styles.label}>{label}</Text>
        <Text variant="button" tone="leafInk" style={styles.value}>{valueLabel}</Text>
      </View>
      <View style={[styles.track, { borderColor: color.leafInk, backgroundColor: color.surface }]}>
        {share > 0 ? (
          <View style={[styles.fill, { width: `${share * 100}%`, backgroundColor: color.lime }]}>
            <View style={[styles.shine, { backgroundColor: color.surface }]} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  head: { flexDirection: 'row', alignItems: 'baseline', gap: space.md },
  label: { flex: 1 },
  value: { fontVariant: ['tabular-nums'] },
  track: { height: 20, borderRadius: radius.full, borderWidth: stroke.ink, overflow: 'hidden' },
  fill: { height: '100%', borderRadius: radius.full },
  // Brillo de la aguada húmeda a lo largo de la barra.
  shine: { position: 'absolute', top: 3, left: 8, right: 8, height: 3, borderRadius: 2, opacity: 0.55 },
});
