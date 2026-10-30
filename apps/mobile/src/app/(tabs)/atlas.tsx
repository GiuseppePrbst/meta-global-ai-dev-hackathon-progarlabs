import { useCallback, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Keyframe, useReducedMotion } from 'react-native-reanimated';

import type { Observation } from '@/domain/observation';
import { AtlasList } from '@/features/atlas/atlas-list';
import { ContourCover } from '@/features/atlas/contour-art';
import { CARD_BOTTOM, CONTROLS_GUTTER } from '@/features/atlas/map-layout';
import { BasemapAttribution, MapControls, MapLoading, MapSummary, MapUnavailable } from '@/features/atlas/map-overlays';
import { ObservationCard } from '@/features/atlas/observation-card';
import { useObservations } from '@/features/atlas/use-observations';
import { t } from '@/i18n/es-CL';
import AtlasMap, { type AtlasMapHandle, type AtlasMapPoint, type AtlasMapStatus } from '@/map/atlas-map';
import { AtlasIcon, duration, easeOutExpo, ListIcon, Paper, ScreenHeader, type Segment, SegmentedControl, space, useTheme } from '@/ui';

type AtlasView = 'map' | 'list';

const NO_OBSERVATIONS: Observation[] = [];

// El DOM component necesita `window`: en web con render de servidor se monta solo en el cliente.
// El servidor responde `false` y el cliente `true`, sin un render extra desde un efecto.
const noSubscription = () => () => {};
const useIsClient = () => useSyncExternalStore(noSubscription, () => true, () => false);

const views: Segment<AtlasView>[] = [
  { key: 'map', label: t.atlas.viewMap, Icon: AtlasIcon },
  { key: 'list', label: t.atlas.viewList, Icon: ListIcon },
];

// La papeleta se deja sobre el mapa: sube girada y se asienta; al cerrarla se retira rápido.
const slipIn = new Keyframe({
  0: { opacity: 0, transform: [{ translateY: 40 }, { rotate: '-4deg' }, { scale: 0.96 }] },
  100: { opacity: 1, transform: [{ translateY: 0 }, { rotate: '0deg' }, { scale: 1 }], easing: easeOutExpo },
}).duration(420);
const slipOut = new Keyframe({
  0: { opacity: 1, transform: [{ translateY: 0 }] },
  100: { opacity: 0, transform: [{ translateY: 20 }] },
}).duration(160);

export default function AtlasScreen() {
  const { color, scheme } = useTheme();
  const reducedMotion = useReducedMotion();
  const observationsQuery = useObservations();
  const observations = observationsQuery.data ?? NO_OBSERVATIONS;
  // Misma referencia mientras no cambien las observaciones: el DOM component no recarga los puntos.
  const mapPoints = useMemo<AtlasMapPoint[]>(
    () => observations.flatMap(({ id, location }) => (location ? [{ id, ...location }] : [])),
    [observations],
  );
  const [view, setView] = useState<AtlasView>('map');
  const [status, setStatus] = useState<'loading' | AtlasMapStatus>('loading');
  const [tileError, setTileError] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const map = useRef<AtlasMapHandle>(null);
  const mounted = useIsClient();

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
        <SegmentedControl variant="band" options={views} value={view} onChange={setView}
          accessibilityLabel={t.atlas.viewLabel} style={styles.switch} />
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
              <MapSummary count={observationsQuery.data ? mapPoints.length : null} observationsError={observationsQuery.error !== null}
                tileError={tileError} />
              <MapControls onZoomIn={() => map.current?.zoomIn()} onZoomOut={() => map.current?.zoomOut()}
                onRecenter={() => map.current?.recenter()} />
              <BasemapAttribution />
              {selected ? (
                <Animated.View key={selected.id} entering={reducedMotion ? FadeIn.duration(duration.reducedIn) : slipIn}
                  exiting={reducedMotion ? FadeOut.duration(duration.reducedOut) : slipOut}
                  style={styles.cardSlot} accessibilityLiveRegion="polite">
                  <ObservationCard observation={selected} onClose={() => setSelectedId(null)} />
                </Animated.View>
              ) : null}
            </>
          ) : null}

          {status === 'loading' ? <MapLoading /> : null}
          {status === 'failed' ? <MapUnavailable /> : null}
        </View>

        {showingList ? (
          <Animated.View entering={FadeIn.duration(220)} exiting={FadeOut.duration(160)}
            style={StyleSheet.absoluteFill}>
            <Paper style={StyleSheet.absoluteFill}>
              <AtlasList observations={observationsQuery} onShowOnMap={showOnMap} />
            </Paper>
          </Animated.View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  body: { flex: 1 },
  switch: { marginTop: space.md },
  // Sobre la escala (abajo a la izquierda) y a la izquierda de los controles del mapa.
  cardSlot: { position: 'absolute', left: space.md, right: CONTROLS_GUTTER, bottom: CARD_BOTTOM },
});
