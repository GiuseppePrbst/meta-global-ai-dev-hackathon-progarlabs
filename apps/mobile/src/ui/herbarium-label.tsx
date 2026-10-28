import { StyleSheet, Text, View } from 'react-native';

import { space, type, useTheme } from '@/ui/theme';

type HerbariumLabelProps = {
  heading: string;
  /** Nombre principal del pliego; en cursiva cuando es un nombre científico. */
  name: string;
  italic?: boolean;
  rows: [string, string][];
};

/** Etiqueta de herbario: la procedencia vive junto al dato, no en una página legal. */
export function HerbariumLabel({ heading, name, italic = true, rows }: HerbariumLabelProps) {
  const { color } = useTheme();
  return (
    <View style={[styles.label, { backgroundColor: color.surface, borderColor: color.outline }]}>
      <View style={[styles.inner, { borderColor: color.outlineVariant }]}>
        <Text style={[type.labelMedium, styles.heading, { color: color.onSurfaceVariant, borderColor: color.outlineVariant }]}>
          {heading}
        </Text>
        <Text style={[italic ? type.scientificLarge : type.titleMedium, { color: color.onSurface }]}>{name}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={[type.labelMedium, styles.key, { color: color.onSurfaceVariant }]}>{label}</Text>
            <Text style={[type.bodyMedium, styles.value, { color: color.onSurface }]}>{value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  label: { borderWidth: 1, borderRadius: 2, padding: 3 },
  inner: { borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  heading: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: { flexDirection: 'row', gap: space.md },
  key: { width: 92, paddingTop: 2 },
  value: { flex: 1 },
});
