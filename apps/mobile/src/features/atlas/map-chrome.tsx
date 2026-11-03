import { Image, type ImageSourcePropType, type LayoutChangeEvent, Linking, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, LinearGradient, Path, Rect, Stop } from 'react-native-svg';

import { type GeoPoint, pathBounds } from '@/domain/geo';

import { OSM_COPYRIGHT } from '@/features/atlas/basemap';
import type { TrailStop, TrailStopKind } from '@/features/atlas/demo-trail';
import { t } from '@/i18n/es-CL';
import type { AtlasMapLayers } from '@/map/atlas-map';
import {
  BinocularsIcon, Button, CameraIcon, ChevronIcon, ChevronLeftIcon, CloseIcon, EmptyState, FilterChip, FlagIcon, IconButton,
  type IconComponent, InfoIcon, LeafIcon, ListIcon, MapIcon, PinIcon, radius, space, StatusBanner, Tag,
  Text, TrailIcon, useTheme,
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
  layers: AtlasMapLayers;
  onToggle: (layer: keyof AtlasMapLayers) => void;
  onOpenList: () => void;
  onOpenInfo: () => void;
  onLayout: (event: LayoutChangeEvent) => void;
};

/** Título, acciones y chips de capas sobre un velo que oscurece el borde superior del mapa. */
export function MapHeader({ layers, onToggle, onOpenList, onOpenInfo, onLayout }: MapHeaderProps) {
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
        <Text variant="headline" tone="onDark" accessibilityRole="header" style={styles.title} numberOfLines={1}>
          {t.map.title}
        </Text>
        <IconButton label={t.map.openList} onPress={onOpenList} look="dark">
          <ListIcon color={color.onDark} size={22} />
        </IconButton>
        <IconButton label={t.map.openInfo} onPress={onOpenInfo} look="dark">
          <InfoIcon color={color.onDark} size={22} />
        </IconButton>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}
        accessibilityLabel={t.map.layersLabel}>
        {layerChips.map(({ key, label, icon }) => (
          <FilterChip key={key} label={label} icon={icon} on="dark" toggle selected={layers[key]} onPress={() => onToggle(key)}
            accessibilityLabel={t.map.layerA11y(label, layers[key])} />
        ))}
      </ScrollView>
    </View>
  );
}

/** Miniatura del trazado: la forma del sendero en lima sobre su tarjeta. */
function TrailThumb({ path, size }: { path: GeoPoint[]; size: number }) {
  const { color } = useTheme();
  const bounds = pathBounds(path);
  if (!bounds) return null;
  const [[west, south], [east, north]] = bounds;
  // Misma escala en ambos ejes (corregida por latitud), centrada en el cuadrado.
  const kx = Math.cos(((south + north) / 2) * (Math.PI / 180));
  const span = Math.max((east - west) * kx, north - south) || 1;
  const pad = size * 0.18;
  const scale = (size - pad * 2) / span;
  const ox = (size - (east - west) * kx * scale) / 2;
  const oy = (size - (north - south) * scale) / 2;
  const d = path
    .map(({ longitude, latitude }, i) => `${i ? 'L' : 'M'}${(ox + (longitude - west) * kx * scale).toFixed(1)},${(oy + (north - latitude) * scale).toFixed(1)}`)
    .join(' ');
  return (
    <View style={[styles.thumb, { width: size, height: size, backgroundColor: color.darkSurfaceHigh }]}>
      <Svg width={size} height={size}>
        <Path d={d} stroke={color.lime} strokeOpacity={0.25} strokeWidth={8} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <Path d={d} stroke={color.lime} strokeWidth={3} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </Svg>
    </View>
  );
}

/** Contenedor oscuro de las tarjetas inferiores del mapa. */
function MapCard({ children, onLayout }: { children: React.ReactNode; onLayout?: (event: LayoutChangeEvent) => void }) {
  const { color } = useTheme();
  return (
    <View onLayout={onLayout} style={[styles.card, { backgroundColor: color.darkSurface, borderColor: color.darkOutline, shadowColor: '#000' }]}>
      {children}
    </View>
  );
}

function ArrowBubble() {
  const { color } = useTheme();
  return (
    <View style={[styles.arrow, { backgroundColor: color.onLime }]}>
      <ChevronIcon color={color.lime} size={18} />
    </View>
  );
}

type TrailCardProps = {
  name: string;
  path: GeoPoint[];
  meta: string;
  metaA11y: string;
  onStart: () => void;
};

