import { useMemo, useState } from 'react';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { Easing, FadeIn, FadeInDown, FadeOut, useReducedMotion } from 'react-native-reanimated';

import type { Species } from '@/domain/species';
import { applyFilter, familiesOf, filterSpecies, type SpeciesFilter } from '@/features/catalog/catalog';
import { useSaved } from '@/features/catalog/saved';
import { SpeciesCard } from '@/features/catalog/species-card';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { useGuide } from '@/features/guide/use-guide';
import { formatDate, t } from '@/i18n/es-CL';
import {
  BookmarkIcon, CloseIcon, EmptyState, FilterChip, type IconComponent, IconButton, InfoIcon, LoadingState, MushroomIcon, ScreenHeader,
  SearchField, SearchIcon, SpeciesIcon,
  space, Text, useTheme,
  NAVIGATION_BAR_OVERLAP,
} from '@/ui';

const NO_SPECIES: Species[] = [];

/** Entrada en cascada de las tarjetas: suben un poco y aparecen, sin pasar de las primeras doce. */
const cardIn = (index: number) => FadeInDown
  .withInitialValues({ opacity: 0, transform: [{ translateY: 14 }] })
  .duration(360).delay(Math.min(index, 12) * 45).easing(Easing.out(Easing.cubic));

const sameFilter = (a: SpeciesFilter, b: SpeciesFilter) => {
  if (a.kind === 'group') return b.kind === 'group' && a.group === b.group;
  if (a.kind === 'family') return b.kind === 'family' && a.family === b.family;
  return a.kind === b.kind;
};

export default function SpeciesListScreen() {
  const { color } = useTheme();
  const { data, isPending, error, refetch } = useSpeciesCatalog();
  const catalog = data ?? NO_SPECIES;
  const saved = useSaved();
  const { data: guide } = useGuide();
  const inGuide = useMemo(() => new Set((guide ?? []).map((entry) => entry.speciesId)), [guide]);
  const reducedMotion = useReducedMotion();
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<SpeciesFilter>({ kind: 'all' });
  const filters = useMemo(() => {
    const list: { label: string; value: SpeciesFilter; icon?: IconComponent }[] = [
      { label: t.species.filterAll, value: { kind: 'all' } },
      { label: t.species.filterSaved, value: { kind: 'saved' }, icon: BookmarkIcon },
      { label: t.species.filterTrees, value: { kind: 'group', group: 'tree' }, icon: SpeciesIcon },
      { label: t.species.filterFungi, value: { kind: 'group', group: 'fungus' }, icon: MushroomIcon },
      ...familiesOf(catalog).map((family) => ({ label: family, value: { kind: 'family', family } as SpeciesFilter })),
    ];
    // Cada chip dice cuántas especies deja ver; los grupos vacíos (p. ej. sin hongos) no se ofrecen.
    return list
      .map((item) => ({ ...item, count: applyFilter(catalog, item.value, saved).length }))
      .filter((item) => item.count > 0 || item.value.kind === 'all' || item.value.kind === 'saved');
  }, [catalog, saved]);
  // Al cambiar de filtro, la lista se remonta y las tarjetas vuelven a entrar en cascada.
  const listKey = filter.kind === 'family' ? `family:${filter.family}` : filter.kind === 'group' ? `group:${filter.group}` : filter.kind;
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
          {filters.map(({ label, value, icon, count }) => (
            <FilterChip key={label} label={label} icon={icon} count={count} selected={sameFilter(filter, value)}
              accessibilityLabel={t.species.filterCountA11y(label, count)} onPress={() => setFilter(value)} />
          ))}
        </ScrollView>
      </View>

      <FlatList
        key={listKey}
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
          </View>
        }
        renderItem={({ item, index }) => (
          <Animated.View entering={reducedMotion ? undefined : cardIn(index)}>
            <SpeciesCard species={item} saved={saved.has(item.id)} inGuide={inGuide.has(item.id)} />
          </Animated.View>
        )}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={empty}
        ListFooterComponent={
          results.length && provenance ? (
            <Text variant="labelSmall" tone="onSurfaceVariant" style={styles.footer}>
              {`${t.species.demoNote}\n${t.species.sourceFooter(provenance.version, formatDate(provenance.accessedAt))}\n${t.species.savedNote}`}
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
  content: { paddingHorizontal: space.lg, paddingBottom: space.xl + NAVIGATION_BAR_OVERLAP },
  listHead: { gap: space.sm, paddingTop: space.sm, paddingBottom: space.md },
  gap: { height: space.lg },
  footer: { paddingTop: space.xl, textAlign: 'center' },
});
