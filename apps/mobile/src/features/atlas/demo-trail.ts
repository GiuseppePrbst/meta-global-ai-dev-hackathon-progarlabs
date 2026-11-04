import type { GeoPoint } from '@/domain/geo';

// TRAZADOS DE DEMOSTRACIÓN, SINTÉTICOS: las coordenadas se generaron con curvas dentro del límite OSM
// del parque (src/features/atlas/parks.ts) para mostrar cómo se vería un recorrido. La API de senderos
// (GET /parks/{id}/trails) no entrega geometría (`geometry_available=false`), así que cada sendero real
// se dibuja con uno de estos trazados, siempre el mismo. Ninguno sigue la huella del sendero que lleva
// el nombre, ni sirve para orientarse. La app lo rotula como trazado de demostración.

export type TrailStopKind = 'start' | 'viewpoint' | 'photo' | 'end';

export type TrailStop = { id: string; kind: TrailStopKind; name: string; point: GeoPoint };

/** Un sendero con su trazado de demostración. `id` y `name` son los del sendero; el trazado no. */
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

// Ondulado, con un pequeño rizo al inicio.
const wavePath = toPath(
  [
    [-72.152, -40.70007], [-72.14773, -40.69817], [-72.14431, -40.6967], [-72.1423, -40.69568],
    [-72.14179, -40.6951], [-72.14235, -40.69489], [-72.14319, -40.69491], [-72.14343, -40.695],
    [-72.14238, -40.69499], [-72.13981, -40.69472], [-72.13598, -40.69407], [-72.1316, -40.69301],
    [-72.12755, -40.69153], [-72.12462, -40.68971], [-72.12319, -40.68767], [-72.12316, -40.68559],
    [-72.12393, -40.68363], [-72.12465, -40.68195],
  ] as const,
);

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

// Cresta ondulada de oeste a este.
const ridgePath = toPath([
  [-72.03, -40.63], [-72.02647, -40.62562], [-72.02294, -40.62281], [-72.01941, -40.62269], [-72.01588, -40.62555],
  [-72.01235, -40.6308], [-72.00882, -40.63713], [-72.00529, -40.64291], [-72.00176, -40.64668], [-71.99824, -40.64756],
  [-71.99471, -40.64556], [-71.99118, -40.64154], [-71.98765, -40.63698], [-71.98412, -40.63349], [-71.98059, -40.6324],
  [-71.97706, -40.63428], [-71.97353, -40.63885], [-71.97, -40.645],
] as const);

// Ramal corto.
const spurPath = toPath([
  [-72.08, -40.66], [-72.07867, -40.66203], [-72.07733, -40.6639], [-72.076, -40.66546], [-72.07467, -40.66661],
  [-72.07333, -40.66727], [-72.072, -40.66746], [-72.07067, -40.66724], [-72.06933, -40.6667], [-72.068, -40.666],
] as const);

// Curva en S al noroeste del parque.
const sPath = toPath([
  [-72.285, -40.48533], [-72.28147, -40.48103], [-72.27794, -40.47712], [-72.27441, -40.47394], [-72.27088, -40.47172],
  [-72.26735, -40.47058], [-72.26382, -40.47048], [-72.26029, -40.47124], [-72.25676, -40.47257], [-72.25324, -40.4741],
  [-72.24971, -40.47543], [-72.24618, -40.47619], [-72.24265, -40.47609], [-72.23912, -40.47495], [-72.23559, -40.47273],
  [-72.23206, -40.46955], [-72.22853, -40.46564], [-72.225, -40.46133],
] as const);

// Gancho que se abre en espiral.
const hookPath = toPath([
  [-72.09773, -40.5375], [-72.09737, -40.53425], [-72.09818, -40.53087], [-72.10024, -40.52761], [-72.10349, -40.52475],
  [-72.10781, -40.52256], [-72.11294, -40.52127], [-72.11857, -40.52105], [-72.12431, -40.522], [-72.12973, -40.52417],
  [-72.1344, -40.52747], [-72.13791, -40.53174], [-72.13993, -40.53674], [-72.14019, -40.54216], [-72.13856, -40.54761],
  [-72.13503, -40.55272], [-72.12975, -40.55708], [-72.12297, -40.56033],
] as const);