/** Tarjeta del sendero de demostración, con su acción principal. */
export function TrailCard({ name, path, meta, metaA11y, onStart }: TrailCardProps) {
  return (
    <MapCard>
      <View style={styles.cardRow}>
        <TrailThumb path={path} size={64} />
        <View style={styles.cardText}>
          <Text variant="titleMedium" tone="onDark" numberOfLines={1}>{name}</Text>
          <View style={styles.metaRow}>
            <Tag label={t.trail.demoTag} tone="demo" />
            <Text variant="bodySmall" tone="onDarkVariant" accessibilityLabel={metaA11y}>{meta}</Text>
          </View>
          <Text variant="labelSmall" tone="onDarkVariant" style={styles.note}>{t.trail.syntheticNote}</Text>
        </View>
      </View>
      <Button label={t.trail.start} accessibilityLabel={t.trail.startA11y} onPress={onStart} trailing={<ArrowBubble />} />
    </MapCard>
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

/** Observación tocada en el mapa: foto de referencia de la especie, nombres y estado. */
export function ObservationCard({ common, scientific, meta, photo, onOpen, onClose }: ObservationCardProps) {
  const { color } = useTheme();
  return (
    <MapCard>
      <View style={styles.cardRow}>
        {photo ? (
          <Image source={photo} style={styles.photo} accessibilityIgnoresInvertColors />
        ) : (
          <View style={[styles.photo, styles.photoEmpty, { backgroundColor: color.darkSurfaceHigh }]}>
            <InfoIcon color={color.onDarkVariant} />
          </View>
        )}
        <View style={styles.cardText}>
          <Text variant="titleMedium" tone="onDark" numberOfLines={1}>{common}</Text>
          {scientific ? <Text variant="scientific" tone="onDarkVariant">{scientific}</Text> : null}
          <View style={styles.tags}>
            <Tag label={t.observation.syntheticTag} tone="demo" />
            <Tag label={t.observation.unverified} tone="dark" />
          </View>
          <Text variant="labelSmall" tone="onDarkVariant">{meta}</Text>
        </View>
        <IconButton label={t.observation.close} onPress={onClose} style={styles.close}>
          <CloseIcon color={color.onDarkVariant} size={22} />
        </IconButton>
      </View>
      {onOpen ? <Button label={t.observation.openSpecies} onPress={onOpen} role="link" trailing={<ArrowBubble />} /> : null}
    </MapCard>
  );
}

/** Atribución visible del mapa base, enlazada a la página de derechos de autor. */
export function BasemapAttribution() {
  const { color } = useTheme();
  return (
    <Pressable onPress={() => Linking.openURL(OSM_COPYRIGHT)} accessibilityRole="link" accessibilityLabel={t.map.attributionA11y}
      hitSlop={{ top: 14, bottom: 14, left: 8, right: 8 }} style={[styles.attribution, { backgroundColor: color.darkScrim }]}>
      <Text variant="labelSmall" tone="onDarkVariant">{t.map.attribution}</Text>
    </Pressable>
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
  return (
    <Animated.View exiting={FadeOut.duration(480)} style={[styles.curtain, { backgroundColor: color.dark }]}
      accessibilityLiveRegion="polite">
      <MapIcon color={color.lime} size={32} />
      <Text variant="bodyMedium" tone="onDarkVariant">{t.map.loading}</Text>
    </Animated.View>
  );
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
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: space.sm },
  thumb: { borderRadius: radius.md, overflow: 'hidden' },
  photo: { width: 72, height: 72, borderRadius: radius.md },
  photoEmpty: { alignItems: 'center', justifyContent: 'center' },
  tags: { flexDirection: 'row', gap: space.xs, marginTop: 2 },
  close: { alignSelf: 'flex-start', marginTop: -space.xs, marginRight: -space.xs },
  arrow: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  walkHead: { position: 'absolute', top: space.sm, right: space.sm, zIndex: 1 },
  exit: { paddingHorizontal: space.sm, paddingVertical: space.xs },
  stopIcon: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  steps: { flexDirection: 'row', gap: space.xs, paddingHorizontal: space.xs },
  step: { flex: 1, height: 4, borderRadius: 2 },
  walkActions: { flexDirection: 'row', alignItems: 'center', gap: space.md },
  grow: { flex: 1 },
  disabled: { opacity: 0.4 },
  attribution: { paddingHorizontal: space.sm, paddingVertical: 2, borderRadius: radius.sm },
  curtain: { ...StyleSheet.absoluteFill, alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xl },
});
