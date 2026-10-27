import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import type { Species } from '@/domain/species';
import { PlateLens } from '@/features/catalog/plate-lens';
import { getMockSpecies, sheetNumber } from '@/features/catalog/mock-species';
import { formatDate, t } from '@/i18n/es-CL';
import { BackIcon } from '@/ui/icons';
import { StatusBanner } from '@/ui/status-banner';
import { ProvisionalTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';

const APP_BAR_HEIGHT = 64;

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const species = getMockSpecies(id);
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [heroHeight, setHeroHeight] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // El nombre pasa a la barra cuando el encabezado de la ficha sale de la vista.
  const titleStyle = useAnimatedStyle(() => {
    const visible = heroHeight > 0 && scrollY.get() > heroHeight - insets.top - APP_BAR_HEIGHT + 24;
    return { opacity: withTiming(visible ? 1 : 0, { duration: 180 }) };
  });

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      {species ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{ paddingBottom: insets.bottom + space.xxl }}>
          <SpeciesSheet species={species} scrollY={scrollY} onHeroLayout={setHeroHeight} />
        </Animated.ScrollView>
      ) : (
        <View style={[styles.notFound, { paddingTop: insets.top + APP_BAR_HEIGHT + space.xl }]} accessibilityLiveRegion="polite">
          <Text style={[type.titleLarge, { color: color.onSurface }]}>{t.detail.notFoundTitle}</Text>
          <Pressable
            onPress={() => router.replace('/species')}
            accessibilityRole="button"
            android_ripple={{ color: color.ripple }}
            style={[styles.outlinedButton, { borderColor: color.outline }]}>
            <Text style={[type.labelLarge, { color: color.leafInk }]}>{t.detail.notFoundAction}</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.appBar, { backgroundColor: color.topBar, paddingTop: insets.top }]}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/species'))}
          accessibilityRole="button"
          accessibilityLabel={t.detail.back}
          android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 24 }}
          style={styles.iconButton}>
          <BackIcon color={color.onTopBar} />
        </Pressable>
        <Animated.Text style={[type.titleMedium, styles.appBarTitle, { color: color.onTopBar }, species && titleStyle]}
          numberOfLines={1}>
          {species?.commonName ?? t.detail.screenTitle}
        </Animated.Text>
      </View>
    </View>
  );
}

type SpeciesSheetProps = {
  species: Species;
  scrollY: SharedValue<number>;
  onHeroLayout: (height: number) => void;
};

