import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import type { Species } from '@/domain/species';
import { CatalogCover, EmptySheet } from '@/features/catalog/art/catalog-art';
import { filterSpecies, sheetNumber } from '@/features/catalog/catalog';
import { SpeciesCard } from '@/features/catalog/species-card';
import { useSpeciesCatalog } from '@/features/catalog/use-species';
import { formatDate, t } from '@/i18n/es-CL';
import { BAND_EDGE, EmptyState, LoadingState, Paper, ScreenHeader, SearchField, space, StatusBanner, Text, useTheme } from '@/ui';

const NO_SPECIES: Species[] = [];

export default function SpeciesListScreen() {
  const { color } = useTheme();
  const { data, isPending, error, refetch } = useSpeciesCatalog();
  const catalog = data ?? NO_SPECIES;
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterSpecies(catalog, query), [catalog, query]);
  // Las filas entran escalonadas solo al abrir el catálogo, no en cada búsqueda.
  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
  }, []);
  const provenance = catalog[0]?.provenance;

  // Mientras carga o si falla, la lista vacía no significa «ningún pliego coincide».
  const empty = isPending ? (
    <LoadingState label={t.species.loading} />
  ) : error ? (
    <EmptyState accessibilityLiveRegion="assertive" art={<EmptySheet ink={color.outline} />}
      title={t.species.errorTitle} body={t.species.errorBody} action={{ label: t.common.retry, onPress: refetch }} />
  ) : (
    <EmptyState accessibilityLiveRegion="polite" art={<EmptySheet ink={color.outline} />}
      title={t.species.emptyTitle(query.trim())} body={t.species.emptyHint}
      action={{ label: t.species.clearSearch, onPress: () => setQuery('') }} />
  );

  return (
    <Paper style={styles.screen}>
      <ScreenHeader title={t.species.title} subtitle={data ? t.species.count(catalog.length) : t.species.subtitle}
        cover={<CatalogCover ink={color.onTopBar} wash={color.lime} />}>
        <SearchField value={query} onChangeText={setQuery} placeholder={t.species.searchPlaceholder}
          label={t.species.searchLabel} clearLabel={t.species.clearSearch} style={styles.search} />
      </ScreenHeader>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        numColumns={2}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        columnWrapperStyle={styles.columns}
        ListHeaderComponent={
          <View style={styles.bannerWrap}>
            <StatusBanner message={t.species.demoBanner} />
          </View>
        }
        renderItem={({ item, index }) => (
          <SpeciesCard species={item} sheet={sheetNumber(catalog, item.id)} index={index} enter={firstRender.current} />
        )}
        ItemSeparatorComponent={Gap}
        ListEmptyComponent={empty}
        ListFooterComponent={
          results.length && provenance ? (
            <Text variant="labelSmall" tone="onSurfaceVariant" style={styles.footer}>
              {t.species.sourceFooter(provenance.version, formatDate(provenance.accessedAt))}
            </Text>
          ) : undefined
        }
      />
    </Paper>
  );
}

function Gap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: { marginTop: space.md },
  content: { paddingTop: BAND_EDGE, paddingBottom: space.xl },
  bannerWrap: { padding: space.lg, paddingBottom: space.lg },
  // Álbum de dos columnas: los cromos de una fila miden lo mismo.
  columns: { paddingHorizontal: space.lg, gap: space.md },
  gap: { height: space.md },
  footer: { paddingHorizontal: space.lg, paddingTop: space.xl, textAlign: 'center' },
});
