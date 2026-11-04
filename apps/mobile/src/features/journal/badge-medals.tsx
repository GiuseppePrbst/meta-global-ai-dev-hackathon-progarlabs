import { useEffect } from 'react';
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
import Svg, { Circle, Path } from 'react-native-svg';

import { type Badge, type BadgeId } from '@/features/journal/badges';
import { Wilo } from '@/features/onboarding/wilo';
import { formatDecimal, t } from '@/i18n/es-CL';
import {
  CheckIcon, easeOutExpo, FootprintsIcon, type IconComponent, LeafIcon, ProgressBar, radius, space, StarIcon, Text, TrailIcon,
  useTheme,
} from '@/ui';

// Insignias como medallas de terreno: las ganadas son rosetas lima que giran y chispean al tocarlas;
// las pendientes, un disco gris con su anillo de avance, que se llena al abrir la pestaña. Wilo
// acompaña la próxima meta. Con movimiento reducido, todo aparece en su estado final y sin gestos.

/** Ícono de cada insignia, compartido con los caminos de avance. */
export const badgeIcons: Record<BadgeId, IconComponent> = {
  'first-species': LeafIcon,
  'half-guide': LeafIcon,
  'full-guide': StarIcon,
  'all-nothofagus': LeafIcon,
  'first-walk': TrailIcon,
  'ten-km': FootprintsIcon,
};

const MEDAL = 84;
const SPARKS = 8;
const RING_R = MEDAL * 0.44;
const RING = 2 * Math.PI * RING_R;
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** «3 de 4», con decimales solo para los kilómetros. */
export function badgeProgressLabel(badge: Badge): string {
  return t.journal.badgeProgress(badge.id === 'ten-km' ? formatDecimal(badge.progress) : String(badge.progress), String(badge.goal));
}

/** Contorno de roseta: lóbulos redondeados alrededor del centro, como el canto de una medalla. */
function rosette(size: number, lobes = 12): string {
  const c = size / 2;
  const inner = size * 0.4;
  const control = size * 0.53;
  const at = (r: number, a: number) => `${(c + r * Math.cos(a)).toFixed(2)} ${(c + r * Math.sin(a)).toFixed(2)}`;
  let d = '';
  for (let i = 0; i < lobes; i++) {
    const a0 = (i / lobes) * Math.PI * 2 - Math.PI / 2;
    const a1 = ((i + 1) / lobes) * Math.PI * 2 - Math.PI / 2;
    d += `${i === 0 ? `M${at(inner, a0)}` : ''} Q${at(control, (a0 + a1) / 2)} ${at(inner, a1)}`;
  }
  return `${d} Z`;
}

const ROSETTE = rosette(MEDAL);

/** Celda de la grilla de insignias; `index` escalona la entrada y el llenado del anillo. */
export function BadgeMedalTile({ badge, index }: { badge: Badge; index: number }) {
  const reducedMotion = useReducedMotion();
  return (
    <Animated.View style={styles.cell} entering={reducedMotion ? undefined : FadeInDown
      // Entrada discreta: fundido corto con un leve ascenso, sin rebote; la cascada apenas se nota.
      .withInitialValues({ opacity: 0, transform: [{ translateY: 6 }] })
      .duration(280).delay(index * 35).easing(Easing.out(Easing.cubic))}>
      {badge.earned ? <EarnedTile badge={badge} index={index} /> : <PendingTile badge={badge} index={index} />}
    </Animated.View>
  );
}

