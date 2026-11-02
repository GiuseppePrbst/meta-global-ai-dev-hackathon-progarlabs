import { StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/text';
import { space, useTheme } from '@/ui/tokens/theme';

/** Tabla de pares rótulo–valor (procedencia, licencias), separada por filetes finos. */
export function DataRows({ rows, on = 'light' }: { rows: [label: string, value: string][]; on?: 'light' | 'dark' }) {
  const { color } = useTheme();
  const dark = on === 'dark';
  return (
    <View>
      {rows.map(([label, value], i) => (
        <View key={label} accessible accessibilityLabel={`${label}: ${value}`}
          style={[styles.row, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: dark ? color.darkOutline : color.outlineVariant }]}>
          <Text variant="labelMedium" tone={dark ? 'onDarkVariant' : 'onSurfaceVariant'} style={styles.label}>{label}</Text>
          <Text variant="bodySmall" tone={dark ? 'onDark' : 'onSurface'} style={styles.value}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: space.md, paddingVertical: space.sm + 2 },
  label: { width: 96, paddingTop: 1 },
  value: { flex: 1 },
});
