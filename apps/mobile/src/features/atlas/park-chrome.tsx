import { useState } from 'react';
import { type LayoutChangeEvent, Linking, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, {
  FadeIn, FadeInDown, interpolate, type SharedValue, useAnimatedReaction, useAnimatedScrollHandler, useAnimatedStyle, useReducedMotion,
  useSharedValue,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import type { ParkProfile } from '@/domain/park';
import { apiErrorMessage } from '@/features/api-error-message';
import { ArrowBubble, MapCard, TrailOption } from '@/features/atlas/map-chrome';
import type { ParkPhoto } from '@/features/atlas/park-content';
import { parkFacts, regionLabel, sourceLabel } from '@/features/atlas/park-facts';
import type { Park } from '@/features/atlas/parks';
import { usePark } from '@/features/atlas/use-park';
import type { QueryResult } from '@/features/query-result';
import { t } from '@/i18n/es-CL';
import {
  Button, ChevronIcon, CloseIcon, CoverImage, DataRows, easeOutExpo, IconButton, LoadingState, NAVIGATION_BAR_OVERLAP, radius, space,
  StatusBanner, Tag, Text, TextButton, useTheme,
} from '@/ui';

// Tarjetas de las etapas de parque del Atlas: la invitación inicial, la ficha del parque con su
// galería y la lista de senderos del parque. El texto sale de la API (GET /parks/{id} y
// GET /parks/{id}/trails); solo las fotos son locales.

/** Entrada escalonada de las piezas de una tarjeta; con movimiento reducido entran sin desplazarse. */
function useRise(reducedMotion: boolean) {
  return (index: number) => (reducedMotion
    ? FadeIn.duration(160)
    : FadeInDown.duration(420).delay(120 + index * 55).easing(easeOutExpo));
}

type ParksHintProps = { parks: Park[]; onOpen: (id: string) => void };

/** Etapa de parques: una invitación a tocar el mapa y, para quien no usa el mapa, un botón por parque. */
export function ParksHint({ parks, onOpen }: ParksHintProps) {
  const { color } = useTheme();
  return (
    <MapCard>
      <View style={styles.hintHead}>
        <Text variant="titleMedium" tone="onDark">{t.parks.hintTitle}</Text>
        <Text variant="bodySmall" tone="onDarkVariant">{t.parks.hintBody}</Text>
      </View>
      {parks.map((park) => (
        <Pressable key={park.id} onPress={() => onOpen(park.id)} accessibilityRole="button"
          accessibilityLabel={t.parks.open(park.name)} accessibilityHint={t.parks.openA11y(park.name)}
          android_ripple={{ color: color.onDarkRipple }}
          style={({ pressed }) => [styles.parkRow, { backgroundColor: color.darkSurfaceHigh, transform: [{ scale: pressed ? 0.98 : 1 }] }]}>
          <View style={[styles.parkDot, { backgroundColor: color.lime }]} />
          <View style={styles.grow}>
            <Text variant="titleSmall" tone="onDark" numberOfLines={1}>{park.name}</Text>
            <ParkRegion parkId={park.id} />
          </View>
          <ChevronIcon color={color.lime} size={20} />
        </Pressable>
      ))}
    </MapCard>
  );
}

/** Región del parque según la API; mientras carga o si falla, nada (el nombre basta para elegir). */
function ParkRegion({ parkId }: { parkId: string }) {
  const region = regionLabel(usePark(parkId).data?.regions ?? []);
  return region ? <Text variant="bodySmall" tone="onDarkVariant" numberOfLines={1}>{region}</Text> : null;
}

type ParkCardProps = {
  park: Park;
  /** Alto máximo al crecer: lo que queda entre la fila del título de la cabecera y el borde inferior. */
  grownMaxHeight: number;
  photos: ParkPhoto[];
  profile: QueryResult<ParkProfile>;
  onVisit: () => void;
  onClose: () => void;
};

const GALLERY_HEIGHT = 228;

/** Ficha del parque: galería deslizable, la ficha del atlas con sus fuentes, y el paso a los senderos. */
export function ParkCard({ park, photos, profile, grownMaxHeight, onVisit, onClose }: ParkCardProps) {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const rise = useRise(reducedMotion);
  const { height } = useWindowDimensions();
  // Al abrirse deja ver el parque arriba: a lo más dos tercios de la pantalla. Al deslizar el texto
  // crece hasta justo bajo la cabecera, para leer con más espacio; vuelve al subir hasta el inicio.
  const collapsedMax = Math.round(height * 0.68) - NAVIGATION_BAR_OVERLAP;
  const expandedMax = Math.max(collapsedMax, grownMaxHeight);
  // El crecimiento va pegado al dedo, como una hoja inferior: los primeros `growRange` px de
  // desplazamiento suben el borde superior de la tarjeta y el texto se compensa hacia abajo, así que
  // todo sube junto con el dedo. Con la tarjeta ya crecida, el texto se desplaza normal. Sin
  // animaciones con tiempo propio: no hay dos movimientos que se pisen al empezar.
  const growRange = expandedMax - collapsedMax;
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    scrollY.set(event.contentOffset.y);
  });
  const growStyle = useAnimatedStyle(() => ({
    maxHeight: collapsedMax + Math.min(Math.max(scrollY.get(), 0), growRange),
  }));
  const pinStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.min(Math.max(scrollY.get(), 0), growRange) }],
  }));
  return (
    <MapCard style={[styles.parkCard, growStyle]}>
      {photos.length ? <Gallery name={park.name} photos={photos} /> : null}
      <IconButton label={t.parks.close} onPress={onClose} look="dark" style={styles.closePhoto}>
        <CloseIcon color={color.onDark} size={20} />
      </IconButton>
      {/* Al soltar a medio crecer, la tarjeta se ajusta a cerrada o crecida (nativo). El relleno
          inferior compensa lo que el texto baja mientras crece, para que se vea hasta el final. */}
      <Animated.ScrollView style={styles.parkScroll} contentContainerStyle={{ paddingBottom: growRange }}
        showsVerticalScrollIndicator={false} onScroll={onScroll} scrollEventThrottle={16}
        snapToOffsets={growRange > 0 ? [growRange] : undefined} snapToEnd={false} decelerationRate="fast">
        <Animated.View style={[styles.parkBody, pinStyle]}>
          <ParkProfileBody name={park.name} profile={profile} rise={rise} />
        </Animated.View>
      </Animated.ScrollView>
      <View style={[styles.parkFooter, { borderTopColor: color.darkOutline }]}>
        <Button label={t.parks.visit} accessibilityLabel={t.parks.visitA11y(park.name)} onPress={onVisit} trailing={<ArrowBubble />} />
      </View>
    </MapCard>
  );
}

