import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Species } from '@/domain/species';
import { LeafPlate, speciesWash } from '@/features/catalog/leaf-plate';
import { filterSpecies, mockSpecies, sheetNumber } from '@/features/catalog/mock-species';
import { formatDate, t } from '@/i18n/es-CL';
import { ChevronIcon, CloseIcon, SearchIcon } from '@/ui/icons';
import { StatusBanner } from '@/ui/status-banner';
import { ScreenHeader } from '@/ui/screen-header';
import { Paper } from '@/ui/paper';
import { ProvisionalTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';
import { BAND_EDGE, seedOf, Wash } from '@/ui/watercolor';

export default function SpeciesListScreen() {
  const { color } = useTheme();
  const [query, setQuery] = useState('');
  const results = useMemo(() => filterSpecies(mockSpecies, query), [query]);
  // Las filas entran escalonadas solo al abrir el catálogo, no en cada búsqueda.
  const firstRender = useRef(true);
  useEffect(() => {
    firstRender.current = false;
  }, []);
  const provenance = mockSpecies[0].provenance;

  return (
    <Paper style={styles.screen}>
      <ScreenHeader title={t.species.title} subtitle={t.species.count(mockSpecies.length)}
        cover={<CatalogCover ink={color.onTopBar} wash={color.lime} />}>
        <View style={[styles.search, { backgroundColor: color.searchField }]}>
          <SearchIcon color={color.onSearchFieldVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.species.searchPlaceholder}
            placeholderTextColor={color.onSearchFieldVariant}
            accessibilityLabel={t.species.searchLabel}
            selectionColor={color.leafInk}
            cursorColor={color.leafInk}
            returnKeyType="search"
            autoCorrect={false}
            style={[type.bodyLarge, styles.searchInput, { color: color.onSearchField }]}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t.species.clearSearch}
              android_ripple={{ color: color.ripple, borderless: true, radius: 24 }}
              style={styles.iconButton}
              hitSlop={4}>
              <CloseIcon color={color.onSearchFieldVariant} />
            </Pressable>
          ) : null}
        </View>
      </ScreenHeader>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingTop: BAND_EDGE, paddingBottom: space.xl }}
        ListHeaderComponent={
          <View style={styles.bannerWrap}>
            <StatusBanner message={t.species.demoBanner} />
          </View>
        }
        renderItem={({ item, index }) => <SpeciesRow species={item} index={index} enter={firstRender.current} />}
        ItemSeparatorComponent={() => (
          <View style={[styles.separator, { backgroundColor: color.outlineVariant }]} />
        )}
        ListEmptyComponent={
          <View style={styles.empty} accessibilityLiveRegion="polite">
            <EmptySheet ink={color.outline} />
            <Text style={[type.titleMedium, { color: color.onSurface }]}>{t.species.emptyTitle(query.trim())}</Text>
            <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.species.emptyHint}</Text>
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              android_ripple={{ color: color.ripple }}
              style={[styles.textButton, { backgroundColor: color.primary }]}>
              <Text style={[type.labelLarge, { color: color.onPrimary }]}>{t.species.clearSearch}</Text>
            </Pressable>
          </View>
        }
        ListFooterComponent={
          results.length ? (
            <Text style={[type.labelSmall, styles.footer, { color: color.onSurfaceVariant }]}>
              {t.species.sourceFooter(provenance.version, formatDate(provenance.accessedAt))}
            </Text>
          ) : undefined
        }
      />
    </Paper>
  );
}

