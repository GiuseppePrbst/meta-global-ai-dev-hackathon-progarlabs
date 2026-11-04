import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Observation } from '@/domain/observation';
import type { DemoTrail, TrailStop } from '@/features/atlas/demo-trail';
import { stopIcons } from '@/features/atlas/map-chrome';
import { useSpeciesNames } from '@/features/atlas/use-species-names';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import type { QueryResult } from '@/features/query-result';
import { formatShortDate, t } from '@/i18n/es-CL';
import {
  BackIcon, ChevronIcon, CoverImage, EmptyState, IconButton, InfoIcon, LoadingState, MapIcon, radius, space, StatusBanner, Tag, Text,
  useTheme,
  NAVIGATION_BAR_OVERLAP,
} from '@/ui';

type MapListProps = {
  /** Sendero abierto en el mapa; sin él, la lista muestra solo las observaciones. */
  trail?: DemoTrail;
  trailMeta?: string;
  observations: QueryResult<Observation[]>;
  onClose: () => void;
  onShowStop: (stop: TrailStop) => void;
  onShowObservation: (observation: Observation) => void;
};

/** Lista textual equivalente al mapa: el sendero, sus paradas y las observaciones. */
export function MapList({ trail, trailMeta, observations: { data, isPending, error, refetch }, onClose, onShowStop, onShowObservation }: MapListProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.screen, { backgroundColor: color.dark }]}>
      <View style={[styles.head, { paddingTop: insets.top + space.sm }]}>
        <IconButton label={t.mapList.close} onPress={onClose} look="dark">
          <BackIcon color={color.onDark} size={22} />
        </IconButton>
        <Text variant="headline" tone="onDark" accessibilityRole="header">{t.mapList.title}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <StatusBanner on="dark" message={t.mapList.demoBanner} />

        {trail ? (
          <View style={styles.section}>
            <Text variant="titleLarge" tone="onDark" accessibilityRole="header">{trail.name}</Text>
            <Text variant="bodySmall" tone="onDarkVariant">{`${trailMeta} · ${t.trail.syntheticNote}`}</Text>
            <View style={[styles.group, { backgroundColor: color.darkSurface }]}>
              {trail.stops.map((stop, i) => {
                const Icon = stopIcons[stop.kind];
                return (
                  <Row key={stop.id} first={i === 0} onPress={() => onShowStop(stop)} accessibilityLabel={t.mapList.stopA11y(i + 1, stop.name)}
                    leading={<View style={[styles.icon, { backgroundColor: color.darkSurfaceHigh }]}><Icon color={color.lime} size={22} /></View>}>
                    <Text variant="labelMedium" tone="onDarkVariant">{t.trail.stopOf(i + 1, trail.stops.length)}</Text>
                    <Text variant="titleSmall" tone="onDark">{stop.name}</Text>
                  </Row>
                );
              })}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text variant="titleLarge" tone="onDark" accessibilityRole="header">{t.mapList.observationsHeading}</Text>
          {isPending ? (
            <LoadingState on="dark" label={t.mapList.observationsLoading} />
          ) : error || !data ? (
            <EmptyState on="dark" icon={InfoIcon} accessibilityLiveRegion="assertive" title={t.mapList.observationsErrorTitle}
              body={t.mapList.observationsErrorBody} action={{ label: t.common.retry, onPress: refetch }} />
          ) : data.length ? (
            <View style={[styles.group, { backgroundColor: color.darkSurface }]}>
              {data.map((observation, i) => (
                <ObservationRow key={observation.id} observation={observation} first={i === 0} onPress={onShowObservation} />
              ))}
            </View>
          ) : (
            <EmptyState on="dark" icon={MapIcon} title={t.mapList.emptyTitle} body={t.mapList.emptyBody} />
          )}
        </View>
      </ScrollView>
    </View>
  );
}

type RowProps = {
  first: boolean;
  leading: React.ReactNode;
  children: React.ReactNode;
  onPress?: () => void;
  accessibilityLabel: string;
};

function Row({ first, leading, children, onPress, accessibilityLabel }: RowProps) {
  const { color } = useTheme();
  return (
    <Pressable onPress={onPress} disabled={!onPress} accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={accessibilityLabel} android_ripple={{ color: color.onDarkRipple }}
      style={[styles.row, !first && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.darkOutline }]}>
      {leading}
      <View style={styles.rowText}>{children}</View>
      {onPress ? <ChevronIcon color={color.onDarkVariant} size={20} /> : null}
    </Pressable>
  );
}

function ObservationRow({ observation, first, onPress }: { observation: Observation; first: boolean; onPress: (o: Observation) => void }) {
  const { color } = useTheme();
  const { common, scientific } = useSpeciesNames(observation.speciesId);
  const located = observation.location !== null;
  const photo = getReferencePhoto(observation.speciesId);
  // Sin ubicación no hay nada que mostrar en el mapa: la fila no es un botón.
  return (
    <Row first={first} onPress={located ? () => onPress(observation) : undefined}
      accessibilityLabel={t.observation.rowA11y(common, observation.createdAt, located)}
      leading={photo ? <CoverImage source={photo.source} style={styles.icon} /> : (
        <View style={[styles.icon, { backgroundColor: color.darkSurfaceHigh }]}><InfoIcon color={color.onDarkVariant} size={22} /></View>
      )}>
      <Text variant="titleSmall" tone="onDark">{common}</Text>
      {scientific ? <Text variant="scientific" tone="onDarkVariant">{scientific}</Text> : null}
      <View style={styles.meta}>
        <Tag label={t.observation.syntheticTag} tone="demo" />
        <Text variant="labelSmall" tone="onDarkVariant">{formatShortDate(observation.createdAt)}</Text>
      </View>
      {!located ? <Text variant="labelSmall" tone="onDarkVariant">{t.observation.noLocation}</Text> : null}
    </Row>
  );
}

const styles = StyleSheet.create({
  screen: { ...StyleSheet.absoluteFill },
  head: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.lg, paddingBottom: space.sm },
  content: { padding: space.lg, paddingBottom: space.xxl + NAVIGATION_BAR_OVERLAP, gap: space.xl },
  section: { gap: space.sm },
  group: { borderRadius: radius.lg, overflow: 'hidden', marginTop: space.xs },
  row: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingHorizontal: space.md, paddingVertical: space.md, minHeight: 64 },
  rowText: { flex: 1, gap: 2 },
  icon: { width: 48, height: 48, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: space.sm, marginTop: 2 },
});
