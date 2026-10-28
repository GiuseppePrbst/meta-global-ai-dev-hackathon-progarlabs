import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Rect } from 'react-native-svg';

import type { Species } from '@/domain/species';
import { LeafPlate } from '@/features/catalog/leaf-plate';
import { filterSpecies, mockSpecies, sheetNumber } from '@/features/catalog/mock-species';
import { formatDate, t } from '@/i18n/es-CL';
import { ChevronIcon, CloseIcon, SearchIcon } from '@/ui/icons';
import { StatusBanner } from '@/ui/status-banner';
import { ScreenHeader } from '@/ui/screen-header';
import { ProvisionalTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';

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
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <ScreenHeader title={t.species.title} subtitle={t.species.count(mockSpecies.length)}
        cover={<CatalogCover ink={color.onTopBar} fill={color.topBarLeafFill} />}>
        <View style={[styles.search, { backgroundColor: color.searchField }]}>
          <SearchIcon color={color.onSurfaceVariant} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t.species.searchPlaceholder}
            placeholderTextColor={color.onSurfaceVariant}
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
              <CloseIcon color={color.onSurfaceVariant} />
            </Pressable>
          ) : null}
        </View>
      </ScreenHeader>

      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: space.xl }}
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
              style={[styles.textButton, { borderColor: color.outline }]}>
              <Text style={[type.labelLarge, { color: color.leafInk }]}>{t.species.clearSearch}</Text>
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
    </View>
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
        <View style={[styles.thumb, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
          <LeafPlate speciesId={species.id} size={56} />
        </View>
        <View style={styles.rowText}>
          <Text style={[type.titleMedium, { color: color.onSurface }]}>{species.commonName}</Text>
          <Text style={[type.scientific, { color: color.onSurfaceVariant }]}>{species.scientificName}</Text>
          <View style={styles.tagRow}>
            <ProvisionalTag />
          </View>
        </View>
        <View style={styles.rowEnd}>
          <Text style={[type.labelSmall, styles.sheet, { color: color.onSurfaceVariant }]}>{t.species.sheet(sheet)}</Text>
          <ChevronIcon color={color.outline} size={20} />
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

/** Portada del catálogo: tres láminas que se entintan al abrir, en la tinta de la barra. */
function CatalogCover({ ink, fill }: { ink: string; fill: string }) {
  return coverLeaves.map((leaf) => (
    <View key={leaf.id}
      style={[styles.coverLeaf, { right: leaf.right, top: leaf.top, transform: [{ rotate: leaf.rotate }] }]}>
      <LeafPlate speciesId={leaf.id} size={112} ink={ink} fill={fill} draw delay={leaf.delay} />
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
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1, gap: 2 },
  tagRow: { marginTop: space.xs },
  rowEnd: { alignItems: 'flex-end', alignSelf: 'stretch', justifyContent: 'space-between', paddingVertical: 2 },
  sheet: { fontVariant: ['tabular-nums'] },
  coverLeaf: { position: 'absolute', width: 112, height: 112, opacity: 0.55 },
  separator: { height: StyleSheet.hairlineWidth, marginLeft: space.lg + 64 + space.lg },
  empty: { padding: space.xl, gap: space.sm, alignItems: 'flex-start' },
  textButton: {
    marginTop: space.md,
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  footer: { paddingHorizontal: space.lg, paddingTop: space.xl, textAlign: 'center' },
});
