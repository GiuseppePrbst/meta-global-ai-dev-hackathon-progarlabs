// Geometría WGS84 pura, sin React ni React Native: la usan las features y también el DOM component
// del mapa, que no puede cargar React Native.

/** Punto WGS84; la API lo envía como GeoJSON `[longitud, latitud]`. */
export type GeoPoint = { longitude: number; latitude: number };

/** Caja `[[oeste, sur], [este, norte]]`, el formato de `fitBounds` de MapLibre. */
export type GeoBounds = [[number, number], [number, number]];

const EARTH_RADIUS_KM = 6371.0088;
const toRad = (deg: number) => (deg * Math.PI) / 180;

/** Distancia de círculo máximo entre dos puntos, en km. */
export function distanceKm(a: GeoPoint, b: GeoPoint): number {
  const dLat = toRad(b.latitude - a.latitude);
  const dLon = toRad(b.longitude - a.longitude);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.latitude)) * Math.cos(toRad(b.latitude)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h));
}

/** Largo de un trazado, sumando sus tramos. */
export function pathLengthKm(points: GeoPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += distanceKm(points[i - 1], points[i]);
  return total;
}

/** Caja que contiene el trazado; `null` si no hay puntos. */
export function pathBounds(points: GeoPoint[]): GeoBounds | null {
  if (!points.length) return null;
  let [west, south, east, north] = [Infinity, Infinity, -Infinity, -Infinity];
  for (const { longitude, latitude } of points) {
    west = Math.min(west, longitude);
    east = Math.max(east, longitude);
    south = Math.min(south, latitude);
    north = Math.max(north, latitude);
  }
  return [[west, south], [east, north]];
}
