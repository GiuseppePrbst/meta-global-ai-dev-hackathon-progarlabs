import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import type { Species } from '@/domain/species';
import { leafAnchor } from '@/features/catalog/leaf-plate';
import { getMockSpecies, sheetNumber } from '@/features/catalog/mock-species';
import { PlateLens } from '@/features/catalog/plate-lens';
import { formatDate, t } from '@/i18n/es-CL';
import { HerbariumLabel } from '@/ui/herbarium-label';
import { BackIcon, InfoIcon } from '@/ui/icons';
import { easeOutExpo, FadeGroup, InkPath } from '@/ui/ink';
import { ProvisionalTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';

const APP_BAR_HEIGHT = 64;
const SHEET_MARGIN = space.md;

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const species = getMockSpecies(id);
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [nameBottom, setNameBottom] = useState(0);

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // El nombre pasa a la barra cuando el nombre del pliego queda bajo ella.
  const titleStyle = useAnimatedStyle(() => {
    const visible = nameBottom > 0 && scrollY.get() > nameBottom;
    return { opacity: withTiming(visible ? 1 : 0, { duration: 180 }) };
  });

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      {species ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{
            padding: SHEET_MARGIN,
            paddingTop: insets.top + APP_BAR_HEIGHT + SHEET_MARGIN,
            paddingBottom: insets.bottom + space.xxl,
          }}>
          <SpeciesSheet species={species} onNameLayout={(bottom) => setNameBottom(bottom + SHEET_MARGIN)} />
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
  /** Borde inferior del nombre común, medido desde el borde superior del pliego. */
  onNameLayout: (bottom: number) => void;
};

