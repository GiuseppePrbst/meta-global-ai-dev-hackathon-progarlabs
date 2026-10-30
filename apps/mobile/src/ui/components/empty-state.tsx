import { StyleSheet, View, type ViewProps } from 'react-native';

import { Button } from '@/ui/components/button';
import { Text } from '@/ui/components/text';
import { space } from '@/ui/tokens/theme';

type EmptyStateProps = Pick<ViewProps, 'accessibilityLiveRegion'> & {
  /** Ilustración en tinta de lo que falta. */
  art: React.ReactNode;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  /**
   * `stacked`: todo en columna, alineado a la izquierda (una lista vacía).
   * `inline`: el dibujo a la izquierda del texto (una sección vacía dentro de una página).
   * `centered`: todo centrado (una pantalla que no puede mostrar su contenido).
   */
  layout?: 'stacked' | 'inline' | 'centered';
};

/** Estado vacío o no disponible: lo dice con texto y, si hay, ofrece un camino que funciona. */
export function EmptyState({ art, title, body, action, layout = 'stacked', accessibilityLiveRegion }: EmptyStateProps) {
  const centered = layout === 'centered';
  const text = (
    <>
      <Text variant="titleMedium" style={centered && styles.centeredText}>{title}</Text>
      <Text variant="bodyMedium" tone="onSurfaceVariant" style={centered && styles.centeredText}>{body}</Text>
    </>
  );

  return (
    <View style={styles[layout]} accessibilityLiveRegion={accessibilityLiveRegion}>
      {art}
      {layout === 'inline' ? <View style={styles.inlineText}>{text}</View> : text}
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  stacked: { padding: space.xl, gap: space.sm, alignItems: 'flex-start' },
  inline: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  inlineText: { flex: 1, gap: space.xs },
  centered: { alignItems: 'center', gap: space.md },
  centeredText: { textAlign: 'center' },
  action: { marginTop: space.md },
});
