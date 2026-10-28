import { useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import { GestureDetector, usePanGesture } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { LeafPlate } from '@/features/catalog/leaf-plate';
import { easePen } from '@/ui/ink';
import { useTheme } from '@/ui/theme';

export const LENS_ZOOM = 2.6;
const LENS_SIZE = 132;
// La lupa flota sobre el dedo para que el pulgar no tape lo que se mira.
const LENS_LIFT = 88;
// La lámina grande de la ficha se entinta despacio, a ritmo de pluma, para poder seguir el trazo.
export const PLATE_DRAW = { delay: 180, duration: 1000 };

type PlateLensProps = {
  speciesId: string;
  ink: string;
  ring: string;
  ground: string;
};

/** Lámina con lupa de terreno: mantener presionado y deslizar amplía el borde de la hoja. */
export function PlateLens({ speciesId, ink, ring, ground }: PlateLensProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const [plateSize, setPlateSize] = useState(0);
  // La lámina ampliada se monta al primer uso: en Android su SVG es un bitmap de varios MB.
  const [lensUsed, setLensUsed] = useState(false);
  const focusX = useSharedValue(0);
  const focusY = useSharedValue(0);
  const shown = useSharedValue(0);

  const pan = usePanGesture({
    activateAfterLongPress: 220,
    onActivate: (event) => {
      'worklet';
      focusX.set(event.x);
      focusY.set(event.y);
      scheduleOnRN(setLensUsed, true);
      shown.set(withTiming(1, { duration: 160 }));
    },
    onUpdate: (event) => {
      'worklet';
      focusX.set(Math.min(Math.max(event.x, 0), plateSize));
      focusY.set(Math.min(Math.max(event.y, 0), plateSize));
    },
    onFinalize: () => {
      'worklet';
      shown.set(withTiming(0, { duration: 120 }));
    },
  });

  const lensStyle = useAnimatedStyle(() => ({
    opacity: shown.get(),
    transform: [
      { translateX: focusX.get() - LENS_SIZE / 2 },
      { translateY: focusY.get() - LENS_SIZE / 2 - LENS_LIFT },
      { scale: reducedMotion ? 1 : 0.7 + 0.3 * shown.get() },
    ],
  }));

  const magnifiedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: LENS_SIZE / 2 - focusX.get() * LENS_ZOOM },
      { translateY: LENS_SIZE / 2 - focusY.get() * LENS_ZOOM },
    ],
  }));

  const onLayout = (event: LayoutChangeEvent) => setPlateSize(event.nativeEvent.layout.width);

  return (
    <GestureDetector gesture={pan}>
      <View style={styles.plate} onLayout={onLayout}>
        <LeafPlate speciesId={speciesId} ink={ink} draw delay={PLATE_DRAW.delay} duration={PLATE_DRAW.duration} easing={easePen} />
        {plateSize > 0 && lensUsed ? (
          <Animated.View
            pointerEvents="none"
            style={[styles.lens, { borderColor: ring, backgroundColor: ground, shadowColor: color.onSurface }, lensStyle]}>
            <Animated.View style={magnifiedStyle}>
              <LeafPlate speciesId={speciesId} ink={ink} size={plateSize * LENS_ZOOM} />
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  plate: { width: '100%', aspectRatio: 1 },
  lens: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: LENS_SIZE,
    height: LENS_SIZE,
    borderRadius: LENS_SIZE / 2,
    borderWidth: 3,
    overflow: 'hidden',
    elevation: 8,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
});
