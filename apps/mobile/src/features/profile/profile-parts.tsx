import { router } from 'expo-router';
import { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withSequence, withSpring, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Stop } from 'react-native-svg';

import type { Species } from '@/domain/species';
import { estimatedMinutes } from '@/features/atlas/demo-trail';
import { getTrailPhoto } from '@/features/atlas/trail-photos';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { useGuide } from '@/features/guide/use-guide';
import { badgeIcons } from '@/features/journal/badge-medals';
import { subtleIn } from '@/features/journal/discoveries';
import { useWalks } from '@/features/journal/use-walks';
import { Wilo } from '@/features/onboarding/wilo';
import type { Activity } from '@/features/profile/activity';
import type { LevelId, LevelProgress } from '@/features/profile/levels';
import { mockAchievements } from '@/features/profile/mock-achievements';
import type { AvatarTone, ProfileTag } from '@/features/profile/profile';
import { formatDecimal, formatDuration, formatShortDate, t } from '@/i18n/es-CL';
import {
  BackIcon, ChevronIcon, type ColorToken, CoverImage, easeOutExpo, elevation, FootprintsIcon, IconButton, type IconComponent,
  LeafIcon, MushroomIcon, ProgressBar, radius, space, StarIcon, Tag, Text, useTheme,
} from '@/ui';

// Piezas de la pestaña Perfil y de su historial. Todo lo que muestran sale del perfil local y del
// diario (más un logro de prueba rotulado); nada se calcula aquí más que el texto. Con movimiento
// reducido, todo aparece en su estado final.

/** Catálogo, guía, recorridos y logros de prueba, o `undefined` mientras falte alguno. */
export function useProfileInputs() {
  const { data: catalog } = useSpeciesCatalog();
  const { data: entries } = useGuide();
  const { data: walks } = useWalks();
  // Misma referencia mientras no cambien los datos, para que los cálculos memorizados no se repitan.
  return useMemo(
    () => (catalog && entries && walks ? { catalog, entries, walks, achievements: mockAchievements } : undefined),
    [catalog, entries, walks],
  );
}

/** Curva de recorte del pie de la portada: la página «muerde» la foto con una ola suave. */
export function CoverCurve({ height = 44 }: { height?: number }) {
  const { color } = useTheme();
  return (
    <Svg width="100%" height={height} viewBox="0 0 400 44" preserveAspectRatio="none" style={styles.curve}>
      <Path d="M0 18 C 70 40, 150 44, 230 30 S 360 4, 400 10 L 400 44 L 0 44 Z" fill={color.background} />
    </Svg>
  );
}

const TONES: Record<AvatarTone, { face: ColorToken; ink: ColorToken }> = {
  lime: { face: 'lime', ink: 'onLime' },
  moss: { face: 'limeSoft', ink: 'onLimeSoft' },
  forest: { face: 'darkSurfaceHigh', ink: 'onDark' },
  stone: { face: 'surfaceMuted', ink: 'onSurface' },
};

/** Avatar de iniciales con borde blanco; sin alias, una hoja. */
export function Avatar({ initials, tone, size, label }: { initials: string; tone: AvatarTone; size: number; label?: string }) {
  const { color } = useTheme();
  const look = TONES[tone];
  const border = Math.max(3, Math.round(size / 26));
  return (
    <View accessible={Boolean(label)} accessibilityLabel={label} accessibilityRole={label ? 'image' : undefined}
      style={[
        styles.avatar,
        size >= 96 ? [elevation.card, { shadowColor: color.shadow }] : null,
        { width: size, height: size, borderRadius: size / 2, borderWidth: border, backgroundColor: color[look.face], borderColor: color.surface },
      ]}>
      {initials ? (
        <Text variant="display" tone={look.ink} style={{ fontSize: size * 0.36, lineHeight: size * 0.44 }}>{initials}</Text>
      ) : (
        <LeafIcon color={color[look.ink]} size={size * 0.42} />
      )}
    </View>
  );
}

/** Ícono de cada etiqueta del perfil, compartido con su selector en Ajustes. */
export const tagIcons: Record<ProfileTag, IconComponent> = {
  forest: LeafIcon,
  trails: FootprintsIcon,
  fungi: MushroomIcon,
};

/** Etiqueta bajo el nombre: ícono y texto en verde musgo. */
export function ProfileTagLabel({ tag }: { tag: ProfileTag }) {
  const { color } = useTheme();
  const Icon = tagIcons[tag];
  return (
    <View style={styles.tagLabel}>
      <Icon color={color.onLimeSoft} size={18} />
      <Text variant="labelLarge" tone="onLimeSoft">{t.profile.tags[tag]}</Text>
    </View>
  );
}

