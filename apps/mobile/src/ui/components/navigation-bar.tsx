import type { TabTriggerSlotProps } from 'expo-router/ui';
import { useEffect } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

import { seedOf, Wash } from '@/ui/art/watercolor';
import { Text } from '@/ui/components/text';
import { space, useTheme } from '@/ui/tokens/theme';

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

/**
 * Destino de la barra. El indicador de Material 3 es aquí una mancha de acuarela lima, distinta en
 * cada destino; se abre desde el centro al activarse.
 */
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
    transform: [{ scaleX: interpolate(active.get(), [0, 1], [0.4, 1]) }, { scaleY: interpolate(active.get(), [0, 1], [0.7, 1]) }],
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
        <Animated.View style={[styles.indicator, indicatorStyle]}>
          <Svg width={INDICATOR.width} height={INDICATOR.height} accessible={false}>
            <Wash seed={seedOf(label)} cx={INDICATOR.width / 2} cy={INDICATOR.height / 2} rx={INDICATOR.width / 2 - 3}
              ry={INDICATOR.height / 2 - 3} color={color.navIndicator} opacity={0.95} wobble={0.16} />
          </Svg>
        </Animated.View>
        {/* Envuelto para que en web el ícono quede sobre el indicador absoluto. */}
        <View>
          <Icon color={iconColor} fill={isFocused ? color.navIconFill : undefined} />
        </View>
      </View>
      <Text variant="labelMedium" tone={isFocused ? 'onSurface' : 'onSurfaceVariant'} numberOfLines={1}
        style={isFocused && styles.labelActive}>
        {label}
      </Text>
    </Pressable>
  );
}

const INDICATOR = { width: 72, height: 40 };

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
  indicator: {
    position: 'absolute',
    left: (64 - INDICATOR.width) / 2,
    top: (32 - INDICATOR.height) / 2,
    width: INDICATOR.width,
    height: INDICATOR.height,
  },
  labelActive: { fontWeight: '800' },
});
