'use dom';

import 'maplibre-gl/dist/maplibre-gl.css';

import { type DOMImperativeFactory, type DOMProps, useDOMImperativeHandle } from 'expo/dom';
import type { Map as MapLibreMap, Marker, RasterLayerSpecification, StyleSpecification } from 'maplibre-gl';
import { useEffect, useRef } from 'react';

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

export type AtlasMapColors = { background: string; ink: string; surface: string; outline: string };

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
const FRAME_PADDING = { top: 72, bottom: 56, left: 24, right: 80 };

// Las teselas OSM se tiñen hacia la paleta del herbario; en oscuro se invierte el brillo y se
// devuelve el tono, para que el mapa no encandile de noche. Solo cambia el render, no los datos.
const rasterPaint: Record<AtlasMapProps['scheme'], NonNullable<RasterLayerSpecification['paint']>> = {
  light: {
    'raster-saturation': -0.55,
    'raster-contrast': -0.08,
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

function mapStyle(scheme: AtlasMapProps['scheme'], background: string): StyleSpecification {
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
    ],
  };
}

export default function AtlasMap({ ref, scheme, colors, reducedMotion, points, selectedId, onStatus, onSelect }: AtlasMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const markers = useRef<Map<string, Marker>>(new Map());
  const MarkerClass = useRef<typeof Marker | null>(null);
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
          style: mapStyle(scheme, colors.background),
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
    const paint = rasterPaint[scheme];
    for (const key of Object.keys(paint) as (keyof typeof paint)[]) {
      instance.setPaintProperty('osm', key, paint[key]);
    }
  }, [scheme, colors.background]);

  /** Reemplaza los marcadores por los puntos actuales; el estilo vive en CSS y sigue al tema. */
  function syncMarkers() {
    const instance = map.current;
    const MarkerCtor = MarkerClass.current;
    if (!instance || !MarkerCtor) return;
    markers.current.forEach((marker) => marker.remove());
    markers.current.clear();
    for (const { id, longitude, latitude } of points) {
      const element = document.createElement('div');
      element.className = id === selectedId ? 'observation-marker is-selected' : 'observation-marker';
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
    if (point && !instance.getBounds().contains([point.longitude, point.latitude])) {
      instance.easeTo({ center: [point.longitude, point.latitude], animate, duration: 900 });
    }
    // Solo reacciona a la selección; los puntos y el movimiento se leen al momento.
  }, [selectedId]);

  return (
    <>
      <style>{`
        html, body { margin: 0; height: 100%; background: ${colors.background}; overscroll-behavior: none; }
        .maplibregl-canvas:focus-visible { outline: 2px solid ${colors.ink}; outline-offset: -2px; }
        .maplibregl-ctrl-bottom-left .maplibregl-ctrl-scale {
          margin: 0 0 12px 12px; padding: 1px 6px; border: 1.5px solid ${colors.ink}; border-top: 0;
          background: ${colors.surface}; color: ${colors.ink};
          font: 500 11px/16px Roboto, system-ui, sans-serif; letter-spacing: 0.4px;
          font-variant-numeric: tabular-nums;
        }
        /* Área de toque de 32 px alrededor de un círculo abierto de 12 px: «sin verificar». */
        .observation-marker {
          width: 32px; height: 32px; display: grid; place-items: center; cursor: pointer;
          -webkit-tap-highlight-color: transparent;
        }
        .observation-marker::before {
          content: ''; box-sizing: border-box; width: 12px; height: 12px; border-radius: 50%;
          background: ${colors.surface}; border: 2.5px solid ${colors.ink};
        }
        .observation-marker.is-selected::before {
          box-shadow: 0 0 0 3px ${colors.surface}, 0 0 0 5px ${colors.ink};
        }
      `}</style>
      {/* Absoluto: llena el WebView en nativo y el contenedor del mapa en web, donde no hay WebView. */}
      <div ref={container} style={{ position: 'absolute', inset: 0 }} />
    </>
  );
}
