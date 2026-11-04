import type { TabTriggerSlotProps } from 'expo-router/ui';
import { Children, useRef, useState } from 'react';
import { Pressable, StyleSheet, View, type ViewProps } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { IconComponent } from '@/ui/components/icons';
import { highlightLeft, scrubIndex, slotCenter } from '@/ui/components/navigation-scrub';
import { Text } from '@/ui/components/text';
import { easeOutExpo } from '@/ui/tokens/motion';
import { radius, space, useTheme } from '@/ui/tokens/theme';

/** Cuánto se monta la barra sobre la pantalla: el contenido anclado abajo debe sumarlo para no quedar tapado. */
export const NAVIGATION_BAR_OVERLAP = radius.xl;

/** Desplazamiento horizontal mínimo para que el deslizamiento tome el control; menos que eso sigue siendo un toque. */
const SCRUB_ACTIVE_OFFSET_X = 4;
/** Cuánto sobresale el resaltado de presión de su destino por cada lado. */
const HIGHLIGHT_OVERHANG = space.sm;
/** Separación mínima entre el resaltado y el borde de la barra: igual al relleno superior, así queda concéntrico a sus esquinas. */
const HIGHLIGHT_INSET = space.xs;
/** Resorte del arrastre: sigue al dedo con un leve retraso, sin rebote. */
const FOLLOW_SPRING = { damping: 26, stiffness: 240, mass: 0.7 };

type NavigationBarProps = ViewProps & {
  /** Al soltar tras deslizar en horizontal, recibe el índice del destino bajo el dedo. Mientras se arrastra no navega. */
  onScrubEnd?: (index: number) => void;
};

/**
 * Barra de navegación Material 3 en verde casi negro; respeta el borde inferior.
 * Las esquinas superiores redondeadas se montan sobre el contenido (margen negativo) para que este asome detrás.
 * Al presionar, una píldora translúcida marca el destino; al deslizar, la sigue al dedo y navega recién al soltar.
 */
export function NavigationBar({ style, onScrubEnd, children, onLayout, ...props }: NavigationBarProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const width = useRef(0);
  const [barWidth, setBarWidth] = useState(0);
  const count = Children.count(children);
  const left = useSharedValue(0);
  const shown = useSharedValue(0);

  const highlightWidthFor = (w: number) => (count > 0 ? (w - 2 * space.sm) / count + 2 * HIGHLIGHT_OVERHANG : 0);
  const indexAt = (x: number) => scrubIndex(x, width.current, count, space.sm);
  const leftAt = (center: number) => highlightLeft(center, highlightWidthFor(width.current), width.current, HIGHLIGHT_INSET);
  const slotLeft = (index: number) => leftAt(slotCenter(index, width.current, count, space.sm));
  const moveTo = (target: number) => left.set(reducedMotion ? target : withSpring(target, FOLLOW_SPRING));

  // Sin espera: apenas el dedo se mueve en horizontal el pan se activa y cancela el Pressable,
  // así soltar no dispara un toque extra. Un toque quieto sigue llegando al Pressable.
  // onBegin/onFinalize llegan también en un toque que no activa el pan: el resaltado sirve a ambos.
  const scrub = usePanGesture({
    enabled: onScrubEnd !== undefined,
    activeOffsetX: [-SCRUB_ACTIVE_OFFSET_X, SCRUB_ACTIVE_OFFSET_X],
    runOnJS: true,
    onBegin: (event) => {
      const index = indexAt(event.x);
      if (index < 0) return;
      left.set(slotLeft(index));
      shown.set(reducedMotion ? 1 : withTiming(1, { duration: 120 }));
    },
    onUpdate: (event) => moveTo(leftAt(event.x)),
    onDeactivate: (event) => {
      if (event.canceled) return;
      const index = indexAt(event.x);
      if (index < 0) return;
      moveTo(slotLeft(index));
      onScrubEnd?.(index);
    },
    onFinalize: () => shown.set(reducedMotion ? 0 : withTiming(0, { duration: 220, easing: easeOutExpo })),
  });

  const highlightStyle = useAnimatedStyle(() => ({ opacity: shown.get(), transform: [{ translateX: left.get() }] }));
  const highlightWidth = highlightWidthFor(barWidth);

  return (
    <GestureDetector gesture={scrub}>
      <View accessibilityRole="tablist"
        onLayout={(event) => {
          width.current = event.nativeEvent.layout.width;
          setBarWidth(width.current);
          onLayout?.(event);
        }}
        style={[styles.bar, { backgroundColor: color.dark, paddingBottom: insets.bottom }, style]} {...props}>
        {highlightWidth > 0 && (
          <Animated.View pointerEvents="none"
            style={[styles.highlight, { width: highlightWidth, bottom: insets.bottom, backgroundColor: color.onDarkRipple }, highlightStyle]} />
        )}
        {children}
      </View>
    </GestureDetector>
  );
}

type NavigationItemProps = Omit<TabTriggerSlotProps, 'ref'> & { label: string; icon: IconComponent };

/** Destino de la barra: el activo se enciende en lima, con su forma rellena. */
export function NavigationItem({ label, icon: Icon, isFocused = false, ...props }: NavigationItemProps) {
  const { color } = useTheme();
  const ink = isFocused ? color.lime : color.onDarkVariant;

  return (
    <Pressable {...props} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{ selected: isFocused }}
      style={styles.item}>
      <View style={styles.iconSlot}>
        <Icon color={ink} fill={isFocused ? color.limeTint : undefined} />
      </View>
      <Text variant="labelMedium" style={{ color: ink }} numberOfLines={1}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row', paddingHorizontal: space.sm, paddingTop: space.xs,
    borderTopLeftRadius: radius.xl, borderTopRightRadius: radius.xl, marginTop: -NAVIGATION_BAR_OVERLAP, zIndex: 1,
  },
  item: { flex: 1, minHeight: 68, alignItems: 'center', justifyContent: 'center', gap: space.xs, paddingTop: space.sm, paddingBottom: space.sm },
  highlight: { position: 'absolute', left: 0, top: HIGHLIGHT_INSET, borderRadius: radius.full },
  iconSlot: { width: 64, height: 32, alignItems: 'center', justifyContent: 'center' },
});
