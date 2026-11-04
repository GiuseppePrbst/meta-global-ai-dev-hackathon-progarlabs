import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, BackHandler, type LayoutChangeEvent, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, SlideInDown, useReducedMotion } from 'react-native-reanimated';

import { type GeoBounds, type GeoPoint, pathBounds, pathLengthKm } from '@/domain/geo';
import type { Observation } from '@/domain/observation';
import {
  type Basemap, DEFAULT_BASEMAP, EOX_ACCESSED, EOX_LICENSE_URL, EOX_YEAR, OSM_ACCESSED, OSM_COPYRIGHT,
} from '@/features/atlas/basemap';
import { type DemoTrail, demoTrail, demoTrails, estimatedMinutes } from '@/features/atlas/demo-trail';
import {
  MapHeader, MapLoading, MapNotices, MapUnavailable, ObservationCard, TrailCard, WalkCard,
} from '@/features/atlas/map-chrome';
import { MapList } from '@/features/atlas/map-list';
import { ParkCard, ParksHint, ParkTrailsCard } from '@/features/atlas/park-chrome';
import { getParkContent } from '@/features/atlas/park-content';
import { getPark, PARK_BOUNDARY_SOURCE, parks } from '@/features/atlas/parks';
import { getTrailPhoto } from '@/features/atlas/trail-photos';
import { useObservations } from '@/features/atlas/use-observations';
import { useSpeciesNames } from '@/features/atlas/use-species-names';
import { openSpecies } from '@/features/catalog/open-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { recordWalk } from '@/features/journal/use-walks';
import { formatDate, formatDecimal, formatDuration, formatShortDate, t } from '@/i18n/es-CL';
import AtlasMap, {
  type AtlasMapHandle, type AtlasMapLayers, type AtlasMapStatus, type AtlasMapStop, type AtlasStage,
} from '@/map/atlas-map';
import { Button, DataRows, easeOutExpo, NAVIGATION_BAR_OVERLAP, FitIcon, IconButton, Sheet, space, Text, TextButton, useTheme } from '@/ui';

const NO_OBSERVATIONS: Observation[] = [];

// El DOM component necesita `window`: en web con render de servidor se monta solo en el cliente.
const noSubscription = () => () => {};
const useIsClient = () => useSyncExternalStore(noSubscription, () => true, () => false);

type TrailView = { trail: DemoTrail; km: number; meta: string; metaA11y: string; mapStops: AtlasMapStop[]; bounds: GeoBounds | null };

// Datos derivados de cada sendero, calculados una vez: el mapa recibe referencias estables.
const trailViews = new Map<string, TrailView>(demoTrails.map((trail) => {
  const km = pathLengthKm(trail.path);
  const kmLabel = formatDecimal(km);
  const duration = formatDuration(estimatedMinutes(km));
  return [trail.id, {
    trail, km,
    meta: t.trail.meta(kmLabel, duration),
    metaA11y: t.trail.metaA11y(kmLabel, duration),
    mapStops: trail.stops.map(({ id, kind, point }) => ({ id, kind, ...point })),
    bounds: pathBounds(trail.path),
  }];
}));
const getTrailView = (id: string) => trailViews.get(id) ?? trailViews.get(demoTrail.id)!;

// Todos los senderos de demostración están dentro del límite de Puyehue (parks.test.ts): son los del parque.
const trailPreviews = demoTrails.map(({ id, path }) => ({ id, path }));
const trailChoices = demoTrails.map(({ id, name }) => {
  const view = getTrailView(id);
  return { id, name, photo: getTrailPhoto(id).source, meta: view.meta, metaA11y: view.metaA11y };
});

// Etapa a la que vuelve «atrás» desde cada una.
const parentStage: Record<AtlasStage, AtlasStage | null> = { parks: null, park: 'parks', trails: 'park', trail: 'trails' };

/** Espacio inferior que tapa una tarjeta del alto dado, más la barra de navegación y el botón flotante. */
const bottomInset = (cardHeight: number) => cardHeight + space.md + NAVIGATION_BAR_OVERLAP + 56;

