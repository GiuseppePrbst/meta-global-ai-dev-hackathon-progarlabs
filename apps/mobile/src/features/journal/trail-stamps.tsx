import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  interpolate,
  useAnimatedProps,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Polyline } from 'react-native-svg';

import type { DemoTrail } from '@/features/atlas/demo-trail';
import { DISTANCE_GOAL_KM } from '@/features/journal/badges';
import { JourneyCard } from '@/features/journal/journey-card';
import { sketchLength, sketchPoints } from '@/features/journal/trail-sketch';
import type { Walk } from '@/features/journal/walks';
import { formatDecimal, formatStampDate, t } from '@/i18n/es-CL';
import { FootprintsIcon, radius, space, StarIcon, Text, useTheme } from '@/ui';

// Senderos como pasaporte: cada recorrido es una estampa con la forma del trazado, que se dibuja sola,
// y un sello con la fecha que cae al terminar. Arriba, Wilo nada por un camino ondulado hasta la
// insignia de 10 km (JourneyCard). Con movimiento reducido, todo aparece en su estado final.

const AnimatedPolyline = Animated.createAnimatedComponent(Polyline);

const subtleIn = (index: number) => FadeInDown
  .withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })
  .duration(280).delay(index * 35).easing(Easing.out(Easing.cubic));

// ——— Tu camino ———

/** Avance acumulado hacia la insignia de distancia, con Wilo nadando hasta donde vas. */
export function TrailJourney({ km }: { km: number }) {
  const done = km >= DISTANCE_GOAL_KM;
  const left = done ? null : formatDecimal(DISTANCE_GOAL_KM - km);
  return (
    <JourneyCard share={km / DISTANCE_GOAL_KM} value={formatDecimal(km)} unit={t.journal.journeyLabel}
      message={done ? t.journal.journeyGoalDone : t.journal.journeyToGoal(left ?? '')}
      accessibilityLabel={t.journal.journeyA11y(formatDecimal(km), left)}
      startLabel={t.journal.journeyStart} goalLabel={t.journal.journeyGoal} goalIcon={StarIcon}
      wilo={{ pose: 'swim', width: 66, height: 26 }} />
  );
}

// ——— Estampas ———

const SKETCH = 104;
const SKETCH_PAD = 14;

/** Recorrido completado como estampa del pasaporte; tocarla vuelve a trazarla y estampa el sello. */
export function WalkStamp({ walk, trail, outing, index }: { walk: Walk; trail: DemoTrail; outing: number; index: number }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const km = formatDecimal(walk.km);
  const date = formatStampDate(walk.completedAt);
  const points = useMemo(() => sketchPoints(trail.path, SKETCH, SKETCH, SKETCH_PAD), [trail.path]);
  const length = useMemo(() => sketchLength(points), [points]);
  const line = points.map(({ x, y }) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const start = points[0];
  const end = points[points.length - 1];

  const draw = useSharedValue(reducedMotion ? 1 : 0);
  const stamp = useSharedValue(reducedMotion ? 1 : 0);

  const play = (delay: number) => {
    if (reducedMotion) return;
    draw.set(0);
    draw.set(withDelay(delay, withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.cubic) })));
    stamp.set(0);
    // El sello cae cuando el trazo llega al final: baja grande y se asienta con un golpe seco.
    stamp.set(withDelay(delay + 900, withSequence(withTiming(0.001, { duration: 0 }), withSpring(1, { damping: 11, stiffness: 260, mass: 0.7 }))));
  };

  useEffect(() => {
    play(160 + index * 120);
    // Solo al montar: tocar la estampa la repite.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const lineProps = useAnimatedProps(() => ({ strokeDashoffset: length * (1 - draw.get()) }));
  const endStyle = useAnimatedStyle(() => ({ opacity: interpolate(draw.get(), [0.92, 1], [0, 1], 'clamp') }));
  const stampStyle = useAnimatedStyle(() => {
    const v = stamp.get();
    return {
      opacity: interpolate(v, [0, 0.15], [0, 1], 'clamp'),
      transform: [{ rotate: '-12deg' }, { scale: interpolate(v, [0, 1], [1.7, 1]) }],
    };
  });

  return (
    <Animated.View entering={reducedMotion ? undefined : subtleIn(index)}>
      <Pressable onPress={() => play(0)} accessibilityLabel={t.journal.walkA11y(walk.completedAt, km)}
        accessibilityHint={reducedMotion ? undefined : t.journal.walkReplayHint}
        android_ripple={{ color: color.onDarkRipple, foreground: true }}
        style={({ pressed }) => [styles.stampCard, { backgroundColor: color.dark, opacity: pressed ? 0.94 : 1 }]}>
        <View style={[styles.sketch, { backgroundColor: color.darkSurface }]}>
          <Svg width={SKETCH} height={SKETCH}>
            {/* Huella completa apenas visible, y encima el trazo que se dibuja. */}
            <Polyline points={line} fill="none" stroke={color.darkSurfaceHigh} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            <AnimatedPolyline points={line} fill="none" stroke={color.lime} strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round"
              strokeDasharray={`${length} ${length}`} animatedProps={lineProps} />
            {start ? <Circle cx={start.x} cy={start.y} r={4.5} fill={color.dark} stroke={color.onDark} strokeWidth={2} /> : null}
          </Svg>
          {end ? (
            <Animated.View style={[styles.endDot, { left: end.x - 6, top: end.y - 6, backgroundColor: color.lime, borderColor: color.dark }, endStyle]} />
          ) : null}
        </View>

        <View style={styles.stampText}>
          <Text variant="labelMedium" tone="onDarkVariant">{t.journal.walkOuting(outing)}</Text>
          <Text variant="titleMedium" tone="onDark" numberOfLines={2}>{trail.name}</Text>
          <View style={styles.km}>
            <FootprintsIcon color={color.lime} size={18} />
            <Text variant="number" tone="onDark">{km}</Text>
            <Text variant="labelMedium" tone="onDarkVariant">km</Text>
          </View>
        </View>

        {/* Sello de fecha: lima sobre el bosque, como una estampa de tinta. */}
        <Animated.View pointerEvents="none" style={[styles.stamp, { borderColor: color.lime }, stampStyle]}>
          <View style={[styles.stampInner, { borderColor: color.lime }]}>
            <Text variant="titleMedium" tone="lime" style={styles.stampDay}>{date.day}</Text>
            <Text variant="tag" tone="lime">{date.month}</Text>
          </View>
        </Animated.View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  stampCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.lg, borderRadius: radius.lg, overflow: 'hidden' },
  sketch: { width: SKETCH, height: SKETCH, borderRadius: radius.md },
  endDot: { position: 'absolute', width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  stampText: { flex: 1, gap: space.xxs, paddingRight: 56 },
  km: { flexDirection: 'row', alignItems: 'baseline', gap: space.xs, marginTop: space.xs },
  stamp: { position: 'absolute', top: space.md, right: space.md, width: 58, height: 58, borderRadius: 29, borderWidth: 2, padding: 3 },
  stampInner: { flex: 1, borderRadius: 26, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  stampDay: { lineHeight: 19 },
});
