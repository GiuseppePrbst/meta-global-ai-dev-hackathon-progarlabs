import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';

import { demoTrail } from '@/features/atlas/demo-trail';
import { applyFilter, familiesOf, type SpeciesFilter } from '@/features/catalog/catalog';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { collectedCount } from '@/features/guide/guide';
import { useGuide } from '@/features/guide/use-guide';
import { computeBadges, totalKm } from '@/features/journal/badges';
import { BadgeTile, GuideTile, StatsCard, WalkRow } from '@/features/journal/journal-parts';
import { useWalks } from '@/features/journal/use-walks';
import { t } from '@/i18n/es-CL';
import {
  EmptyState, FilterChip, Grid, LoadingState, type PillTab, PillTabs, ProgressBar, ScreenHeader, space, StatusBanner, Text, TrailIcon,
  useTheme,
} from '@/ui';

type Section = 'discoveries' | 'trails' | 'badges';

const sections: PillTab<Section>[] = [
  { key: 'discoveries', label: t.journal.tabDiscoveries },
  { key: 'trails', label: t.journal.tabTrails },
  { key: 'badges', label: t.journal.tabBadges },
];

export default function JournalScreen() {
  const { color } = useTheme();
  const { data: catalog } = useSpeciesCatalog();
  const { data: entries } = useGuide();
  const { data: walks } = useWalks();
  const [section, setSection] = useState<Section>('discoveries');
  const [family, setFamily] = useState<string | null>(null);

  const badges = useMemo(
    () => (catalog && entries && walks ? computeBadges({ catalog, entries, walks }) : []),
    [catalog, entries, walks],
  );

  if (!catalog || !entries || !walks) {
    return (
      <View style={[styles.screen, { backgroundColor: color.background }]}>
        <ScreenHeader title={t.journal.title} />
        <LoadingState label={t.journal.loading} />
      </View>
    );
  }

  const collected = collectedCount(catalog, entries);
  const added = new Map(entries.map((entry) => [entry.speciesId, entry]));
  const filter: SpeciesFilter = family ? { kind: 'family', family } : { kind: 'all' };
  const shown = applyFilter(catalog, filter);
  const share = catalog.length ? Math.round((collected / catalog.length) * 100) : 0;

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
              <View style={styles.progressHead}>
                <Text variant="titleLarge" accessibilityRole="header">{t.journal.guideTitle}</Text>
                <Text variant="labelMedium" tone="onSurfaceVariant">{t.journal.guideProgress(collected, catalog.length)}</Text>
              </View>
              <View style={styles.progressRow}>
                <ProgressBar value={collected} max={catalog.length} label={t.journal.guideProgressA11y(collected, catalog.length)}
                  style={styles.grow} />
                <Text variant="labelLarge" accessibilityElementsHidden importantForAccessibility="no">{`${share}%`}</Text>
              </View>
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
                  {shown.map((species) => <GuideTile key={species.id} species={species} entry={added.get(species.id)} />)}
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
                {walks.toReversed().map((walk, i) => <WalkRow key={`${walk.completedAt}-${i}`} walk={walk} name={demoTrail.name} />)}
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
              <Grid columns={2}>
                {badges.map((badge) => <BadgeTile key={badge.id} badge={badge} />)}
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
  content: { paddingBottom: space.xl, gap: space.lg },
  padded: { paddingHorizontal: space.lg },
  block: { gap: space.sm },
  progressHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', gap: space.md },
  progressRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  chips: { gap: space.sm, paddingHorizontal: space.lg },
  list: { gap: space.sm, marginTop: space.xs },
});
