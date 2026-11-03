import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { AccessibilityInfo, Linking, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, FadeOutDown, useReducedMotion } from 'react-native-reanimated';

import { type GeoPoint, pathLengthKm } from '@/domain/geo';
import type { Observation } from '@/domain/observation';
import { BASEMAP_ACCESSED, OSM_COPYRIGHT } from '@/features/atlas/basemap';
import { demoTrail, estimatedMinutes } from '@/features/atlas/demo-trail';
import {
  BasemapAttribution, MapHeader, MapLoading, MapNotices, MapUnavailable, ObservationCard, TrailCard, WalkCard,
} from '@/features/atlas/map-chrome';
import { MapList } from '@/features/atlas/map-list';
import { useObservations } from '@/features/atlas/use-observations';
import { useSpeciesNames } from '@/features/atlas/use-species-names';
import { openSpecies } from '@/features/catalog/open-species';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { recordWalk } from '@/features/journal/use-walks';
import { formatDate, formatDecimal, formatDuration, formatShortDate, t } from '@/i18n/es-CL';
import AtlasMap, { type AtlasMapHandle, type AtlasMapLayers, type AtlasMapStatus, type AtlasMapStop } from '@/map/atlas-map';
import { Button, DataRows, FitIcon, IconButton, Sheet, space, Text, TextButton, useTheme } from '@/ui';

const NO_OBSERVATIONS: Observation[] = [];

// El DOM component necesita `window`: en web con render de servidor se monta solo en el cliente.
const noSubscription = () => () => {};
const useIsClient = () => useSyncExternalStore(noSubscription, () => true, () => false);

const trailKm = pathLengthKm(demoTrail.path);
const trailKmLabel = formatDecimal(trailKm);
const trailDuration = formatDuration(estimatedMinutes(trailKm));
const trailMeta = t.trail.meta(trailKmLabel, trailDuration);
const { stops } = demoTrail;
const mapStops: AtlasMapStop[] = stops.map(({ id, kind, point }) => ({ id, kind, ...point }));

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [walkStep, setWalkStep] = useState<number | null>(null);
  const [showList, setShowList] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [headerHeight, setHeaderHeight] = useState(150);
  const [cardHeight, setCardHeight] = useState(190);
  const map = useRef<AtlasMapHandle>(null);
  const mounted = useIsClient();

  const onStatus = useCallback((next: AtlasMapStatus) => {
    if (next === 'tile-error') setTileError(true);
    else setStatus(next);
  }, []);

  const selected = observations.find((observation) => observation.id === selectedId);
  const walking = walkStep !== null;
  const insets = useMemo(() => ({ top: headerHeight, bottom: cardHeight + space.md + 56 }), [headerHeight, cardHeight]);

  // Durante el recorrido la cámara sigue a la parada actual.
  useEffect(() => {
    if (walkStep === null) return;
    const { point } = stops[walkStep];
    map.current?.focus(point.longitude, point.latitude);
  }, [walkStep]);

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
  }, []);

  const exitWalk = () => {
    setWalkStep(null);
    setSelectedId(null);
    map.current?.fitTrail();
  };

  const completeWalk = () => {
    recordWalk({ trailId: demoTrail.id, km: trailKm });
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
    <View style={[styles.screen, { backgroundColor: color.dark }]}>
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
            points={mapPoints}
            trail={demoTrail.path}
            stops={mapStops}
            layers={layers}
            selectedId={selectedId}
            insets={insets}
            onStatus={onStatus}
            onSelect={onSelect}
            dom={{ style: { flex: 1, backgroundColor: color.dark }, accessibilityLabel: t.map.mapA11y }}
          />
        ) : null}

        {status === 'loading' ? <MapLoading /> : null}
        {status === 'failed' ? <MapUnavailable onOpenList={() => setShowList(true)} /> : null}

        <MapHeader layers={layers} onToggle={toggleLayer} onOpenList={() => setShowList(true)} onOpenInfo={() => setShowInfo(true)}
          onLayout={(event) => setHeaderHeight(event.nativeEvent.layout.height)} />
        <View style={[styles.noticesSlot, { top: headerHeight - space.md }]} pointerEvents="box-none">
          <MapNotices tileError={tileError} observationsError={observationsQuery.error !== null} />
        </View>

        {status === 'ready' ? (
          <View style={styles.bottom} pointerEvents="box-none">
            <View style={styles.aboveCard} pointerEvents="box-none">
              <BasemapAttribution />
              <IconButton label={t.map.recenter} onPress={() => map.current?.fitTrail()} look="dark">
                <FitIcon color={color.onDark} size={22} />
              </IconButton>
            </View>
            <View onLayout={(event) => setCardHeight(event.nativeEvent.layout.height)}>
              {walking ? (
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
                <Animated.View key="trail" entering={FadeIn.duration(220)} exiting={FadeOut.duration(120)}>
                  <TrailCard name={demoTrail.name} path={demoTrail.path} meta={trailMeta}
                    metaA11y={t.trail.metaA11y(trailKmLabel, trailDuration)} onStart={() => goToStop(0)} />
                </Animated.View>
              )}
            </View>
          </View>
        ) : null}
      </View>

      {showList ? (
        <Animated.View entering={FadeIn.duration(200)} exiting={FadeOut.duration(140)} style={StyleSheet.absoluteFill}>
          <MapList trail={demoTrail} trailMeta={`${t.trail.demoTag} · ${trailMeta}`} observations={observationsQuery}
            onClose={() => setShowList(false)}
            onShowStop={(stop) => showOnMap(stop.id, stop.point)}
            onShowObservation={(observation) => observation.location && showOnMap(observation.id, observation.location)} />
        </Animated.View>
      ) : null}

      <Sheet visible={showInfo} title={t.mapInfo.title} closeLabel={t.mapInfo.close} onClose={() => setShowInfo(false)}>
        <Text variant="bodyMedium" tone="onDark">{t.mapInfo.disclaimer}</Text>
        <DataRows on="dark" rows={[
          [t.mapInfo.basemap, t.mapInfo.basemapValue],
          [t.mapInfo.license, t.mapInfo.licenseValue],
          [t.mapInfo.satellite, t.mapInfo.satelliteValue],
          [t.mapInfo.framing, t.mapInfo.framingValue],
          [t.mapInfo.accessed, formatDate(BASEMAP_ACCESSED)],
          [t.mapInfo.status, t.mapInfo.statusValue],
        ]} />
        <TextButton label={t.mapInfo.copyright} role="link" tone="onDark" onPress={() => Linking.openURL(OSM_COPYRIGHT)} />
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
      meta={`${formatShortDate(observation.createdAt)} · ${t.observation.note}`} onClose={onClose}
      onOpen={speciesId ? () => openSpecies(speciesId) : undefined} />
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  noticesSlot: { position: 'absolute', left: 0, right: 0 },
  bottom: { position: 'absolute', left: space.md, right: space.md, bottom: space.md, gap: space.sm },
  aboveCard: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
});
