'use dom';

import 'maplibre-gl/dist/maplibre-gl.css';

import { type DOMImperativeFactory, type DOMProps, useDOMImperativeHandle } from 'expo/dom';
import type { JSONValue } from 'expo/build/dom/dom.types';
import type { Map as MapLibreMap, Marker, RasterLayerSpecification, StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { type GeoBounds, type GeoPoint, pathBounds } from '@/domain/geo';
import type { TrailStopKind } from '@/features/atlas/demo-trail';

// MapLibre GL JS dentro de un Expo DOM component (ADR 0002). Recibe datos ya resueltos como props
// y no hace peticiones a la API; solo pide teselas del mapa base.
// Ni las observaciones ni el sendero usan fuentes GeoJSON: una fuente GeoJSON se procesa en el Web
// Worker de MapLibre y, si el worker no arranca dentro del WebView, el evento `load` nunca llega.
// Los marcadores son HTML y el sendero es un SVG que se reproyecta cuando la cámara se mueve.
// Este archivo no importa `@/ui` ni nada que cargue React Native: el DOM component no puede; solo
// módulos de TypeScript puro como `@/domain/geo`, y tipos.

export type AtlasMapStatus = 'ready' | 'tile-error' | 'failed';

export interface AtlasMapHandle extends DOMImperativeFactory {
  fitTrail(): void;
  fitFrame(): void;
  /** Centra la cámara en un punto; los argumentos cruzan el puente como JSON. */
  focus(...args: JSONValue[]): void;
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

type AtlasMapProps = {
  ref: React.Ref<AtlasMapHandle>;
  colors: AtlasMapColors;
  reducedMotion: boolean;
  points: AtlasMapPoint[];
  trail: GeoPoint[];
  stops: AtlasMapStop[];
  layers: AtlasMapLayers;
  /** Marcador destacado: una observación o una parada. */
  selectedId: string | null;
  /** Espacio que tapan la cabecera y la tarjeta inferior, para encuadrar lo que queda visible. */
  insets: { top: number; bottom: number };
  onStatus: (status: AtlasMapStatus) => void;
  onSelect: (id: string | null) => void;
  dom?: DOMProps;
};

// Encuadre del rango de coordenadas publicado por CONAF, no límites oficiales del parque (docs/SOURCES.md).
const PUYEHUE_FRAME: GeoBounds = [
  [-(72 + 20 / 60), -(40 + 57 / 60)],
  [-(71 + 50 / 60), -(40 + 25 / 60)],
];

// Teselas OSM oscurecidas: se invierte el brillo y se devuelve el tono, y una veladura verde las
// lleva al bosque nocturno. Prepara el lugar del mapa satelital, que espera un proveedor con licencia.
const rasterPaint: NonNullable<RasterLayerSpecification['paint']> = {
  'raster-saturation': -0.6,
  'raster-contrast': 0.3,
  'raster-brightness-min': 0.72,
  'raster-brightness-max': 0.035,
  'raster-hue-rotate': 180,
};

function mapStyle(colors: AtlasMapColors): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19 },
    },
    layers: [
      { id: 'ground', type: 'background', paint: { 'background-color': colors.ground } },
      { id: 'osm', type: 'raster', source: 'osm', paint: rasterPaint },
      { id: 'tint', type: 'background', paint: { 'background-color': colors.tint, 'background-opacity': 0.3 } },
    ],
  };
}

const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
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
};

function svgIcon(name: keyof typeof icons, size: number) {
  return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" ${ICON} aria-hidden="true">${icons[name]}</svg>`;
}

