import { StyleSheet, View } from 'react-native';

import { InfoIcon } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

/** Aviso de estado no bloqueante (p. ej. modo demostración). */
export function StatusBanner({ message }: { message: string }) {
  const { color } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: color.demo, borderColor: color.onDemo }]} accessibilityRole="summary">
      <View style={[styles.bubble, { backgroundColor: color.surface }]}>
        <InfoIcon color={color.onDemo} size={20} />
      </View>
      <Text variant="bodyMedium" tone="onDemo" style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingLeft: space.md,
    paddingRight: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
    borderWidth: 1.5,
  },
  bubble: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1, fontWeight: '500' },
});
