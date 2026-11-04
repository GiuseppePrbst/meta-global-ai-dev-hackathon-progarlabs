import { useState } from 'react';
import { StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { markOnboardingSeen } from '@/features/onboarding/onboarding-seen';
import { Wilo, type WiloPose } from '@/features/onboarding/wilo';
import { t } from '@/i18n/es-CL';
import {
  Button,
  IdentifyIcon,
  type IconComponent,
  JournalIcon,
  MapIcon,
  NAVIGATION_BAR_OVERLAP,
  NavigationBar,
  NavigationItem,
  ProfileIcon,
  radius,
  space,
  SpeciesIcon,
  Text,
  TextButton,
  useTheme,
} from '@/ui';

// Presentación del primer inicio: Wilo explica las cinco pestañas, en el mismo orden que la barra.
// Abajo se repite la barra real con la pestaña del paso encendida, para que se reconozca después.

type TabKey = keyof typeof t.onboarding.steps;

const STEPS: { tab: TabKey; label: string; icon: IconComponent; pose: WiloPose }[] = [
  { tab: 'identify', label: t.tabs.identify, icon: IdentifyIcon, pose: 'greet' },
  { tab: 'atlas', label: t.tabs.map, icon: MapIcon, pose: 'swim' },
  { tab: 'species', label: t.tabs.species, icon: SpeciesIcon, pose: 'sniff' },
  { tab: 'journal', label: t.tabs.journal, icon: JournalIcon, pose: 'happy' },
  { tab: 'profile', label: t.tabs.profile, icon: ProfileIcon, pose: 'greet' },
];

export function Onboarding() {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);

  const step = STEPS[index];
  const copy = t.onboarding.steps[step.tab];
  const last = index === STEPS.length - 1;
  const stageWidth = Math.min(width - space.xl * 2, 360);
  const stageHeight = Math.min(Math.max(height * 0.3, 170), 280);

  return (
    <Animated.View exiting={FadeOut.duration(220)} accessibilityViewIsModal
      style={[StyleSheet.absoluteFill, { backgroundColor: color.background }]}>
      <View style={[styles.top, { paddingTop: insets.top + space.sm }]}>
        <View style={styles.dots} accessibilityLabel={t.onboarding.stepOf(index + 1, STEPS.length)}>
          {STEPS.map((s, i) => (
            <View key={s.tab} style={[styles.dot, {
              width: i === index ? 22 : 8,
              backgroundColor: i <= index ? color.onLimeSoft : color.outlineVariant,
            }]} />
          ))}
        </View>
        {!last && (
          <TextButton label={t.onboarding.skip} onPress={markOnboardingSeen} tone="onSurfaceVariant" />
        )}
      </View>

      <View style={styles.body}>
        <Wilo pose={step.pose} width={stageWidth} height={stageHeight} accessibilityLabel={t.onboarding.wiloA11y} />

        <Animated.View key={step.tab} entering={FadeInDown.duration(320).delay(80)}
          style={[styles.bubble, { backgroundColor: color.surface, shadowColor: color.shadow }]}
          accessibilityLiveRegion="polite">
          <View style={[styles.tail, { backgroundColor: color.surface }]} />
          <View style={[styles.eyebrow, { backgroundColor: color.limeSoft }]}>
            <step.icon color={color.onLimeSoft} size={16} />
            <Text variant="tag" tone="onLimeSoft">{step.label}</Text>
          </View>
          <Text variant="headline" accessibilityRole="header">{copy.title}</Text>
          <Text variant="bodyLarge" tone="onSurfaceVariant">{copy.body}</Text>
        </Animated.View>
      </View>

      <Animated.View entering={FadeIn.duration(400)} style={styles.actions}>
        <Button label={last ? t.onboarding.done : t.onboarding.next}
          onPress={last ? markOnboardingSeen : () => setIndex(index + 1)} />
      </Animated.View>

      <NavigationBar accessibilityLabel={t.onboarding.tabsLabel}>
        {STEPS.map((s, i) => (
          <NavigationItem key={s.tab} label={s.label} icon={s.icon} isFocused={i === index}
            onPress={() => setIndex(i)} />
        ))}
      </NavigationBar>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: space.xl,
  },
  dots: { flexDirection: 'row', gap: space.xs + 2, alignItems: 'center', minHeight: 48 },
  dot: { height: 8, borderRadius: radius.full },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.xl, paddingHorizontal: space.xl },
  bubble: {
    alignSelf: 'stretch',
    maxWidth: 480,
    marginHorizontal: 'auto',
    gap: space.sm,
    padding: space.xl,
    borderRadius: radius.xl,
    elevation: 2,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
  },
  tail: {
    position: 'absolute',
    top: -8,
    left: '50%',
    marginLeft: -9,
    width: 18,
    height: 18,
    borderRadius: 3,
    transform: [{ rotate: '45deg' }],
  },
  eyebrow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: space.xs + 2,
    paddingHorizontal: space.md,
    paddingVertical: space.xs,
    borderRadius: radius.full,
  },
  actions: { paddingHorizontal: space.xl, paddingBottom: space.lg + NAVIGATION_BAR_OVERLAP },
});
