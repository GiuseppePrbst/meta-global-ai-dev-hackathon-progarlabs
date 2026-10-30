import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg from 'react-native-svg';

import { Paper } from '@/ui/art/paper';
import { BAND_EDGE, seedOf, Wash } from '@/ui/art/watercolor';
import { Button } from '@/ui/components/button';
import { ScreenHeader } from '@/ui/components/screen-header';
import { Tag } from '@/ui/components/tag';
import { Text } from '@/ui/components/text';
import { useLayoutSize } from '@/ui/hooks/use-layout-size';
import { space, useTheme } from '@/ui/tokens/theme';

type PendingFeatureProps = {
  title: string;
  subtitle: string;
  heading: string;
  body: string;
  /** Texto de la cinta de estado (equivale a un 501): se dice, no se simula. */
  tag: string;
  action: string;
  onAction: () => void;
  /** Ilustración del pliego: lo que la pestaña hará, dibujado en tinta. */
  art: React.ReactNode;
  /** Ilustración decorativa de la barra superior. */
  cover?: React.ReactNode;
};

/** Pestaña cuya capacidad aún no existe: lo dice con texto y ofrece un camino que sí funciona. */
export function PendingFeature({ title, subtitle, heading, body, tag, action, onAction, art, cover }: PendingFeatureProps) {
  const { color } = useTheme();
  const artSize = useLayoutSize();
  return (
    <Paper style={styles.screen}>
      <ScreenHeader title={title} subtitle={subtitle} cover={cover} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.sheet} accessible={false} importantForAccessibility="no-hide-descendants"
          onLayout={artSize.onLayout}>
          <Svg width={artSize.width} height={artSize.height} style={StyleSheet.absoluteFill}>
            <Wash seed={seedOf(title)} cx={artSize.width / 2} cy={artSize.height / 2} rx={artSize.width * 0.38}
              ry={artSize.height * 0.38} color={color.backdrop} opacity={0.45} wobble={0.16} grain={16} />
          </Svg>
          {art}
        </View>
        <Animated.View entering={FadeInDown.delay(240).duration(360)} style={styles.text}>
          <Text variant="titleLarge" accessibilityRole="header">
            {heading}
          </Text>
          <Tag label={tag} background="demo" ink="onDemo" mark="dash" tilt="right" />
          <Text variant="bodyLarge" tone="onSurfaceVariant">{body}</Text>
          <Button label={action} onPress={onAction} style={styles.button} />
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
  button: { marginTop: space.sm },
});
