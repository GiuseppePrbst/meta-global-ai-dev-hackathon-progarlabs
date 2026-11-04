import type { GeoPoint } from '@/domain/geo';

// Dibujo de un trazado dentro de una caja: proyección equirectangular local (la longitud se acorta
// por el coseno de la latitud media), escalada para caber con margen y centrada, con el norte arriba.
// Es una miniatura para reconocer la forma, no un mapa: no conserva escala entre trazados.

export type SketchPoint = { x: number; y: number };

export function sketchPoints(path: GeoPoint[], width: number, height: number, pad = 0): SketchPoint[] {
  if (!path.length) return [];
  const midLat = path.reduce((sum, p) => sum + p.latitude, 0) / path.length;
  const k = Math.cos((midLat * Math.PI) / 180);
  const xs = path.map((p) => p.longitude * k);
  const ys = path.map((p) => -p.latitude);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const spanX = maxX - minX;
  const spanY = maxY - minY;
  const innerW = width - pad * 2;
  const innerH = height - pad * 2;
  const scale = Math.min(spanX ? innerW / spanX : Infinity, spanY ? innerH / spanY : Infinity);
  const s = Number.isFinite(scale) ? scale : 0;
  const offX = pad + (innerW - spanX * s) / 2;
  const offY = pad + (innerH - spanY * s) / 2;
  return xs.map((x, i) => ({ x: offX + (x - minX) * s, y: offY + (ys[i] - minY) * s }));
}

/** Largo de la polilínea en las unidades del dibujo, para animar su trazo. */
export function sketchLength(points: SketchPoint[]): number {
  let total = 0;
  for (let i = 1; i < points.length; i++) total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  return total;
}
