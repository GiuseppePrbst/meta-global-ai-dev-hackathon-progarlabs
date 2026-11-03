import { useId } from 'react';
import { Image, Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import { openSpecies } from '@/features/catalog/open-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import type { Badge, BadgeId } from '@/features/journal/badges';
import type { Walk } from '@/features/journal/walks';
import { SpeciesSilhouette } from '@/features/species-art/species-silhouette';
import { formatDecimal, formatShortDate, t } from '@/i18n/es-CL';
import {
  CheckIcon, FootprintsIcon, type IconComponent, LeafIcon, LockIcon, radius, space, StarIcon, Tag, Text, TrailIcon, useTheme,
} from '@/ui';

type Stat = { icon: IconComponent; value: string; label: string };

/** Tarjeta oscura con las cuatro cifras del diario, separadas por filetes. */
export function StatsCard({ species, trails, km, badges }: { species: number; trails: number; km: number; badges: number }) {
  const { color } = useTheme();
  const kmLabel = formatDecimal(km);
  const stats: Stat[] = [
    { icon: LeafIcon, value: String(species), label: t.journal.statSpecies },
    { icon: TrailIcon, value: String(trails), label: t.journal.statTrails },
    { icon: FootprintsIcon, value: kmLabel, label: t.journal.statKm },
    { icon: StarIcon, value: String(badges), label: t.journal.statBadges },
  ];
  return (
    <View style={[styles.stats, { backgroundColor: color.dark }]} accessible
      accessibilityLabel={t.journal.statsA11y(species, trails, kmLabel, badges)}>
      <View style={styles.statsRow}>
        {stats.map(({ icon: Icon, value, label }, i) => (
          <View key={label} style={[styles.stat, i > 0 && { borderLeftWidth: StyleSheet.hairlineWidth, borderColor: color.darkOutline }]}>
            <Icon color={color.lime} size={22} />
            <Text variant="number" tone="onDark">{value}</Text>
            <Text variant="labelSmall" tone="onDarkVariant" style={styles.statLabel} numberOfLines={2}>{label}</Text>
          </View>
        ))}
      </View>
      <View style={[styles.statsFoot, { borderColor: color.darkOutline }]}>
        <Tag label={t.journal.demoTag} tone="demo" />
      </View>
    </View>
  );
}

type GuideTileProps = { species: Species; entry: GuideEntry | undefined };

/** Cuadro de la guía: la foto con check si ya la sumó; si no, su silueta con candado. */
export function GuideTile({ species, entry }: GuideTileProps) {
  const { color } = useTheme();
  const photo = getReferencePhoto(species.id);
  const collected = entry !== undefined;
  // Id único por cuadro: en web los gradientes viven en el mismo documento y un id repetido
  // haría que todos los cuadros usaran el velo del primero.
  const veilId = `veil-${useId().replace(/[^\w-]/g, '')}`;
  return (
    <Pressable onPress={() => openSpecies(species.id)} accessibilityRole="link"
      accessibilityLabel={entry ? t.journal.collectedA11y(species.commonName, entry.addedAt) : t.journal.lockedA11y(species.commonName)}
      style={({ pressed }) => [styles.tile, { backgroundColor: collected ? color.dark : color.lockedTile, opacity: pressed ? 0.85 : 1 }]}>
      {collected && photo ? (
        <Image source={photo.source} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityIgnoresInvertColors />
      ) : (
        <View style={styles.silhouette}>
          <SpeciesSilhouette speciesId={species.id} color={collected ? color.lime : color.lockedInk} />
        </View>
      )}
      {/* Velo inferior para que el nombre se lea sobre la foto. */}
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none">
        <Defs>
          <LinearGradient id={veilId} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0.35" stopColor="#000" stopOpacity={0} />
            <Stop offset="1" stopColor="#000" stopOpacity={collected ? 0.78 : 0.35} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#${veilId})`} />
      </Svg>
      <View style={[styles.badge, { backgroundColor: collected ? color.lime : color.scrim }]}>
        {collected ? <CheckIcon color={color.onLime} size={14} /> : <LockIcon color={color.onDark} size={13} />}
      </View>
      <View style={styles.tileText}>
        <Text variant="labelMedium" style={styles.tileName} numberOfLines={2}>{species.commonName}</Text>
        <Text variant="labelSmall" style={styles.tileMeta} numberOfLines={1}>
          {entry ? formatShortDate(entry.addedAt) : t.journal.locked}
        </Text>
      </View>
    </Pressable>
  );
}

/** Recorrido completado, como fila de tarjeta. */
export function WalkRow({ walk, name }: { walk: Walk; name: string }) {
  const { color } = useTheme();
  const km = formatDecimal(walk.km);
  return (
    <View style={[styles.walk, { backgroundColor: color.surface, borderColor: color.outlineVariant }]} accessible
      accessibilityLabel={t.journal.walkA11y(walk.completedAt, km)}>
      <View style={[styles.walkIcon, { backgroundColor: color.dark }]}>
        <TrailIcon color={color.lime} size={22} />
      </View>
      <View style={styles.walkText}>
        <Text variant="titleSmall">{name}</Text>
        <Text variant="bodySmall" tone="onSurfaceVariant">{formatShortDate(walk.completedAt)}</Text>
      </View>
      <Text variant="titleMedium">{`${km} km`}</Text>
    </View>
  );
}

const badgeIcons: Record<BadgeId, IconComponent> = {
  'first-species': LeafIcon,
  'half-guide': LeafIcon,
  'full-guide': StarIcon,
  'all-nothofagus': LeafIcon,
  'first-walk': TrailIcon,
  'ten-km': FootprintsIcon,
};

/** Insignia: ganada en lima sobre oscuro; si no, en gris con su avance. */
export function BadgeTile({ badge }: { badge: Badge }) {
  const { color } = useTheme();
  const copy = t.journal.badges[badge.id];
  const Icon = badgeIcons[badge.id];
  const progress = t.journal.badgeProgress(
    badge.id === 'ten-km' ? formatDecimal(badge.progress) : String(badge.progress),
    String(badge.goal),
  );
  return (
    <View style={[styles.badgeTile, { backgroundColor: badge.earned ? color.dark : color.surface, borderColor: badge.earned ? color.dark : color.outlineVariant }]}
      accessible accessibilityLabel={t.journal.badgeA11y(copy.name, copy.rule, badge.earned, progress)}>
      <View style={[styles.medal, { backgroundColor: badge.earned ? color.lime : color.surfaceMuted }]}>
        {badge.earned ? <Icon color={color.onLime} size={26} /> : <LockIcon color={color.outline} size={22} />}
      </View>
      <Text variant="titleSmall" tone={badge.earned ? 'onDark' : 'onSurface'} style={styles.center} numberOfLines={2}>{copy.name}</Text>
      <Text variant="labelSmall" tone={badge.earned ? 'onDarkVariant' : 'onSurfaceVariant'} style={styles.center} numberOfLines={3}>
        {copy.rule}
      </Text>
      <Text variant="labelMedium" style={[styles.center, { color: badge.earned ? color.lime : color.onSurfaceVariant }]}>
        {badge.earned ? t.journal.badgeEarned : progress}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  stats: { borderRadius: radius.lg, paddingTop: space.lg, paddingHorizontal: space.xs },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  statLabel: { textAlign: 'center' },
  statsFoot: { alignItems: 'center', paddingVertical: space.sm, marginTop: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  tile: { aspectRatio: 0.86, borderRadius: radius.md, overflow: 'hidden' },
  silhouette: { ...StyleSheet.absoluteFill, padding: space.md, paddingBottom: space.xxl },
  badge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileText: { position: 'absolute', left: space.sm, right: space.sm, bottom: space.sm },
  tileName: { color: '#FFFFFF' }, // Sobre el velo negro, en ambas variantes.
  tileMeta: { color: 'rgba(255,255,255,0.78)' },
  walk: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  walkIcon: { width: 44, height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  walkText: { flex: 1, gap: 2 },
  badgeTile: { flex: 1, alignItems: 'center', gap: space.xs, padding: space.md, borderRadius: radius.lg, borderWidth: 1 },
  medal: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginBottom: space.xs },
  center: { textAlign: 'center' },
});
