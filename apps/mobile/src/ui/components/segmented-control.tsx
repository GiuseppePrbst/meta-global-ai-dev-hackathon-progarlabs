import { Pressable, type StyleProp, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, { useAnimatedStyle, useReducedMotion, withTiming } from 'react-native-reanimated';

import { Text } from '@/ui/components/text';
import { useLayoutSize } from '@/ui/hooks/use-layout-size';
import { duration } from '@/ui/tokens/motion';
import { type ColorToken, radius, space, useTheme } from '@/ui/tokens/theme';

type SegmentIcon = (props: { color: string; size?: number }) => React.ReactNode;

export type Segment<T extends string> = { key: T; label: string; Icon: SegmentIcon };

type SegmentedControlProps<T extends string> = {
  options: Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
  /**
   * `band`: grande, sobre la banda verde de una barra superior.
   * `paper`: discreto, sobre el papel; se ve de 32 dp y el área de toque sigue siendo de 48 dp.
   */
  variant: 'band' | 'paper';
  style?: StyleProp<ViewStyle>;
};

type Variant = {
  border: ColorToken;
  thumb: ColorToken;
  ink: ColorToken;
  inkSelected: ColorToken;
  ripple: ColorToken;
  iconSize: number;
  label: 'labelLarge' | 'labelMedium';
};

const variants: Record<SegmentedControlProps<string>['variant'], Variant> = {
  band: {
    border: 'onTopBarVariant', thumb: 'segmentSelected', ink: 'onTopBar', inkSelected: 'onSegmentSelected',
    ripple: 'onTopBarRipple', iconSize: 18, label: 'labelLarge',
  },
  paper: {
    border: 'outlineVariant', thumb: 'surfaceContainer', ink: 'onSurfaceVariant', inkSelected: 'onSurface',
    ripple: 'ripple', iconSize: 14, label: 'labelMedium',
  },
};

const PAPER_HIT_SLOP = { top: 8, bottom: 8 };

/** Botones segmentados de opciones iguales; la selección se desliza de una a otra. */
export function SegmentedControl<T extends string>({
  options, value, onChange, accessibilityLabel, variant, style,
}: SegmentedControlProps<T>) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const { width: measured, onLayout } = useLayoutSize();
  const look = variants[variant];
  // El pulgar va dentro del borde.
  const width = Math.max(measured - 2, 0);
  const segmentWidth = width / options.length;
  const index = Math.max(options.findIndex((option) => option.key === value), 0);

  const thumbStyle = useAnimatedStyle(() => {
    const x = index * segmentWidth;
    return {
      width: segmentWidth,
      transform: [{ translateX: reducedMotion ? x : withTiming(x, { duration: duration.toggle }) }],
    };
  });

  return (
    <View style={[styles.control, variant === 'band' ? styles.band : styles.paper, { borderColor: color[look.border] }, style]}
      accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel} onLayout={onLayout}>
      {width > 0 ? <Animated.View style={[styles.thumb, { backgroundColor: color[look.thumb] }, thumbStyle]} /> : null}
      {options.map(({ key, label, Icon }) => {
        const selected = value === key;
        const ink = selected ? look.inkSelected : look.ink;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="radio" accessibilityState={{ selected }}
            android_ripple={{ color: color[look.ripple] }} hitSlop={variant === 'paper' ? PAPER_HIT_SLOP : undefined}
            style={variant === 'band' ? styles.bandSegment : styles.paperSegment}>
            <Icon color={color[ink]} size={look.iconSize} />
            <Text variant={look.label} tone={ink} style={selected && styles.selected}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: { flexDirection: 'row', borderRadius: radius.full, overflow: 'hidden' },
  band: { borderWidth: 1.5 },
  // Segmentos iguales: el pulgar mide lo mismo que cada opción.
  paper: { borderWidth: 1, minWidth: 168 },
  thumb: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.full },
  bandSegment: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.sm },
  paperSegment: {
    flex: 1, minHeight: 32, paddingHorizontal: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs,
  },
  selected: { fontWeight: '800' },
});
