import { useEffect, useMemo, useState } from 'react';
import { type LayoutChangeEvent, StyleSheet, View } from 'react-native';
import Animated, {
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Path } from 'react-native-svg';

import { Wilo, type WiloPose } from '@/features/onboarding/wilo';
import { t } from '@/i18n/es-CL';
import { easeOutExpo, type IconComponent, radius, space, Text, useTheme } from '@/ui';

// Avance hacia una insignia como un camino ondulado: lo recorrido en lima con casing oscuro, como el
// sendero del mapa; lo que falta, punteado hasta la medalla. Al aparecer, Wilo avanza hasta donde vas
// y la línea crece detrás. Con movimiento reducido, aparece ya en su lugar.

const WAVE_H = 76;
const WAVE_PAD = 18;
const WAVE_SAMPLES = 48;

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Muestras de una onda suave a lo ancho, con su largo acumulado para recorrerla a velocidad pareja. */
function wave(width: number) {
  const x0 = WAVE_PAD;
  const x1 = Math.max(width - WAVE_PAD, x0 + 1);
  const xs: number[] = [];
  const ys: number[] = [];
  const along: number[] = [0];
  for (let i = 0; i <= WAVE_SAMPLES; i++) {
    const f = i / WAVE_SAMPLES;
    xs.push(x0 + (x1 - x0) * f);
    ys.push(WAVE_H / 2 + 4 + 13 * Math.sin(f * Math.PI * 2.5));
    if (i > 0) along.push(along[i - 1] + Math.hypot(xs[i] - xs[i - 1], ys[i] - ys[i - 1]));
  }
  const d = xs.map((x, i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${ys[i].toFixed(1)}`).join(' ');
  return { xs, ys, along, length: along[along.length - 1], d };
}

/** Pose de Wilo y su caja; las poses anchas necesitan más ancho que alto. */
export type JourneyWilo = { pose: WiloPose; width: number; height: number };

type JourneyCardProps = {
  /** Avance de 0 a 1; se recorta al rango. */
  share: number;
  /** Cifra grande y su unidad, p. ej. «7,6» y «km de senderos». */
  value: string;
  unit: string;
  /** Cuánto falta, o la celebración si ya se completó. */
  message: string;
  accessibilityLabel: string;
  startLabel: string;
  goalLabel: string;
  goalIcon: IconComponent;
  wilo: JourneyWilo;
};

export function JourneyCard({ share: raw, value, unit, message, accessibilityLabel, startLabel, goalLabel, goalIcon: GoalIcon, wilo }: JourneyCardProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const share = Math.max(0, Math.min(raw, 1));
  const done = share >= 1;
  const w = useMemo(() => wave(width), [width]);
  const go = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!width) return;
    if (reducedMotion) {
      go.set(1);
      return;
    }
    go.set(0);
    go.set(withDelay(200, withTiming(1, { duration: 1400, easing: easeOutExpo })));
  }, [go, reducedMotion, width, share]);

  const trailProps = useAnimatedProps(() => ({ strokeDashoffset: w.length * (1 - share * go.get()) }));
  // Wilo recorre la onda por su largo, no por x: así llega justo a la punta de la línea lima.
  const wiloStyle = useAnimatedStyle(() => {
    const s = w.length * share * go.get();
    return {
      transform: [
        { translateX: interpolate(s, w.along, w.xs) - wilo.width / 2 },
        { translateY: interpolate(s, w.along, w.ys) - wilo.height + 6 },
      ],
    };
  });

  return (
    <View style={[styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <View accessible accessibilityLabel={accessibilityLabel} style={styles.head}>
        <View style={styles.number}>
          <Text variant="number">{value}</Text>
          <Text variant="labelMedium" tone="onSurfaceVariant" style={styles.unit}>{unit}</Text>
        </View>
        <Text variant="bodySmall" tone="onSurfaceVariant">{message}</Text>
      </View>

      <View style={styles.wave} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
        importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        {width ? (
          <>
            <Svg width={width} height={WAVE_H}>
              {/* Camino por recorrer: punteado gris. */}
              <Path d={w.d} fill="none" stroke={color.outline} strokeOpacity={0.45} strokeWidth={3} strokeLinecap="round" strokeDasharray="0.1 9" />
              {/* Lo recorrido: lima, con un casing oscuro como el sendero del mapa. */}
              <AnimatedPath d={w.d} fill="none" stroke={color.dark} strokeWidth={9} strokeLinecap="round"
                strokeDasharray={`${w.length} ${w.length}`} animatedProps={trailProps} />
              <AnimatedPath d={w.d} fill="none" stroke={color.lime} strokeWidth={5} strokeLinecap="round"
                strokeDasharray={`${w.length} ${w.length}`} animatedProps={trailProps} />
              <Circle cx={w.xs[0]} cy={w.ys[0]} r={5} fill={color.surface} stroke={color.dark} strokeWidth={2.5} />
              <Circle cx={w.xs[WAVE_SAMPLES]} cy={w.ys[WAVE_SAMPLES]} r={15} fill={done ? color.lime : color.surfaceMuted}
                stroke={done ? color.dark : color.outline} strokeWidth={done ? 2.5 : 1.5} strokeDasharray={done ? undefined : '3 3'} />
            </Svg>
            <View style={[styles.goalIcon, { left: w.xs[WAVE_SAMPLES] - 8, top: w.ys[WAVE_SAMPLES] - 8 }]}>
              <GoalIcon color={done ? color.onLime : color.outline} size={16} />
            </View>
            <Animated.View style={[styles.wilo, { width: wilo.width, height: wilo.height }, wiloStyle]}>
              <Wilo pose={wilo.pose} width={wilo.width} height={wilo.height} accessibilityLabel={t.onboarding.wiloA11y} />
            </Animated.View>
          </>
        ) : null}
      </View>
      <View style={styles.labels} importantForAccessibility="no-hide-descendants" accessibilityElementsHidden>
        <Text variant="labelSmall" tone="onSurfaceVariant">{startLabel}</Text>
        <Text variant="labelSmall" tone="onSurfaceVariant" numberOfLines={1} style={styles.goalLabel}>{goalLabel}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: radius.lg, borderWidth: 1, paddingTop: space.lg, paddingHorizontal: space.lg, paddingBottom: space.md },
  head: { gap: space.xxs },
  number: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs },
  unit: { flexShrink: 1 },
  wave: { height: WAVE_H, marginHorizontal: -space.sm, marginTop: space.xs },
  labels: { flexDirection: 'row', justifyContent: 'space-between', gap: space.md, marginTop: -space.xs },
  goalLabel: { flexShrink: 1, textAlign: 'right' },
  goalIcon: { position: 'absolute', width: 16, height: 16 },
  wilo: { position: 'absolute', top: 0, left: 0 },
});
