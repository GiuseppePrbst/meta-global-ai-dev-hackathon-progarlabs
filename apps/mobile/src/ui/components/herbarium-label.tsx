import { StyleSheet, View } from 'react-native';

import { Tape } from '@/ui/components/tape';
import { Text } from '@/ui/components/text';
import { space, useTheme } from '@/ui/tokens/theme';

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
        <Text variant={italic ? 'scientificLarge' : 'titleMedium'}>{name}</Text>
        {rows.map(([label, value]) => (
          <View key={label} style={styles.row}>
            <Text variant="labelMedium" tone="onSurfaceVariant" style={styles.key}>{label}</Text>
            <Text variant="bodyMedium" style={styles.value}>{value}</Text>
          </View>
        ))}
        <Text variant="handBold" tone="onSurfaceVariant" style={[styles.stamp, { borderColor: color.outlineVariant }]}>
          {heading}
        </Text>
      </View>
      <Tape style={styles.tapeLeft} />
      <Tape style={styles.tapeRight} />
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
  tapeLeft: { top: 0, left: -6, transform: [{ rotate: '-24deg' }] },
  tapeRight: { top: 0, right: -6, transform: [{ rotate: '22deg' }] },
});
