import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  FadeIn,
  FadeOut,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg from 'react-native-svg';

import type { Species } from '@/domain/species';
import { leafAnchor, speciesWash } from '@/features/catalog/leaf-plate';
import { getMockSpecies, sheetNumber } from '@/features/catalog/mock-species';
import { PLATE_DRAW, PlateLens } from '@/features/catalog/plate-lens';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { TapedPhoto } from '@/features/catalog/taped-photo';
import { formatDate, t } from '@/i18n/es-CL';
import { HerbariumLabel } from '@/ui/herbarium-label';
import { BackIcon, InfoIcon, LeafIcon, PhotoIcon } from '@/ui/icons';
import { easePen, whenIdle } from '@/ui/ink';
import { Paper } from '@/ui/paper';
import { ProvisionalTag } from '@/ui/status-tag';
import { radius, space, type, useTheme } from '@/ui/theme';
import { BAND_EDGE, PaintedBand, seedOf, Wash } from '@/ui/watercolor';

const APP_BAR_HEIGHT = 64;

type PlateFace = 'plate' | 'photo';
const SHEET_MARGIN = space.md;

export default function SpeciesDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const species = getMockSpecies(id);
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  const scrollY = useSharedValue(0);
  const [nameBottom, setNameBottom] = useState(0);
  const [barSize, setBarSize] = useState({ width: 0, height: 0 });

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });

  // El nombre pasa a la barra cuando el nombre del pliego queda bajo ella.
  const titleStyle = useAnimatedStyle(() => {
    const visible = nameBottom > 0 && scrollY.get() > nameBottom;
    return { opacity: withTiming(visible ? 1 : 0, { duration: 180 }) };
  });

  return (
    <Paper style={styles.screen}>
      {species ? (
        <Animated.ScrollView onScroll={onScroll} scrollEventThrottle={16}
          contentContainerStyle={{
            padding: SHEET_MARGIN,
            paddingTop: insets.top + APP_BAR_HEIGHT + BAND_EDGE + SHEET_MARGIN,
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
            style={[styles.filledButton, { backgroundColor: color.primary }]}>
            <Text style={[type.labelLarge, { color: color.onPrimary }]}>{t.detail.notFoundAction}</Text>
          </Pressable>
        </View>
      )}

      <View style={[styles.appBar, { paddingTop: insets.top }]}
        onLayout={({ nativeEvent: { layout } }) => setBarSize({ width: layout.width, height: layout.height })}>
        <Svg width={barSize.width} height={barSize.height} style={StyleSheet.absoluteFill} accessible={false}
          pointerEvents="none">
          <PaintedBand seed={seedOf(id ?? 'ficha')} width={barSize.width} height={barSize.height} color={color.topBar}
            glaze={color.topBarGlaze} edge={color.topBarEdge} paper={color.background} />
        </Svg>
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
    </Paper>
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
  const photo = getReferencePhoto(species.id);
  const [face, setFace] = useState<PlateFace>('plate');

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
    <View style={styles.sheet}>
      {/* La lámina y la foto ocupan el mismo cuadrado: cambiar de una a otra no mueve la página. */}
      <View style={styles.plateArea}>
        {face === 'photo' && photo ? (
          <Animated.View key="photo" exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
            <TapedPhoto photo={photo} seed={seedOf(species.id) + 11} accessibilityLabel={t.detail.photoA11y(species.commonName)} />
          </Animated.View>
        ) : (
          // Al volver, la lámina se monta de nuevo y se vuelve a entintar.
          <Animated.View key="plate" entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}
            accessible accessibilityRole="image" accessibilityLabel={t.detail.plateA11y(species.commonName)}>
            <PlateBackdrop speciesId={species.id} />
            <PlateLens speciesId={species.id} ink={color.leafInk} ring={color.accent} ground={color.surface} />
            <LeafLeader speciesId={species.id} ink={color.leafInk} badge={color.accent} onBadge={color.onAccent} />
          </Animated.View>
        )}
      </View>
      <View style={styles.caption}>
        <View style={styles.captionHead}>
          <Text style={[type.handBold, { color: color.accent }]}>{t.detail.plateNumber(sheet)}</Text>
          {photo ? <FaceSwitch value={face} onChange={setFace} /> : null}
        </View>
        {face === 'photo' && photo ? (
          <>
            <Text style={[type.bodyMedium, styles.captionStrong, { color: color.onSurface }]}>{t.detail.photoCaption}</Text>
            <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.detail.photoCredit(photo.author, photo.license)}</Text>
            <Pressable onPress={() => Linking.openURL(photo.sourceUrl)} accessibilityRole="link"
              android_ripple={{ color: color.ripple }} style={styles.sourceLink}>
              <Text style={[type.labelLarge, { color: color.primary }]}>{t.detail.photoSource}</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={[type.bodyMedium, styles.captionStrong, { color: color.onSurface }]}>{t.detail.plateCaption}</Text>
            <Text style={[type.bodyMedium, { color: color.onSurfaceVariant }]}>{t.detail.lensHint}</Text>
          </>
        )}
      </View>


      {/* Entrada de guía de campo: nombre, científico y familia sobre un filete de tinta. */}
      <View style={styles.identity} onLayout={(event) => setIdentityY(event.nativeEvent.layout.y)}>
        <Text style={[type.headlineMedium, { color: color.onSurface }]} accessibilityRole="header"
          onLayout={(event) => onNameLayout(identityY + event.nativeEvent.layout.y + event.nativeEvent.layout.height)}>
          {species.commonName}
        </Text>
        <Text style={[type.scientificLarge, { color: color.onSurface }]}>{species.scientificName}</Text>
        <Text style={[type.labelMedium, styles.smallCaps, { color: color.onSurfaceVariant }]}>{t.detail.family(traits.family)}</Text>
        <View style={[styles.entryRule, { backgroundColor: color.leafInk }]} />
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
        {/* Rasgos como en una guía impresa: rótulo en versalitas y texto, entre filetes finos. */}
        <View style={[styles.marks, { borderColor: color.outlineVariant }]}>
          {notes.map(({ label, value, marker }) => (
            <View key={label} style={[styles.note, { borderColor: color.outlineVariant }]} accessible
              accessibilityLabel={`${label}. ${value}${marker ? ` ${t.detail.leafMarkerHint}` : ''}`}>
              <View style={styles.noteLabel}>
                {marker ? (
                  <View style={[styles.badge, { backgroundColor: color.accent }]}>
                    <Text style={[type.labelMedium, styles.badgeText, { color: color.onAccent }]}>{marker}</Text>
                  </View>
                ) : null}
                <Text style={[type.labelMedium, styles.smallCaps, { color: color.leafInk }]}>{label}</Text>
              </View>
              <Text style={[type.bodyLarge, { color: color.onSurface }]}>{value}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* La etiqueta de procedencia se fija en la esquina inferior derecha, como en un pliego real. */}
      <View style={styles.labelCorner}>
        <HerbariumLabel heading={t.detail.labelHeading} name={species.scientificName} rows={labelRows} />
      </View>
    </View>
  );
}

// La guía sale cuando la lámina está casi entintada.
// El interruptor se ve de 32 dp para no competir con la lámina; el área de toque sigue siendo de 48 dp.
const FACE_HIT_SLOP = { top: 8, bottom: 8 };

/** Lámina o foto: segmentado discreto bajo el cuadrado; la selección se desliza de una a otra. */
function FaceSwitch({ value, onChange }: { value: PlateFace; onChange: (face: PlateFace) => void }) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const options: { key: PlateFace; label: string; Icon: typeof LeafIcon }[] = [
    { key: 'plate', label: t.detail.facePlate, Icon: LeafIcon },
    { key: 'photo', label: t.detail.facePhoto, Icon: PhotoIcon },
  ];

  const thumbStyle = useAnimatedStyle(() => {
    const x = value === 'photo' ? width / 2 : 0;
    return { width: width / 2, transform: [{ translateX: reducedMotion ? x : withTiming(x, { duration: 280 }) }] };
  });

  return (
    <View style={[styles.faceSwitch, { borderColor: color.outlineVariant }]} accessibilityRole="radiogroup"
      accessibilityLabel={t.detail.faceLabel} onLayout={(event) => setWidth(event.nativeEvent.layout.width - 2)}>
      {width > 0 ? <Animated.View style={[styles.faceThumb, { backgroundColor: color.surfaceContainer }, thumbStyle]} /> : null}
      {options.map(({ key, label, Icon }) => {
        const selected = value === key;
        const ink = selected ? color.onSurface : color.onSurfaceVariant;
        return (
          <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="radio" accessibilityState={{ selected }}
            android_ripple={{ color: color.ripple }} hitSlop={FACE_HIT_SLOP} style={styles.faceSegment}>
            <Icon color={ink} size={14} />
            <Text style={[type.labelMedium, { color: ink }, selected && styles.faceSelected]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const LEADER_DELAY = PLATE_DRAW.delay + PLATE_DRAW.duration * 0.85;
const BADGE_RADIUS = 11;
const LEADER_STROKE = 0.75;

/** Mancha grande del color de la especie detrás de la lámina: el fondo pintado de la página. */
function PlateBackdrop({ speciesId }: { speciesId: string }) {
  const [width, setWidth] = useState(0);
  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <Svg width={width} height={width}>
          <Wash seed={seedOf(speciesId) + 5} cx={width * 0.5} cy={width * 0.5} rx={width * 0.4} ry={width * 0.38}
            color={speciesWash(speciesId)} opacity={0.14} wobble={0.18} grain={14} />
        </Svg>
      ) : null}
    </View>
  );
}

type LeafLeaderProps = { speciesId: string; ink: string; badge: string; onBadge: string };

/**
 * Línea guía de tinta desde una hoja de la lámina hasta el número de su nota, en la esquina inferior izquierda.
 * Va en vistas y no en SVG: en Android cada frame de un SVG animado rehace un bitmap del tamaño de la lámina;
 * aquí solo se animan `transform` y `opacity`.
 */
function LeafLeader({ speciesId, ink, badge, onBadge }: LeafLeaderProps) {
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const progress = useSharedValue(reducedMotion ? 1 : 0);

  useEffect(() => {
    if (reducedMotion) return;
    return whenIdle(() => progress.set(withDelay(LEADER_DELAY, withTiming(1, { duration: 550, easing: easePen }))));
  }, [progress, reducedMotion]);

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0, 0.15], [0, 1], Extrapolation.CLAMP),
  }));
  const lineStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(progress.get(), [0, 0.8], [0, 1], Extrapolation.CLAMP) }],
  }));
  const badgeStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.get(), [0.7, 1], [0, 1], Extrapolation.CLAMP),
  }));

  const anchor = leafAnchor(speciesId);
  if (!anchor) return null;

  const ax = (anchor.x / 100) * width;
  const ay = (anchor.y / 100) * width;
  const bx = BADGE_RADIUS + 4;
  const by = width - BADGE_RADIUS - 4;
  // La guía termina en el borde del número, no en su centro.
  const length = Math.hypot(ax - bx, ay - by);
  const reach = Math.max(length - BADGE_RADIUS, 0);
  const angle = Math.atan2(by - ay, bx - ax);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none" accessible={false}
      importantForAccessibility="no-hide-descendants" onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      {width > 0 ? (
        <>
          {/* Contenedor girado desde la hoja; dentro, el trazo crece desde su extremo izquierdo. */}
          <View style={[styles.leader, { left: ax, top: ay - LEADER_STROKE / 2, width: reach,
            transform: [{ rotate: `${angle}rad` }] }]}>
            <Animated.View style={[styles.leaderStroke, { backgroundColor: ink }, lineStyle]} />
          </View>
          <Animated.View style={[styles.leaderDot, { left: ax - 3, top: ay - 3, backgroundColor: badge }, dotStyle]} />
          <Animated.View style={[styles.badge, styles.leaderBadge,
            { left: bx - BADGE_RADIUS, top: by - BADGE_RADIUS, backgroundColor: badge }, badgeStyle]}>
            <Text style={[type.labelMedium, styles.badgeText, { color: onBadge }]}>1</Text>
          </Animated.View>
        </>
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
    minHeight: APP_BAR_HEIGHT + BAND_EDGE,
    paddingBottom: BAND_EDGE,
    paddingHorizontal: space.xs,
    gap: space.xs,
  },
  appBarTitle: { flex: 1, paddingRight: space.lg },
  iconButton: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  // Página del cuaderno: sin caja; la lámina se pinta directo sobre el papel.
  sheet: { paddingHorizontal: space.xs },
  plateArea: { width: '100%', aspectRatio: 1 },
  caption: { paddingTop: space.lg, gap: 2 },
  captionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: space.md, marginBottom: space.md },
  // Segmentos iguales: el pulgar mide la mitad del interruptor.
  faceSwitch: { flexDirection: 'row', minWidth: 168, borderWidth: 1, borderRadius: radius.full, overflow: 'hidden' },
  faceThumb: { position: 'absolute', top: 0, bottom: 0, left: 0, borderRadius: radius.full },
  faceSegment: { flex: 1, minHeight: 32, paddingHorizontal: space.sm, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: space.xs },
  faceSelected: { fontWeight: '800' },
  sourceLink: { minHeight: 48, justifyContent: 'center', alignSelf: 'flex-start' },
  captionStrong: { fontWeight: '600' },
  identity: { paddingTop: space.lg, gap: space.xs },
  // Versalitas de guía impresa: rótulos cortos en mayúsculas espaciadas.
  smallCaps: { textTransform: 'uppercase', letterSpacing: 1.2 },
  entryRule: { height: 1.5, marginTop: space.md },
  statusBlock: { marginTop: space.md, gap: space.sm },
  notes: { paddingTop: space.xxl, gap: space.md },
  draft: { flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' },
  draftText: { flex: 1, marginTop: -2 },
  marks: { borderTopWidth: StyleSheet.hairlineWidth },
  note: { paddingVertical: space.md, gap: space.xs, borderBottomWidth: StyleSheet.hairlineWidth },
  noteLabel: { flexDirection: 'row', alignItems: 'center', gap: space.sm, minHeight: 22 },
  badge: { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  badgeText: { fontWeight: '800', fontVariant: ['tabular-nums'] },
  leader: { position: 'absolute', height: LEADER_STROKE, transformOrigin: 'left center' },
  leaderStroke: { flex: 1, borderRadius: LEADER_STROKE / 2, transformOrigin: 'left center' },
  leaderDot: { position: 'absolute', width: 6, height: 6, borderRadius: 3 },
  leaderBadge: { position: 'absolute' },
  labelCorner: { marginTop: space.xxl, alignSelf: 'flex-end', width: '92%' },
  notFound: { padding: space.xl, gap: space.lg, alignItems: 'flex-start' },
  filledButton: {
    minHeight: 48,
    paddingHorizontal: space.xl,
    borderRadius: radius.full,
    justifyContent: 'center',
    overflow: 'hidden',
  },
});
