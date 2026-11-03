import { StyleSheet, View, type ViewProps } from 'react-native';

import { Button } from '@/ui/components/button';
import type { IconComponent } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

type EmptyStateProps = Pick<ViewProps, 'accessibilityLiveRegion'> & {
  icon: IconComponent;
  title: string;
  body: string;
  action?: { label: string; onPress: () => void };
  /** Fondo sobre el que va. */
  on?: 'light' | 'dark';
};

/** Estado vacío o no disponible: lo dice con texto y, si hay, ofrece un camino que funciona. */
export function EmptyState({ icon: Icon, title, body, action, on = 'light', accessibilityLiveRegion }: EmptyStateProps) {
  const { color } = useTheme();
  const dark = on === 'dark';
  return (
    <View style={styles.wrap} accessibilityLiveRegion={accessibilityLiveRegion}>
      <View style={[styles.badge, { backgroundColor: dark ? color.darkSurfaceHigh : color.surfaceMuted }]}>
        <Icon color={dark ? color.lime : color.onSurfaceVariant} size={28} />
      </View>
      <Text variant="titleMedium" tone={dark ? 'onDark' : 'onSurface'} style={styles.center}>{title}</Text>
      <Text variant="bodyMedium" tone={dark ? 'onDarkVariant' : 'onSurfaceVariant'} style={styles.center}>{body}</Text>
      {action ? <Button label={action.label} onPress={action.onPress} style={styles.action} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: space.xxl, paddingHorizontal: space.xl, gap: space.sm, alignItems: 'center' },
  badge: { width: 64, height: 64, borderRadius: radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: space.sm },
  center: { textAlign: 'center', maxWidth: 320 },
  action: { marginTop: space.md },
});