function EarnedTile({ badge, index }: { badge: Badge; index: number }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const copy = t.journal.badges[badge.id];
  const Icon = badgeIcons[badge.id];
  const spin = useSharedValue(0);
  const pop = useSharedValue(1);
  const burst = useSharedValue(0);
  // Inclinación alterna: medallas prendidas a mano, no alineadas por una regla.
  const tilt = index % 2 === 0 ? -6 : 5;

  const celebrate = () => {
    if (reducedMotion) return;
    spin.set(0);
    spin.set(withTiming(1, { duration: 760, easing: easeOutExpo }));
    pop.set(withSequence(withTiming(1.14, { duration: 140 }), withSpring(1, { damping: 8, stiffness: 180 })));
    burst.set(0);
    burst.set(withTiming(1, { duration: 620, easing: easeOutExpo }));
  };

  const medalStyle = useAnimatedStyle(() => ({
    transform: [{ perspective: 600 }, { rotate: `${tilt}deg` }, { rotateY: `${spin.get() * 360}deg` }, { scale: pop.get() }],
  }));

  return (
    <Pressable onPress={celebrate} accessibilityRole="button"
      accessibilityLabel={t.journal.badgeA11y(copy.name, copy.rule, true, '')} accessibilityHint={reducedMotion ? undefined : t.journal.badgeCelebrateHint}
      android_ripple={{ color: color.onDarkRipple, foreground: true }}
      style={({ pressed }) => [styles.tile, { backgroundColor: color.dark, borderColor: color.dark, opacity: pressed ? 0.94 : 1 }]}>
      <View style={styles.stage}>
        {Array.from({ length: SPARKS }, (_, i) => <Spark key={i} index={i} burst={burst} color={i % 2 ? color.onDark : color.lime} />)}
        <Animated.View style={[styles.medal, medalStyle]}>
          <View style={styles.layer} pointerEvents="none"><Svg width={MEDAL} height={MEDAL}>
            <Path d={ROSETTE} fill={color.lime} />
            {/* Costura: el borde punteado de una medalla de tela. */}
            <Circle cx={MEDAL / 2} cy={MEDAL / 2} r={MEDAL * 0.3} fill="none" stroke={color.onLime} strokeOpacity={0.35}
              strokeWidth={1.4} strokeDasharray="2 3" />
          </Svg></View>
          <View><Icon color={color.onLime} size={28} /></View>
        </Animated.View>
      </View>
      <Text variant="titleSmall" tone="onDark" style={styles.center} numberOfLines={2}>{copy.name}</Text>
      <Text variant="labelSmall" tone="onDarkVariant" style={styles.center} numberOfLines={3}>{copy.rule}</Text>
      <View style={styles.status}>
        <CheckIcon color={color.lime} size={14} />
        <Text variant="labelMedium" tone="lime">{t.journal.badgeEarned}</Text>
      </View>
    </Pressable>
  );
}

/** Chispa de la celebración: sale del centro hacia afuera y se apaga. */
function Spark({ index, burst, color }: { index: number; burst: ReturnType<typeof useSharedValue<number>>; color: string }) {
  const angle = (index / SPARKS) * Math.PI * 2 + Math.PI / SPARKS;
  const style = useAnimatedStyle(() => {
    const v = burst.get();
    const distance = interpolate(v, [0, 1], [MEDAL * 0.3, MEDAL * 0.68]);
    return {
      opacity: v === 0 ? 0 : interpolate(v, [0, 0.2, 1], [0, 1, 0]),
      transform: [
        { translateX: Math.cos(angle) * distance },
        { translateY: Math.sin(angle) * distance },
        { scale: interpolate(v, [0, 0.3, 1], [0.4, 1.2, 0.6]) },
      ],
    };
  });
  return <Animated.View pointerEvents="none" style={[styles.spark, { backgroundColor: color }, style]} />;
}

