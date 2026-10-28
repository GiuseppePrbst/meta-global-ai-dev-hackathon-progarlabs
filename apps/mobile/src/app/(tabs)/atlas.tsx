import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  FadeIn,
  FadeOut,
  Keyframe,
  useAnimatedStyle,
  useReducedMotion,
  withTiming,
} from 'react-native-reanimated';
import Svg from 'react-native-svg';

import type { Observation } from '@/domain/observation';
import { ContourCover, EmptyAtlasSheet, SurveyHill } from '@/features/atlas/contour-art';
import { mockObservations } from '@/features/atlas/mock-observations';
import { LeafPlate, speciesWash } from '@/features/catalog/leaf-plate';
import { getMockSpecies } from '@/features/catalog/mock-species';
import { formatDate, t } from '@/i18n/es-CL';
import AtlasMap, { type AtlasMapHandle, type AtlasMapPoint, type AtlasMapStatus } from '@/map/atlas-map';
import { HerbariumLabel } from '@/ui/herbarium-label';
import { AtlasIcon, ChevronIcon, CloseIcon, FrameIcon, ListIcon, MinusIcon, PlusIcon } from '@/ui/icons';
import { Paper } from '@/ui/paper';
import { ScreenHeader } from '@/ui/screen-header';
import { easeOutExpo } from '@/ui/ink';
import { StatusBanner } from '@/ui/status-banner';
import { SyntheticTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';
import { BAND_EDGE, seedOf, Wash } from '@/ui/watercolor';

type AtlasView = 'map' | 'list';

// La papeleta se deja sobre el mapa: sube girada y se asienta; al cerrarla se retira rápido.
const slipIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 40 }, { rotate: '-4deg' }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }], easing: easeOutExpo },
}).duration(420);
const slipOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: 20 }] },
}).duration(160);
const CARD_THUMB = 64;
// Renglón de la papeleta y distancia de la línea por sobre el pie del renglón (bajo la línea base).
const RULE = 24;
const RULE_DROP = 3;

const OSM_COPYRIGHT = 'https://www.openstreetmap.org/copyright';
// Fecha de consulta del registro de OpenStreetMap en docs/DATASET_LICENSES.md.
const BASEMAP_ACCESSED = '2026-10-27';

// Observaciones sintéticas hasta conectar GET /observations. Fuera del componente: el DOM component
// recibe la misma referencia en cada render y no vuelve a cargar los puntos.
const observations = mockObservations;
const mapPoints: AtlasMapPoint[] = observations.flatMap(({ id, location }) => (location ? [{ id, ...location }] : []));

