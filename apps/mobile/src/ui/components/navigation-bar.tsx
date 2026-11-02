import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconComponent } from '@/ui/components/icons';
import { Text } from '@/ui/components/text';
import { easeOutExpo } from '@/ui/tokens/motion';
import { space, useTheme } from '@/ui/tokens/theme';

/** Barra de navegación Material 3 en verde casi negro; respeta el borde inferior. */
export function NavigationBar({ style, ...props }: ViewProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: color.dark, paddingBottom: insets.bottom }, style]} {...props} />
  );
}

type NavigationItemProps = Omit<TabTriggerSlotProps, 'ref'> & { label: string; icon: IconComponent };

/** Destino de la barra: el activo se enciende en lima, con su forma rellena y un indicador encima. */
export function NavigationItem({ label, icon: Icon, isFocused = false, ...props }: NavigationItemProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const active = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    const target = isFocused ? 1 : 0;
    active.set(reducedMotion ? target : withTiming(target, { duration: 240, easing: easeOutExpo }));
  }, [active, isFocused, reducedMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({ opacity: active.get(), transform: [{ scaleX: 0.5 + 0.5 * active.get() }] }));

  const ink = isFocused ? color.lime : color.onDarkVariant;

  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isFocused }}
      android_ripple={{ color: color.onDarkRipple, borderless: true, radius: 40 }} style={styles.item}>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.indicator, { backgroundColor: color.darkSurfaceHigh }, indicatorStyle]} />
        {/* Envuelto: en web el indicador absoluto quedaría encima del ícono. */}
        <View style={styles.icon}>
          <Icon color={ink} fill={isFocused ? color.limeTint : undefined} />
        </View>
      </View>
      <Text variant="labelMedium" style={{ color: ink }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', paddingHorizontal: space.sm },
  item: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingTop: space.sm, paddingBottom: space.sm },
  icon: { zIndex: 1 },
  iconSlot: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
  indicator: { position: 'absolute', left: 0, top: 0, width: 64, height: 32, borderRadius: 16 },
});