function SpeciesRow({ species, index, enter }: { species: Species; index: number; enter: boolean }) {
  const { color } = useTheme();
  const sheet = sheetNumber(species.id);

  return (
    <Animated.View entering={enter ? FadeInDown.delay(80 + index * 45).duration(320) : undefined}>
      <Pressable
        onPress={() => router.push({ pathname: '/species/[id]', params: { id: species.id } })}
        accessibilityRole="button"
        accessibilityLabel={t.species.rowA11y(species.commonName, species.scientificName)}
        android_ripple={{ color: color.ripple }}
        style={({ pressed }) => [styles.row, pressed && process.env.EXPO_OS === 'ios' && { opacity: 0.7 }]}>
        <View style={styles.thumb}>
          <Svg width={THUMB} height={THUMB} style={StyleSheet.absoluteFill} accessible={false}>
            <Wash seed={seedOf(species.id)} cx={THUMB / 2} cy={THUMB / 2} rx={THUMB / 2 - 8} ry={THUMB / 2 - 10}
              color={speciesWash(species.id)} opacity={0.22} wobble={0.2} grain={6} />
          </Svg>
          <LeafPlate speciesId={species.id} size={60} />
        </View>
        <View style={styles.rowText}>
          <Text style={[type.titleMedium, { color: color.onSurface }]}>{species.commonName}</Text>
          <Text style={[type.scientific, { color: color.onSurfaceVariant }]}>{species.scientificName}</Text>
          <View style={styles.tagRow}>
            <ProvisionalTag />
          </View>
        </View>
        <View style={styles.rowEnd}>
          <Text style={[type.handBold, styles.sheet, { color: color.accent }]}>{t.species.sheet(sheet)}</Text>
          <ChevronIcon color={color.onSurfaceVariant} size={20} />
        </View>
      </Pressable>
    </Animated.View>
  );
}

const coverLeaves = [
  { id: 'eucryphia-cordifolia', rotate: '-18deg', right: 72, top: 4, delay: 0 },
  { id: 'nothofagus-pumilio', rotate: '14deg', right: 16, top: 0, delay: 140 },
  { id: 'podocarpus-nubigenus', rotate: '38deg', right: -28, top: 26, delay: 280 },
];

/** Portada del catálogo: tres láminas que se pintan al abrir, en la tinta de la barra sobre aguada lima. */
function CatalogCover({ ink, wash }: { ink: string; wash: string }) {
  return coverLeaves.map((leaf) => (
    <View key={leaf.id}
      style={[styles.coverLeaf, { right: leaf.right, top: leaf.top, transform: [{ rotate: leaf.rotate }] }]}>
      <LeafPlate speciesId={leaf.id} size={112} ink={ink} wash={wash} draw delay={leaf.delay} />
    </View>
  ));
}

/** Pliego vacío: el contorno punteado de una hoja que no está. */
function EmptySheet({ ink }: { ink: string }) {
  return (
    <Svg width={72} height={88} viewBox="0 0 72 88" accessible={false}>
      <Rect x={1} y={1} width={70} height={86} rx={4} stroke={ink} strokeWidth={1.5} fill="none" />
      <Path d="M36 74 C 18 60, 16 34, 36 14 C 56 34, 54 60, 36 74 Z M36 74 L36 82" stroke={ink} strokeWidth={1.5}
        strokeDasharray={[4, 4]} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

const THUMB = 72;

const styles = StyleSheet.create({
  screen: { flex: 1 },
  search: {
    marginTop: space.md,
    minHeight: 56,
    borderRadius: radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: space.lg,
    paddingRight: space.xs,
    gap: space.md,
  },
  searchInput: { flex: 1, paddingVertical: space.md },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  bannerWrap: { padding: space.lg, paddingBottom: space.sm },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 96,
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    gap: space.lg,
  },
  thumb: { width: THUMB, height: THUMB, alignItems: 'center', justifyContent: 'center' },
  rowText: { flex: 1, gap: 2 },
  tagRow: { marginTop: space.xs },
  rowEnd: { alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between', paddingVertical: 2 },
  sheet: { fontVariant: ['tabular-nums'] },
  coverLeaf: { position: 'absolute', width: 112, height: 112, opacity: 0.8 },
  separator: { height: 1, marginLeft: space.lg + THUMB + space.lg, marginRight: space.lg },
  empty: { padding: space.xl, gap: space.sm, alignItems: 'flex-start' },
  textButton: {
    marginTop: space.md,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: space.lg, paddingTop: space.xl, textAlign: 'center' },
});
