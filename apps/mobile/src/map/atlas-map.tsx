'use dom';

import 'maplibre-gl/dist/maplibre-gl.css';

import { type DOMImperativeFactory, type DOMProps, useDOMImperativeHandle } from 'expo/dom';
import type { Map as MapLibreMap, Marker, RasterLayerSpecification, StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

import { leafPath, seeded, seedOf } from '@/ui/art/brush';

// MapLibre GL JS dentro de un Expo DOM component (ADR 0002). Recibe datos ya resueltos como props
// y no hace peticiones a la API; solo pide teselas del mapa base.
// Las observaciones son marcadores HTML, no una fuente GeoJSON: una fuente GeoJSON se procesa en el
// Web Worker de MapLibre y, si el worker no arranca dentro del WebView, el evento `load` nunca llega.

export type AtlasMapStatus = 'ready' | 'tile-error' | 'failed';

export interface AtlasMapHandle extends DOMImperativeFactory {
  zoomIn: () => void;
  zoomOut: () => void;
  recenter: () => void;
}

export type AtlasMapColors = { background: string; ink: string; surface: string; outline: string; leaf: string; tint: string };

/** Observación ya resuelta para dibujar: solo lo que el mapa necesita. */
export type AtlasMapPoint = { id: string; longitude: number; latitude: number };

type AtlasMapProps = {
  ref: React.Ref<AtlasMapHandle>;
  scheme: 'light' | 'dark';
  colors: AtlasMapColors;
  reducedMotion: boolean;
  points: AtlasMapPoint[];
  selectedId: string | null;
  onStatus: (status: AtlasMapStatus) => void;
  onSelect: (id: string | null) => void;
  dom?: DOMProps;
};

// Encuadre del rango de coordenadas publicado por CONAF, no límites oficiales del parque (docs/SOURCES.md).
const PUYEHUE_FRAME: [[number, number], [number, number]] = [
  [-(72 + 20 / 60), -(40 + 57 / 60)],
  [-(71 + 50 / 60), -(40 + 25 / 60)],
];
// Alto aproximado que ocupa la papeleta de la observación sobre el borde inferior del mapa.
const CARD_CLEARANCE = 320;
const FRAME_PADDING = { top: 72, bottom: 56, left: 24, right: 80 };

// Las teselas OSM se tiñen hacia la paleta del cuaderno; en oscuro se invierte el brillo y se
// devuelve el tono, para que el mapa no encandile de noche. Solo cambia el render, no los datos.
const rasterPaint: Record<AtlasMapProps['scheme'], NonNullable<RasterLayerSpecification['paint']>> = {
  light: {
    'raster-saturation': -0.3,
    'raster-contrast': 0,
    'raster-brightness-min': 0.06,
    'raster-brightness-max': 0.97,
    'raster-hue-rotate': 0,
  },
  dark: {
    'raster-saturation': -0.6,
    'raster-contrast': -0.1,
    'raster-brightness-min': 0.86,
    'raster-brightness-max': 0.06,
    'raster-hue-rotate': 180,
  },
};

// Una aguada verde translúcida sobre las teselas: el mapa entra en la paleta del cuaderno.
const tintOpacity: Record<AtlasMapProps['scheme'], number> = { light: 0.14, dark: 0.22 };

function mapStyle(scheme: AtlasMapProps['scheme'], background: string, tint: string): StyleSpecification {
  return {
    version: 8,
    sources: {
      osm: {
        type: 'raster',
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        maxzoom: 19,
      },
    },
    layers: [
      { id: 'paper', type: 'background', paint: { 'background-color': background } },
      { id: 'osm', type: 'raster', source: 'osm', paint: rasterPaint[scheme] },
      { id: 'tint', type: 'background', paint: { 'background-color': tint, 'background-opacity': tintOpacity[scheme] } },
    ],
  };
}

const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';
// Las hojas caen cuando la cámara se posa sobre el encuadre (1600 ms), de oeste a este.
const LEAF_LANDING_MS = 900;
const LEAF_STAGGER_MS = 110;

/**
 * Hoja de acuarela verde oscuro de 48 px: veladuras que no calzan, filo seco y, encima, la hoja
 * entintada con su nervio y nervaduras en claro. La misma observación pinta siempre la
 * misma hoja, con su propia inclinación. Es un signo del cuaderno, no la hoja de la especie.
 */
function leafSvg(id: string, colors: AtlasMapColors) {
  const seed = seedOf(id);
  const rand = seeded(seed);
  const tilt = (rand() - 0.5) * 80;
  const veils = [0, 1, 2].map((i) => {
    const drift = () => (rand() - 0.5) * 2;
    return leafPath(seed + i * 31, 24 + drift(), 23 + drift(), 30 - i * 3, 17 - i * 2, 0.22);
  });
  const outline = leafPath(seed + 101, 24, 23, 26, 13.5, 0.06);
  const halo = leafPath(seed + 107, 24, 23, 36, 22, 0.08);
  const bend = (rand() - 0.5) * 3;
  const stalk = 'M24,41 L24,34';
  const rib = `M24,35 Q${24 + bend},24 24,13`;
  const veins = [0, 1, 2]
    .map((i) => {
      const y = 30 - i * 5;
      const reach = 5 - i * 1.2;
      return `M24,${y} q${reach * 0.6},-2 ${reach},-${3.2 - i * 0.6} M24,${y - 1} q-${reach * 0.6},-2 -${reach},-${3.2 - i * 0.6}`;
    })
    .join(' ');
  const { leaf, surface } = colors;
  return `
    <svg class="leaf" viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
      <circle class="leaf-ripple" cx="24" cy="24" r="13" fill="none" stroke="${leaf}" stroke-width="1.2" />
      <g transform="rotate(${tilt.toFixed(1)} 24 24)">
        <g class="leaf-wash">
          <path d="${veils[0]}" fill="${surface}" fill-opacity="0.78" />
          ${veils.map((d) => `<path d="${d}" fill="${leaf}" fill-opacity="0.2" />`).join('')}
          <path d="${veils[0]}" fill="none" stroke="${leaf}" stroke-opacity="0.4" stroke-width="0.9" />
        </g>
        <path class="leaf-halo" d="${halo}" pathLength="1" fill="none" stroke="${leaf}" stroke-width="1.6" stroke-linecap="round" />
        <path class="leaf-stalk" d="${stalk}" fill="none" stroke="${leaf}" stroke-width="1.8" stroke-linecap="round" />
        <path class="leaf-core" d="${outline}" fill="${leaf}" fill-opacity="0.88" />
        <path class="leaf-ring" d="${outline}" pathLength="1" fill="none" stroke="${leaf}" stroke-width="2.6" stroke-linejoin="round" stroke-linecap="round" />
        <path class="leaf-rib" d="${rib}" pathLength="1" fill="none" stroke="${surface}" stroke-opacity="0.85" stroke-width="1.4" stroke-linecap="round" />
        <path class="leaf-veins" d="${veins}" fill="none" stroke="${surface}" stroke-opacity="0.55" stroke-width="0.8" stroke-linecap="round" />
      </g>
    </svg>`;
}

export default function AtlasMap({ ref, scheme, colors, reducedMotion, points, selectedId, onStatus, onSelect }: AtlasMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const MarkerClass = useRef<typeof Marker | null>(null);
  const painted = useRef(false);
  const animate = !reducedMotion;

  useDOMImperativeHandle(
    ref,
    () => ({
      zoomIn: () => map.current?.zoomIn({ animate }),
      zoomOut: () => map.current?.zoomOut({ animate }),
      recenter: () => map.current?.fitBounds(PUYEHUE_FRAME, { padding: FRAME_PADDING, animate, duration: 900 }),
    }),
    [animate],
  );

  useEffect(() => {
    let disposed = false;
    let reportedTileError = false;
    import('maplibre-gl')
      .then(({ Map, Marker, ScaleControl }) => {
        if (disposed || !container.current) return;
        const instance = new Map({
          container: container.current,
          style: mapStyle(scheme, colors.background, colors.tint),
          // La cámara llega desde la escala regional hasta el encuadre: ubica antes de mostrar detalle.
          center: [-72.08, -40.68],
          zoom: animate ? 7 : 9,
          attributionControl: false,
          dragRotate: false,
          pitchWithRotate: false,
          touchPitch: false,
          minZoom: 5,
        });
        instance.touchZoomRotate.disableRotation();
        instance.addControl(new ScaleControl({ unit: 'metric', maxWidth: 96 }), 'bottom-left');
        instance.once('load', () => {
          instance.fitBounds(PUYEHUE_FRAME, { padding: FRAME_PADDING, animate, duration: 1600 });
          // Las hojas esperan pintadas en pausa hasta que el mapa carga.
          container.current?.classList.add('is-ready');
          onStatus('ready');
        });
        instance.on('error', () => {
          if (reportedTileError) return;
          reportedTileError = true;
          onStatus('tile-error');
        });
        instance.on('webglcontextlost', () => onStatus('failed'));
        // Tocar el mapa fuera de un marcador cierra la observación abierta.
        instance.on('click', ({ originalEvent }) => {
          if (!(originalEvent.target as Element | null)?.closest?.('.observation-marker')) onSelect(null);
        });
        map.current = instance;
        MarkerClass.current = Marker;
        syncMarkers();
      })
      .catch(() => onStatus('failed'));
    return () => {
      disposed = true;
      markers.current.clear();
      map.current?.remove();
      map.current = null;
    };
    // El mapa se crea una vez; el tema se aplica abajo sin recrearlo.
  }, []);

  useEffect(() => {
    const instance = map.current;
    if (!instance?.isStyleLoaded()) return;
    instance.setPaintProperty('paper', 'background-color', colors.background);
    instance.setPaintProperty('tint', 'background-color', colors.tint);
    instance.setPaintProperty('tint', 'background-opacity', tintOpacity[scheme]);
    const paint = rasterPaint[scheme];
    for (const key of Object.keys(paint) as (keyof typeof paint)[]) {
      instance.setPaintProperty('osm', key, paint[key]);
    }
  }, [scheme, colors.background, colors.tint]);

  /** Reemplaza los marcadores por los puntos actuales; el estilo vive en CSS y sigue al tema. */
  function syncMarkers() {
    const instance = map.current;
    const MarkerCtor = MarkerClass.current;
    if (!instance || !MarkerCtor) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    // La primera vez las hojas esperan a que la cámara se pose; después, las nuevas caen enseguida.
    const landing = painted.current ? 0 : LEAF_LANDING_MS;
    painted.current = true;
    const westToEast = points.toSorted((a, b) => a.longitude - b.longitude).map(({ id }) => id);
    for (const { id, longitude, latitude } of points) {
      const element = document.createElement('div');
      element.className = id === selectedId ? 'observation-marker is-selected' : 'observation-marker';
      element.style.setProperty('--delay', `${landing + westToEast.indexOf(id) * LEAF_STAGGER_MS}ms`);
      element.innerHTML = leafSvg(id, colors);
      // Lo accesible es la vista Lista: el marcador no entra al árbol de accesibilidad.
      element.setAttribute('aria-hidden', 'true');
      element.addEventListener('click', () => onSelect(id));
      markers.current.set(id, new MarkerCtor({ element }).setLngLat([longitude, latitude]).addTo(instance));
    }
  }

  useEffect(() => {
    syncMarkers();
    // Los puntos llegan con referencia estable: solo se rehacen si cambian de verdad.
  }, [points]);

  // Una selección hecha desde la lista puede quedar fuera de la vista: el mapa la acerca.
  useEffect(() => {
    markers.current.forEach((marker, id) => marker.getElement().classList.toggle('is-selected', id === selectedId));
    const instance = map.current;
    if (!instance) return;
    const point = points.find(({ id }) => id === selectedId);
    if (!point) return;
    const lngLat: [number, number] = [point.longitude, point.latitude];
    if (!instance.getBounds().contains(lngLat)) {
      instance.easeTo({ center: lngLat, animate, duration: 900 });
      return;
    }
    // La papeleta cubre la parte baja del mapa: si la hoja queda debajo, el mapa la sube a la vista.
    const { y } = instance.project(lngLat);
    const limit = instance.getContainer().clientHeight - CARD_CLEARANCE;
    if (y > limit) instance.panBy([0, y - limit + 24], { animate, duration: 600 });
    // Solo reacciona a la selección; los puntos y el movimiento se leen al momento.
  }, [selectedId]);

  return (
    <>
      <style>{`
        html, body { margin: 0; height: 100%; background: ${colors.background}; overscroll-behavior: none; }
        .maplibregl-canvas:focus-visible { outline: 2px solid ${colors.ink}; outline-offset: -2px; }
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl-scale {
          margin: 0 0 12px 12px; padding: 1px 6px; border: 2px solid ${colors.ink}; border-top: 0;
          background: ${colors.surface}; color: ${colors.ink};
          font: 500 11px/16px Roboto, system-ui, sans-serif; letter-spacing: 0.4px;
          font-variant-numeric: tabular-nums;
        }
        /* Hoja verde oscuro de 48 px: área de toque completa. */
        .observation-marker { width: 48px; height: 48px; cursor: pointer; -webkit-tap-highlight-color: transparent; }
        .observation-marker.is-selected { z-index: 2; }
        .leaf { display: block; overflow: visible; }
        .leaf-wash, .leaf-ripple { transform-box: view-box; transform-origin: 24px 24px; }
        .leaf-ring, .leaf-rib, .leaf-halo { stroke-dasharray: 1; }
        .leaf-halo { stroke-dashoffset: 1; }
        .leaf-ripple { opacity: 0; }
        /* Seleccionada: la aguada se abre y un segundo contorno la rodea. */
        .is-selected .leaf-wash { transform: scale(1.3); }
        .is-selected .leaf-halo { stroke-dashoffset: 0; }
        ${animate ? `
        .leaf { transition: transform 140ms ${EASE_OUT_EXPO}; }
        .observation-marker:active .leaf { transform: scale(0.88); }
        .leaf-wash { transition: transform 520ms ${EASE_OUT_EXPO}; }
        .leaf-halo { transition: stroke-dashoffset 480ms ${EASE_OUT_EXPO}; }
        .is-selected .leaf-ripple { animation: leaf-ripple 900ms ${EASE_OUT_EXPO}; }
        /* La hoja cae: se mece al posarse, la aguada florece y el contorno se entinta encima. */
        .leaf { animation: leaf-fall 820ms ${EASE_OUT_EXPO} var(--delay) backwards; }
        .leaf-wash > * { animation: leaf-bloom 760ms ${EASE_OUT_EXPO} var(--delay) backwards; transform-box: view-box; transform-origin: 24px 24px; }
        .leaf-core, .leaf-stalk { animation: leaf-fade 160ms ease-out var(--delay) backwards; }
        .leaf-ring { animation: leaf-ink 520ms ${EASE_OUT_EXPO} calc(var(--delay) + 140ms) backwards; }
        .leaf-rib { animation: leaf-ink 420ms ${EASE_OUT_EXPO} calc(var(--delay) + 360ms) backwards; }
        .leaf-veins { animation: leaf-fade 240ms ease-out calc(var(--delay) + 600ms) backwards; }
        .atlas-map:not(.is-ready) .leaf, .atlas-map:not(.is-ready) .leaf * { animation-play-state: paused; }
        @keyframes leaf-fall { from { transform: translate(-6px, -14px) rotate(-18deg); opacity: 0; } 60% { transform: translate(2px, 1px) rotate(6deg); opacity: 1; } }
        @keyframes leaf-bloom { from { transform: scale(0.15); opacity: 0; } }
        @keyframes leaf-fade { from { opacity: 0; } }
        @keyframes leaf-ink { from { stroke-dashoffset: 1; } }
        @keyframes leaf-ripple { from { opacity: 0.6; transform: scale(0.7); } to { opacity: 0; transform: scale(2); } }
        ` : ''}
      `}</style>
      {/* Absoluto: llena el WebView en nativo y el contenedor del mapa en web, donde no hay WebView. */}
      <div ref={container} className="atlas-map" style={{ position: 'absolute', inset: 0, isolation: 'isolate' }} />
    </>
  );
}