function SpeciesSheet({ species, scrollY, onHeroLayout }: SpeciesSheetProps) {
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const sheet = sheetNumber(species.id);
  const { traits, provenance } = species;

  // La lámina se queda atrás un poco al subir: profundidad, no desplazamiento decorativo.
  const plateStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: reducedMotion ? 0 : Math.max(scrollY.get(), 0) * 0.35 }],
  }));

  const traitRows: [string, string][] = [
    [t.detail.leaf, traits.leaf],
    [t.detail.bark, traits.bark],
    [t.detail.habit, traits.habit],
    [t.detail.whereToLook, traits.whereToLook],
  ];

  const labelRows: [string, string][] = [
    [t.detail.source, provenance.sourceName],
    [t.detail.version, provenance.version],
    [t.detail.license, provenance.license],
    [t.detail.accessed, formatDate(provenance.accessedAt)],
    [t.detail.attribution, provenance.attribution],
    [t.detail.validation, `${t.detail.pendingValidation} · ${provenance.validationOwner}`],
  ];

  return (
    <View>
      <View
        style={[styles.hero, { backgroundColor: color.topBar, paddingTop: insets.top + APP_BAR_HEIGHT }]}
        onLayout={(event) => onHeroLayout(event.nativeEvent.layout.height)}>
        <Animated.View
          style={[styles.heroPlate, plateStyle]}
          accessible
          accessibilityRole="image"
          accessibilityLabel={t.detail.plateA11y(species.commonName)}>
          <PlateLens speciesId={species.id} ink={color.onTopBar} fill={color.topBarLeafFill}
            ring={color.onTopBar} ground={color.topBar} />
        </Animated.View>
        <View style={[styles.heroFoot, { backgroundColor: color.topBar }]}>
          <Text style={[type.labelSmall, styles.tabular, { color: color.onTopBarVariant }]}>
            {t.detail.plateCaption(sheet)}
          </Text>
          <Text style={[type.bodyMedium, { color: color.onTopBar }]}>{t.detail.lensHint}</Text>
        </View>
      </View>

      <View style={styles.identity}>
        <Text style={[type.headlineMedium, { color: color.onSurface }]} accessibilityRole="header">
          {species.commonName}
        </Text>
        <Text style={[type.scientificLarge, { color: color.onSurface }]}>{species.scientificName}</Text>
        <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.detail.family(traits.family)}</Text>
        <View style={styles.statusBlock}>
          <ProvisionalTag />
          <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.status.provisionalNote}</Text>
        </View>
      </View>

      <Section title={t.detail.traitsTitle}>
        <StatusBanner message={t.detail.traitsDraft} />
        <View style={styles.traits}>
          {traitRows.map(([label, value], i) => (
            <View
              key={label}
              style={[styles.trait, i > 0 && { borderTopWidth: StyleSheet.hairlineWidth, borderColor: color.outlineVariant }]}>
              <Text style={[type.labelLarge, { color: color.onSurfaceVariant }]}>{label}</Text>
              <Text style={[type.bodyLarge, { color: color.onSurface }]}>{value}</Text>
            </View>
          ))}
        </View>
      </Section>

      <Section title={t.detail.provenanceTitle}>
        {/* Etiqueta de herbario: la procedencia vive junto a la ficha, no en una página legal. */}
        <View style={[styles.label, { backgroundColor: color.surface, borderColor: color.outline }]}>
          <View style={[styles.labelInner, { borderColor: color.outlineVariant }]}>
            <Text style={[type.labelMedium, styles.labelHeading, { color: color.onSurfaceVariant, borderColor: color.outlineVariant }]}>
              {t.detail.labelHeading}
            </Text>
            <Text style={[type.scientificLarge, { color: color.onSurface }]}>{species.scientificName}</Text>
            {labelRows.map(([label, value]) => (
              <View key={label} style={styles.labelRow}>
                <Text style={[type.labelMedium, styles.labelKey, { color: color.onSurfaceVariant }]}>{label}</Text>
                <Text style={[type.bodyMedium, styles.labelValue, { color: color.onSurface }]}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
      </Section>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <View style={styles.section}>
      <Text style={[type.titleLarge, { color: color.onSurface }]} accessibilityRole="header">
        {title}
      </Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  appBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: APP_BAR_HEIGHT,
    paddingHorizontal: space.xs,
    gap: space.xs,
  },
  appBarTitle: { flex: 1, paddingRight: space.lg },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  hero: { overflow: 'hidden', borderBottomLeftRadius: radius.lg * 2, borderBottomRightRadius: radius.lg * 2 },
  heroPlate: { width: '82%', maxWidth: 340, alignSelf: 'center', paddingVertical: space.sm },
  heroFoot: { paddingHorizontal: space.xl, paddingTop: space.sm, paddingBottom: space.xl, gap: space.xs },
  tabular: { fontVariant: ['tabular-nums'] },
  identity: { paddingHorizontal: space.lg, paddingTop: space.xl, gap: space.xs },
  statusBlock: { marginTop: space.md, gap: space.sm },
  section: { paddingHorizontal: space.lg, paddingTop: space.xxl, gap: space.md },
  traits: { marginTop: space.xs },
  trait: { paddingVertical: space.md, gap: 2 },
  label: { borderWidth: 1, borderRadius: 2, padding: 3 },
  labelInner: { borderWidth: StyleSheet.hairlineWidth, padding: space.lg, gap: space.sm },
  labelHeading: {
    textTransform: 'uppercase',
    letterSpacing: 1,
    paddingBottom: space.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  labelRow: { flexDirection: 'row', gap: space.md },
  labelKey: { width: 92, paddingTop: 2 },
  labelValue: { flex: 1 },
  notFound: { padding: space.xl, gap: space.lg, alignItems: 'flex-start' },
  outlinedButton: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    borderWidth: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
