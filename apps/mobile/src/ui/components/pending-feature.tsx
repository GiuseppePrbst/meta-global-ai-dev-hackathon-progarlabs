import { ScrollView, StyleSheet, View } from 'react-native';

import { Button } from '@/ui/components/button';
import type { IconComponent } from '@/ui/components/icons';
import { ScreenHeader } from '@/ui/components/screen-header';
import { Tag } from '@/ui/components/tag';
import { Text } from '@/ui/components/text';
import { radius, space, useTheme } from '@/ui/tokens/theme';

type PendingFeatureProps = {
  title: string;
  heading: string;
  body: string;
  /** Texto de la etiqueta de estado (equivale a un 501): se dice, no se simula. */
  tag: string;
  /** Pasos de lo que la pestaña hará, en orden. */
  steps: { icon: IconComponent; label: string }[];
  action: string;
  onAction: () => void;
};

/** Pestaña cuya capacidad aún no existe: lo dice con texto y ofrece un camino que sí funciona. */
export function PendingFeature({ title, heading, body, tag, steps, action, onAction }: PendingFeatureProps) {
  const { color } = useTheme();
  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <ScreenHeader title={title} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: color.dark }]}>
          <Text variant="headline" tone="onDark">{heading}</Text>
          <Tag label={tag} tone="demo" />
          <Text variant="bodyMedium" tone="onDarkVariant">{body}</Text>
          <View style={styles.steps}>
            {steps.map(({ icon: Icon, label }, i) => (
              <View key={label} style={styles.step}>
                <View style={[styles.stepIcon, { backgroundColor: color.darkSurfaceHigh }]}>
                  <Icon color={color.lime} size={22} />
                </View>
                <Text variant="labelLarge" tone="onDark" style={styles.stepLabel}>{`${i + 1}. ${label}`}</Text>
              </View>
            ))}
          </View>
        </View>
        <Button label={action} onPress={onAction} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: space.lg, paddingTop: space.sm, gap: space.lg },
  card: { borderRadius: radius.lg, padding: space.xl, gap: space.md },
  steps: { gap: space.sm, marginTop: space.sm },
  step: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  stepIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  stepLabel: { flex: 1 },
});
