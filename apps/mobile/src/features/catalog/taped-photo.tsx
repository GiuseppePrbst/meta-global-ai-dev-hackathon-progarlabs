import { useMemo } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, Keyframe, useReducedMotion } from 'react-native-reanimated';

import type { ReferencePhoto } from '@/features/catalog/reference-photos';
import { easeOutExpo } from '@/ui/ink';
import { useTheme } from '@/ui/theme';
import { seeded } from '@/ui/watercolor';

// Lado mayor de la foto respecto del cuadrado de la lámina: deja aire para el borde y la cinta.
const FILL = 0.82;
const TAPE_TOP = '-38deg';
const TAPE_BOTTOM = '-34deg';

/** La cinta se estira al apretarla contra el papel; el giro va en cada paso para no perderlo. */
function tapeOn(rotate: string) {
  return new Keyframe({
    0: { opacity: 0, transform: [{ rotate }, { scaleX: 0.3 }] },
    100: { opacity: 0.85, transform: [{ rotate }, { scaleX: 1 }], easing: easeOutExpo },
  }).duration(260);
}

type TapedPhotoProps = { photo: ReferencePhoto; seed: number; accessibilityLabel: string };

/**
 * Foto de referencia pegada en el cuaderno, en el mismo cuadrado que la lámina: copia con borde
 * blanco, algo torcida, sujeta con dos trozos de cinta. Al aparecer cae sobre la página y se asienta;
 * después se pegan las cintas.
 */
export function TapedPhoto({ photo, seed, accessibilityLabel }: TapedPhotoProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();

  const { tilt, drop } = useMemo(() => {
    const rand = seeded(seed);
    const angle = -1.5 - rand() * 2;
    return {
      tilt: `${angle.toFixed(1)}deg`,
      drop: new Keyframe({
        0: { opacity: 0, transform: [{ translateY: -28 }, { rotate: `${(angle - 7).toFixed(1)}deg` }, { scale: 1.08 }] },
        100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: `${angle.toFixed(1)}deg` }, { scale: 1 }], easing: easeOutExpo },
      }).duration(560),
    };
  }, [seed]);

  const landscape = photo.aspect >= 1;
  const width = `${(landscape ? FILL : FILL * photo.aspect) * 100}%` as const;

  return (
    <View style={styles.page} accessible accessibilityRole="image" accessibilityLabel={accessibilityLabel}>
      <Animated.View entering={reducedMotion ? FadeIn.duration(160) : drop}
        style={[styles.print, { width, backgroundColor: color.surface, borderColor: color.outlineVariant, transform: [{ rotate: tilt }] }]}>
        <View style={[styles.window, { aspectRatio: photo.aspect, backgroundColor: color.surfaceContainer }]}>
          <Image source={photo.source} style={StyleSheet.absoluteFill} resizeMode="cover" accessible={false} />
        </View>
        <Animated.View entering={reducedMotion ? undefined : tapeOn(TAPE_TOP).delay(380)}
          style={[styles.tape, styles.tapeTop, { backgroundColor: color.lime }]} />
        <Animated.View entering={reducedMotion ? undefined : tapeOn(TAPE_BOTTOM).delay(480)}
          style={[styles.tape, styles.tapeBottom, { backgroundColor: color.lime }]} />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  // Copia de papel fotográfico: borde blanco algo más ancho abajo, filo fino; pegada, sin sombra.
  print: { padding: 7, paddingBottom: 14, borderWidth: StyleSheet.hairlineWidth, borderRadius: 1 },
  window: { width: '100%', overflow: 'hidden' },
  // Dos trozos de cinta en esquinas opuestas, como se pega una foto en una libreta.
  tape: { position: 'absolute', width: 64, height: 20, opacity: 0.85, borderRadius: 1 },
  tapeTop: { top: -8, left: -20, transform: [{ rotate: TAPE_TOP }] },
  tapeBottom: { bottom: -6, right: -20, transform: [{ rotate: TAPE_BOTTOM }] },
});