function PendingTile({ badge, index }: { badge: Badge; index: number }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const copy = t.journal.badges[badge.id];
  const Icon = badgeIcons[badge.id];
  const progress = badgeProgressLabel(badge);
  const share = badge.goal > 0 ? Math.min(badge.progress / badge.goal, 1) : 0;
  const fill = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) {
      fill.set(1);
      return;
    }
    fill.set(withDelay(160 + index * 35, withTiming(1, { duration: 800, easing: easeOutExpo })));
  }, [fill, index, reducedMotion]);

  const ringProps = useAnimatedProps(() => ({ strokeDashoffset: RING * (1 - share * fill.get()) }));

  return (
    <View style={[styles.tile, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}
      accessible accessibilityLabel={t.journal.badgeA11y(copy.name, copy.rule, false, progress)}>
      <View style={styles.stage}>
        <View style={styles.medal}>
          <View style={styles.layer} pointerEvents="none"><Svg width={MEDAL} height={MEDAL}>
            <Circle cx={MEDAL / 2} cy={MEDAL / 2} r={RING_R} fill="none" stroke={color.surfaceMuted} strokeWidth={6} />
            {/* Empieza arriba y avanza en sentido horario. */}
            <AnimatedCircle cx={MEDAL / 2} cy={MEDAL / 2} r={RING_R} fill="none" stroke={color.lime} strokeWidth={6}
              strokeLinecap="round" strokeDasharray={`${RING} ${RING}`} animatedProps={ringProps}
              transform={`rotate(-90 ${MEDAL / 2} ${MEDAL / 2})`} opacity={share > 0 ? 1 : 0} />
            <Circle cx={MEDAL / 2} cy={MEDAL / 2} r={MEDAL * 0.31} fill={color.surfaceMuted} />
          </Svg></View>
          <View><Icon color={color.outline} size={26} /></View>
        </View>
      </View>
      <Text variant="titleSmall" style={styles.center} numberOfLines={2}>{copy.name}</Text>
      <Text variant="labelSmall" tone="onSurfaceVariant" style={styles.center} numberOfLines={3}>{copy.rule}</Text>
      <Text variant="labelMedium" tone="onSurfaceVariant" style={styles.status}>{progress}</Text>
    </View>
  );
}

/** Tarjeta sobre la grilla: la insignia más cercana con Wilo olfateándola, o la celebración final. */
export function NextBadgeCard({ next }: { next: Badge | undefined }) {
  const { color } = useTheme();
  const copy = next ? t.journal.badges[next.id] : undefined;
  const progress = next ? badgeProgressLabel(next) : '';
  return (
    <View style={[styles.next, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <View style={styles.nextText} accessible
        accessibilityLabel={next && copy ? t.journal.badgeNextA11y(copy.name, copy.rule, progress) : `${t.journal.badgeAllTitle} ${t.journal.badgeAllBody}`}>
        {next && copy ? (
          <>
            <Text variant="labelMedium" tone="onSurfaceVariant">{t.journal.badgeNextTitle}</Text>
            <Text variant="headline">{copy.name}</Text>
            <Text variant="bodySmall" tone="onSurfaceVariant">{copy.rule}</Text>
            <View style={styles.nextProgress}>
              <ProgressBar value={next.progress} max={next.goal} label={progress} style={styles.grow} />
              <Text variant="labelLarge">{progress}</Text>
            </View>
          </>
        ) : (
          <>
            <Text variant="headline">{t.journal.badgeAllTitle}</Text>
            <Text variant="bodySmall" tone="onSurfaceVariant">{t.journal.badgeAllBody}</Text>
          </>
        )}
      </View>
      <Wilo pose={next ? 'sniff' : 'happy'} width={104} height={96} accessibilityLabel={t.onboarding.wiloA11y} />
    </View>
  );
}

const styles = StyleSheet.create({
  cell: { flex: 1 },
  tile: { flex: 1, alignItems: 'center', gap: space.xs, paddingHorizontal: space.md, paddingTop: space.lg, paddingBottom: space.md, borderRadius: radius.lg, borderWidth: 1 },
  // Deja sitio a las chispas fuera del disco sin recortarlas.
  stage: { width: MEDAL + space.xl, height: MEDAL + space.sm, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  medal: { width: MEDAL, height: MEDAL, alignItems: 'center', justifyContent: 'center' },
  // El dibujo de la medalla va debajo y el ícono, centrado encima (en un View: en web, un hermano sin
  // posición quedaría bajo la capa absoluta).
  layer: { position: 'absolute', top: 0, left: 0 },
  spark: { position: 'absolute', width: 7, height: 7, borderRadius: 4 },
  center: { textAlign: 'center' },
  status: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xxs },
  next: { flexDirection: 'row', alignItems: 'center', gap: space.sm, padding: space.lg, paddingRight: space.sm, borderRadius: radius.lg, borderWidth: 1 },
  nextText: { flex: 1, gap: space.xxs },
  nextProgress: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: space.sm },
  grow: { flex: 1 },
});
