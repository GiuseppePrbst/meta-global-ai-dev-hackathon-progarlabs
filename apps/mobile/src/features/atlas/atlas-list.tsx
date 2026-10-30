import { ScrollView, StyleSheet, View } from 'react-native';

import type { Observation } from '@/domain/observation';
import { BASEMAP_ACCESSED } from '@/features/atlas/basemap';
import { EmptyAtlasSheet } from '@/features/atlas/contour-art';
import { ObservationRow } from '@/features/atlas/observation-row';
import type { QueryResult } from '@/features/query-result';
import { formatDate, t } from '@/i18n/es-CL';
import { BAND_EDGE, EmptyState, HerbariumLabel, LoadingState, space, StatusBanner, Text, useTheme } from '@/ui';

type AtlasListProps = {
  observations: QueryResult<Observation[]>;
  onShowOnMap: (observation: Observation) => void;
};

/** Lista textual equivalente al mapa: lo mismo que el mapa muestra, más su procedencia. */
export function AtlasList({ observations: { data: observations, isPending, error, refetch }, onShowOnMap }: AtlasListProps) {
  const { color } = useTheme();
  const labelRows: [string, string][] = [
    [t.atlas.basemap, t.atlas.basemapValue],
    [t.atlas.license, t.atlas.licenseValue],
    [t.atlas.framing, t.atlas.framingValue],
    [t.atlas.accessed, formatDate(BASEMAP_ACCESSED)],
    [t.atlas.status, t.atlas.statusValue],
  ];

  return (
    <ScrollView contentContainerStyle={styles.list}>
      <StatusBanner message={t.atlas.demoBanner} />

      <View style={styles.section}>
        <Text variant="titleLarge" accessibilityRole="header">
          {t.atlas.listHeading}
        </Text>
        {isPending ? (
          <LoadingState label={t.atlas.observationsLoading} />
        ) : error || !observations ? (
          <EmptyState layout="inline" accessibilityLiveRegion="assertive" art={<EmptyAtlasSheet ink={color.outline} />}
            title={t.atlas.observationsErrorTitle} body={t.atlas.observationsErrorBody}
            action={{ label: t.common.retry, onPress: refetch }} />
        ) : observations.length > 0 ? (
          <View style={[styles.rows, { borderColor: color.outlineVariant }]}>
            {observations.map((observation) => (
              <ObservationRow key={observation.id} observation={observation} onPress={onShowOnMap} />
            ))}
          </View>
        ) : (
          <EmptyState layout="inline" art={<EmptyAtlasSheet ink={color.outline} />} title={t.atlas.emptyTitle}
            body={t.atlas.emptyBody} />
        )}
      </View>

      <View style={styles.section}>
        <Text variant="titleLarge" accessibilityRole="header">
          {t.atlas.aboutTitle}
        </Text>
        <Text variant="bodyMedium" tone="onSurfaceVariant">{t.atlas.disclaimer}</Text>
        <HerbariumLabel heading={t.atlas.labelHeading} name={t.atlas.labelName} italic={false} rows={labelRows} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: { padding: space.lg, paddingTop: BAND_EDGE + space.lg, paddingBottom: space.xxl, gap: space.sm },
  section: { paddingTop: space.xl, gap: space.md },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
});