/** Pliego de herbario: lámina, notas al margen, identidad y etiqueta de procedencia en una sola hoja. */
function SpeciesSheet({ species, onNameLayout }: SpeciesSheetProps) {
  const { color } = useTheme();
  const [identityY, setIdentityY] = useState(0);
  const sheet = sheetNumber(species.id);
  const { traits, provenance } = species;

  const notes: { label: string; value: string; marker?: string }[] = [
    { label: t.detail.leaf, value: traits.leaf, marker: '1' },
    { label: t.detail.bark, value: traits.bark },
    { label: t.detail.habit, value: traits.habit },
    { label: t.detail.whereToLook, value: traits.whereToLook },
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
    <View style={[styles.sheet, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
      <View accessible accessibilityRole="image" accessibilityLabel={t.detail.plateA11y(species.commonName)}>
        <PlateLens speciesId={species.id} ink={color.leafInk} fill={color.leafFill} ring={color.leafInk}
          ground={color.surface} />
        <LeafLeader speciesId={species.id} ink={color.leafInk} paper={color.surface} />
      </View>
      <View style={styles.caption}>
        <Text style={[type.labelSmall, styles.tabular, { color: color.onSurfaceVariant }]}>
          {t.detail.plateCaption(sheet)}
        </Text>
        <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.detail.lensHint}</Text>
      </View>

      <View style={[styles.rule, { backgroundColor: color.outlineVariant }]} />

      <View style={styles.identity} onLayout={(event) => setIdentityY(event.nativeEvent.layout.y)}>
        <Text style={[type.headlineMedium, { color: color.onSurface }]} accessibilityRole="header"
          onLayout={(event) => onNameLayout(identityY + event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
          {species.commonName}
        </Text>
        <Text style={[type.scientificLarge, { color: color.onSurface }]}>{species.scientificName}</Text>
        <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.detail.family(traits.family)}</Text>
        <View style={styles.statusBlock}>
          <ProvisionalTag />
          <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.status.provisionalNote}</Text>
        </View>
      </View>

      <View style={styles.notes}>
        <Text style={[type.titleLarge, { color: color.onSurface }]} accessibilityRole="header">
          {t.detail.traitsTitle}
        </Text>
        {/* El aviso de borrador va junto a las notas que califica, no en un banner aparte. */}
        <View style={styles.draft}>
          <InfoIcon color={color.onSurfaceVariant} size={16} />
          <Text style={[type.bodyMedium, styles.draftText, { color: color.onSurfaceVariant }]}>{t.detail.traitsDraft}</Text>
        </View>
        {notes.map(({ label, value, marker }) => (
          <View key={label} style={styles.note} accessible
            accessibilityLabel={`${label}. ${value}${marker ? ` ${t.detail.leafMarkerHint}` : ''}`}>
            <View style={styles.noteMarker}>
              {marker ? (
                <View style={[styles.badge, { borderColor: color.leafInk }]}>
                  <Text style={[type.labelMedium, styles.tabular, { color: color.leafInk }]}>{marker}</Text>
                </View>
              ) : (
                <View style={[styles.tick, { backgroundColor: color.outline }]} />
              )}
            </View>
            <View style={styles.noteText}>
              <Text style={[type.labelMedium, styles.noteLabel, { color: color.onSurfaceVariant }]}>{label}</Text>
              <Text style={[type.bodyLarge, { color: color.onSurface }]}>{value}</Text>
            </View>
          </View>
        ))}
      </View>

      {/* La etiqueta de procedencia se fija en la esquina inferior derecha, como en un pliego real. */}
      <View style={styles.labelCorner}>
        <HerbariumLabel heading={t.detail.labelHeading} name={species.scientificName} rows={labelRows} />
      </View>
    </View>
  );
}

const LEADER_DELAY = 900;
const BADGE_RADIUS = 11;

/** Línea guía de tinta desde una hoja de la lámina hasta el número de su nota, en la esquina inferior izquierda. */
function LeafLeader({ speciesId, ink, paper }: { speciesId: string; ink: string; paper: string }) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (!reducedMotion) progress.set(withDelay(LEADER_DELAY, withTiming(1, { duration: 700, easing: easeOutExpo })));
  }, [progress, reducedMotion]);

  const anchor = leafAnchor(speciesId);
  if (!anchor) return null;

  const ax = (anchor.x / 100) * width;
  const ay = (anchor.y / 100) * width;
  const bx = BADGE_RADIUS + 4;
  const by = width - BADGE_RADIUS - 4;
  // La guía termina en el borde del número, no en su centro.
  const length = Math.hypot(ax - bx, ay - by);
  const ex = bx + ((ax - bx) / length) * BADGE_RADIUS;
  const ey = by + ((ay - by) / length) * BADGE_RADIUS;
  const drawn = reducedMotion ? null : progress;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
      importantForAccessibility="no-hide-descendants" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={width}>
          <FadeGroup progress={drawn} from={0} to={0.15}>
            <Circle cx={ax} cy={ay} r={2.5} fill={ink} />
          </FadeGroup>
          <InkPath progress={drawn} from={0} to={0.8} length={Math.ceil(length)}
            d={`M${ax.toFixed(1)},${ay.toFixed(1)} L${ex.toFixed(1)},${ey.toFixed(1)}`}
            stroke={ink} strokeWidth={0.75} fill="none" />
          <FadeGroup progress={drawn} from={0.7} to={1}>
            <Circle cx={bx} cy={by} r={BADGE_RADIUS} stroke={ink} strokeWidth={1.2} fill={paper} />
            <SvgText x={bx} y={by + 4} fontSize={12} fontWeight="500" fill={ink} textAnchor="middle">1</SvgText>
          </FadeGroup>
        </Svg>
      ) : null}
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
  // Papel de pliego: borde de 1 px y esquinas casi rectas, sin sombra.
  sheet: { borderWidth: 1, borderRadius: 3, padding: space.lg, paddingBottom: space.lg },
  caption: { paddingTop: space.sm, gap: 2 },
  tabular: { fontVariant: ['tabular-nums'] },
  rule: { height: StyleSheet.hairlineWidth, marginTop: space.lg },
  identity: { paddingTop: space.lg, gap: space.xs },
  statusBlock: { marginTop: space.md, gap: space.sm },
  notes: { paddingTop: space.xxl, gap: space.md },
  draft: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  draftText: { flex: 1, marginTop: -2 },
  note: { flexDirection: 'row', gap: space.md, paddingTop: space.xs },
  noteMarker: { width: 24, alignItems: 'center', paddingTop: 2 },
  badge: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tick: { width: 10, height: 1, marginTop: 8 },
  noteText: { flex: 1, gap: 2 },
  noteLabel: { textTransform: 'uppercase', letterSpacing: 1 },
  labelCorner: { marginTop: space.xxl, alignSelf: 'flex-end', width: '92%' },
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
