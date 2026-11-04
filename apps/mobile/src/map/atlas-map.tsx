'use dom';

import 'maplibre-gl/dist/maplibre-gl.css';

import { type DOMImperativeFactory, type DOMProps, useDOMImperativeHandle } from 'expo/dom';
import type { JSONValue } from 'expo/build/dom/dom.types';
import type { Map as MapLibreMap, Marker, RasterLayerSpecification, StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { type GeoBounds, type GeoPoint, pathBounds, pointInPolygon } from '@/domain/geo';
import { type Basemap, EOX_MAX_ZOOM, EOX_TILES } from '@/features/atlas/basemap';
import type { TrailStopKind } from '@/features/atlas/demo-trail';

// MapLibre GL JS dentro de un Expo DOM component (ADR 0002). Recibe datos ya resueltos como props
// y no hace peticiones a la API; solo pide teselas del mapa base.
// Ni las observaciones, ni los senderos, ni el límite del parque usan fuentes GeoJSON: una fuente
// GeoJSON se procesa en el Web Worker de MapLibre y, si el worker no arranca dentro del WebView, el
// evento `load` nunca llega. Los marcadores son HTML, y senderos y parques son un SVG que se reproyecta
// cuando la cámara se mueve.
// Este archivo no importa `@/ui` ni nada que cargue React Native: el DOM component no puede; solo
// módulos de TypeScript puro como `@/domain/geo`, y tipos.

export type AtlasMapStatus = 'ready' | 'tile-error' | 'failed';

/**
 * Etapa del recorrido del Atlas: parques vistos de lejos, un parque abierto, los senderos del parque
 * y un sendero elegido. Cada etapa decide qué se dibuja y cómo encuadra la cámara.
 */
export type AtlasStage = 'parks' | 'park' | 'trails' | 'trail';

export interface AtlasMapHandle extends DOMImperativeFactory {
  fitTrail(): void;
  fitFrame(): void;
  /** Centra la cámara en un punto; los argumentos cruzan el puente como JSON. */
  focus(...args: JSONValue[]): void;
  /**
   * Encuadra la etapa dada: `(etapa, insetInferior, caja)`. El inset es el alto de la tarjeta recién
   * medida; la caja, la del sendero o parque que se encuadra, para no depender de que las props ya
   * hayan llegado.
   */
  frame(...args: JSONValue[]): void;
}

export type AtlasMapColors = {
  ground: string;
  tint: string;
  marker: string;
  markerBorder: string;
  onMarker: string;
  accent: string;
  onAccent: string;
};

export type AtlasMapPoint = GeoPoint & { id: string };
export type AtlasMapStop = AtlasMapPoint & { kind: TrailStopKind };
export type AtlasMapLayers = { species: boolean; trail: boolean; stops: boolean };
export type AtlasMapPark = { id: string; shortName: string; boundary: GeoPoint[]; bounds: GeoBounds; labelPoint: GeoPoint };
export type AtlasMapTrailPreview = { id: string; path: GeoPoint[] };

type AtlasMapProps = {
  ref: React.Ref<AtlasMapHandle>;
  colors: AtlasMapColors;
  reducedMotion: boolean;
  stage: AtlasStage;
  parks: AtlasMapPark[];
  /** Parque abierto en las etapas `park`, `trails` y `trail`. */
  parkId: string | null;
  /** Todos los senderos del parque, dibujados finos en la etapa `trails`. */
  trailPreviews: AtlasMapTrailPreview[];
  points: AtlasMapPoint[];
  trail: GeoPoint[];
  stops: AtlasMapStop[];
  layers: AtlasMapLayers;
  basemap: Basemap;
  /** Marcador destacado: una observación o una parada. */
  selectedId: string | null;
  /** Espacio que tapan la cabecera y la tarjeta inferior, para encuadrar lo que queda visible. */
  insets: { top: number; bottom: number };
  onStatus: (status: AtlasMapStatus) => void;
  onSelect: (id: string | null) => void;
  /** Tocar un parque (polígono o etiqueta); `null` al tocar fuera del parque abierto. */
  onSelectPark: (id: string | null) => void;
  /** Tocar el inicio de un sendero en la etapa `trails`. */
  onPickTrail: (id: string) => void;
  /** El usuario alejó la cámara de un sendero lo suficiente: volver a la vista de senderos. */
  onZoomOutOfTrail: () => void;
  /** El usuario acercó la cámara a un sendero en la vista de senderos: abrirlo con sus paradas. */
  onZoomIntoTrail: (id: string) => void;
  dom?: DOMProps;
};

// Encuadre del rango de coordenadas publicado por CONAF, no límites oficiales del parque (docs/SOURCES.md).
const PUYEHUE_FRAME: GeoBounds = [
  [-(72 + 20 / 60), -(40 + 57 / 60)],
  [-(71 + 50 / 60), -(40 + 25 / 60)],
];

// Vista de parques: de lejos, con lagos y volcanes del entorno como referencia. La entrada parte aún
// más lejos, sobre el sur de Chile, y vuela hasta ella.
const OVERVIEW_ZOOM = 7.7;
/** Grados alrededor del parque que muestra la vista de parques. */
const OVERVIEW_MARGIN = 0.45;
const OVERVIEW_MAX_ZOOM = 8.2;
const INTRO_CENTER: [number, number] = [-71.6, -39.2];
const INTRO_ZOOM = 4.6;

// Cambio de etapa por zoom, relativo al zoom que encuadra cada sendero (depende de la pantalla y del
// largo del sendero): alejarse 1,2 niveles bajo ese encuadre lo minimiza; en la vista de senderos,
// acercarse a 0,6 niveles de él lo abre. La distancia entre ambos evita que salte de ida y vuelta.
const TRAIL_ZOOM_OUT_DELTA = 1.2;
const TRAIL_ZOOM_IN_DELTA = 0.6;
/** Margen tras un movimiento de cámara de la app durante el que un `moveend` no se toma como del usuario. */
const APP_MOVE_GRACE = 400;

// Teselas OSM oscurecidas: se invierte el brillo y se devuelve el tono, y una veladura verde las
// lleva al bosque nocturno.
const osmPaint: NonNullable<RasterLayerSpecification['paint']> = {
  'raster-saturation': -0.6,
  'raster-contrast': 0.3,
  'raster-brightness-min': 0.72,
  'raster-brightness-max': 0.035,
  'raster-hue-rotate': 180,
};

// El bosque de Puyehue en Sentinel-2 es muy oscuro (mediana ~6 % de brillo). `raster-contrast` estira
// alrededor del gris medio y lo hunde en negro, y `raster-brightness-*` no puede aclarar; por eso la
// imagen satelital se realza con un filtro CSS sobre el canvas: primero aclara y después contrasta.
// Valores elegidos comparando teselas reales del sendero (02-11-2026).
const SATELLITE_FILTER = 'brightness(1.7) contrast(1.25) saturate(1.1)';

// Teselas de 256 px declaradas como 128: MapLibre pide un nivel más de detalle (hasta EOX_MAX_ZOOM) y
// las muestra a la mitad, más nítidas en pantallas de alta densidad, a cambio de cuatro veces más teselas.
const SATELLITE_TILE_SIZE = 128;

// Veladura verde sobre cada mapa base: fuerte sobre OSM, apenas un tono sobre la imagen satelital.
const tintOpacity: Record<Basemap, number> = { osm: 0.3, satellite: 0.12 };

const visibility = (on: boolean) => (on ? 'visible' : 'none');

// Ambos mapas base viven en el estilo y el interruptor solo cambia su visibilidad; una capa oculta no
// pide teselas.
function mapStyle(colors: AtlasMapColors, basemap: Basemap): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 },
      satellite: { type: 'raster', tiles: [EOX_TILES], tileSize: SATELLITE_TILE_SIZE, maxzoom: EOX_MAX_ZOOM },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': colors.ground } },
      { id: 'osm', type: 'raster', source: 'osm', paint: osmPaint, layout: { visibility: visibility(basemap === 'osm') } },
      { id: 'satellite', type: 'raster', source: 'satellite', layout: { visibility: visibility(basemap === 'satellite') } },
      { id: 'tint', type: 'background', paint: { 'background-color': colors.tint, 'background-opacity': tintOpacity[basemap] } },
    ],
  };
}