// Subida larga de sur a norte.
const climbPath = toPath([
  [-72.13833, -40.84333], [-72.13588, -40.83912], [-72.13446, -40.83491], [-72.13467, -40.8307], [-72.13643, -40.82649],
  [-72.13899, -40.82228], [-72.14128, -40.81807], [-72.14232, -40.81386], [-72.14168, -40.80965], [-72.13963, -40.80544],
  [-72.13703, -40.80123], [-72.13498, -40.79702], [-72.13435, -40.79281], [-72.13539, -40.7886], [-72.13767, -40.78439],
  [-72.14024, -40.78018], [-72.142, -40.77596], [-72.14221, -40.77175], [-72.14079, -40.76754], [-72.13833, -40.76333],
] as const);

type DemoShape = { path: GeoPoint[]; viewpoint: number; photo: number };

/** Trazados disponibles, con la posición de sus paradas de mirador y foto. El orden es estable: no reordenar. */
export const DEMO_SHAPES: readonly DemoShape[] = [
  { path: wavePath, viewpoint: 5, photo: 11 },
  { path: loopPath, viewpoint: 5, photo: 13 },
  { path: zigzagPath, viewpoint: 10, photo: 15 },
  { path: arcPath, viewpoint: 4, photo: 12 },
  { path: ridgePath, viewpoint: 5, photo: 12 },
  { path: spurPath, viewpoint: 3, photo: 6 },
  { path: sPath, viewpoint: 6, photo: 12 },
  { path: hookPath, viewpoint: 5, photo: 11 },
  { path: climbPath, viewpoint: 7, photo: 14 },
];

/**
 * Trazado fijo de cada sendero conocido de Puyehue (ids del Knowledge Atlas), uno distinto por sendero.
 * La asignación es arbitraria: la forma no tiene relación con el sendero real.
 */
export const DEMO_SHAPE_BY_TRAIL: Readonly<Record<string, number>> = {
  'puyehue-salto-del-pudu': 0,
  'puyehue-anticura-catrue': 1,
  'puyehue-crater-raihuen-casablanca': 2,
  'puyehue-antillanca-ruta': 3,
  'puyehue-el-indio': 4,
  'puyehue-rio-anticura': 5,
  'puyehue-la-princesa': 6,
  'puyehue-repucura': 7,
  'puyehue-volcan-puyehue': 8,
};

/** Hash FNV-1a de 32 bits: estable entre arranques y plataformas. */
function hash(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h;
}

/** Índice del trazado de un sendero: el de la tabla, o uno elegido por hash si el id no está en ella. */
export function demoShapeIndex(trailId: string): number {
  return DEMO_SHAPE_BY_TRAIL[trailId] ?? hash(trailId) % DEMO_SHAPES.length;
}

// Misma referencia para el mismo sendero: el mapa compara trazados y paradas por identidad.
const cache = new Map<string, DemoTrail>();

/** El sendero `trailId`, con su nombre real, dibujado con su trazado de demostración fijo. */
export function demoTrailFor(trailId: string, name: string): DemoTrail {
  const key = `${trailId}\u0000${name}`;
  const cached = cache.get(key);
  if (cached) return cached;
  const shape = DEMO_SHAPES[demoShapeIndex(trailId)];
  const trail = { id: trailId, name, path: shape.path, stops: stopsAlong(trailId, shape.path, shape.viewpoint, shape.photo) };
  cache.set(key, trail);
  return trail;
}

/** Ritmo de referencia para estimar duración: caminata tranquila, sin desnivel. Es una estimación. */
export const WALKING_KMH = 3;

/** Minutos estimados para recorrer `km` al ritmo de referencia, redondeados a 5. */
export function estimatedMinutes(km: number): number {
  return Math.max(5, Math.round(((km / WALKING_KMH) * 60) / 5) * 5);
}
