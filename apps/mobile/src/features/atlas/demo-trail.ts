import type { GeoPoint } from '@/domain/geo';

// SENDEROS DE DEMOSTRACIÓN, trazados SINTÉTICOS: las coordenadas se generaron con curvas dentro del
// límite OSM del parque (src/features/atlas/parks.ts) para mostrar cómo se vería un recorrido. Ninguno
// es un sendero real, no siguen ninguna huella del terreno y no sirven para orientarse. La app los
// rotula como demostración.

export type TrailStopKind = 'start' | 'viewpoint' | 'photo' | 'end';

export type TrailStop = { id: string; kind: TrailStopKind; name: string; point: GeoPoint };

export type DemoTrail = { id: string; name: string; path: GeoPoint[]; stops: TrailStop[] };

const toPath = (coords: readonly (readonly [number, number])[]): GeoPoint[] =>
  coords.map(([longitude, latitude]) => ({ longitude, latitude }));

/** Paradas tipo: inicio, mirador, punto de foto y final en las posiciones dadas del trazado. */
function stopsAlong(id: string, path: GeoPoint[], viewpoint: number, photo: number): TrailStop[] {
  return [
    { id: `${id}-start`, kind: 'start', name: 'Inicio', point: path[0] },
    { id: `${id}-viewpoint`, kind: 'viewpoint', name: 'Mirador', point: path[viewpoint] },
    { id: `${id}-photo`, kind: 'photo', name: 'Punto de foto', point: path[photo] },
    { id: `${id}-end`, kind: 'end', name: 'Final', point: path[path.length - 1] },
  ];
}

const path = toPath(
  [
    [-72.152, -40.70007], [-72.14773, -40.69817], [-72.14431, -40.6967], [-72.1423, -40.69568],
    [-72.14179, -40.6951], [-72.14235, -40.69489], [-72.14319, -40.69491], [-72.14343, -40.695],
    [-72.14238, -40.69499], [-72.13981, -40.69472], [-72.13598, -40.69407], [-72.1316, -40.69301],
    [-72.12755, -40.69153], [-72.12462, -40.68971], [-72.12319, -40.68767], [-72.12316, -40.68559],
    [-72.12393, -40.68363], [-72.12465, -40.68195],
  ] as const,
);

export const demoTrail: DemoTrail = {
  id: 'demo-trail',
  name: 'Sendero de demostración',
  path,
  stops: stopsAlong('demo-trail', path, 5, 11),
};

// Circuito: vuelve a su inicio.
const loopPath = toPath([
  [-72.035, -40.73], [-72.03682, -40.72753], [-72.04122, -40.7253], [-72.0458, -40.72353], [-72.04872, -40.72239],
  [-72.05, -40.722], [-72.05128, -40.72239], [-72.0542, -40.72353], [-72.05878, -40.7253], [-72.06318, -40.72753],
  [-72.065, -40.73], [-72.06318, -40.73247], [-72.05878, -40.7347], [-72.0542, -40.73647], [-72.05128, -40.73761],
  [-72.05, -40.738], [-72.04872, -40.73761], [-72.0458, -40.73647], [-72.04122, -40.7347], [-72.03682, -40.73247],
  [-72.035, -40.73],
] as const);

// Subida en zigzag hacia el noreste.
const zigzagPath = toPath([
  [-72.27, -40.715], [-72.2678, -40.71069], [-72.2656, -40.70991], [-72.2634, -40.71102], [-72.2612, -40.70961],
  [-72.259, -40.70496], [-72.2568, -40.7011], [-72.2546, -40.7009], [-72.2524, -40.70187], [-72.2502, -40.6998],
  [-72.248, -40.69495], [-72.2458, -40.69163], [-72.2436, -40.69193], [-72.2414, -40.69262], [-72.2392, -40.68991],
  [-72.237, -40.68499], [-72.2348, -40.68228], [-72.2326, -40.68297],
] as const);

// Arco largo y suave de oeste a este.
const arcPath = toPath([
  [-71.99, -40.57], [-71.986, -40.5674], [-71.982, -40.56487], [-71.978, -40.56248], [-71.974, -40.56032],
  [-71.97, -40.55842], [-71.966, -40.55686], [-71.962, -40.55566], [-71.958, -40.55485], [-71.954, -40.55445],
  [-71.95, -40.55446], [-71.946, -40.55486], [-71.942, -40.55562], [-71.938, -40.55672], [-71.934, -40.55808],
  [-71.93, -40.55967], [-71.926, -40.5614], [-71.922, -40.5632],
] as const);

/** Todos los senderos de demostración; el primero es el que el mapa muestra al abrir. */
export const demoTrails: DemoTrail[] = [
  demoTrail,
  { id: 'demo-loop', name: 'Circuito de demostración', path: loopPath, stops: stopsAlong('demo-loop', loopPath, 5, 13) },
  { id: 'demo-zigzag', name: 'Subida de demostración', path: zigzagPath, stops: stopsAlong('demo-zigzag', zigzagPath, 10, 15) },
  { id: 'demo-arc', name: 'Travesía de demostración', path: arcPath, stops: stopsAlong('demo-arc', arcPath, 4, 12) },
];

/** Sendero de demostración por id; cae en el principal si el id no existe. */
export function getDemoTrail(id: string): DemoTrail {
  return demoTrails.find((trail) => trail.id === id) ?? demoTrail;
}

/** Ritmo de referencia para estimar duración: caminata tranquila, sin desnivel. Es una estimación. */
export const WALKING_KMH = 3;

/** Minutos estimados para recorrer `km` al ritmo de referencia, redondeados a 5. */
export function estimatedMinutes(km: number): number {
  return Math.max(5, Math.round(((km / WALKING_KMH) * 60) / 5) * 5);
}
