import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';

import { badgeIcons } from '@/features/journal/badge-medals';
import { type Badge, type BadgeId, nextBadge } from '@/features/journal/badges';
import { Wilo } from '@/features/onboarding/wilo';
import { t } from '@/i18n/es-CL';
import { easeOutExpo, ProgressBar, radius, space, Text, useTheme } from '@/ui';

// Descubrimientos: el avance de la guía, que se llena al aparecer, y el anillo hacia la insignia de
// descubrimiento más cercana, con Wilo asomando. Con movimiento reducido, todo aparece ya lleno.

/** Entrada discreta de los cuadros de la grilla, igual que medallas y estampas. */
export const subtleIn = (index: number) => FadeInDown
  .withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })
  .duration(280).delay(Math.min(index, 12) * 30).easing(Easing.out(Easing.cubic));

/** Avance de la guía: riel con relleno lima, que sirve igual con 10 especies que con 100. */
export function GuideProgress({ collected, total }: { collected: number; total: number }) {
  const share = total ? Math.round((collected / total) * 100) : 0;
  return (
    <View style={styles.progress}>
      <View style={styles.progressHead}>
        <Text variant="titleLarge" accessibilityRole="header">{t.journal.guideTitle}</Text>
        <Text variant="labelMedium" tone="onSurfaceVariant">{t.journal.guideProgress(collected, total)}</Text>
      </View>
      <View style={styles.progressRow}>
        <ProgressBar value={collected} max={total} label={t.journal.guideProgressA11y(collected, total)} animateIn style={styles.grow} />
        <Text variant="labelLarge" accessibilityElementsHidden importantForAccessibility="no">{`${share}%`}</Text>
      </View>
    </View>
  );
}

/** Insignias que se ganan descubriendo especies (las demás son de senderos). */
const DISCOVERY: BadgeId[] = ['first-species', 'half-guide', 'full-guide', 'all-nothofagus'];

// ——— Hacia la próxima insignia ———

const RING = 108;
const RING_STROKE = 10;
const RING_R = (RING - RING_STROKE) / 2;
const RING_LEN = 2 * Math.PI * RING_R;

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/**
 * Avance hacia la insignia de descubrimiento más cercana a completarse: un anillo lima que se llena al
 * aparecer, con la cifra al centro, y Wilo asomando por el borde (olfateando mientras falta, contento
 * al ganarla). Si ya están todas, celebra la guía completa. `null` si no hay ninguna.
 */
export function DiscoveryGoal({ badges }: { badges: Badge[] }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const discovery = badges.filter((badge) => DISCOVERY.includes(badge.id));
  const badge = nextBadge(discovery) ?? discovery.find((b) => b.id === 'full-guide');
  const share = badge && badge.goal ? Math.min(badge.progress / badge.goal, 1) : 0;
  const fill = useSharedValue(reducedMotion ? share : 0);

  useEffect(() => {
    fill.set(reducedMotion ? share : withDelay(200, withTiming(share, { duration: 1100, easing: easeOutExpo })));
  }, [fill, reducedMotion, share]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING_LEN * (1 - fill.get()) }));

  if (!badge) return null;
  const copy = t.journal.badges[badge.id];
  const Icon = badgeIcons[badge.id];
  const nothofagus = badge.id === 'all-nothofagus';
  const message = badge.earned
    ? t.journal.discoveryDone(copy.name)
    : t.journal.discoveryToGoal(badge.goal - badge.progress, copy.name, nothofagus);

  return (
    <View style={styles.goalWrap}>
      <View style={[styles.goal, { backgroundColor: color.dark }]} accessible accessibilityRole="progressbar"
        accessibilityLabel={`${copy.name}. ${t.journal.discoveryA11y(badge.progress, badge.goal, message)}`}
        accessibilityValue={{ min: 0, max: badge.goal, now: badge.progress }}>
        <View style={styles.ring}>
          <Svg width={RING} height={RING}>
            <Circle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={color.darkSurfaceHigh} strokeWidth={RING_STROKE} />
            {/* Empieza arriba y avanza en sentido horario. */}
            <AnimatedCircle cx={RING / 2} cy={RING / 2} r={RING_R} fill="none" stroke={color.lime} strokeWidth={RING_STROKE}
              strokeLinecap="round" strokeDasharray={`${RING_LEN} ${RING_LEN}`} animatedProps={ringProps}
              transform={`rotate(-90 ${RING / 2} ${RING / 2})`} opacity={share > 0 ? 1 : 0} />
          </Svg>
          <View style={styles.ringCenter}>
            <Icon color={badge.earned ? color.lime : color.onDarkVariant} size={18} />
            <Text variant="number" tone="onDark">{String(badge.progress)}</Text>
            <Text variant="labelSmall" tone="onDarkVariant">{t.journal.discoveryOf(badge.goal)}</Text>
          </View>
        </View>
        <View style={styles.goalText}>
          <Text variant="headline" tone="onDark">{copy.name}</Text>
          <Text variant="bodySmall" tone="onDarkVariant">{message}</Text>
        </View>
      </View>
      {/* Wilo asoma por el borde de la tarjeta. */}
      <View style={styles.peek} pointerEvents="box-none">
        <Wilo pose={badge.earned ? 'happy' : 'sniff'} width={badge.earned ? 56 : 78} height={46}
          accessibilityLabel={t.onboarding.wiloA11y} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  progress: { gap: space.sm },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  // Deja sitio arriba para que Wilo se pare sobre el borde de la tarjeta (su caja mide 46).
  goalWrap: { paddingTop: 44 },
  goal: { flexDirection: 'row', alignItems: 'center', gap: space.lg, padding: space.lg, borderRadius: radius.lg },
  ring: { width: RING, height: RING, alignItems: 'center', justifyContent: 'center' },
  // Encima del anillo (en un View: en web, un hermano sin posición quedaría bajo el Svg).
  ringCenter: { position: 'absolute', alignItems: 'center' },
  goalText: { flex: 1, gap: space.xxs },
  peek: { position: 'absolute', top: 0, right: space.lg },
});
