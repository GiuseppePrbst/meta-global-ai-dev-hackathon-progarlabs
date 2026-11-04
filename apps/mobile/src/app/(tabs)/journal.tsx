import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { useReducedMotion } from 'react-native-reanimated';

import { apiErrorMessage } from '@/features/api-error-message';
import { getDemoTrail } from '@/features/atlas/demo-trail';
import { applyFilter, familiesOf, type SpeciesFilter } from '@/features/catalog/catalog';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { collectedCount } from '@/features/guide/guide';
import { useGuide } from '@/features/guide/use-guide';
import { BadgeMedalTile, NextBadgeCard } from '@/features/journal/badge-medals';
import { DiscoveryGoal, GuideProgress, subtleIn } from '@/features/journal/discoveries';
import { computeBadges, nextBadge, totalKm } from '@/features/journal/badges';
import { GuideTile, StatsCard } from '@/features/journal/journal-parts';
import { TrailJourney, WalkStamp } from '@/features/journal/trail-stamps';
import { useWalks } from '@/features/journal/use-walks';
import { useFocusKey } from '@/features/focus-key';
import { t } from '@/i18n/es-CL';
import {
  EmptyState, FilterChip, Grid, InfoIcon, LoadingState, type PillTab, PillTabs, ScreenHeader, space, StatusBanner, Text, TrailIcon,
  useTheme,
  NAVIGATION_BAR_OVERLAP,
} from '@/ui';

type Section = 'discoveries' | 'trails' | 'badges';

const sections: PillTab<Section>[] = [
  { key: 'discoveries', label: t.journal.tabDiscoveries },
  { key: 'trails', label: t.journal.tabTrails },
  { key: 'badges', label: t.journal.tabBadges },
];

/** Se remonta al volver a la pestaña, para repetir la entrada animada. */
export default function JournalTab() {
  return <JournalScreen key={useFocusKey()} />;
}

function JournalScreen() {
  const { color } = useTheme();
  const { data: catalog, error: catalogError, refetch: refetchCatalog } = useSpeciesCatalog();
  const { data: entries } = useGuide();
  const { data: walks } = useWalks();
  const [section, setSection] = useState<Section>('discoveries');
  const [family, setFamily] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const badges = useMemo(
    () => (catalog && entries && walks ? computeBadges({ catalog, entries, walks }) : []),
    [catalog, entries, walks],
  );

  if (!catalog || !entries || !walks) {
    return (
      <View style={[styles.screen, { backgroundColor: color.background }]}>
        <ScreenHeader title={t.journal.title} />
        {/* El diario cuenta especies del catálogo de la API: si no llegó, se dice, no queda «cargando». */}
        {catalogError && !catalog ? (
          <EmptyState accessibilityLiveRegion="assertive" icon={InfoIcon} title={t.journal.errorTitle} body={apiErrorMessage(catalogError)}
            action={{ label: t.common.retry, onPress: refetchCatalog }} />
        ) : (
          <LoadingState label={t.journal.loading} />
        )}
      </View>
    );
  }

  const collected = collectedCount(catalog, entries);
  const added = new Map(entries.map((entry) => [entry.speciesId, entry]));
  const filter: SpeciesFilter = family ? { kind: 'family', family } : { kind: 'all' };
  const shown = applyFilter(catalog, filter);

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <ScreenHeader title={t.journal.title} />
      <ScrollView contentContainerStyle={styles.content}>
        <PillTabs options={sections} value={section} onChange={setSection} accessibilityLabel={t.journal.tabsLabel} />

        <View style={styles.padded}>
          <StatsCard species={collected} trails={walks.length} km={totalKm(walks)} badges={badges.filter((b) => b.earned).length} />
        </View>

        {section === 'discoveries' ? (
          <>
            <View style={[styles.padded, styles.block]}>
              <GuideProgress collected={collected} total={catalog.length} />
              <View style={styles.journey}><DiscoveryGoal badges={badges} /></View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
              accessibilityLabel={t.journal.filterLabel}>
              <FilterChip label={t.species.filterAll} selected={family === null} onPress={() => setFamily(null)} />
              {familiesOf(catalog).map((name) => (
                <FilterChip key={name} label={name} selected={family === name} onPress={() => setFamily(name)} />
              ))}
            </ScrollView>
            <View style={styles.padded}>
              {shown.length ? (
                <Grid columns={3}>
                  {shown.map((species, i) => (
                    <Animated.View key={species.id} entering={reducedMotion ? undefined : subtleIn(i)}>
                      <GuideTile species={species} entry={added.get(species.id)} />
                    </Animated.View>
                  ))}
                </Grid>
              ) : (
                <Text variant="bodyMedium" tone="onSurfaceVariant">{t.journal.emptyFilter}</Text>
              )}
            </View>
          </>
        ) : null}

        {section === 'trails' ? (
          <View style={[styles.padded, styles.block]}>
            <Text variant="titleLarge" accessibilityRole="header">{t.journal.trailsTitle}</Text>
            <Text variant="bodySmall" tone="onSurfaceVariant">{t.journal.trailsBody}</Text>
            {walks.length ? (
              <View style={styles.list}>
                <TrailJourney km={totalKm(walks)} />
                {/* La más reciente primero; el número de salida sigue el orden en que se hicieron. */}
                {walks.toReversed().map((walk, i) => (
                  <WalkStamp key={`${walk.completedAt}-${i}`} walk={walk} trail={getDemoTrail(walk.trailId)} outing={walks.length - i} index={i} />
                ))}
              </View>
            ) : (
              <EmptyState icon={TrailIcon} title={t.journal.trailsEmptyTitle} body={t.journal.trailsEmptyBody}
                action={{ label: t.tabs.map, onPress: () => router.navigate('/atlas') }} />
            )}
          </View>
        ) : null}

        {section === 'badges' ? (
          <View style={[styles.padded, styles.block]}>
            <Text variant="titleLarge" accessibilityRole="header">{t.journal.badgesTitle}</Text>
            <Text variant="bodySmall" tone="onSurfaceVariant">{t.journal.badgesBody}</Text>
            <View style={styles.list}>
              <NextBadgeCard next={nextBadge(badges)} />
              <Grid columns={2}>
                {badges.map((badge, i) => <BadgeMedalTile key={badge.id} badge={badge} index={i} />)}
              </Grid>
            </View>
          </View>
        ) : null}

        <View style={styles.padded}>
          <StatusBanner message={t.journal.demoNote} />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingBottom: space.xl + NAVIGATION_BAR_OVERLAP, gap: space.lg },
  padded: { paddingHorizontal: space.lg },
  block: { gap: space.sm },
  journey: { marginTop: space.sm },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  list: { gap: space.sm, marginTop: space.xs },
});