export default function AtlasMap({
  ref, colors, reducedMotion, points, trail, stops, layers, selectedId, insets, onStatus, onSelect,
}: AtlasMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const MarkerClass = useRef<typeof Marker | null>(null);
  const trailPath = useRef<SVGPathElement[]>([]);
  const animate = !reducedMotion;

  const padding = () => ({ top: insets.top + 24, bottom: insets.bottom + 24, left: 32, right: 32 });

  const trailBounds = () => (trail.length < 2 ? null : pathBounds(trail));

  useDOMImperativeHandle(
    ref,
    () => ({
      fitTrail: () => {
        const bounds = trailBounds();
        if (bounds) map.current?.fitBounds(bounds, { padding: padding(), animate, duration: 900 });
      },
      fitFrame: () => {
        map.current?.fitBounds(PUYEHUE_FRAME, { padding: padding(), animate, duration: 900 });
      },
      focus: (longitude, latitude) => {
        const instance = map.current;
        if (!instance || typeof longitude !== 'number' || typeof latitude !== 'number') return;
        // El punto queda en el centro de lo que la cabecera y la tarjeta dejan visible.
        instance.easeTo({
          center: [longitude, latitude],
          zoom: Math.max(instance.getZoom(), 14),
          padding: padding(),
          animate,
          duration: 800,
        });
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
        const bounds = trailBounds();
        const instance = new Map({
          container: container.current,
          style: mapStyle(colors),
          // La cámara llega desde el entorno hasta el sendero: ubica antes de mostrar detalle.
          bounds: animate ? PUYEHUE_FRAME : (bounds ?? PUYEHUE_FRAME),
          fitBoundsOptions: { padding: padding() },
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          minZoom: 5,
        });
        instance.touchZoomRotate.disableRotation();
        mountTrail(instance);
        instance.once('load', () => {
          if (bounds) instance.fitBounds(bounds, { padding: padding(), animate, duration: 1600 });
          container.current?.classList.add('is-ready');
          onStatus('ready');
        });
        instance.on('move', () => drawTrail(instance));
        instance.on('resize', () => drawTrail(instance));
        instance.on('error', () => {
          if (reportedTileError) return;
          reportedTileError = true;
          onStatus('tile-error');
        });
        instance.on('webglcontextlost', () => onStatus('failed'));
        // Tocar el mapa fuera de un marcador cierra lo seleccionado.
        instance.on('click', ({ originalEvent }) => {
          if (!(originalEvent.target as Element | null)?.closest?.('.marker')) onSelect(null);
        });
        map.current = instance;
        MarkerClass.current = Marker;
        syncMarkers();
      })
      .catch(() => onStatus('failed'));
    return () => {
      disposed = true;
      markerMap.clear();
      map.current?.remove();
      map.current = null;
    };
    // El mapa se crea una vez; capas y selección se aplican abajo sin recrearlo. Los callbacks y
    // colores que captura llegan estables desde la pantalla.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Capa SVG del sendero bajo los marcadores: halo, borde oscuro y trazo lima. */
  function mountTrail(instance: MapLibreMap) {
    const canvasContainer = instance.getCanvasContainer();
    const svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'trail');
    svg.setAttribute('aria-hidden', 'true');
    trailPath.current = ['trail-glow', 'trail-casing', 'trail-line'].map((name) => {
      const path = document.createElementNS(SVG_NS, 'path');
      path.setAttribute('class', name);
      path.setAttribute('pathLength', '1');
      svg.appendChild(path);
      return path;
    });
    canvasContainer.insertBefore(svg, canvasContainer.firstChild?.nextSibling ?? null);
    drawTrail(instance);
  }

  function drawTrail(instance: MapLibreMap) {
    if (trail.length < 2) return;
    const d = trail
      .map(({ longitude, latitude }, i) => {
        const { x, y } = instance.project([longitude, latitude]);
        return `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`;
      })
      .join(' ');
    trailPath.current.forEach((path) => path.setAttribute('d', d));
  }

  /** Reemplaza los marcadores por los actuales; el estilo vive en CSS. */
  function syncMarkers() {
    const instance = map.current;
    const MarkerCtor = MarkerClass.current;
    if (!instance || !MarkerCtor) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    const add = (id: string, className: string, html: string, lngLat: [number, number], order: number) => {
      const element = document.createElement('div');
      element.className = `marker ${className}`;
      element.classList.toggle('is-selected', id === selectedId);
      element.style.setProperty('--delay', `${900 + order * 70}ms`);
      element.innerHTML = `<span class="marker-face">${html}</span>`;
      // Lo accesible es la vista Lista: el marcador no entra al árbol de accesibilidad.
      element.setAttribute('aria-hidden', 'true');
      element.addEventListener('click', () => onSelect(id));
      markers.current.set(id, new MarkerCtor({ element }).setLngLat(lngLat).addTo(instance));
    };
    if (layers.stops) {
      stops.forEach(({ id, kind, longitude, latitude }, i) => add(id, `stop stop-${kind}`, svgIcon(kind, 22), [longitude, latitude], i));
    }
    if (layers.species) {
      points.forEach(({ id, longitude, latitude }, i) =>
        add(id, 'observation', svgIcon('leaf', 20), [longitude, latitude], stops.length + i));
    }
  }

  useEffect(() => {
    syncMarkers();
    // Puntos, paradas y capas llegan con referencia estable: solo se rehacen si cambian de verdad.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [points, stops, layers.species, layers.stops]);

  useEffect(() => {
    markers.current.forEach((marker, id) => marker.getElement().classList.toggle('is-selected', id === selectedId));
  }, [selectedId]);

  return (
    <>
      <style>{`
        html, body { margin: 0; height: 100%; background: ${colors.ground}; overscroll-behavior: none; }
        .maplibregl-canvas:focus-visible { outline: 2px solid ${colors.accent}; outline-offset: -2px; }
        .trail { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; overflow: visible;
          display: ${layers.trail ? 'block' : 'none'}; }
        .trail path { fill: none; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 1; stroke-dashoffset: 0; }
        .trail-glow { stroke: ${colors.accent}; stroke-opacity: 0.28; stroke-width: 14; filter: blur(4px); }
        .trail-casing { stroke: ${colors.ground}; stroke-opacity: 0.55; stroke-width: 8; }
        .trail-line { stroke: ${colors.accent}; stroke-width: 4.5; }
        /* 48 px de toque; la cara visible es un círculo de 40 o 44. */
        .marker { width: 48px; height: 48px; display: grid; place-items: center; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .marker-face { display: grid; place-items: center; border-radius: 50%; box-sizing: border-box;
          background: ${colors.marker}; color: ${colors.onMarker}; border: 2px solid ${colors.markerBorder};
          box-shadow: 0 4px 12px rgba(0,0,0,0.45); transition: transform 220ms ${EASE_OUT_EXPO}, background 160ms, color 160ms; }
        .observation .marker-face { width: 40px; height: 40px; }
        .stop .marker-face { width: 44px; height: 44px; }
        .stop-start .marker-face, .stop-end .marker-face { border-color: ${colors.accent}; }
        .marker.is-selected { z-index: 2; }
        .is-selected .marker-face { background: ${colors.accent}; color: ${colors.onAccent}; border-color: ${colors.accent};
          transform: scale(1.14); box-shadow: 0 0 0 6px ${colors.accent}40, 0 6px 16px rgba(0,0,0,0.5); }
        ${animate ? `
        /* Al mostrarse el mapa el sendero se dibuja de inicio a fin y los marcadores aparecen a lo largo. */
        .atlas-map.is-ready .trail path { animation: trail-draw 1600ms ${EASE_OUT_EXPO} 500ms backwards; }
        .atlas-map:not(.is-ready) .trail path { stroke-dashoffset: 1; }
        .marker-face { animation: marker-pop 420ms ${EASE_OUT_EXPO} var(--delay) backwards; }
        .atlas-map:not(.is-ready) .marker-face { animation-play-state: paused; }
        @keyframes trail-draw { from { stroke-dashoffset: 1; } }
        @keyframes marker-pop { from { transform: scale(0.4); opacity: 0; } }
        ` : ''}
      `}</style>
      {/* Absoluto: llena el WebView en nativo y el contenedor del mapa en web, donde no hay WebView. */}
      <div ref={container} className="atlas-map" style={{ position: 'absolute', inset: 0, isolation: 'isolate' }} />
    </>
  );
}
