import type { GeoPoint } from '@/domain/geo';

// SENDERO DE DEMOSTRACIÓN, trazado SINTÉTICO: las coordenadas se generaron con una curva dentro del
// encuadre CONAF para mostrar cómo se vería un recorrido. No es un sendero real, no sigue ninguna
// huella del terreno y no sirve para orientarse. La app lo rotula como demostración donde aparece.

export type TrailStopKind = 'start' | 'viewpoint' | 'photo' | 'end';

export type TrailStop = { id: string; kind: TrailStopKind; name: string; point: GeoPoint };

export type DemoTrail = { id: string; name: string; path: GeoPoint[]; stops: TrailStop[] };

const path: GeoPoint[] = (
  [
    [-72.152, -40.70007], [-72.14773, -40.69817], [-72.14431, -40.6967], [-72.1423, -40.69568],
    [-72.14179, -40.6951], [-72.14235, -40.69489], [-72.14319, -40.69491], [-72.14343, -40.695],
    [-72.14238, -40.69499], [-72.13981, -40.69472], [-72.13598, -40.69407], [-72.1316, -40.69301],
    [-72.12755, -40.69153], [-72.12462, -40.68971], [-72.12319, -40.68767], [-72.12316, -40.68559],
    [-72.12393, -40.68363], [-72.12465, -40.68195],
  ] as const
).map(([longitude, latitude]) => ({ longitude, latitude }));

export const demoTrail: DemoTrail = {
  id: 'demo-trail',
  name: 'Sendero de demostración',
  path,
  stops: [
    { id: 'stop-start', kind: 'start', name: 'Inicio', point: path[0] },
    { id: 'stop-viewpoint', kind: 'viewpoint', name: 'Mirador', point: path[5] },
    { id: 'stop-photo', kind: 'photo', name: 'Punto de foto', point: path[11] },
    { id: 'stop-end', kind: 'end', name: 'Final', point: path[path.length - 1] },
  ],
};

/** Ritmo de referencia para estimar duración: caminata tranquila, sin desnivel. Es una estimación. */
export const WALKING_KMH = 3;

/** Minutos estimados para recorrer `km` al ritmo de referencia, redondeados a 5. */
export function estimatedMinutes(km: number): number {
  return Math.max(5, Math.round(((km / WALKING_KMH) * 60) / 5) * 5);
}