export default function AtlasScreen() {
  const { color, scheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const [view, setView] = useState<AtlasView>('map');
  const [status, setStatus] = useState<'loading' | AtlasMapStatus>('loading');
  const [tileError, setTileError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const map = useRef<AtlasMapHandle>(null);
  // El DOM component necesita `window`: en web con render de servidor se monta solo en el cliente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const onStatus = useCallback((next: AtlasMapStatus) => {
    if (next === 'tile-error') setTileError(true);
    else setStatus(next);
  }, []);

  const showingList = view === 'list';
  const selected = observations.find((observation) => observation.id === selectedId);

  // Desde la lista: vuelve al mapa con la observación elegida; el mapa la trae a la vista.
  const showOnMap = useCallback((observation: Observation) => {
    setSelectedId(observation.id);
    setView('map');
  }, []);

  return (
    <View style={[styles.screen, { backgroundColor: color.background }]}>
      <ScreenHeader title={t.atlas.title} subtitle={t.atlas.subtitle}
        cover={<ContourCover ink={color.onTopBar} wash={color.lime} />}>
        <ViewSwitch value={view} onChange={setView} />
      </ScreenHeader>

      <View style={styles.body}>
        {/* El mapa sigue montado bajo la lista: volver a él no recarga teselas ni pierde el encuadre. */}
        <View style={StyleSheet.absoluteFill} accessibilityElementsHidden={showingList}
          importantForAccessibility={showingList ? 'no-hide-descendants' : 'auto'}>
          {mounted && status !== 'failed' ? (
            <AtlasMap
              ref={map}
              scheme={scheme}
              colors={{ background: color.background, ink: color.leafInk, surface: color.surface, outline: color.outline, leaf: color.leafInk, tint: color.topBarGlaze }}
              reducedMotion={reducedMotion}
              points={mapPoints}
              selectedId={selectedId}
              onStatus={onStatus}
              onSelect={setSelectedId}
              dom={{
                style: { flex: 1, backgroundColor: color.background },
                accessibilityLabel: t.atlas.mapA11y,
              }}
            />
          ) : null}

          {status === 'ready' ? (
            <>
              <Animated.View entering={FadeIn.delay(600).duration(320)} style={styles.topOverlay} pointerEvents="box-none">
                <View style={[styles.chip, { backgroundColor: color.surface, borderColor: color.outlineVariant, shadowColor: color.scrim }]}
                  accessible accessibilityLabel={t.atlas.syntheticCountA11y(mapPoints.length)}>
                  <View style={[styles.chipMark, { borderColor: color.accent }]} />
                  <Text style={[type.labelLarge, { color: color.onSurface }]}>{t.atlas.syntheticCount(mapPoints.length)}</Text>
                </View>
                {tileError ? (
                  <View accessibilityLiveRegion="polite">
                    <StatusBanner message={t.atlas.tileError} />
                  </View>
                ) : null}
              </Animated.View>
              <Animated.View entering={FadeIn.delay(700).duration(320)} style={styles.controls}>
                <View style={[styles.controlGroup, { backgroundColor: color.surface, borderColor: color.outlineVariant, shadowColor: color.scrim }]}>
                  <MapButton label={t.atlas.zoomIn} onPress={() => map.current?.zoomIn()}>
                    <PlusIcon color={color.onSurface} />
                  </MapButton>
                  <View style={[styles.controlDivider, { backgroundColor: color.outlineVariant }]} />
                  <MapButton label={t.atlas.zoomOut} onPress={() => map.current?.zoomOut()}>
                    <MinusIcon color={color.onSurface} />
                  </MapButton>
                </View>
                <View style={[styles.controlGroup, { backgroundColor: color.surface, borderColor: color.outlineVariant, shadowColor: color.scrim }]}>
                  <MapButton label={t.atlas.recenter} onPress={() => map.current?.recenter()}>
                    <FrameIcon color={color.primary} />
                  </MapButton>
                </View>
              </Animated.View>
              <Pressable
                onPress={() => Linking.openURL(OSM_COPYRIGHT)}
                accessibilityRole="link"
                accessibilityLabel={t.atlas.attributionA11y}
                hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }}
                style={[styles.attribution, { backgroundColor: color.surface, borderColor: color.outlineVariant }]}>
                <Text style={[type.labelSmall, { color: color.onSurfaceVariant }]}>{t.atlas.attribution}</Text>
              </Pressable>
              {selected ? (
                <Animated.View key={selected.id} entering={reducedMotion ? FadeIn.duration(160) : slipIn}
                  exiting={reducedMotion ? FadeOut.duration(120) : slipOut}
                  style={styles.cardSlot} accessibilityLiveRegion="polite">
                  <ObservationCard observation={selected} onClose={() => setSelectedId(null)} />
                </Animated.View>
              ) : null}
            </>
          ) : null}

          {status === 'loading' ? (
            <Animated.View exiting={FadeOut.duration(520)} style={[styles.curtain, { backgroundColor: color.background }]}
              accessibilityLiveRegion="polite">
              <SurveyHill ink={color.leafInk} wash={color.lime} />
              <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.atlas.loading}</Text>
            </Animated.View>
          ) : null}

          {status === 'failed' ? (
            <View style={[styles.curtain, { backgroundColor: color.background }]} accessibilityLiveRegion="assertive">
              <EmptyAtlasSheet ink={color.outline} />
              <Text style={[type.titleMedium, styles.centered, { color: color.onSurface }]}>{t.atlas.failedTitle}</Text>
              <Text style={[type.bodyMedium, styles.centered, { color: color.onSurfaceVariant }]}>{t.atlas.failedBody}</Text>
            </View>
          ) : null}
        </View>

        {showingList ? (
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}
            style={StyleSheet.absoluteFill}>
            <Paper style={StyleSheet.absoluteFill}>
              <AtlasList onShowOnMap={showOnMap} />
            </Paper>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

/** Lista textual equivalente al mapa: lo mismo que el mapa muestra, más su procedencia. */
function AtlasList({ onShowOnMap }: { onShowOnMap: (observation: Observation) => void }) {
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
        <Text style={[type.titleLarge, { color: color.onSurface }]} accessibilityRole="header">
          {t.atlas.listHeading}
        </Text>
        {observations.length > 0 ? (
          <View style={[styles.rows, { borderColor: color.outlineVariant }]}>
            {observations.map((observation) => (
              <ObservationRow key={observation.id} observation={observation} onPress={onShowOnMap} />
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <EmptyAtlasSheet ink={color.outline} />
            <View style={styles.emptyText}>
              <Text style={[type.titleMedium, { color: color.onSurface }]}>{t.atlas.emptyTitle}</Text>
              <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.atlas.emptyBody}</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.section}>
        <Text style={[type.titleLarge, { color: color.onSurface }]} accessibilityRole="header">
          {t.atlas.aboutTitle}
        </Text>
        <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.atlas.disclaimer}</Text>
        <HerbariumLabel heading={t.atlas.labelHeading} name={t.atlas.labelName} italic={false} rows={labelRows} />
      </View>
    </ScrollView>
  );
}

/** Nombre visible de la especie de una observación; puede no tener especie elegida. */
function speciesNames(observation: Observation) {
  const species = observation.speciesId ? getMockSpecies(observation.speciesId) : undefined;
  return { common: species?.commonName ?? t.atlas.noSpecies, scientific: species?.scientificName };
}

/** Marca de «sin verificar»: círculo abierto, igual que el punto del mapa. */
function UnverifiedMark() {
  const { color } = useTheme();
  return <View style={[styles.chipMark, { borderColor: color.accent }]} />;
}

function ObservationRow({ observation, onPress }: { observation: Observation; onPress: (observation: Observation) => void }) {
  const { color } = useTheme();
  const { common, scientific } = speciesNames(observation);
  const located = observation.location !== null;
  const meta = `${t.atlas.syntheticTag} · ${formatDate(observation.createdAt)}`;

  const content = (
    <>
      <UnverifiedMark />
      <View style={styles.rowText}>
        <Text style={[type.titleMedium, { color: color.onSurface }]}>{common}</Text>
        {scientific ? <Text style={[type.scientific, { color: color.onSurfaceVariant }]}>{scientific}</Text> : null}
        <Text style={[type.labelMedium, { color: color.onSurfaceVariant }]}>
          {located ? meta : `${meta} · ${t.atlas.noLocation}`}
        </Text>
      </View>
      {located ? <ChevronIcon color={color.onSurfaceVariant} /> : null}
    </>
  );

  // Sin ubicación no hay nada que mostrar en el mapa: la fila no es un botón.
  if (!located) {
    return (
      <View style={[styles.row, { borderColor: color.outlineVariant }]} accessible
        accessibilityLabel={t.atlas.rowA11y(common, observation.createdAt, false)}>
        {content}
      </View>
    );
  }
  return (
    <Pressable onPress={() => onPress(observation)} accessibilityRole="button"
      accessibilityLabel={t.atlas.rowA11y(common, observation.createdAt, true)}
      android_ripple={{ color: color.ripple }} style={[styles.row, { borderColor: color.outlineVariant }]}>
      {content}
    </Pressable>
  );
}

/** Papeleta de la observación tocada en el mapa: una hoja de libreta de campo dejada sobre la carta. */
function ObservationCard({ observation, onClose }: { observation: Observation; onClose: () => void }) {
  const { color } = useTheme();
  const { common, scientific } = speciesNames(observation);
  const speciesId = observation.speciesId;

  return (
    <View style={styles.slip}>
      <Paper style={[styles.card, { backgroundColor: color.surface, borderColor: color.outlineVariant, shadowColor: color.scrim }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardThumb}>
            <Svg width={CARD_THUMB} height={CARD_THUMB} style={StyleSheet.absoluteFill} accessible={false}>
              <Wash seed={seedOf(observation.id)} cx={CARD_THUMB / 2} cy={CARD_THUMB / 2} rx={CARD_THUMB / 2 - 4}
                ry={CARD_THUMB / 2 - 6} color={speciesId ? speciesWash(speciesId) : color.accent}
                opacity={speciesId ? 0.24 : 0.16} wobble={0.22} grain={5} />
            </Svg>
            {/* La lámina se entinta al abrir la papeleta; sin especie elegida queda el círculo abierto. */}
            {speciesId ? <LeafPlate speciesId={speciesId} size={52} draw delay={120} /> : <UnverifiedMark />}
          </View>
          <View style={styles.rowText}>
            <Text style={[type.titleMedium, { color: color.onSurface }]}>{common}</Text>
            {scientific ? <Text style={[type.scientific, { color: color.onSurfaceVariant }]}>{scientific}</Text> : null}
          </View>
          <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel={t.atlas.closeCard}
            android_ripple={{ color: color.ripple, borderless: true, radius: 24 }} style={styles.cardClose}>
            <CloseIcon color={color.onSurfaceVariant} />
          </Pressable>
        </View>
        {/* Línea de cabecera de la libreta: separa el encabezado de los renglones. */}
        <View style={[styles.cardHeadRule, { backgroundColor: color.accent }]} />
        <Ruled>
          <View style={styles.cardMeta}>
            <View style={styles.onRuleBox}>
              <SyntheticTag />
            </View>
            <Text style={[type.handBold, styles.onRule, { color: color.onSurfaceVariant }]}>{formatDate(observation.createdAt)}</Text>
          </View>
          <Text style={[type.bodyMedium, styles.onRule, { color: color.onSurface }]}>{observation.notes}</Text>
          {speciesId ? (
            <Pressable onPress={() => router.push({ pathname: '/species/[id]', params: { id: speciesId } })}
              accessibilityRole="link" android_ripple={{ color: color.ripple }} style={styles.cardAction}>
              <Text style={[type.labelLarge, styles.onRule, { color: color.primary }]}>{t.atlas.openSpecies}</Text>
              <ChevronIcon color={color.primary} />
            </Pressable>
          ) : null}
        </Ruled>
      </Paper>
      {/* Cinta que la sujeta al mapa. */}
      <View style={[styles.slipTape, { backgroundColor: color.lime }]} />
    </View>
  );
}

/** Renglones de la libreta: una línea fina bajo cada renglón de `RULE` dp; el texto de dentro escribe sobre ellas. */
function Ruled({ children }: { children: React.ReactNode }) {
  const { color } = useTheme();
  const [height, setHeight] = useState(0);
  return (
    <View onLayout={(event) => setHeight(event.nativeEvent.layout.height)}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}>
        {Array.from({ length: Math.floor(height / RULE) }, (_, i) => (
          <View key={i} style={[styles.rule, { top: (i + 1) * RULE - RULE_DROP, backgroundColor: color.outlineVariant }]} />
        ))}
      </View>
      {children}
    </View>
  );
}

/** Botones segmentados Mapa / Lista; la selección se desliza entre ambos. */
function ViewSwitch({ value, onChange }: { value: AtlasView; onChange: (view: AtlasView) => void }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const options: { key: AtlasView; label: string; Icon: typeof ListIcon }[] = [
    { key: 'map', label: t.atlas.viewMap, Icon: AtlasIcon },
    { key: 'list', label: t.atlas.viewList, Icon: ListIcon },
  ];

  const thumbStyle = useAnimatedStyle(() => {
    const x = value === 'list' ? width / 2 : 0;
    return { width: width / 2, transform: [{ translateX: reducedMotion ? x : withTiming(x, { duration: 280 }) }] };
  });

  return (
    <View style={[styles.switch, { borderColor: color.onTopBarVariant }]} accessibilityRole="radiogroup"
      accessibilityLabel={t.atlas.viewLabel} onLayout={(event) => setWidth(event.nativeEvent.layout.width - 2)}>
      {width > 0 ? <Animated.View style={[styles.thumb, { backgroundColor: color.segmentSelected }, thumbStyle]} /> : null}
      {options.map(({ key, label, Icon }) => {
        const selected = value === key;
        const ink = selected ? color.onSegmentSelected : color.onTopBar;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="radio" accessibilityState={{ selected }}
            android_ripple={{ color: 'rgba(255,255,255,0.16)' }} style={styles.segment}>
            <Icon color={ink} size={18} />
            <Text style={[type.labelLarge, { color: ink }, selected && styles.segmentSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function MapButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  const { color } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={label}
      android_ripple={{ color: color.ripple }} style={styles.mapButton}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  switch: {
    marginTop: space.md,
    flexDirection: 'row',
    borderWidth: 1.5,
    borderRadius: radius.full,
    overflow: 'hidden',
  },
  thumb: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.full },
  segment: {
    flex: 1,
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.sm,
  },
  segmentSelected: { fontWeight: '800' },
  topOverlay: { position: 'absolute', top: BAND_EDGE + space.md, left: space.md, right: 76, gap: space.sm, alignItems: 'flex-start' },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 36,
    paddingHorizontal: space.md,
    borderRadius: radius.full,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  // Círculo abierto: observación sin verificar, igual que el punto del mapa.
  chipMark: { width: 12, height: 12, borderRadius: 6, borderWidth: 2.5 },
  controls: { position: 'absolute', right: space.md, bottom: 56, gap: space.md },
  controlGroup: {
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
    elevation: 2,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 3,
  },
  controlDivider: { height: StyleSheet.hairlineWidth },
  mapButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  attribution: {
    position: 'absolute',
    right: space.md,
    bottom: space.md,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: StyleSheet.hairlineWidth,
  },
  curtain: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space.md,
    padding: space.xl,
  },
  centered: { textAlign: 'center' },
  list: { padding: space.lg, paddingTop: BAND_EDGE + space.lg, paddingBottom: space.xxl, gap: space.sm },
  section: { paddingTop: space.xl, gap: space.md },
  empty: { flexDirection: 'row', gap: space.lg, alignItems: 'flex-start' },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    minHeight: 72,
    paddingVertical: space.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowText: { flex: 1, gap: 2 },
  // Sobre la escala (abajo a la izquierda) y a la izquierda de los controles del mapa.
  cardSlot: { position: 'absolute', left: space.md, right: 76, bottom: 44 },
  // Papeleta: hoja de libreta con filo fino y esquinas casi rectas; la sombra es la de lo que flota sobre el mapa.
  slip: { paddingTop: 9 },
  card: {
    paddingHorizontal: space.lg,
    paddingTop: space.md,
    paddingBottom: space.sm,
    borderRadius: 2,
    borderWidth: StyleSheet.hairlineWidth,
    elevation: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  slipTape: { position: 'absolute', top: 0, left: 28, width: 64, height: 18, opacity: 0.85, borderRadius: 1, transform: [{ rotate: '-5deg' }] },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: space.md, paddingBottom: space.sm },
  cardThumb: { width: CARD_THUMB, height: CARD_THUMB, alignItems: 'center', justifyContent: 'center', marginLeft: -space.xs },
  cardClose: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', marginRight: -space.md, marginTop: -space.xs },
  cardHeadRule: { height: 1, marginHorizontal: -space.lg, opacity: 0.45 },
  rule: { position: 'absolute', left: -space.lg, right: -space.lg, height: StyleSheet.hairlineWidth },
  // Todo lo que va sobre los renglones ocupa renglones enteros, para que el texto calce con las líneas.
  onRule: { lineHeight: RULE },
  onRuleBox: { height: RULE, justifyContent: 'center' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', columnGap: space.md, flexWrap: 'wrap' },
  // Un renglón en blanco antes de la acción; el área de toque sigue siendo de 48 dp.
  cardAction: { flexDirection: 'row', alignItems: 'center', gap: space.xs, minHeight: 2 * RULE, paddingTop: RULE, alignSelf: 'flex-start' },
  emptyText: { flex: 1, gap: space.xs },
});
