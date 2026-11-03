import { StyleSheet, View } from 'react-native';

import { InfoIcon } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

/** Aviso de estado no bloqueante (modo demostración, error parcial). Fondo violeta suave, distinto de lo activo. */
export function StatusBanner({ message, on = 'light' }: { message: string; on?: 'light' | 'dark' }) {
  const { color } = useTheme();
  const dark = on === 'dark';
  return (
    <View style={[styles.banner, { backgroundColor: dark ? color.darkScrim : color.demo, borderColor: dark ? color.darkOutline : color.demo }]}
      accessibilityRole="summary">
      <InfoIcon color={dark ? color.onDark : color.onDemo} size={18} />
      <Text variant="bodySmall" tone={dark ? 'onDark' : 'onDemo'} style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space.sm,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
  },
  text: { flex: 1 },
});