export default function MapScreen() {
  const { color } = useTheme();
  const reducedMotion = useReducedMotion();
  const observationsQuery = useObservations();
  const observations = observationsQuery.data ?? NO_OBSERVATIONS;
  // Misma referencia mientras no cambien las observaciones: el DOM component no recarga los puntos.
  const mapPoints = useMemo(
    () => observations.flatMap(({ id, location }) => (location ? [{ id, ...location }] : [])),
    [observations],
  );
  const [status, setStatus] = useState<'loading' | AtlasMapStatus>('loading');
  const [tileError, setTileError] = useState(false);
  const [layers, setLayers] = useState<AtlasMapLayers>({ species: true, trail: true, stops: true });
  const [basemap, setBasemap] = useState<Basemap>(DEFAULT_BASEMAP);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [walkStep, setWalkStep] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [stage, setStage] = useState<AtlasStage>('parks');
  const [parkId, setParkId] = useState<string | null>(null);
  const park = parkId ? getPark(parkId) : undefined;
  const parkContent = parkId ? getParkContent(parkId) : undefined;
  const [trailId, setTrailId] = useState(demoTrail.id);
  const { trail, km: trailKm, meta: trailMeta, metaA11y: trailMetaA11y, mapStops } = getTrailView(trailId);
  const { stops } = trail;
  const trailPhoto = getTrailPhoto(trailId);
  const [headerHeight, setHeaderHeight] = useState(150);
  const [screenHeight, setScreenHeight] = useState(0);
  const [cardHeight, setCardHeight] = useState(190);
  const map = useRef<AtlasMapHandle>(null);
  const mounted = useIsClient();

  const onStatus = useCallback((next: AtlasMapStatus) => {
    if (next === 'tile-error') setTileError(true);
    else setStatus(next);
  }, []);

  const selected = observations.find((observation) => observation.id === selectedId);
  const walking = walkStep !== null;
  const insets = useMemo(() => ({ top: headerHeight, bottom: bottomInset(cardHeight) }), [headerHeight, cardHeight]);

  // Al cambiar de etapa la cámara espera a que la tarjeta nueva mida su alto, para encuadrar lo que
  // queda visible sobre ella. La primera etapa la encuadra la carga del mapa.
  const pendingFrame = useRef<AtlasStage | null>(null);
  // La invitación inicial espera a que la cámara llegue a los parques; al volver, entra de inmediato.
  const [navigated, setNavigated] = useState(false);
  const goTo = useCallback((next: AtlasStage) => {
    pendingFrame.current = next;
    setNavigated(true);
    setStage(next);
  }, []);
  const onStageCardLayout = (event: LayoutChangeEvent) => {
    const height = event.nativeEvent.layout.height;
    // La tarjeta del parque anima su alto al deslizar: no se reenvía cada cuadro al mapa.
    const target = pendingFrame.current;
    if (stage !== 'park' || target !== null) setCardHeight(height);
    if (target === null) return;
    // La caja viaja con la orden: en nativo puede llegar al mapa antes que las props nuevas.
    const bounds = target === 'trail' ? getTrailView(trailId).bounds : (getPark(parkId ?? '') ?? parks[0]).bounds;
    map.current?.frame(target, bottomInset(height), bounds);
    pendingFrame.current = null;
  };

  // Durante el recorrido la cámara sigue a la parada actual.
  useEffect(() => {
    if (walkStep === null) return;
    const { point } = stops[walkStep];
    map.current?.focus(point.longitude, point.latitude);
  }, [walkStep, stops]);

  const goToStop = (index: number) => {
    setWalkStep(index);
    setSelectedId(stops[index].id);
  };

  // Estable: el mapa la captura al crear sus marcadores.
  const onSelect = useCallback((id: string | null) => {
    const stopIndex = stops.findIndex((stop) => stop.id === id);
    // Durante el recorrido, tocar una parada salta a ella; fuera, solo la destaca.
    if (stopIndex >= 0) setWalkStep((step) => (step === null ? null : stopIndex));
    setSelectedId(id);
  }, [stops]);

  const openPark = useCallback((id: string | null) => {
    if (!id) {
      goTo('parks');
      return;
    }
    setParkId(id);
    goTo('park');
  }, [goTo]);

  // Cambios de etapa por zoom: la cámara queda donde el usuario la dejó, sin encuadre nuevo.
  const zoomOutOfTrail = useCallback(() => {
    // Durante el recorrido por paradas el zoom no cambia de etapa.
    if (walkStep !== null) return;
    setSelectedId(null);
    setNavigated(true);
    setStage('trails');
  }, [walkStep]);

  const zoomIntoTrail = useCallback((id: string) => {
    setWalkStep(null);
    setSelectedId(null);
    setTrailId(id);
    setNavigated(true);
    setStage('trail');
  }, []);

  const pickTrail = useCallback((id: string) => {
    setWalkStep(null);
    setSelectedId(null);
    setTrailId(id);
    goTo('trail');
  }, [goTo]);

  const goBack = useCallback(() => {
    const parent = parentStage[stage];
    if (!parent) return false;
    setWalkStep(null);
    setSelectedId(null);
    goTo(parent);
    return true;
  }, [stage, goTo]);

  // Atrás del sistema sube una etapa antes de salir de la pestaña.
  useEffect(() => {
    const subscription = BackHandler.addEventListener('hardwareBackPress', goBack);
    return () => subscription.remove();
  }, [goBack]);

  const exitWalk = () => {
    setWalkStep(null);
    setSelectedId(null);
    map.current?.fitTrail();
  };

  const completeWalk = () => {
    recordWalk({ trailId: trail.id, km: trailKm });
    AccessibilityInfo.announceForAccessibility(t.trail.completed);
    exitWalk();
  };

  const showOnMap = (id: string, point: GeoPoint) => {
    setShowList(false);
    setSelectedId(id);
    map.current?.focus(point.longitude, point.latitude);
  };

  const toggleLayer = (layer: keyof AtlasMapLayers) => setLayers((current) => ({ ...current, [layer]: !current[layer] }));

  return (
    <View style={[styles.screen, { backgroundColor: color.dark }]}
      onLayout={(event) => setScreenHeight(event.nativeEvent.layout.height)}>
      <View style={StyleSheet.absoluteFill} accessibilityElementsHidden={showList}
        importantForAccessibility={showList ? 'no-hide-descendants' : 'auto'}>
        {mounted && status !== 'failed' ? (
          <AtlasMap
            ref={map}
            colors={{
              ground: color.dark,
              tint: color.mapTint,
              marker: color.darkScrim,
              markerBorder: color.onDark,
              onMarker: color.onDark,
              accent: color.lime,
              onAccent: color.onLime,
            }}
            reducedMotion={reducedMotion}
            stage={stage}
            parks={parks}
            parkId={parkId}
            trailPreviews={trailPreviews}
            points={mapPoints}
            trail={trail.path}
            stops={mapStops}
            layers={layers}
            basemap={basemap}
            selectedId={selectedId}
            insets={insets}
            onStatus={onStatus}
            onSelect={onSelect}
            onSelectPark={openPark}
            onPickTrail={pickTrail}
            onZoomOutOfTrail={zoomOutOfTrail}
            onZoomIntoTrail={zoomIntoTrail}
            dom={{ style: { flex: 1, backgroundColor: color.dark }, accessibilityLabel: t.map.mapA11y }}
          />
        ) : null}

        {status === 'loading' ? <MapLoading /> : null}
        {status === 'failed' ? <MapUnavailable onOpenList={() => setShowList(true)} /> : null}

        <MapHeader title={stage === 'parks' || !park ? t.parks.title : park.shortName}
          onBack={stage === 'parks' ? undefined : goBack}
          backA11y={t.parks.backA11y(parentStage[stage] === 'parks' || !park ? t.parks.title
            : parentStage[stage] === 'park' ? park.shortName : t.parks.trailsTitle)}
          showLayers={stage === 'trail'}
          layers={layers} onToggle={toggleLayer} basemap={basemap}
          onToggleBasemap={() => setBasemap((current) => (current === 'satellite' ? 'osm' : 'satellite'))}
          onOpenInfo={() => setShowInfo(true)}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} />
        <View style={[styles.noticesSlot, { top: headerHeight - space.md }]} pointerEvents="box-none">
          <MapNotices tileError={tileError} observationsError={observationsQuery.error !== null} />
        </View>

        {status === 'ready' ? (
          <View style={styles.bottom} pointerEvents="box-none">
            {stage === 'trail' ? (
              <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)} style={styles.aboveCard}
                pointerEvents="box-none">
                <IconButton label={t.map.recenter} onPress={() => map.current?.fitTrail()} look="dark">
                  <FitIcon color={color.onDark} size={22} />
                </IconButton>
              </Animated.View>
            ) : null}
            <View onLayout={(event) => stage !== 'park' && setCardHeight(event.nativeEvent.layout.height)}>
              {stage === 'parks' ? (
                <Animated.View key="parks" entering={FadeInDown.duration(420).delay(navigated ? 0 : 900).easing(easeOutExpo)}
                  exiting={FadeOutDown.duration(160)}>
                  <View onLayout={onStageCardLayout}>
                    <ParksHint parks={parks} regionOf={(id) => getParkContent(id)?.region} onOpen={openPark} />
                  </View>
                </Animated.View>
              ) : stage === 'park' && park && parkContent ? (
                <Animated.View key="park" entering={reducedMotion ? FadeIn.duration(200) : SlideInDown.duration(560).easing(easeOutExpo)}
                  exiting={FadeOutDown.duration(180)}>
                  <View onLayout={onStageCardLayout}>
                    <ParkCard park={park} content={parkContent} onVisit={() => goTo('trails')} onClose={() => goTo('parks')}
                      grownMaxHeight={screenHeight - (headerHeight - space.xl) - space.md - NAVIGATION_BAR_OVERLAP - space.sm} />
                  </View>
                </Animated.View>
              ) : stage === 'trails' && park ? (
                <Animated.View key="trails" entering={FadeInDown.duration(380).easing(easeOutExpo)}
                  exiting={FadeOutDown.duration(160)}>
                  <View onLayout={onStageCardLayout}>
                    <ParkTrailsCard parkName={park.name} trails={trailChoices} onPick={pickTrail} />
                  </View>
                </Animated.View>
              ) : walking ? (
                <Animated.View key="walk" entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(140)}>
                  <WalkCard stop={stops[walkStep]} index={walkStep} total={stops.length}
                    onPrevious={() => walkStep > 0 && goToStop(walkStep - 1)}
                    onNext={() => goToStop(Math.min(walkStep + 1, stops.length - 1))}
                    onComplete={completeWalk} onExit={exitWalk} />
                </Animated.View>
              ) : selected ? (
                <Animated.View key={selected.id} entering={FadeInDown.duration(260)} exiting={FadeOutDown.duration(140)}
                  accessibilityLiveRegion="polite">
                  <SelectedObservation observation={selected} onClose={() => setSelectedId(null)} />
                </Animated.View>
              ) : (
                <Animated.View key="trail" entering={FadeInDown.duration(380).easing(easeOutExpo)} exiting={FadeOut.duration(120)}>
                  <View onLayout={onStageCardLayout}>
                    <TrailCard name={trail.name} photo={trailPhoto.source} photoA11y={trailPhoto.a11y} meta={trailMeta}
                      metaA11y={trailMetaA11y} onStart={() => goToStop(0)}
                      onOtherTrails={() => goTo('trails')} />
                  </View>
                </Animated.View>
              )}
            </View>
          </View>
        ) : null}
      </View>

      {showList ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
          <MapList trail={trail} trailMeta={`${t.trail.demoTag} · ${trailMeta}`} observations={observationsQuery}
            onClose={() => setShowList(false)}
            onShowStop={(stop) => showOnMap(stop.id, stop.point)}
            onShowObservation={(observation) => observation.location && showOnMap(observation.id, observation.location)} />
        </Animated.View>
      ) : null}

      <Sheet visible={showInfo} title={t.mapInfo.title} closeLabel={t.mapInfo.close} onClose={() => setShowInfo(false)}>
        <Text variant="bodyMedium" tone="onDark">{t.mapInfo.disclaimer}</Text>
        <DataRows on="dark" rows={[
          [t.mapInfo.satellite, t.mapInfo.satelliteValue(EOX_YEAR)],
          [t.mapInfo.satelliteLicense, t.mapInfo.satelliteLicenseValue],
          [t.mapInfo.basemap, t.mapInfo.basemapValue],
          [t.mapInfo.license, t.mapInfo.licenseValue],
          [t.mapInfo.parkBoundary, t.mapInfo.parkBoundaryValue(PARK_BOUNDARY_SOURCE.osmVersion, formatDate(PARK_BOUNDARY_SOURCE.accessed))],
          [t.mapInfo.framing, t.mapInfo.framingValue],
          [t.mapInfo.accessed, `EOX ${formatDate(EOX_ACCESSED)} · OSM ${formatDate(OSM_ACCESSED)}`],
          [t.mapInfo.status, t.mapInfo.statusValue],
          [t.mapInfo.trailPhoto, trailPhoto.credit],
        ]} />
        <TextButton label={t.mapInfo.satelliteCopyright} role="link" tone="onDark" onPress={() => Linking.openURL(EOX_LICENSE_URL)} />
        <TextButton label={t.mapInfo.copyright} role="link" tone="onDark" onPress={() => Linking.openURL(OSM_COPYRIGHT)} />
        <TextButton label={t.mapInfo.parkBoundarySource} role="link" tone="onDark"
          onPress={() => Linking.openURL(PARK_BOUNDARY_SOURCE.url)} />
        <TextButton label={t.mapInfo.trailPhotoSource} role="link" tone="onDark" onPress={() => Linking.openURL(trailPhoto.url)} />
        <Button label={t.mapInfo.showFrame} tone="ghost" onPress={() => {
          setShowInfo(false);
          map.current?.fitFrame();
        }} />
      </Sheet>

    </View>
  );
}

function SelectedObservation({ observation, onClose }: { observation: Observation; onClose: () => void }) {
  const { speciesId } = observation;
  const { common, scientific } = useSpeciesNames(speciesId);
  return (
    <ObservationCard common={common} scientific={scientific} photo={getReferencePhoto(speciesId)?.source}
      meta={formatShortDate(observation.createdAt)} onClose={onClose}
      onOpen={speciesId ? () => openSpecies(speciesId) : undefined} />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  noticesSlot: { position: 'absolute', left: 0, right: 0 },
  bottom: { position: 'absolute', left: space.md, right: space.md, bottom: space.md + NAVIGATION_BAR_OVERLAP, gap: space.sm },
  aboveCard: { flexDirection: 'row', justifyContent: 'flex-end' },
});
