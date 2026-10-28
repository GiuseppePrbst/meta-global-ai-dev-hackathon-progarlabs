import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { ScreenHeader } from '@/ui/screen-header';
import { Paper } from '@/ui/paper';
import { NotImplementedTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';
import { BAND_EDGE, seedOf, Wash } from '@/ui/watercolor';

type PendingFeatureProps = {
  title: string;
  subtitle: string;
  heading: string;
  body: string;
  action: string;
  onAction: () => void;
  /** Ilustración del pliego: lo que la pestaña hará, dibujado en tinta. */
  art: React.ReactNode;
  /** Ilustración decorativa de la barra superior. */
  cover?: React.ReactNode;
};

/** Pestaña cuya capacidad aún no existe: lo dice con texto y ofrece un camino que sí funciona. */
export function PendingFeature({ title, subtitle, heading, body, action, onAction, art, cover }: PendingFeatureProps) {
  const { color } = useTheme();
  const [artSize, setArtSize] = useState({ width: 0, height: 0 });
  return (
    <Paper style={styles.screen}>
      <ScreenHeader title={title} subtitle={subtitle} cover={cover} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sheet} accessible={false} importantForAccessibility="no-hide-descendants"
          onLayout={({ nativeEvent: { layout } }) => setArtSize({ width: layout.width, height: layout.height })}>
          <Svg width={artSize.width} height={artSize.height} style={StyleSheet.absoluteFill}>
            <Wash seed={seedOf(title)} cx={artSize.width / 2} cy={artSize.height / 2} rx={artSize.width * 0.38}
              ry={artSize.height * 0.38} color={color.backdrop} opacity={0.45} wobble={0.16} grain={16} />
          </Svg>
          {art}
        </View>
        <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.text}>
          <Text style={[type.titleLarge, { color: color.onSurface }]} accessibilityRole="header">
            {heading}
          </Text>
          <NotImplementedTag />
          <Text style={[type.bodyLarge, { color: color.onSurfaceVariant }]}>{body}</Text>
          <Pressable onPress={onAction} accessibilityRole="button" android_ripple={{ color: color.ripple }}
            style={[styles.button, { backgroundColor: color.primary }]}>
            <Text style={[type.labelLarge, { color: color.onPrimary }]}>{action}</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </Paper>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: BAND_EDGE + space.lg, paddingBottom: space.xxl, gap: space.xl },
  sheet: {
    aspectRatio: 1.4,
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
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
