import { useEffect } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  FadeOut,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { easeOutExpo, useTheme } from '@/ui';

// Wilo, el huillín guía. Cada pose es un recorte del arte original (ver assets/images/wilo/ATTRIBUTION.md)
// con su propia animación en reposo; al tocarlo da un salto.

export type WiloPose = 'greet' | 'swim' | 'sniff' | 'happy';

const POSES: Record<WiloPose, { source: number; aspect: number; idleMs: number }> = {
  greet: { source: require('../../../assets/images/wilo/wilo-greet.png'), aspect: 720 / 688, idleMs: 1600 },
  swim: { source: require('../../../assets/images/wilo/wilo-swim.png'), aspect: 611 / 218, idleMs: 1100 },
  sniff: { source: require('../../../assets/images/wilo/wilo-sniff.png'), aspect: 530 / 308, idleMs: 700 },
  happy: { source: require('../../../assets/images/wilo/wilo-happy.png'), aspect: 483 / 397, idleMs: 520 },
};

/**
 * Calienta la caché de imágenes con las cuatro poses para que Wilo aparezca junto con la pantalla.
 * Nunca falla y espera como máximo `timeoutMs`: si la red está lenta, la presentación se muestra igual.
 */
export function preloadWilo(timeoutMs = 2500): Promise<void> {
  const loads = Object.values(POSES).map(({ source }) => {
    // En web (react-native-web) no existe `resolveAssetSource`: ahí no se precarga.
    const uri = Image.resolveAssetSource?.(source)?.uri;
    return uri ? Image.prefetch(uri).catch(() => false) : Promise.resolve(false);
  });
  const timeout = new Promise<void>((resolve) => setTimeout(resolve, timeoutMs));
  return Promise.race([Promise.all(loads).then(() => undefined), timeout]);
}

const sine = Easing.inOut(Easing.sin);

type WiloProps = {
  pose: WiloPose;
  /** Caja disponible; la pose se ajusta dentro sin deformarse. */
  width: number;
  height: number;
  accessibilityLabel: string;
};

export function Wilo({ pose, width, height, accessibilityLabel }: WiloProps) {
  const reducedMotion = useReducedMotion();
  const jump = useSharedValue(0);

  const onPress = () => {
    if (reducedMotion) return;
    jump.set(withSequence(
      withTiming(1, { duration: 200, easing: Easing.out(Easing.quad) }),
      withSpring(0, { damping: 7, stiffness: 160 }),
    ));
  };

  const jumpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -36 * jump.get() }, { rotate: `${-6 * jump.get()}deg` }, { scale: 1 + 0.06 * jump.get() }],
  }));

  return (
    <Pressable onPress={onPress} accessibilityRole="image" accessibilityLabel={accessibilityLabel}
      style={{ width, height }}>
      <Animated.View style={[StyleSheet.absoluteFill, jumpStyle]}>
        {/* La clave remonta la pose: la anterior se desvanece y la nueva entra con su gesto. */}
        <Animated.View key={pose} style={styles.center}
          entering={pose === 'swim' ? swimIn : softIn}
          exiting={FadeOut.duration(140)}>
          <IdlePose pose={pose} width={width} height={height} animate={!reducedMotion} />
        </Animated.View>
      </Animated.View>
    </Pressable>
  );
}

function IdlePose({ pose, width, height, animate }: { pose: WiloPose; width: number; height: number; animate: boolean }) {
  const { color } = useTheme();
  const { source, aspect, idleMs } = POSES[pose];
  // Las poses anchas (nadando, olfateando) se ven chicas si se ajustan a la caja completa: ocupan el ancho.
  const w = Math.min(width, height * aspect);
  const h = w / aspect;

  const t = useSharedValue(0);
  useEffect(() => {
    if (!animate) return;
    t.set(withRepeat(withTiming(1, { duration: idleMs, easing: sine }), -1, true));
    return () => cancelAnimation(t);
  }, [animate, idleMs, t]);

  const bodyStyle = useAnimatedStyle(() => {
    const v = t.get();
    switch (pose) {
      case 'greet': // Respira y ladea la cabeza, curioso.
        return { transform: [{ translateY: -5 * v }, { rotate: `${-1.5 + 3 * v}deg` }, { scaleY: 1 + 0.02 * v }] };
      case 'swim': // Flota con la corriente.
        return { transform: [{ translateX: -8 + 16 * v }, { translateY: 5 * Math.sin(v * Math.PI * 2) }, { rotate: `${-3 + 6 * v}deg` }] };
      case 'sniff': // Se estira hacia la piedra, olfateando.
        return { transform: [{ translateX: 7 * v }, { rotate: `${2 * v}deg` }] };
      case 'happy': // Saltitos de alegría, con un leve aplastado al tocar el suelo.
        return { transform: [{ translateY: -12 * v }, { scaleY: 0.96 + 0.06 * v }, { scaleX: 1.03 - 0.04 * v }] };
    }
  });

  const shadowStyle = useAnimatedStyle(() => ({
    opacity: pose === 'swim' ? 0 : 0.5 - 0.2 * t.get(),
    transform: [{ scaleX: 1 - 0.18 * t.get() }],
  }));

  return (
    <View style={{ width: w, height: h }}>
      <Animated.View style={[styles.shadow, { width: w * 0.62, left: w * 0.19, backgroundColor: color.demo }, shadowStyle]} />
      <Animated.View style={[styles.fill, { transformOrigin: '50% 100%' }, bodyStyle]}>
        <Image source={source} style={styles.fill} resizeMode="contain" accessibilityIgnoresInvertColors />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  shadow: { position: 'absolute', bottom: -6, height: 14, borderRadius: 999 },
});

// Entradas suaves: aparece casi en su tamaño, sin rebote marcado.
function softIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ scale: 0.94 }, { translateY: 8 }] },
    animations: {
      opacity: withTiming(1, { duration: 220 }),
      transform: [
        { scale: withTiming(1, { duration: 360, easing: easeOutExpo }) },
        { translateY: withTiming(0, { duration: 360, easing: easeOutExpo }) },
      ],
    },
  };
}

function swimIn() {
  'worklet';
  return {
    initialValues: { opacity: 0, transform: [{ translateX: -16 }] },
    animations: {
      opacity: withTiming(1, { duration: 220 }),
      transform: [{ translateX: withTiming(0, { duration: 420, easing: easeOutExpo }) }],
    },
  };
}
