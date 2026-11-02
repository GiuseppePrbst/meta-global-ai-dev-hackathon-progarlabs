import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';

import type { Species } from '@/domain/species';
import { applyFilter, familiesOf, filterSpecies, type SpeciesFilter } from '@/features/catalog/catalog';
import { useSaved } from '@/features/catalog/saved';
import { SpeciesCard } from '@/features/catalog/species-card';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { formatDate, t } from '@/i18n/es-CL';
import {
  BookmarkIcon, CloseIcon, EmptyState, FilterChip, IconButton, InfoIcon, LoadingState, ScreenHeader, SearchField, SearchIcon,
  space, StatusBanner, Text, useTheme,
} from '@/ui';

const NO_SPECIES: Species[] = [];

const sameFilter = (a: SpeciesFilter, b: SpeciesFilter) =>
  a.kind === b.kind && (a.kind !== 'family' || (b.kind === 'family' && a.family === b.family));

export default function SpeciesListScreen() {
  const { color } = useTheme();
  const { data, isPending, error, refetch } = useSpeciesCatalog();
  const catalog = data ?? NO_SPECIES;
  const saved = useSaved();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SpeciesFilter>({ kind: 'all' });
  const filters = useMemo<{ label: string; value: SpeciesFilter }[]>(() => [
    { label: t.species.filterAll, value: { kind: 'all' } },
    { label: t.species.filterSaved, value: { kind: 'saved' } },
    ...familiesOf(catalog).map((family) => ({ label: family, value: { kind: 'family', family } as SpeciesFilter })),
  ], [catalog]);
  const results = useMemo(() => filterSpecies(applyFilter(catalog, filter, saved), query), [catalog, filter, saved, query]);
  const provenance = catalog[0]?.provenance;

  const closeSearch = () => {
    setSearching(false);
    setQuery('');
  };

  // Mientras carga o si falla, la lista vacía no significa «ninguna especie coincide».
  const empty = isPending ? (
    <LoadingState label={t.species.loading} />
  ) : error ? (
    <EmptyState accessibilityLiveRegion="assertive" icon={InfoIcon} title={t.species.errorTitle} body={t.species.errorBody}
      action={{ label: t.common.retry, onPress: refetch }} />
  ) : query.trim() ? (
    <EmptyState accessibilityLiveRegion="polite" icon={SearchIcon} title={t.species.emptyTitle(query.trim())} body={t.species.emptyHint}
      action={{ label: t.species.clearSearch, onPress: () => setQuery('') }} />
  ) : filter.kind === 'saved' ? (
    <EmptyState accessibilityLiveRegion="polite" icon={BookmarkIcon} title={t.species.emptySavedTitle} body={t.species.emptySavedBody}
      action={{ label: t.species.showAll, onPress: () => setFilter({ kind: 'all' }) }} />
  ) : (
    <EmptyState accessibilityLiveRegion="polite" icon={InfoIcon} title={t.species.emptyFilterTitle} body={t.species.emptyHint}
      action={{ label: t.species.showAll, onPress: () => setFilter({ kind: 'all' }) }} />
  );

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <ScreenHeader title={t.species.title} actions={
        <IconButton label={searching ? t.species.closeSearch : t.species.openSearch} look="light"
          onPress={searching ? closeSearch : () => setSearching(true)}>
          {searching ? <CloseIcon color={color.onSurface} size={22} /> : <SearchIcon color={color.onSurface} size={22} />}
        </IconButton>
      }>
        {searching ? (
          <Animated.View entering={FadeIn.duration(160)} exiting={FadeOut.duration(100)}>
            <SearchField value={query} onChangeText={setQuery} placeholder={t.species.searchPlaceholder} autoFocus
              label={t.species.searchLabel} clearLabel={t.species.clearSearch} />
          </Animated.View>
        ) : null}
      </ScreenHeader>

      <View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
          accessibilityLabel={t.species.filterLabel}>
          {filters.map(({ label, value }) => (
            <FilterChip key={label} label={label} selected={sameFilter(filter, value)} onPress={() => setFilter(value)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.listHead}>
            {data ? (
              <Text variant="labelMedium" tone="onSurfaceVariant" accessibilityLiveRegion="polite">
                {t.species.count(results.length, catalog.length)}
              </Text>
            ) : null}
            <StatusBanner message={t.species.demoBanner} />
          </View>
        }
        renderItem={({ item }) => <SpeciesCard species={item} saved={saved.has(item.id)} />}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={empty}
        ListFooterComponent={
          results.length && provenance ? (
            <Text variant="labelSmall" tone="onSurfaceVariant" style={styles.footer}>
              {`${t.species.sourceFooter(provenance.version, formatDate(provenance.accessedAt))}\n${t.species.savedNote}`}
            </Text>
          ) : undefined
        }
      />
    </View>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingBottom: space.sm },
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl },
  listHead: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.md },
  gap: { height: space.md },
  footer: { paddingTop: space.xl, textAlign: 'center' },
});
