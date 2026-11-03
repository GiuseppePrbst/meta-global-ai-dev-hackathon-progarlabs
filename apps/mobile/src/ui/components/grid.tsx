import { Children } from 'react';
import { StyleSheet, View } from 'react-native';

import { space } from '@/ui/tokens/theme';

type GridProps = {
  columns: number;
  gap?: number;
  children: React.ReactNode;
};

/** Grilla de columnas iguales; la última fila conserva el ancho de las celdas. */
export function Grid({ columns, gap = space.sm, children }: GridProps) {
  const items = Children.toArray(children);
  const rows = Array.from({ length: Math.ceil(items.length / columns) }, (_, r) => items.slice(r * columns, (r + 1) * columns));
  return (
    <View style={{ gap }}>
      {rows.map((row, r) => (
        <View key={r} style={[styles.row, { gap }]}>
          {row.map((item, i) => <View key={i} style={styles.cell}>{item}</View>)}
          {Array.from({ length: columns - row.length }, (_, i) => <View key={`pad-${i}`} style={styles.cell} />)}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row' },
  cell: { flex: 1 },
});