type Rise = ReturnType<typeof useRise>;

/** Contenido de la ficha según el estado de GET /parks/{id}: cargando, error con reintento o la ficha. */
function ParkProfileBody({ name, profile: { data, isPending, error, refetch }, rise }: { name: string; profile: QueryResult<ParkProfile>; rise: Rise }) {
  const { color } = useTheme();
  if (!data) {
    return (
      <>
        <Text variant="headline" tone="onDark" accessibilityRole="header">{name}</Text>
        {isPending ? <LoadingState label={t.parks.loading} on="dark" /> : null}
        {error ? (
          <View style={styles.section}>
            <StatusBanner on="dark" message={`${t.parks.errorTitle} ${apiErrorMessage(error)}`} />
            <Button label={t.common.retry} tone="ghost" onPress={refetch} />
          </View>
        ) : null}
      </>
    );
  }
  const region = regionLabel(data.regions);
  const facts = parkFacts(data);
  const source = data.sources[0];
  const rows: [string, string][] = [
    ...(data.provinces ? [[t.parks.provinces, data.provinces] as [string, string]] : []),
    ...(data.communes ? [[t.parks.communes, data.communes] as [string, string]] : []),
    ...(data.accessText ? [[t.parks.access, data.accessText] as [string, string]] : []),
    [t.parks.boundary, t.parks.boundaryValue],
    ...(source ? [[t.parks.source, sourceLabel(source)] as [string, string]] : []),
    [t.parks.knowledgeVersion, data.knowledgeVersion],
    [t.parks.photos, t.parks.photosValue],
  ];
  return (
    <>
      <Animated.View entering={rise(0)} style={styles.titleBlock}>
        {region ? <Text variant="labelMedium" tone="lime">{region}</Text> : null}
        <Text variant="headline" tone="onDark" accessibilityRole="header">{data.name}</Text>
      </Animated.View>
      {facts.length ? (
        <View style={styles.facts}>
          {facts.map((fact, index) => (
            <Animated.View key={fact.label} entering={rise(1 + index)} accessible accessibilityLabel={`${fact.value} ${fact.label}`}
              style={[styles.fact, { backgroundColor: color.darkSurfaceHigh, flexGrow: fact.value.length > 4 ? 1.45 : 1 }]}>
              <Text variant="titleLarge" tone="lime" numberOfLines={1}>{fact.value}</Text>
              <Text variant="labelSmall" tone="onDarkVariant" numberOfLines={2}>{fact.label}</Text>
            </Animated.View>
          ))}
        </View>
      ) : null}
      <Animated.View entering={rise(4)}>
        <StatusBanner on="dark" message={t.parks.liveStatus} />
      </Animated.View>
      {data.visitNotice ? (
        <Animated.View entering={rise(5)} style={styles.section}>
          <Text variant="titleSmall" tone="onDark">{t.parks.visitNotice}</Text>
          <Text variant="bodyMedium" tone="onDark">{data.visitNotice}</Text>
        </Animated.View>
      ) : null}
      {data.sectors.length ? (
        <Animated.View entering={rise(6)} style={styles.section}>
          <Text variant="titleSmall" tone="onDark">{t.parks.sectors}</Text>
          <View style={styles.chips}>
            {data.sectors.map((sector) => <Tag key={sector} label={sector} tone="dark" />)}
          </View>
        </Animated.View>
      ) : null}
      <Animated.View entering={rise(7)} style={styles.section}>
        <DataRows on="dark" rows={rows} />
        {data.limitations.length ? (
          <View style={styles.limitations}>
            <Text variant="labelMedium" tone="onDarkVariant">{t.parks.limitations}</Text>
            {data.limitations.map((limitation) => (
              <Text key={limitation} variant="labelSmall" tone="onDarkVariant">{`· ${limitation}`}</Text>
            ))}
          </View>
        ) : null}
        <TextButton label={t.parks.openOfficial} role="link" tone="onDark" onPress={() => Linking.openURL(data.officialUrl)} />
      </Animated.View>
    </>
  );
}

