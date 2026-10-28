import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { ScreenHeader } from '@/ui/screen-header';
import { NotImplementedTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';

type PendingFeatureProps = {
  title: string;
  subtitle: string;
  heading: string;
  body: string;
  action: string;
  onAction: () => void;
  /** Ilustración del pliego: lo que la pestaña hará, dibujado en tinta. */
  art: React.ReactNode;
};

/** Pestaña cuya capacidad aún no existe: lo dice con texto y ofrece un camino que sí funciona. */
export function PendingFeature({ title, subtitle, heading, body, action, onAction, art }: PendingFeatureProps) {
  const { color } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <ScreenHeader title={title} subtitle={subtitle} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.sheet, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}
          accessible={false} importantForAccessibility="no-hide-descendants">
          {art}
        </View>
        <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.text}>
          <NotImplementedTag />
          <Text style={[type.titleLarge, { color: color.onSurface }]} accessibilityRole="header">
            {heading}
          </Text>
          <Text style={[type.bodyLarge, { color: color.onSurfaceVariant }]}>{body}</Text>
          <Pressable onPress={onAction} accessibilityRole="button" android_ripple={{ color: color.ripple }}
            style={[styles.button, { borderColor: color.outline }]}>
            <Text style={[type.labelLarge, { color: color.leafInk }]}>{action}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingBottom: space.xxl, gap: space.xl },
  sheet: {
    aspectRatio: 1.4,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  text: { gap: space.md, alignItems: 'flex-start' },
  button: {
    marginTop: space.sm,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
