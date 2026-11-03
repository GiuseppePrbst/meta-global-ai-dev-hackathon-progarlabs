import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/text';
import { space, useTheme } from '@/ui/tokens/theme';

/** Carga en curso: indicador y texto, anunciado a los lectores de pantalla. */
export function LoadingState({ label, on = 'light' }: { label: string; on?: 'light' | 'dark' }) {
  const { color } = useTheme();
  const dark = on === 'dark';
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite" accessible accessibilityLabel={label}>
      <ActivityIndicator color={dark ? color.lime : color.onSurface} />
      <Text variant="bodyMedium" tone={dark ? 'onDarkVariant' : 'onSurfaceVariant'}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});
