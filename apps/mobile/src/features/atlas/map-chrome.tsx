import {
  type ImageSourcePropType, type LayoutChangeEvent, Pressable, ScrollView, StyleSheet, View,
} from 'react-native';
import { useEffect } from 'react';
import Animated, {
  Easing, FadeIn, FadeOut, type SharedValue, useAnimatedStyle, useReducedMotion, useSharedValue, withDelay, withRepeat, withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { Basemap } from '@/features/atlas/basemap';
import type { TrailStop, TrailStopKind } from '@/features/atlas/demo-trail';
import { t } from '@/i18n/es-CL';
import type { AtlasMapLayers } from '@/map/atlas-map';
import {
  BackIcon, BinocularsIcon, Button, CameraIcon, ChevronIcon, ChevronLeftIcon, CloseIcon, CoverImage, EmptyState, FilterChip, FlagIcon, IconButton,
  type IconComponent, InfoIcon, LayersIcon, LeafIcon, MapIcon, PinIcon, radius, space, StatusBanner, Tag,
  Text, TextButton, TrailIcon, useTheme,
} from '@/ui';

// Piezas que flotan sobre el mapa oscuro, o lo tapan mientras no puede mostrarse.

/** Ícono de cada tipo de parada; el mapa HTML usa los mismos trazos. */
export const stopIcons: Record<TrailStopKind, IconComponent> = { start: FlagIcon, viewpoint: BinocularsIcon, photo: CameraIcon, end: FlagIcon };

const layerChips:{ key: keyof AtlasMapLayers; icon: IconComponent; label: string }[] = [
  { key: 'species', label: t.map.layerSpecies, icon: LeafIcon },
  { key: 'trail', label: t.map.layerTrail, icon: TrailIcon },
  { key: 'stops', label: t.map.layerStops, icon: PinIcon },
];

type MapHeaderProps = {
  title: string;
  /** Sube una etapa (sendero → senderos → parque → parques); sin él no hay botón. */
  onBack?: () => void;
  backA11y?: string;
  /** Los chips de capas solo tienen sentido con un sendero en el mapa. */
  showLayers: boolean;
  layers: AtlasMapLayers;
  onToggle: (layer: keyof AtlasMapLayers) => void;
  basemap: Basemap;
  onToggleBasemap: () => void;
  onOpenInfo: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

/** Título, acciones y chips de capas sobre un velo que oscurece el borde superior del mapa. */
export function MapHeader({
  title, onBack, backA11y, showLayers, layers, onToggle, basemap, onToggleBasemap, onOpenInfo, onLayout,
}: MapHeaderProps) {
  const satellite = basemap === 'satellite';
  const { color } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.header} pointerEvents="box-none" onLayout={onLayout}>
      <Svg style={StyleSheet.absoluteFill} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.dark} stopOpacity={0.92} />
            <Stop offset="0.6" stopColor={color.dark} stopOpacity={0.55} />
            <Stop offset="1" stopColor={color.dark} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill="url(#veil)" />
      </Svg>
      <View style={[styles.titleRow, { paddingTop: insets.top + space.sm }]} pointerEvents="box-none">
        {onBack ? (
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.back}>
            <IconButton label={backA11y ?? t.parks.back} onPress={onBack} look="plain">
              <ChevronLeftIcon color={color.onDark} size={24} />
            </IconButton>
          </Animated.View>
        ) : null}
        {/* El título cambia con la etapa: entra con un fundido corto. */}
        <Animated.View key={title} entering={FadeIn.duration(260)} style={styles.title}>
          <Text variant="headline" tone="onDark" accessibilityRole="header" numberOfLines={1}>{title}</Text>
        </Animated.View>
        {/* Alterna el mapa base: satelital u OpenStreetMap. */}
        <IconButton label={t.map.basemapA11y(satellite)} onPress={onToggleBasemap} look="plain">
          <LayersIcon color={color.onDark} size={22} />
        </IconButton>
        <IconButton label={t.map.openInfo} onPress={onOpenInfo} look="plain">
          <InfoIcon color={color.onDark} size={22} />
        </IconButton>
      </View>
      {showLayers ? (
        <Animated.View entering={FadeIn.duration(260)} exiting={FadeOut.duration(140)}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
            accessibilityLabel={t.map.layersLabel}>
            {layerChips.map(({ key, label, icon }) => (
              <FilterChip key={key} label={label} icon={icon} on="dark" selected={layers[key]} onPress={() => onToggle(key)}
                accessibilityLabel={t.map.layerA11y(label, layers[key])} />
            ))}
          </ScrollView>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Contenedor oscuro de las tarjetas inferiores del mapa. */
type MapCardProps = {
  children: React.ReactNode;
  onLayout?: (event: LayoutChangeEvent) => void;
  /** Acepta estilos animados: la tarjeta del parque anima su alto máximo. */
  style?: React.ComponentProps<typeof Animated.View>['style'];
};

export function MapCard({ children, onLayout, style }: MapCardProps) {
  const { color } = useTheme();
  return (
    <Animated.View onLayout={onLayout}
      style={[styles.card, { backgroundColor: color.darkSurface, borderColor: color.darkOutline, shadowColor: '#000' }, style]}>
      {children}
    </Animated.View>
  );
}

export function ArrowBubble() {
  const { color } = useTheme();
  return (
    <View style={[styles.arrow, { backgroundColor: color.onLime }]}>
      <ChevronIcon color={color.lime} size={18} />
    </View>
  );
}

type TrailCardProps = {
  name: string;
  photo: ImageSourcePropType;
  photoA11y: string;
  meta: string;
  metaA11y: string;
  onStart: () => void;
  onOtherTrails: () => void;
  onDetails: () => void;
};

/** Tarjeta del sendero, con su trazado de demostración en el mapa: foto con margen y esquinas redondeadas a la izquierda (con la flecha a «otros senderos» en su esquina), datos e inicio a la derecha. */
export function TrailCard({ name, photo, photoA11y, meta, metaA11y, onStart, onOtherTrails, onDetails }: TrailCardProps) {
  const { color } = useTheme();
  return (
    <MapCard style={styles.trailCard}>
      {/* La foto va en un marco absoluto para no aportar su alto intrínseco: el alto lo fija la columna derecha. */}
      <View style={styles.trailPhotoFrame}>
        <CoverImage source={photo} accessible accessibilityRole="image" accessibilityLabel={photoA11y} />
      </View>
      <IconButton label={t.trail.otherTrails} onPress={onOtherTrails} look="dark" hitSlop={4} style={styles.otherTrails}>
        <BackIcon color={color.onDark} size={22} />
      </IconButton>
      <View style={styles.trailBody}>
        <View style={styles.cardText}>
          <Text variant="titleMedium" tone="onDark" numberOfLines={2}>{name}</Text>
          {/* Sin etiqueta de demostración: la nota de abajo ya dice que el trazado es sintético. */}
          <Text variant="titleSmall" tone="lime" accessibilityLabel={metaA11y}>{meta}</Text>
          <Text variant="labelSmall" tone="onDarkVariant" style={styles.note}>{t.trail.syntheticNote}</Text>
          <TextButton label={t.trail.details} onPress={onDetails} tone="onDark" />
        </View>
        <Button label={t.trail.start} accessibilityLabel={t.trail.startA11y} onPress={onStart} size="compact" />
      </View>
    </MapCard>
  );
}

type TrailOptionProps = {
  name: string;
  photo: ImageSourcePropType;
  meta: string;
  metaA11y: string;
  /** Línea secundaria: cierre publicado o tipo de fuente. */
  note?: string;
  onPress: () => void;
};

/** Fila de «Otros senderos»: miniatura, nombre y datos; tocarla cambia el sendero del mapa. */
export function TrailOption({ name, photo, meta, metaA11y, note, onPress }: TrailOptionProps) {
  const { color } = useTheme();
  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={[name, metaA11y, note].filter(Boolean).join('. ')}
      accessibilityHint={t.trail.chooseA11y} android_ripple={{ color: color.onDarkRipple }}
      style={({ pressed }) => [styles.trailOption, { backgroundColor: color.darkSurfaceHigh, opacity: pressed ? 0.85 : 1 }]}>
      <View style={styles.trailOptionPhoto}>
        <CoverImage source={photo} />
      </View>
      <View style={styles.cardText}>
        <Text variant="titleSmall" tone="onDark" numberOfLines={1}>{name}</Text>
        <Text variant="titleSmall" tone="lime" numberOfLines={1}>{meta}</Text>
        {note ? <Text variant="labelSmall" tone="onDarkVariant" numberOfLines={2}>{note}</Text> : null}
      </View>
      <ChevronIcon color={color.onDarkVariant} size={20} />
    </Pressable>
  );
}

type WalkCardProps = {
  stop: TrailStop;
  index: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  onExit: () => void;
};

/** Recorrido de demostración por paradas: la cámara va de una a otra, sin usar la ubicación. */
export function WalkCard({ stop, index, total, onPrevious, onNext, onComplete, onExit }: WalkCardProps) {
  const { color } = useTheme();
  const Icon = stopIcons[stop.kind];
  const last = index === total - 1;
  return (
    <MapCard>
      <View style={styles.walkHead}>
        <Pressable onPress={onExit} accessibilityRole="button" accessibilityLabel={t.trail.finishA11y} hitSlop={12}>
          <Text variant="labelLarge" tone="onDarkVariant" style={styles.exit}>{t.trail.finish}</Text>
        </Pressable>
      </View>
      <View style={styles.cardRow} accessible accessibilityLiveRegion="polite"
        accessibilityLabel={`${t.trail.stopOf(index + 1, total)}: ${stop.name}`}>
        <View style={[styles.stopIcon, { backgroundColor: color.lime }]}>
          <Icon color={color.onLime} size={26} />
        </View>
        <View style={styles.cardText}>
          <Text variant="labelMedium" tone="onDarkVariant">{t.trail.stopOf(index + 1, total)}</Text>
          <Text variant="titleLarge" tone="onDark">{stop.name}</Text>
        </View>
      </View>
      {/* Avance: un segmento por parada. */}
      <View style={styles.steps} importantForAccessibility="no-hide-descendants">
        {Array.from({ length: total }, (_, i) => (
          <View key={i} style={[styles.step, { backgroundColor: i <= index ? color.lime : color.darkSurfaceHigh }]} />
        ))}
      </View>
      <Tag label={t.trail.walkingTag} tone="dark" />
      <View style={styles.walkActions}>
        <IconButton label={t.trail.previous} onPress={onPrevious} look="dark" style={index === 0 && styles.disabled}>
          <ChevronLeftIcon color={color.onDark} />
        </IconButton>
        {last ? (
          <Button label={t.trail.complete} accessibilityLabel={t.trail.completeA11y} onPress={onComplete} style={styles.grow} />
        ) : (
          <Button label={t.trail.next} onPress={onNext} trailing={<ArrowBubble />} style={styles.grow} />
        )}
      </View>
    </MapCard>
  );
}

type ObservationCardProps = {
  common: string;
  scientific?: string;
  meta: string;
  photo?: ImageSourcePropType;
  onOpen?: () => void;
  onClose: () => void;
};

/**
 * Observación tocada en el mapa: foto de referencia de la especie a todo el alto (con margen, como la
 * del sendero), nombres y estado. Toda la tarjeta abre la ficha; el chevron lima lo indica.
 */
export function ObservationCard({ common, scientific, meta, photo, onOpen, onClose }: ObservationCardProps) {
  const { color } = useTheme();
  return (
    <MapCard style={styles.trailCard}>
      <Pressable onPress={onOpen} disabled={!onOpen} accessibilityRole={onOpen ? 'link' : undefined}
        accessibilityLabel={`${common}${scientific ? `, ${scientific}` : ''}. ${t.observation.unverified}. ${meta}`}
        accessibilityHint={onOpen ? t.observation.openSpecies : undefined}
        android_ripple={onOpen ? { color: color.onDarkRipple, foreground: true } : undefined}
        style={({ pressed }) => [styles.observationRow, { opacity: pressed ? 0.85 : 1 }]}>
        {/* Marco absoluto, como en el sendero: el alto lo fija la columna de texto. */}
        <View style={[styles.trailPhotoFrame, styles.observationPhoto, !photo && { backgroundColor: color.darkSurfaceHigh }]}>
          {photo ? <CoverImage source={photo} /> : (
            <View style={styles.photoEmpty}>
              <InfoIcon color={color.onDarkVariant} />
            </View>
          )}
        </View>
        <View style={styles.observationBody}>
          <Text variant="titleMedium" tone="onDark" numberOfLines={1}>{common}</Text>
          {scientific ? <Text variant="scientific" tone="onDarkVariant" numberOfLines={1}>{scientific}</Text> : null}
          <View style={styles.tags}>
            <Tag label={t.observation.unverified} tone="dark" />
          </View>
          <Text variant="labelSmall" tone="onDarkVariant">{meta}</Text>
        </View>
        {onOpen ? (
          <View style={styles.observationChevron}>
            <ChevronIcon color={color.lime} size={28} />
          </View>
        ) : null}
      </Pressable>
      <IconButton label={t.observation.close} onPress={onClose} look="dark" hitSlop={4} style={styles.otherTrails}>
        <CloseIcon color={color.onDark} size={20} />
      </IconButton>
    </MapCard>
  );
}

/** Avisos de lo que no cargó, bajo los chips. */
export function MapNotices({ tileError, observationsError }: { tileError: boolean; observationsError: boolean }) {
  if (!tileError && !observationsError) return null;
  return (
    <Animated.View entering={FadeIn.duration(240)} style={styles.notices} accessibilityLiveRegion="polite">
      {observationsError ? <StatusBanner on="dark" message={t.map.observationsErrorBanner} /> : null}
      {tileError ? <StatusBanner on="dark" message={t.map.tileError} /> : null}
    </Animated.View>
  );
}

/** Telón mientras carga el mapa base; se retira con un fundido. */
export function MapLoading() {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const first = useSharedValue(0);
  const second = useSharedValue(0);

  // Dos ondas tipo sonar, desfasadas, salen del ícono mientras carga; con movimiento reducido el ícono queda quieto.
  useEffect(() => {
    if (reducedMotion) return;
    const wave = () => withRepeat(withTiming(1, { duration: 1600, easing: Easing.out(Easing.quad) }), -1, false);
    first.set(wave());
    second.set(withDelay(800, wave()));
  }, [first, second, reducedMotion]);

  return (
    <Animated.View exiting={FadeOut.duration(480)} style={[styles.curtain, { backgroundColor: color.dark }]}
      accessibilityLiveRegion="polite" accessible accessibilityLabel={t.map.loading}>
      <View style={styles.loadingMark}>
        {reducedMotion ? null : (
          <>
            <LoadingWave progress={first} color={color.lime} />
            <LoadingWave progress={second} color={color.lime} />
          </>
        )}
        <View style={[styles.loadingIcon, { backgroundColor: color.darkSurfaceHigh }]}>
          <MapIcon color={color.lime} size={28} />
        </View>
      </View>
      <Text variant="bodyMedium" tone="onDarkVariant">{t.map.loading}</Text>
    </Animated.View>
  );
}

function LoadingWave({ progress, color }: { progress: SharedValue<number>; color: string }) {
  const style = useAnimatedStyle(() => ({
    opacity: 0.6 * (1 - progress.get()),
    transform: [{ scale: 1 + 0.9 * progress.get() }],
  }));
  return <Animated.View style={[styles.loadingWave, { borderColor: color }, style]} />;
}

/** Telón cuando el mapa no puede funcionar en el dispositivo: remite a la lista. */
export function MapUnavailable({ onOpenList }: { onOpenList: () => void }) {
  const { color } = useTheme();
  return (
    <View style={[styles.curtain, { backgroundColor: color.dark }]}>
      <EmptyState on="dark" icon={MapIcon} accessibilityLiveRegion="assertive" title={t.map.failedTitle} body={t.map.failedBody}
        action={{ label: t.map.failedAction, onPress: onOpenList }} />
    </View>
  );
}

const styles = StyleSheet.create({
  header: { position: 'absolute', top: 0, left: 0, right: 0, paddingBottom: space.xl },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingHorizontal: space.lg },
  title: { flex: 1 },
  back: { marginLeft: -space.md, marginRight: -space.xs },
  chips: { gap: space.sm, paddingHorizontal: space.lg, paddingTop: space.md },
  notices: { position: 'absolute', left: space.lg, right: space.lg, gap: space.sm },
  card: {
    borderRadius: radius.xl,
    borderWidth: 1,
    padding: space.md,
    paddingTop: space.md + 2,
    gap: space.md,
    elevation: 8,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  cardText: { flex: 1, gap: 3 },
  note: { marginTop: 1 },
  // El alto de la tarjeta lo define la columna derecha; la foto se estira a ese alto con margen propio.
  trailCard: { flexDirection: 'row', alignItems: 'stretch', padding: 0, paddingTop: 0, gap: 0 },
  trailPhotoFrame: { width: 108, margin: space.sm, marginRight: 0, borderRadius: radius.lg, overflow: 'hidden' },
  trailBody: { flex: 1, padding: space.md, gap: space.sm },
  trailOption: { flexDirection: 'row', alignItems: 'center', gap: space.md, padding: space.sm, paddingRight: space.md, borderRadius: radius.lg, overflow: 'hidden' },
  trailOptionPhoto: { width: 64, height: 64, borderRadius: radius.md, overflow: 'hidden' },
  // Flecha discreta sobre la esquina superior izquierda de la foto; hitSlop completa el área de toque de 48 dp.
  otherTrails: { position: 'absolute', top: space.sm + space.xs, left: space.sm + space.xs, zIndex: 1, width: 40, height: 40, borderRadius: 20 },
  observationRow: { flex: 1, flexDirection: 'row', alignItems: 'stretch', borderRadius: radius.xl, overflow: 'hidden' },
  observationPhoto: { width: 100 },
  observationBody: { flex: 1, justifyContent: 'center', gap: 3, padding: space.md, paddingRight: 0, minHeight: 112 },
  observationChevron: { justifyContent: 'center', paddingHorizontal: space.md },
  photoEmpty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', gap: space.xs, marginTop: 2 },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  walkHead: { position: 'absolute', top: space.sm, right: space.sm, zIndex: 1 },
  exit: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  stopIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.xs },
  step: { flex: 1, height: 4, borderRadius: 2 },
  walkActions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  disabled: { opacity: 0.4 },
  loadingMark: { width: 112, height: 112, alignItems: 'center', justifyContent: 'center' },
  loadingIcon: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  loadingWave: { position: 'absolute', width: 56, height: 56, borderRadius: 28, borderWidth: 2 },
  curtain: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});
