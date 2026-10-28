import { StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, type, useTheme } from '@/ui/theme';

type ScreenHeaderProps = {
  title: string;
  subtitle: string;
  /** Ilustración decorativa detrás del título, bajo la barra de estado. */
  cover?: React.ReactNode;
  children?: React.ReactNode;
};

/** Encabezado verde bosque de las pestañas principales. */
export function ScreenHeader({ title, subtitle, cover, children }: ScreenHeaderProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.bar, { backgroundColor: color.topBar, paddingTop: insets.top + space.lg }]}>
      {cover ? (
        <View style={[StyleSheet.absoluteFill, { top: insets.top }]} pointerEvents="none" accessible={false}
          importantForAccessibility="no-hide-descendants">
          {cover}
        </View>
      ) : null}
      <Text style={[type.headlineLarge, { color: color.onTopBar }]} accessibilityRole="header">
        {title}
      </Text>
      <Text style={[type.bodyMedium, { color: color.onTopBarVariant }]}>{subtitle}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    overflow: 'hidden',
    paddingHorizontal: space.lg,
    paddingBottom: space.lg,
    gap: space.xs,
  },
});
