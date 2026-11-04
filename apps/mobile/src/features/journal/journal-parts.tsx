import { useId } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import { openSpecies } from '@/features/catalog/open-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { SpeciesSilhouette } from '@/features/species-art/species-silhouette';
import { formatDecimal, formatShortDate, t } from '@/i18n/es-CL';
import {
  CheckIcon, CoverImage, FootprintsIcon, type IconComponent, LeafIcon, LockIcon, radius, space, StarIcon, Text, TrailIcon, useTheme,
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
        <CoverImage source={photo.source} />
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

const styles = StyleSheet.create({
  stats: { borderRadius: radius.lg, paddingVertical: space.lg, paddingHorizontal: space.xs },
  statsRow: { flexDirection: 'row' },
  stat: { flex: 1, alignItems: 'center', gap: 2, paddingHorizontal: space.xs },
  statLabel: { textAlign: 'center' },
  tile: { aspectRatio: 0.86, borderRadius: radius.md, overflow: 'hidden' },
  silhouette: { ...StyleSheet.absoluteFill, padding: space.md, paddingBottom: space.xxl },
  badge: { position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileText: { position: 'absolute', left: space.sm, right: space.sm, bottom: space.sm },
  tileName: { color: '#FFFFFF' }, // Sobre el velo negro, en ambas variantes.
  tileMeta: { color: 'rgba(255,255,255,0.78)' },
});