const METAL: Record<LevelId, { light: ColorToken; deep: ColorToken; ink: ColorToken; icon: IconComponent }> = {
  sprout: { light: 'limeSoft', deep: 'lime', ink: 'onLimeSoft', icon: LeafIcon },
  bronze: { light: 'bronze', deep: 'bronzeDeep', ink: 'onDark', icon: LeafIcon },
  silver: { light: 'silver', deep: 'silverDeep', ink: 'onDark', icon: LeafIcon },
  gold: { light: 'gold', deep: 'goldDeep', ink: 'onDark', icon: StarIcon },
};

const HEX = 'M24 2.5l18.6 10.75v21.5L24 45.5 5.4 34.75v-21.5z';
const HEX_INNER = 'M24 7.5l14.3 8.25v16.5L24 40.5 9.7 32.25v-16.5z';

/** Medalla hexagonal de metal con su ícono; el nombre del nivel siempre va escrito al lado. */
export function LevelMedal({ id, size }: { id: LevelId; size: number }) {
  const { color } = useTheme();
  const look = METAL[id];
  const Icon = look.icon;
  const gradient = `medal-${id}`;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 48 48" style={StyleSheet.absoluteFill}>
        <Defs>
          <LinearGradient id={gradient} x1="0" y1="0" x2="0.4" y2="1">
            <Stop offset="0" stopColor={color[look.light]} />
            <Stop offset="1" stopColor={color[look.deep]} />
          </LinearGradient>
        </Defs>
        <Path d={HEX} fill={color[look.deep]} />
        <Path d={HEX_INNER} fill={`url(#${gradient})`} stroke={color.onDark} strokeOpacity={0.55} strokeWidth={1.2} strokeLinejoin="round" />
        {/* Brillo: una franja clara en la cara superior izquierda. */}
        <Path d="M24 7.5L9.7 15.75v6L24 13z" fill={color.onDark} fillOpacity={0.22} />
      </Svg>
      <Icon color={color[look.ink]} fill={id === 'gold' ? color[look.ink] : undefined} size={size * 0.4} />
    </View>
  );
}

/** Destello de cuatro puntas junto a la medalla actual; aparece una vez, con un pequeño rebote. */
function Sparkle({ size, delay, style }: { size: number; delay: number; style: ViewStyle }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const pop = useSharedValue(reducedMotion ? 1 : 0);
  useEffect(() => {
    if (reducedMotion) return;
    pop.set(withDelay(delay, withSequence(withSpring(1.25, { damping: 6, stiffness: 220 }), withTiming(1, { duration: 300 }))));
  }, [delay, pop, reducedMotion]);
  const popStyle = useAnimatedStyle(() => ({ opacity: Math.min(pop.get(), 1), transform: [{ scale: pop.get() }] }));
  return (
    <Animated.View style={[styles.sparkle, style, popStyle]} importantForAccessibility="no-hide-descendants">
      <Svg width={size} height={size} viewBox="0 0 12 12">
        <Path d="M6 0 C6.6 4.2 7.8 5.4 12 6 C7.8 6.6 6.6 7.8 6 12 C5.4 7.8 4.2 6.6 0 6 C4.2 5.4 5.4 4.2 6 0z" fill={color.lime} />
      </Svg>
    </Animated.View>
  );
}