/** Fotos a lo ancho de la tarjeta, una por página, con paralaje y puntos que siguen al dedo. */
function Gallery({ name, photos }: { name: string; photos: ParkPhoto[] }) {
  const [width, setWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((event) => {
    x.set(event.contentOffset.x);
  });
  // El contador cambia a mitad de camino entre fotos, mientras se desliza.
  useAnimatedReaction(
    () => (width ? Math.round(x.get() / width) : 0),
    (now, before) => {
      if (now !== before) scheduleOnRN(setIndex, now);
    },
    [width],
  );
  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  return (
    <View style={styles.gallery} onLayout={onLayout} accessibilityLabel={t.parks.gallery(name)}>
      {width ? (
        <Animated.ScrollView horizontal pagingEnabled showsHorizontalScrollIndicator={false} onScroll={onScroll}
          scrollEventThrottle={16} decelerationRate="fast">
          {photos.map((photo, i) => (
            <GalleryPage key={photo.url} photo={photo} index={i} total={photos.length} width={width} x={x} />
          ))}
        </Animated.ScrollView>
      ) : null}
      <View style={styles.dots} pointerEvents="none" importantForAccessibility="no-hide-descendants">
        {photos.map((photo, i) => <Dot key={photo.url} index={i} width={width} x={x} />)}
      </View>
      <Text variant="labelSmall" tone="onDark" style={styles.counter} importantForAccessibility="no">
        {`${index + 1}/${photos.length}`}
      </Text>
    </View>
  );
}

type GalleryPageProps = { photo: ParkPhoto; index: number; total: number; width: number; x: SharedValue<number> };

function GalleryPage({ photo, index, total, width, x }: GalleryPageProps) {
  const { color } = useTheme();
  // La foto se desliza más lento que la página: profundidad sin mover el pie ni el crédito.
  const parallax = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(x.get(), [(index - 1) * width, index * width, (index + 1) * width], [-width * 0.3, 0, width * 0.3]) },
      { scale: interpolate(x.get(), [(index - 1) * width, index * width, (index + 1) * width], [1.12, 1.02, 1.12]) },
    ],
  }));
  return (
    <View style={[styles.page, { width }]}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        <CoverImage source={photo.source} accessible accessibilityRole="image"
          accessibilityLabel={t.parks.photoOf(index + 1, total, photo.caption)} />
      </Animated.View>
      {/* Velo inferior bajo el pie de foto, para que se lea sobre cualquier foto y funda con la tarjeta. */}
      <Svg style={styles.galleryVeil} width="100%" height="100%" preserveAspectRatio="none" pointerEvents="none">
        <Defs>
          <LinearGradient id={`gallery-veil-${index}`} x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={color.darkSurface} stopOpacity={0} />
            <Stop offset="1" stopColor={color.darkSurface} stopOpacity={0.95} />
          </LinearGradient>
        </Defs>
        <Rect width="100%" height="100%" fill={`url(#gallery-veil-${index})`} />
      </Svg>
      <View style={styles.caption} pointerEvents="box-none">
        <Text variant="titleSmall" tone="onDark" numberOfLines={1} style={styles.shadowText}>{photo.caption}</Text>
        <Pressable onPress={() => Linking.openURL(photo.url)} accessibilityRole="link" hitSlop={8}
          accessibilityLabel={t.parks.photoCreditA11y(photo.author, photo.license)}>
          <Text variant="labelSmall" tone="onDark" numberOfLines={1} style={[styles.shadowText, styles.credit]}>
            {t.parks.photoCredit(photo.author, photo.license)}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Punto de la página: el activo se alarga y se vuelve lima, siguiendo el desplazamiento. */
function Dot({ index, width, x }: { index: number; width: number; x: SharedValue<number> }) {
  const { color } = useTheme();
  const style = useAnimatedStyle(() => {
    const distance = width ? Math.min(1, Math.abs(x.get() / width - index)) : index === 0 ? 0 : 1;
    return { width: interpolate(distance, [0, 1], [20, 6]), opacity: interpolate(distance, [0, 1], [1, 0.45]) };
  });
  return <Animated.View style={[styles.dot, { backgroundColor: color.lime }, style]} />;
}

export type TrailChoice = { id: string; name: string; photo: ParkPhoto['source']; meta: string; metaA11y: string; note: string };

type ParkTrailsCardProps = {
  parkName: string;
  /** Senderos de GET /parks/{id}/trails, ya convertidos en filas; `data` vacío si el atlas no tiene. */
  trails: QueryResult<TrailChoice[]>;
  onPick: (id: string) => void;
};

/** Etapa de senderos: los senderos del parque según la API, con su trazado de demostración en el mapa. */
export function ParkTrailsCard({ parkName, trails: { data, isPending, error, refetch }, onPick }: ParkTrailsCardProps) {
  const reducedMotion = useReducedMotion();
  const rise = useRise(reducedMotion);
  const { height } = useWindowDimensions();
  return (
    <MapCard style={{ maxHeight: Math.round(height * 0.46) - NAVIGATION_BAR_OVERLAP }}>
      <Animated.View entering={rise(0)} style={styles.hintHead}>
        <Text variant="labelMedium" tone="lime">{parkName}</Text>
        <Text variant="titleLarge" tone="onDark" accessibilityRole="header">{t.parks.trailsTitle}</Text>
        <Text variant="labelSmall" tone="onDarkVariant">{t.parks.trailsBody}</Text>
      </Animated.View>
      {data ? (
        data.length ? (
          <ScrollView contentContainerStyle={styles.trailList} showsVerticalScrollIndicator={false}>
            {data.map((trail, index) => (
              <Animated.View key={trail.id} entering={rise(1 + Math.min(index, 6))}>
                <TrailOption name={trail.name} photo={trail.photo} meta={trail.meta} metaA11y={trail.metaA11y} note={trail.note}
                  onPress={() => onPick(trail.id)} />
              </Animated.View>
            ))}
          </ScrollView>
        ) : (
          <Text variant="bodySmall" tone="onDarkVariant">{t.parks.trailsEmpty}</Text>
        )
      ) : isPending ? (
        <LoadingState label={t.parks.trailsLoading} on="dark" />
      ) : error ? (
        <View style={styles.section}>
          <StatusBanner on="dark" message={`${t.parks.trailsError} ${apiErrorMessage(error)}`} />
          <Button label={t.common.retry} tone="ghost" onPress={refetch} />
        </View>
      ) : null}
    </MapCard>
  );
}

const styles = StyleSheet.create({
  grow: { flex: 1 },
  hintHead: { gap: 2 },
  parkRow: {
    flexDirection: 'row', alignItems: 'center', gap: space.md, paddingVertical: space.md, paddingHorizontal: space.md,
    borderRadius: radius.lg, overflow: 'hidden',
  },
  parkDot: { width: 10, height: 10, borderRadius: 5 },
  parkCard: { padding: 0, paddingTop: 0, gap: 0, overflow: 'hidden' },
  closePhoto: { position: 'absolute', top: space.sm, right: space.sm, zIndex: 2, width: 40, height: 40, borderRadius: 20 },
  gallery: { height: GALLERY_HEIGHT, overflow: 'hidden', borderTopLeftRadius: radius.xl - 1, borderTopRightRadius: radius.xl - 1 },
  page: { height: GALLERY_HEIGHT, overflow: 'hidden' },
  galleryVeil: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 128 },
  caption: { position: 'absolute', left: space.lg, right: 64, bottom: space.lg + 6, gap: 1 },
  credit: { opacity: 0.8 },
  shadowText: { textShadowColor: 'rgba(0,0,0,0.6)', textShadowRadius: 6, textShadowOffset: { width: 0, height: 1 } },
  dots: { position: 'absolute', left: space.lg, bottom: space.sm, flexDirection: 'row', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  counter: { position: 'absolute', right: space.lg, bottom: space.lg + 6 },
  parkScroll: { flexShrink: 1 },
  parkBody: { padding: space.lg, paddingTop: space.md, gap: space.lg },
  titleBlock: { gap: 2 },
  facts: { flexDirection: 'row', gap: space.sm },
  fact: { flexBasis: 0, borderRadius: radius.md, paddingVertical: space.sm + 2, paddingHorizontal: space.sm, gap: 1 },
  section: { gap: space.sm },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs + 2 },
  parkFooter: { padding: space.md, borderTopWidth: StyleSheet.hairlineWidth },
  trailList: { gap: space.sm },
  limitations: { gap: 2, paddingTop: space.sm },
});
