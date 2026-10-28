import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Text } from '@/ui/components/text';
import { space, useTheme } from '@/ui/tokens/theme';

/** Carga en curso: indicador y texto, anunciado a los lectores de pantalla. */
export function LoadingState({ label }: { label: string }) {
  const { color } = useTheme();
  return (
    <View style={styles.wrap} accessibilityLiveRegion="polite" accessible accessibilityLabel={label}>
      <ActivityIndicator color={color.primary} />
      <Text variant="bodyMedium" tone="onSurfaceVariant">{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.xl },
});
