import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { leafAnchor } from '@/features/species-art/leaf-plate';
import { PLATE_DRAW } from '@/features/catalog/art/plate-lens';
import { easePen, type, useLayoutSize, whenIdle } from '@/ui';

// La guía sale cuando la lámina está casi entintada.
const LEADER_DELAY = PLATE_DRAW.delay + PLATE_DRAW.duration * 0.85;
const BADGE_RADIUS = 11;
const LEADER_STROKE = 0.75;

type LeafLeaderProps = { speciesId: string; ink: string; badge: string; onBadge: string };

/**
 * Línea guía de tinta desde una hoja de la lámina hasta el número de su nota, en la esquina inferior izquierda.
 * Va en vistas y no en SVG: en Android cada frame de un SVG animado rehace un bitmap del tamaño de la lámina;
 * aquí solo se animan `transform` y `opacity`.
 */
export function LeafLeader({ speciesId, ink, badge, onBadge }: LeafLeaderProps) {
  const reducedMotion = useReducedMotion();
  const { width, onLayout } = useLayoutSize();
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    return whenIdle(() => progress.set(withDelay(LEADER_DELAY, withTiming(1, { duration: 550, easing: easePen }))));
  }, [progress, reducedMotion]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.15], [0, 1], Extrapolation.CLAMP),
  }));
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.get(), [0, 0.8], [0, 1], Extrapolation.CLAMP) }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.7, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const anchor = leafAnchor(speciesId);
  if (!anchor) return null;

  const ax = (anchor.x / 100) * width;
  const ay = (anchor.y / 100) * width;
  const bx = BADGE_RADIUS + 4;
  const by = width - BADGE_RADIUS - 4;
  // La guía termina en el borde del número, no en su centro.
  const length = Math.hypot(ax - bx, ay - by);
  const reach = Math.max(length - BADGE_RADIUS, 0);
  const angle = Math.atan2(by - ay, bx - ax);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
      importantForAccessibility="no-hide-descendants" onLayout={onLayout}>
      {width > 0 ? (
        <>
          {/* Contenedor girado desde la hoja; dentro, el trazo crece desde su extremo izquierdo. */}
          <View style={[styles.leader, { left: ax, top: ay - LEADER_STROKE / 2, width: reach,
            transform: [{ rotate: `${angle}rad` }] }]}>
            <Animated.View style={[styles.stroke, { backgroundColor: ink }, lineStyle]} />
          </View>
          <Animated.View style={[styles.dot, { left: ax - 3, top: ay - 3, backgroundColor: badge }, dotStyle]} />
          <Animated.View style={[styles.badge, styles.placedBadge,
            { left: bx - BADGE_RADIUS, top: by - BADGE_RADIUS, backgroundColor: badge }, badgeStyle]}>
            <Text style={[type.labelMedium, styles.badgeText, { color: onBadge }]}>1</Text>
          </Animated.View>
        </>
      ) : null}
    </View>
  );
}

/** Número de una nota de la ficha, el mismo que marca la guía en la lámina. */
export function NoteBadge({ label, color, ink }: { label: string; color: string; ink: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color }]}>
      <Text style={[type.labelMedium, styles.badgeText, { color: ink }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  leader: { position: 'absolute', height: LEADER_STROKE, transformOrigin: 'left center' },
  stroke: { flex: 1, borderRadius: LEADER_STROKE / 2, transformOrigin: 'left center' },
  dot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  badge: { width: 2 * BADGE_RADIUS, height: 2 * BADGE_RADIUS, borderRadius: BADGE_RADIUS, alignItems: 'center', justifyContent: 'center' },
  placedBadge: { position: 'absolute' },
  badgeText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
});