const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

// Entrada de los marcadores (ms). Al abrir: esperan a que el trazo empiece a dibujarse y aparecen
// escalonados. Al activar un filtro o cambiar de etapa: solo los nuevos, casi a la vez.
const MARKER_POP = 260;
const MARKER_INTRO_DELAY = 450;
const MARKER_INTRO_STAGGER = 35;
const MARKER_STAGGER = 15;
const MARKER_STAGGER_MAX = 120;
// Los inicios de sendero entran uno tras otro, siguiendo el dibujo de cada trazo.
const TRAILHEAD_STAGGER = 140;
const SVG_NS = 'http://www.w3.org/2000/svg';
const ICON = 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';

// Los mismos trazos que los íconos de la app (src/ui/components/icons.tsx).
const icons = {
  leaf: '<path d="M5 19c0-8 5-13 14-14 0 9-5 14-13 14z"/><path d="M5 19c3-4 6-7 9.5-9.5"/>',
  unknown: '<circle cx="12" cy="12" r="7"/><path d="M12 9v4M12 15.8v.2"/>',
  start: '<path d="M6 21V4M6 4.5h10.5l-2 3.75 2 3.75H6"/>',
  viewpoint: '<circle cx="7" cy="15.5" r="3.5"/><circle cx="17" cy="15.5" r="3.5"/><path d="M10.5 15.5h3M4.5 13l2-7.5h3l.5 7M19.5 13l-2-7.5h-3l-.5 7"/>',
  photo: '<path d="M4 8.5A1.5 1.5 0 015.5 7h2l1.5-2.5h6L16.5 7h2A1.5 1.5 0 0120 8.5v9a1.5 1.5 0 01-1.5 1.5h-13A1.5 1.5 0 014 17.5z"/><circle cx="12" cy="13" r="3.5"/>',
  end: '<path d="M6 21V4M6 4.5h10.5l-2 3.75 2 3.75H6"/><path d="M9.5 6.5h3M9.5 10h3"/>',
  // Montaña con árbol: el mismo dibujo que la etiqueta de parque.
  park: '<path d="M3 19l6.5-11 4 6.5"/><path d="M11.5 19l4.5-7.5 5 7.5z"/><path d="M3 19h18"/>',
};