/** Globo de diálogo con colita hacia Wilo, que mira hacia el texto. Wilo no gana gestos nuevos. */
export function WiloCheer({ level }: { level: LevelProgress }) {
  const { color } = useTheme();
  const message = !level.next
    ? t.profile.wiloTop
    : level.discoveries === 0
      ? t.profile.wiloStart
      : t.profile.wiloProgress(level.next.min - level.discoveries, t.profile.levels[level.next.id]);
  return (
    <View style={styles.cheer}>
      <View style={[styles.bubble, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
        <Text variant="labelMedium" tone="onDemo">{t.profile.wilo}</Text>
        <Text variant="bodyMedium">{message}</Text>
        <Svg width={14} height={18} viewBox="0 0 14 18" style={styles.tail} importantForAccessibility="no-hide-descendants">
          <Path d="M0 0 L14 9 L0 18 Z" fill={color.surface} />
          <Path d="M0 0 L14 9 L0 18" fill="none" stroke={color.outlineVariant} strokeWidth={1} strokeLinejoin="round" />
        </Svg>
      </View>
      {/* El arte mira a la derecha: se espeja para que mire al globo. */}
      <View style={styles.flip}>
        <Wilo pose="happy" width={96} height={80} accessibilityLabel={t.profile.wiloA11y} />
      </View>
    </View>
  );
}

/** Tarjeta oscura del nivel actual: medalla que entra con un salto, destellos y avance. */
export function LevelCard({ level, onPress, hint }: { level: LevelProgress; onPress: () => void; hint: string }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const name = t.profile.levels[level.id];
  const progress = level.next ? t.profile.levelProgress(level.discoveries, level.next.min) : t.profile.levelTop(level.discoveries);

  const medal = useSharedValue(reducedMotion ? 1 : 0.6);
  const press = useSharedValue(1);
  useEffect(() => {
    if (!reducedMotion) medal.set(withDelay(120, withSpring(1, { damping: 9, stiffness: 170 })));
  }, [medal, reducedMotion]);
  const medalStyle = useAnimatedStyle(() => ({ transform: [{ scale: medal.get() }, { rotate: `${(1 - medal.get()) * -30}deg` }] }));
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: press.get() }] }));
  const squeeze = (to: number) => {
    if (!reducedMotion) press.set(withTiming(to, { duration: 160, easing: easeOutExpo }));
  };

  return (
    <Animated.View style={pressStyle}>
      <Pressable onPress={onPress} onPressIn={() => squeeze(0.98)} onPressOut={() => squeeze(1)}
        accessibilityRole="button" accessibilityLabel={t.profile.levelA11y(level.number, name, progress)} accessibilityHint={hint}
        style={[styles.levelCard, { backgroundColor: color.dark }]}>
        <View style={styles.medalSlot}>
          <Animated.View style={medalStyle}><LevelMedal id={level.id} size={72} /></Animated.View>
          <Sparkle size={12} delay={420} style={{ top: -2, right: 0 }} />
          <Sparkle size={8} delay={560} style={{ bottom: 6, left: -2 }} />
          <Sparkle size={6} delay={680} style={{ top: 10, left: 2 }} />
        </View>
        <View style={styles.grow}>
          <Text variant="labelMedium" tone="lime">{t.profile.levelNumber(level.number)}</Text>
          <Text variant="headline" tone="onDark">{name}</Text>
          {level.next ? (
            <ProgressBar value={level.discoveries} max={level.next.min} label={progress} animateIn style={styles.levelBar} />
          ) : null}
          <Text variant="bodySmall" tone="onDarkVariant">{progress}</Text>
        </View>
        <View style={[styles.chevron, { backgroundColor: color.darkSurfaceHigh }]}>
          <ChevronIcon color={color.onDark} size={20} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

/** Los niveles que aún no se alcanzan, en una tarjeta clara con separadores, como hitos por venir. */
export function UpcomingLevels({ level }: { level: LevelProgress }) {
  const { color } = useTheme();
  if (!level.upcoming.length) return null;
  return (
    <View style={[styles.upcoming, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <Text variant="labelMedium" tone="onSurfaceVariant">{t.profile.nextLevelTitle}</Text>
      <View style={styles.upcomingRow}>
        {level.upcoming.map((next, i) => (
          <View key={next.id}
            style={[styles.upcomingItem, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: color.outlineVariant, paddingLeft: space.md }]}
            accessible accessibilityLabel={`${t.profile.levels[next.id]}, ${t.profile.nextLevelGoal(next.min)}`}>
            <LevelMedal id={next.id} size={48} />
            <View style={styles.grow}>
              <Text variant="titleSmall">{t.profile.levels[next.id]}</Text>
              <Text variant="bodySmall" tone="onSurfaceVariant">{t.profile.nextLevelGoal(next.min)}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

type Described = { title: string; detail: string; a11yDetail?: string; test?: boolean };

function describe(activity: Activity, catalog: Species[]): Described {
  switch (activity.kind) {
    case 'walk': {
      const km = formatDecimal(activity.km);
      const duration = formatDuration(estimatedMinutes(activity.km));
      return {
        title: activity.trailName,
        detail: t.profile.activityWalkDetail(km, duration),
        a11yDetail: t.profile.activityWalkA11y(km, duration),
      };
    }
    case 'species': {
      const names = activity.speciesIds.map((id) => catalog.find((s) => s.id === id)?.commonName ?? id);
      return { title: t.profile.activitySpecies(names.length), detail: names.join(', ') };
    }
    case 'badge': {
      const badge = t.journal.badges[activity.badgeId];
      return { title: t.profile.activityBadge, detail: `${badge.name}\n${badge.rule}` };
    }
    case 'achievement':
      return { title: t.profile.activityAchievement, detail: `${activity.achievement.name}\n${activity.achievement.rule}`, test: true };
  }
}

/** Miniatura de la fila: la foto del sendero, o un ícono sobre un fondo suave. */
function Thumb({ activity }: { activity: Activity }) {
  const { color } = useTheme();
  if (activity.kind === 'walk') {
    return (
      <View style={styles.thumb}>
        <CoverImage source={getTrailPhoto(activity.trailId).source} />
      </View>
    );
  }
  const earned = activity.kind === 'badge' || activity.kind === 'achievement';
  const Icon = activity.kind === 'badge' ? badgeIcons[activity.badgeId] : activity.kind === 'achievement' ? StarIcon : LeafIcon;
  const ink = earned ? color.goldDeep : color.onLimeSoft;
  return (
    <View style={[styles.thumb, { backgroundColor: earned ? color.goldSoft : color.limeSoft }]}>
      <Icon color={ink} fill={earned ? ink : undefined} size={24} />
    </View>
  );
}

/** Una fila del historial: miniatura, qué pasó y cuándo. Entra escalonada. */
function ActivityRow({ activity, catalog, index, last }: { activity: Activity; catalog: Species[]; index: number; last: boolean }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const { title, detail, a11yDetail, test } = describe(activity, catalog);
  const date = formatShortDate(activity.date);
  return (
    <Animated.View entering={reducedMotion ? undefined : subtleIn(index)}
      style={[styles.row, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: color.outlineVariant }]}
      accessible accessibilityLabel={`${test ? `${t.profile.activityTest}. ` : ''}${t.profile.activityA11y(title, a11yDetail ?? detail, date)}`}>
      <Thumb activity={activity} />
      <View style={styles.grow}>
        <View style={styles.rowTitle}>
          <Text variant="titleSmall" numberOfLines={1} style={styles.shrink}>{title}</Text>
          {test ? <Tag label={t.profile.activityTest} tone="demo" /> : null}
        </View>
        <Text variant="bodySmall" tone="onSurfaceVariant" numberOfLines={2}>{detail}</Text>
      </View>
      <Text variant="labelMedium" tone="onSurfaceVariant" style={styles.date}>{date}</Text>
    </Animated.View>
  );
}

/** Tarjeta blanca que agrupa las filas del historial. */
export function ActivityList({ items, catalog }: { items: Activity[]; catalog: Species[] }) {
  const { color } = useTheme();
  return (
    <View style={[styles.list, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      {items.map((item, i) => (
        <ActivityRow key={`${item.kind}-${item.date}-${i}`} activity={item} catalog={catalog} index={i} last={i === items.length - 1} />
      ))}
    </View>
  );
}

/** Cabecera de una pantalla apilada del perfil: volver y título. */
export function BackHeader({ title }: { title: string }) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const back = () => (router.canGoBack() ? router.back() : router.replace('/profile'));
  return (
    <View style={[styles.backHeader, { paddingTop: insets.top + space.sm }]}>
      <IconButton label={t.profile.back} onPress={back} look="muted">
        <BackIcon color={color.onSurface} size={22} />
      </IconButton>
      <Text variant="titleLarge" accessibilityRole="header" numberOfLines={1} style={styles.grow}>{title}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  curve: { position: 'absolute', left: 0, right: 0, bottom: -1 },
  backHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.md },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  tagLabel: { flexDirection: 'row', alignItems: 'center', gap: space.xs, marginTop: space.xxs },
  grow: { flex: 1, minWidth: 0 },
  shrink: { flexShrink: 1 },
  cheer: { flexDirection: 'row', alignItems: 'flex-end', gap: space.md },
  bubble: {
    flex: 1,
    gap: space.xxs,
    paddingHorizontal: space.md,
    paddingVertical: space.sm + 2,
    borderRadius: radius.lg,
    borderWidth: 1,
    marginBottom: space.lg,
  },
  tail: { position: 'absolute', right: -13, bottom: 14 },
  flip: { transform: [{ scaleX: -1 }] },
  levelCard: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.lg, paddingLeft: space.md, borderRadius: radius.lg },
  medalSlot: { width: 80, height: 80, alignItems: 'center', justifyContent: 'center' },
  sparkle: { position: 'absolute' },
  levelBar: { marginTop: space.sm, marginBottom: space.xs },
  chevron: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  upcoming: { gap: space.sm, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  upcomingRow: { flexDirection: 'row', gap: space.md },
  upcomingItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: space.sm },
  list: { borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: space.md },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: space.md, paddingVertical: space.md },
  rowTitle: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  thumb: { width: 56, height: 56, borderRadius: radius.md, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  date: { paddingTop: 2 },
});
