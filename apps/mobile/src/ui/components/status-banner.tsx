import { StyleSheet, View } from 'react-native';

import { InfoIcon } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

/** Aviso de estado no bloqueante (p. ej. modo demostración). */
export function StatusBanner({ message }: { message: string }) {
  const { color } = useTheme();
  return (
    <View style={[styles.banner, { backgroundColor: color.demo }]} accessibilityRole="summary">
      <InfoIcon color={color.onDemo} size={20} />
      <Text variant="bodyMedium" tone="onDemo" style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.md,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderRadius: radius.lg,
  },
  text: { flex: 1, fontWeight: '500' },
});
