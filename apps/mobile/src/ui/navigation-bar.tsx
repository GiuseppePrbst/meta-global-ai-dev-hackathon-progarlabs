import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { space, type, useTheme } from '@/ui/theme';

/** Barra de navegación Material 3: contenedor de las pestañas principales, respeta el borde inferior. */
export function NavigationBar({ style, ...props }: ViewProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.bar,
        { backgroundColor: color.navBar, borderColor: color.outlineVariant, paddingBottom: insets.bottom },
        style,
      ]}
      {...props}
    />
  );
}

type NavIcon = (props: { color: string; fill?: string }) => React.ReactNode;

type NavigationItemProps = Omit<TabTriggerSlotProps, 'ref'> & { label: string; icon: NavIcon };

/** Destino de la barra. El indicador se abre desde el centro al activarse, como en Material 3. */
export function NavigationItem({ label, icon: Icon, isFocused = false, ...props }: NavigationItemProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const active = useSharedValue(isFocused ? 1 : 0);

  useEffect(() => {
    active.set(
      reducedMotion ? (isFocused ? 1 : 0) : withTiming(isFocused ? 1 : 0, { duration: 260, easing: Easing.out(Easing.exp) }),
    );
  }, [active, isFocused, reducedMotion]);

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: active.get(),
    transform: [{ scaleX: interpolate(active.get(), [0, 1], [0.4, 1]) }],
  }));

  const iconColor = isFocused ? color.onNavIndicator : color.onSurfaceVariant;

  return (
    <Pressable
      {...props}
      accessibilityRole="tab"
      accessibilityLabel={label}
      accessibilityState={{ selected: isFocused }}
      android_ripple={{ color: color.ripple, borderless: true, radius: 40 }}
      style={styles.item}>
      <View style={styles.iconSlot}>
        <Animated.View style={[styles.indicator, { backgroundColor: color.navIndicator }, indicatorStyle]} />
        {/* Envuelto para que en web el ícono quede sobre el indicador absoluto. */}
        <View>
          <Icon color={iconColor} fill={isFocused ? color.navIconFill : undefined} />
        </View>
      </View>
      <Text
        numberOfLines={1}
        style={[
          type.labelMedium,
          { color: isFocused ? color.onSurface : color.onSurfaceVariant },
          isFocused && styles.labelActive,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  item: {
    flex: 1,
    minHeight: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.xs,
    paddingTop: space.md,
    paddingBottom: space.md,
  },
  iconSlot: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
  indicator: { ...StyleSheet.absoluteFill, borderRadius: 16 },
  labelActive: { fontWeight: '700' },
});