function svgIcon(name: keyof typeof icons, size: number) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ${ICON} aria-hidden="true">${icons[name]}</svg>`;
}

const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

type ParkShape = { id: string; paths: SVGPathElement[] };
type PreviewShape = { id: string; paths: SVGPathElement[] };

export default function AtlasMap({
  ref, colors, reducedMotion, stage, parks, parkId, trailPreviews, points, trail, stops, layers, basemap, selectedId, insets,
  onStatus, onSelect, onSelectPark, onPickTrail, onZoomOutOfTrail, onZoomIntoTrail,
}: AtlasMapProps) {
  // Los listeners de zoom se registran una vez: llaman a los callbacks vigentes desde aquí.
  const zoomHandlers = useRef({ onZoomOutOfTrail, onZoomIntoTrail });
  zoomHandlers.current = { onZoomOutOfTrail, onZoomIntoTrail };
  const currentPreviews = useRef(trailPreviews);
  currentPreviews.current = trailPreviews;
  // Hasta cuándo un movimiento de cámara es de la app (encuadres, seguir paradas), no del usuario.
  const appMoveUntil = useRef(0);
  const markAppMove = (duration: number) => {
    appMoveUntil.current = Math.max(appMoveUntil.current, performance.now() + duration + APP_MOVE_GRACE);
  };
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const MarkerClass = useRef<typeof Marker | null>(null);
  const trailPath = useRef<SVGPathElement[]>([]);
  const parkShapes = useRef<ParkShape[]>([]);
  const previewShapes = useRef<PreviewShape[]>([]);
  // Los listeners de MapLibre se registran una vez: leen los datos vigentes desde aquí.
  const currentTrail = useRef(trail);
  currentTrail.current = trail;
  const currentStage = useRef(stage);
  currentStage.current = stage;
  const currentParks = useRef(parks);
  currentParks.current = parks;
  const currentParkId = useRef(parkId);
  currentParkId.current = parkId;
  // Mapa base vigente y si el estilo ya cargó: antes de `load` MapLibre no acepta cambios de capa.
  const currentBasemap = useRef(basemap);
  const styleReady = useRef(false);
  // La entrada escalonada de los marcadores ocurre una sola vez, al abrir el mapa.
  const introDone = useRef(false);
  const animate = !reducedMotion;

  /** Márgenes para encuadrar; el inferior se recorta para que siempre quede mapa visible. */
  const padding = (bottom = insets.bottom) => {
    const height = container.current?.clientHeight ?? 800;
    const top = insets.top + 24;
    return { top, bottom: Math.max(24, Math.min(bottom + 24, height - top - 140)), left: 32, right: 32 };
  };

  const trailBounds = () => (currentTrail.current.length < 2 ? null : pathBounds(currentTrail.current));
  const openPark = () => currentParks.current.find((park) => park.id === currentParkId.current) ?? currentParks.current[0];

  /** Lleva la cámara al encuadre de cada etapa. */
  /**
   * Lleva la cámara al encuadre de cada etapa. `given` es la caja que manda la pantalla junto con la
   * orden: en nativo la orden imperativa y las props cruzan el puente por separado y la orden puede
   * llegar antes que el sendero nuevo; sin ella se encuadraría el sendero anterior.
   */
  function frameStage(instance: MapLibreMap, target: AtlasStage, bottom: number, duration = 1200, given?: GeoBounds) {
    markAppMove(duration * 1.3);
    const park = openPark();
    if (target === 'trail') {
      const bounds = given ?? trailBounds();
      if (bounds) instance.fitBounds(bounds, { padding: padding(bottom), animate, duration });
      return;
    }
    if (!park && !given) return;
    const parkBounds = given ?? park!.bounds;
    if (target === 'parks') {
      // fitBounds, no flyTo con `padding`: easeTo/flyTo dejan ese margen fijo en la cámara y los
      // encuadres siguientes lo sumarían al suyo hasta no caber.
      const [[west, south], [east, north]] = parkBounds;
      instance.fitBounds([[west - OVERVIEW_MARGIN, south - OVERVIEW_MARGIN], [east + OVERVIEW_MARGIN, north + OVERVIEW_MARGIN]], {
        padding: padding(bottom), maxZoom: OVERVIEW_MAX_ZOOM, animate, duration: duration * 1.3, linear: false, curve: 1.6,
      });
      return;
    }
    instance.fitBounds(parkBounds, { padding: padding(bottom), animate, duration });
  }

  /** Caja `[[oeste, sur], [este, norte]]` que llega por el puente como JSON; `undefined` si no es válida. */
  const asBounds = (value: JSONValue | undefined): GeoBounds | undefined => {
    if (!Array.isArray(value) || value.length !== 2) return undefined;
    const [sw, ne] = value;
    if (!Array.isArray(sw) || !Array.isArray(ne) || ![...sw, ...ne].every((n) => typeof n === 'number')) return undefined;
    return [[sw[0] as number, sw[1] as number], [ne[0] as number, ne[1] as number]];
  };

  useDOMImperativeHandle(
    ref,
    () => ({
      fitTrail: () => {
        const bounds = trailBounds();
        markAppMove(900);
        if (bounds) map.current?.fitBounds(bounds, { padding: padding(), animate, duration: 900 });
      },
      fitFrame: () => {
        markAppMove(900);
        map.current?.fitBounds(PUYEHUE_FRAME, { padding: padding(), animate, duration: 900 });
      },
      focus: (longitude, latitude) => {
        const instance = map.current;
        if (!instance || typeof longitude !== 'number' || typeof latitude !== 'number') return;
        // El punto queda en el centro de lo que la cabecera y la tarjeta dejan visible. Con `offset` y
        // no con `padding`, que quedaría fijo en la cámara y descuadraría los encuadres siguientes.
        const { top, bottom } = padding();
        markAppMove(800);
        instance.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(instance.getZoom(), 14),
          offset: [0, (top - bottom) / 2],
          animate,
          duration: 800,
        });
      },
      frame: (target, bottom, bounds) => {
        const instance = map.current;
        if (!instance || !styleReady.current) return;
        if (target !== 'parks' && target !== 'park' && target !== 'trails' && target !== 'trail') return;
        frameStage(instance, target, typeof bottom === 'number' ? bottom : insets.bottom, 1200, asBounds(bounds));
      },
    }),
    [animate, insets.top, insets.bottom, trail],
  );

  useEffect(() => {
    const markerMap = markers.current;
    let disposed = false;
    let reportedTileError = false;
    import('maplibre-gl')
      .then(({ Map, Marker }) => {
        if (disposed || !container.current) return;
        const startsOnTrail = currentStage.current === 'trail';
        const bounds = trailBounds();
        const park = openPark();
        const instance = new Map({
          container: container.current,
          style: mapStyle(colors, currentBasemap.current),
          // La cámara llega desde lejos hasta los parques: ubica antes de mostrar detalle.
          ...(startsOnTrail
            ? { bounds: animate ? PUYEHUE_FRAME : (bounds ?? PUYEHUE_FRAME), fitBoundsOptions: { padding: padding() } }
            : animate || !park
              ? { center: INTRO_CENTER, zoom: INTRO_ZOOM }
              : { center: [park.labelPoint.longitude, park.labelPoint.latitude] as [number, number], zoom: OVERVIEW_ZOOM }),
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          minZoom: 3,
        });
        instance.touchZoomRotate.disableRotation();
        mountOverlay(instance);
        instance.once('load', () => {
          styleReady.current = true;
          // Por si el interruptor cambió mientras cargaba el estilo.
          applyBasemap(instance);
          frameStage(instance, currentStage.current, insets.bottom, 1800);
          container.current?.classList.add('is-ready');
          onStatus('ready');
        });
        instance.on('move', () => drawOverlay(instance));
        instance.on('resize', () => drawOverlay(instance));
        instance.on('error', () => {
          if (reportedTileError) return;
          reportedTileError = true;
          onStatus('tile-error');
        });
        instance.on('webglcontextlost', () => onStatus('failed'));
        instance.on('click', ({ originalEvent, lngLat }) => {
          if ((originalEvent.target as Element | null)?.closest?.('.marker')) return;
          const current = currentStage.current;
          // De lejos, o con un parque abierto, tocar dentro de su límite lo abre; tocar fuera cierra.
          if (current === 'parks' || current === 'park') {
            const point = { longitude: lngLat.lng, latitude: lngLat.lat };
            const hit = currentParks.current.find((candidate) => pointInPolygon(point, candidate.boundary));
            if (hit) onSelectPark(hit.id);
            else if (current === 'park') onSelectPark(null);
            return;
          }
          // Tocar el mapa fuera de un marcador cierra lo seleccionado.
          onSelect(null);
        });
        // Al terminar un movimiento del usuario (pellizco, rueda, arrastre) se revisa si el zoom
        // cambia de etapa. Los de la app quedan marcados con `markAppMove` y no cuentan: la rueda no
        // trae `originalEvent` en `zoomstart`, así que no sirve para distinguirlos.
        instance.on('moveend', () => {
          if (performance.now() < appMoveUntil.current) return;
          switchStageByZoom(instance);
        });
        // En web el cursor avisa que el parque se puede tocar.
        instance.on('mousemove', ({ lngLat }) => {
          const over = currentStage.current === 'parks'
            && currentParks.current.some((candidate) => pointInPolygon({ longitude: lngLat.lng, latitude: lngLat.lat }, candidate.boundary));
          container.current?.classList.toggle('is-over-park', over);
        });
        map.current = instance;
        MarkerClass.current = Marker;
        syncMarkers();
      })
      .catch(() => onStatus('failed'));
    return () => {
      disposed = true;
      styleReady.current = false;
      markerMap.clear();
      map.current?.remove();
      map.current = null;
    };
    // El mapa se crea una vez; capas, etapa y selección se aplican abajo sin recrearlo. Los callbacks y
    // colores que captura llegan estables desde la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /**
   * Alejarse de un sendero lo minimiza en la vista de senderos; acercarse a uno en esa vista lo abre
   * con sus paradas. Dos umbrales distintos para que no salte de ida y vuelta en el límite.
   */
  function switchStageByZoom(instance: MapLibreMap) {
    const zoom = instance.getZoom();
    const current = currentStage.current;
    /** Zoom con que la app encuadraría esa caja ahora mismo. */
    const fitZoom = (bounds: GeoBounds | null) => (bounds ? instance.cameraForBounds(bounds, { padding: padding() })?.zoom : undefined);
    if (current === 'trail') {
      const framed = fitZoom(trailBounds());
      if (framed !== undefined && zoom < framed - TRAIL_ZOOM_OUT_DELTA) zoomHandlers.current.onZoomOutOfTrail();
      return;
    }
    if (current !== 'trails') return;
    // El sendero más cercano al centro de lo visible, si está razonablemente cerca.
    const canvas = instance.getCanvas();
    const center = { x: canvas.clientWidth / 2, y: canvas.clientHeight / 2 };
    let best: { id: string; distance: number } | null = null;
    for (const { id, path } of currentPreviews.current) {
      for (const { longitude, latitude } of path) {
        const { x, y } = instance.project([longitude, latitude]);
        const distance = Math.hypot(x - center.x, y - center.y);
        if (!best || distance < best.distance) best = { id, distance };
      }
    }
    if (!best || best.distance > Math.min(center.x, center.y) * 0.9) return;
    const { id } = best;
    const framed = fitZoom(pathBounds(currentPreviews.current.find((preview) => preview.id === id)?.path ?? []));
    if (framed !== undefined && zoom > framed - TRAIL_ZOOM_IN_DELTA) zoomHandlers.current.onZoomIntoTrail(id);
  }

  function svgPath(className: string, parent: Element) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('class', className);
    path.setAttribute('pathLength', '1');
    parent.appendChild(path);
    return path;
  }

  function svgGroup(className: string, parent: Element) {
    const group = document.createElementNS(SVG_NS, 'g');
    group.setAttribute('class', className);
    parent.appendChild(group);
    return group;
  }

  /**
   * Capa SVG bajo los marcadores, de abajo hacia arriba: límite de cada parque (relleno, halo y
   * borde), senderos del parque en vista previa y el sendero elegido (halo, borde oscuro y trazo lima).
   */
  function mountOverlay(instance: MapLibreMap) {
    const canvasContainer = instance.getCanvasContainer();
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'overlay');
    svg.setAttribute('aria-hidden', 'true');
    const parksGroup = svgGroup('parks', svg);
    parkShapes.current = currentParks.current.map(({ id }) => {
      const group = svgGroup('park', parksGroup);
      group.setAttribute('data-id', id);
      return { id, paths: ['park-fill', 'park-glow', 'park-line'].map((name) => svgPath(name, group)) };
    });
    const previewsGroup = svgGroup('previews', svg);
    previewShapes.current = trailPreviews.map(({ id }, index) => {
      const group = svgGroup('preview', previewsGroup);
      group.setAttribute('style', `--i:${index}`);
      return { id, paths: ['preview-casing', 'preview-line'].map((name) => svgPath(name, group)) };
    });
    const trailGroup = svgGroup('trail', svg);
    trailPath.current = ['trail-glow', 'trail-casing', 'trail-line'].map((name) => svgPath(name, trailGroup));
    canvasContainer.insertBefore(svg, canvasContainer.firstChild?.nextSibling ?? null);
    drawOverlay(instance);
  }

  function project(instance: MapLibreMap, points: GeoPoint[], close: boolean) {
    const d = points
      .map(({ longitude, latitude }, i) => {
        const { x, y } = instance.project([longitude, latitude]);
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    return close ? `${d} Z` : d;
  }

  function drawOverlay(instance: MapLibreMap) {
    parkShapes.current.forEach(({ id, paths }) => {
      const park = currentParks.current.find((candidate) => candidate.id === id);
      if (!park) return;
      const d = project(instance, park.boundary, true);
      paths.forEach((path) => path.setAttribute('d', d));
    });
    // Las vistas previas solo se ven en la etapa de senderos: fuera de ella no se reproyectan.
    if (currentStage.current === 'trails') {
      previewShapes.current.forEach(({ id, paths }) => {
        const preview = trailPreviews.find((candidate) => candidate.id === id);
        if (!preview || preview.path.length < 2) return;
        const d = project(instance, preview.path, false);
        paths.forEach((path) => path.setAttribute('d', d));
      });
    }
    const current = currentTrail.current;
    if (current.length < 2) return;
    const d = project(instance, current, false);
    trailPath.current.forEach((path) => path.setAttribute('d', d));
  }

  /**
   * Lleva los marcadores a los de la etapa actual sin rehacer los que siguen: solo los nuevos se crean y
   * animan. La primera vez aparecen escalonados; después, al activar un filtro o cambiar de etapa, solo
   * entran los que faltaban. El estilo vive en CSS.
   */
  function syncMarkers() {
    const instance = map.current;
    const MarkerCtor = MarkerClass.current;
    if (!instance || !MarkerCtor) return;
    const intro = !introDone.current;
    introDone.current = true;
    type Wanted = { className: string; html: string; lngLat: [number, number]; onClick: () => void; delay?: number };
    const wanted = new Map<string, Wanted>();
    if (stage === 'parks') {
      parks.forEach(({ id, shortName, labelPoint }) => wanted.set(`park:${id}`, {
        className: 'park-label',
        html: `<span class="park-pulse"></span><span class="park-pill">${svgIcon('park', 18)}<span>${escapeHtml(shortName)}</span></span>`,
        lngLat: [labelPoint.longitude, labelPoint.latitude],
        onClick: () => onSelectPark(id),
        // Aparece cuando el límite termina de dibujarse.
        delay: intro ? 1500 : 120,
      }));
    }
    if (stage === 'trails') {
      trailPreviews.forEach(({ id, path }, index) => path.length && wanted.set(`trailhead:${id}`, {
        className: 'trailhead',
        html: '',
        lngLat: [path[0].longitude, path[0].latitude],
        onClick: () => onPickTrail(id),
        delay: 300 + index * TRAILHEAD_STAGGER,
      }));
    }
    if (stage === 'trail' && layers.stops) {
      stops.forEach(({ id, kind, longitude, latitude }) => wanted.set(id, {
        className: `stop stop-${kind}`, html: svgIcon(kind, 22), lngLat: [longitude, latitude], onClick: () => onSelect(id),
      }));
    }
    if (stage === 'trail' && layers.species) {
      points.forEach(({ id, longitude, latitude }) => wanted.set(id, {
        className: 'observation', html: svgIcon('leaf', 20), lngLat: [longitude, latitude], onClick: () => onSelect(id),
      }));
    }
    markers.current.forEach((marker, id) => {
      if (wanted.has(id)) return;
      marker.remove();
      markers.current.delete(id);
    });
    let order = 0;
    wanted.forEach(({ className, html, lngLat, onClick, delay: fixedDelay }, id) => {
      const existing = markers.current.get(id);
      if (existing) {
        existing.setLngLat(lngLat);
        return;
      }
      const element = document.createElement('div');
      element.className = `marker ${className} is-entering`;
      element.classList.toggle('is-selected', id === selectedId);
      const delay = fixedDelay
        ?? (intro ? MARKER_INTRO_DELAY + order * MARKER_INTRO_STAGGER : Math.min(order * MARKER_STAGGER, MARKER_STAGGER_MAX));
      element.style.setProperty('--delay', `${delay}ms`);
      element.innerHTML = className === 'park-label' ? html : `<span class="marker-face">${html}</span>`;
      // Tras entrar, el marcador deja de tener animación: un cambio de estilo no la repite.
      element.addEventListener('animationend', (event) => {
        if (event.target === element.firstElementChild || event.target === element.querySelector('.park-pill')) {
          element.classList.remove('is-entering');
        }
      });
      // Lo accesible son las tarjetas y la vista Lista: el marcador no entra al árbol de accesibilidad.
      element.setAttribute('aria-hidden', 'true');
      element.addEventListener('click', onClick);
      markers.current.set(id, new MarkerCtor({ element }).setLngLat(lngLat).addTo(instance));
      order += 1;
    });
  }

  // Otro sendero: se redibuja. La cámara la mueve la pantalla al cambiar de etapa.
  const shownTrail = useRef(trail);
  useEffect(() => {
    const instance = map.current;
    if (shownTrail.current === trail || !instance || !styleReady.current) return;
    shownTrail.current = trail;
    drawOverlay(instance);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trail]);

  useEffect(() => {
    const instance = map.current;
    if (instance) drawOverlay(instance);
    syncMarkers();
    // Puntos, paradas y capas llegan con referencia estable: solo se rehacen si cambian de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, points, stops, layers.species, layers.stops]);

  function applyBasemap(instance: MapLibreMap) {
    const next = currentBasemap.current;
    instance.setLayoutProperty('osm', 'visibility', visibility(next === 'osm'));
    instance.setLayoutProperty('satellite', 'visibility', visibility(next === 'satellite'));
    instance.setPaintProperty('tint', 'background-opacity', tintOpacity[next]);
  }

  useEffect(() => {
    currentBasemap.current = basemap;
    // Antes de `load` no hay nada que cambiar: el mapa se crea, o termina de cargar, con el vigente.
    if (map.current && styleReady.current) applyBasemap(map.current);
  }, [basemap]);

  useEffect(() => {
    markers.current.forEach((marker, id) => marker.getElement().classList.toggle('is-selected', id === selectedId));
  }, [selectedId]);

  useEffect(() => {
    parkShapes.current.forEach(({ id, paths }) => paths[0].parentElement?.classList.toggle('is-open', id === parkId));
  }, [parkId, stage]);

  const accent = colors.accent;
  return (
    <>
      <style>{`
        html, body { margin: 0; height: 100%; background: ${colors.ground}; overscroll-behavior: none; }
        .maplibregl-canvas { filter: ${basemap === 'satellite' ? SATELLITE_FILTER : 'none'}; }
        .maplibregl-canvas:focus-visible { outline: 2px solid ${accent}; outline-offset: -2px; }
        .atlas-map.is-over-park .maplibregl-canvas-container { cursor: pointer; }
        .overlay { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible; }
        .overlay path { fill: none; stroke-linecap: round; stroke-linejoin: round; }

        /* Parque: relleno lima translúcido, halo difuso y borde. Cada etapa le da otra intensidad. */
        .park path { transition: fill-opacity 600ms ${EASE_OUT_EXPO}, stroke-opacity 600ms ${EASE_OUT_EXPO}, stroke-width 600ms ${EASE_OUT_EXPO}; }
        .overlay .park-fill { fill: ${accent}; fill-opacity: 0.16; stroke: none; }
        .park-glow { stroke: ${accent}; stroke-opacity: 0.35; stroke-width: 12; filter: blur(5px); }
        .park-line { stroke: ${accent}; stroke-width: 2.5; stroke-dasharray: 1; stroke-dashoffset: 0; }
        .park.is-open .park-fill { fill-opacity: 0.1; }
        .park.is-open .park-line { stroke-width: 3; }
        [data-stage="trails"] .park-fill { fill-opacity: 0.05; }
        [data-stage="trails"] .park-glow, [data-stage="trail"] .park-glow { stroke-opacity: 0; }
        [data-stage="trails"] .park-line, [data-stage="trail"] .park-line { stroke-width: 1.5; stroke-opacity: 0.55; }
        [data-stage="trail"] .park-fill { fill-opacity: 0; }

        /* Senderos del parque, finos: solo en la etapa de senderos. */
        .previews { display: none; }
        [data-stage="trails"] .previews { display: inline; }
        .preview path { stroke-dasharray: 1; stroke-dashoffset: 0; }
        .preview-casing { stroke: ${colors.ground}; stroke-opacity: 0.6; stroke-width: 7; }
        .preview-line { stroke: ${accent}; stroke-width: 3.5; }

        /* Sendero elegido. */
        .trail { display: none; }
        [data-stage="trail"] .trail { display: ${layers.trail ? 'inline' : 'none'}; }
        .trail path { stroke-dasharray: 1; stroke-dashoffset: 0; }
        .trail-glow { stroke: ${accent}; stroke-opacity: 0.28; stroke-width: 14; filter: blur(4px); }
        .trail-casing { stroke: ${colors.ground}; stroke-opacity: 0.55; stroke-width: 8; }
        .trail-line { stroke: ${accent}; stroke-width: 4.5; }

        /* 48 px de toque; la cara visible es un círculo de 40 o 44. */
        .marker { width: 48px; height: 48px; display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .marker-face { display: grid; place-items: center; border-radius: 50%; box-sizing: border-box;
          background: ${colors.marker}; color: ${colors.onMarker}; border: 2px solid ${colors.markerBorder};
          box-shadow: 0 4px 12px rgba(0,0,0,0.45); transition: transform 220ms ${EASE_OUT_EXPO}, background 160ms, color 160ms; }
        .observation .marker-face { width: 40px; height: 40px; }
        .stop .marker-face { width: 44px; height: 44px; }
        .trailhead .marker-face { width: 16px; height: 16px; background: ${accent}; border: 3px solid ${colors.ground}; box-shadow: 0 0 0 4px ${accent}55, 0 3px 8px rgba(0,0,0,0.5); }
        .trailhead:hover .marker-face { transform: scale(1.3); }
                .stop-start .marker-face, .stop-end .marker-face { border-color: ${accent}; }
        .marker.is-selected { z-index: 2; }
        .is-selected .marker-face { background: ${accent}; color: ${colors.onAccent}; border-color: ${accent};
          transform: scale(1.14); box-shadow: 0 0 0 6px ${accent}40, 0 6px 16px rgba(0,0,0,0.5); }

        /* Etiqueta del parque: píldora lima con un pulso que invita a tocarla. */
        .park-label { width: max-content; height: auto; display: grid; place-items: center; }
        .park-pill { position: relative; display: flex; align-items: center; gap: 6px; padding: 8px 14px 8px 10px;
          border-radius: 999px; background: ${accent}; color: ${colors.onAccent}; white-space: nowrap;
          font: 700 14px/18px Figtree, system-ui, sans-serif; letter-spacing: -0.1px;
          box-shadow: 0 6px 18px rgba(0,0,0,0.45); transition: transform 220ms ${EASE_OUT_EXPO}; }
        .park-label:hover .park-pill { transform: scale(1.05); }
        .park-label:active .park-pill { transform: scale(0.96); }
        .park-pulse { position: absolute; inset: 0; border-radius: 999px; border: 2px solid ${accent}; opacity: 0; }

        ${animate ? `
        /* Al abrir, el límite del parque se traza y se rellena; después respira despacio. */
        .atlas-map.is-ready .park-line { animation: draw 1800ms ${EASE_OUT_EXPO} 300ms backwards; }
        .atlas-map:not(.is-ready) .park-line { stroke-dashoffset: 1; }
        .atlas-map.is-ready .park-fill { animation: fade-in 1200ms ease-out 900ms backwards; }
        .atlas-map.is-ready[data-stage="parks"] .park-glow { animation: fade-in 1200ms ease-out 900ms backwards, breathe 3200ms ease-in-out 2100ms infinite; }
        [data-stage="parks"] .park-pulse { animation: pulse 2400ms ${EASE_OUT_EXPO} 2000ms infinite; }
        /* Los senderos del parque se dibujan uno tras otro. */
        [data-stage="trails"] .preview path { animation: draw 1100ms ${EASE_OUT_EXPO} calc(200ms + var(--i) * ${TRAILHEAD_STAGGER}ms) backwards; }
        /* El sendero elegido se dibuja de inicio a fin y las paradas aparecen a lo largo. */
        .atlas-map.is-ready .trail path { animation: draw 1600ms ${EASE_OUT_EXPO} 500ms backwards; }
        .is-entering .marker-face { animation: marker-pop ${MARKER_POP}ms ${EASE_OUT_EXPO} var(--delay) backwards; }
        .is-entering .park-pill { animation: pill-rise 520ms ${EASE_OUT_EXPO} var(--delay) backwards; }
        .atlas-map:not(.is-ready) .marker-face, .atlas-map:not(.is-ready) .park-pill { animation-play-state: paused; }
        @keyframes draw { from { stroke-dashoffset: 1; } }
        @keyframes fade-in { from { fill-opacity: 0; stroke-opacity: 0; } }
        @keyframes breathe { 50% { stroke-opacity: 0.12; } }
        @keyframes pulse { from { opacity: 0.7; transform: scale(1); } to { opacity: 0; transform: scale(1.35, 1.9); } }
        @keyframes marker-pop { from { transform: scale(0.4); opacity: 0; } }
        @keyframes pill-rise { from { transform: translateY(10px) scale(0.8); opacity: 0; } }
        ` : ''}
      `}</style>
      {/* Absoluto: llena el WebView en nativo y el contenedor del mapa en web, donde no hay WebView. */}
      <div ref={container} className="atlas-map" data-stage={stage} style={{ position: 'absolute', inset: 0, isolation: 'isolate' }} />
    </>
  );
}
