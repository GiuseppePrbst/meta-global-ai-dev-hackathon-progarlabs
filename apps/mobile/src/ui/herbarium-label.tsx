import { StyleSheet, Text, View } from 'react-native';

import { space, type, useTheme } from '@/ui/theme';

type HerbariumLabelProps = {
  heading: string;
  /** Sello al pie: de qué parte del cuaderno es la etiqueta. */
  name: string;
  italic?: boolean;
  rows: [string, string][];
};

/** Etiqueta de procedencia pegada con cinta al cuaderno: la fuente vive junto al dato, no en una página legal. */
export function HerbariumLabel({ heading, name, italic = true, rows }: HerbariumLabelProps) {
  const { color } = useTheme();
  return (
    <View style={styles.wrap}>
      <View style={[styles.label, { backgroundColor: color.surface, borderColor: color.leafInk }]}>
        <Text style={[italic ? type.scientificLarge : type.titleMedium, { color: color.onSurface }]}>{name}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text style={[type.labelMedium, styles.key, { color: color.onSurfaceVariant }]}>{label}</Text>
            <Text style={[type.bodyMedium, styles.value, { color: color.onSurface }]}>{value}</Text>
          </View>
        ))}
        <Text style={[type.handBold, styles.stamp, { color: color.onSurfaceVariant, borderColor: color.outlineVariant }]}>
          {heading}
        </Text>
      </View>
      <View style={[styles.tape, styles.tapeLeft, { backgroundColor: color.lime }]} />
      <View style={[styles.tape, styles.tapeRight, { backgroundColor: color.lime }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingTop: 8 },
  label: { borderWidth: 1.5, borderRadius: 4, padding: space.lg, gap: space.sm },
  // Sello del cuaderno al pie de la etiqueta.
  stamp: { marginTop: space.xs, paddingTop: space.sm, borderTopWidth: 1, borderStyle: 'dashed', textAlign: 'right' },
  row: { flexDirection: 'row', gap: space.md },
  key: { width: 92, paddingTop: 2 },
  value: { flex: 1 },
  // Dos trozos de cinta translúcida sujetan las esquinas superiores.
  tape: { position: 'absolute', top: 0, width: 56, height: 18, opacity: 0.85, borderRadius: 1 },
  tapeLeft: { left: -6, transform: [{ rotate: '-24deg' }] },
  tapeRight: { right: -6, transform: [{ rotate: '22deg' }] },
});
