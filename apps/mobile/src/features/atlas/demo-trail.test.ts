import { describe, expect, it } from '@jest/globals';

import { pathBounds } from '@/domain/geo';
import { demoTrail, estimatedMinutes } from '@/features/atlas/demo-trail';

describe('estimatedMinutes', () => {
  it('estima a 3 km/h redondeando a 5 minutos', () => {
    expect(estimatedMinutes(3)).toBe(60);
    expect(estimatedMinutes(3.8)).toBe(75);
  });

  it('nunca baja de 5 minutos', () => {
    expect(estimatedMinutes(0)).toBe(5);
  });
});

describe('demoTrail', () => {
  it('tiene sus paradas sobre el trazado, empezando y terminando en sus extremos', () => {
    const { path, stops } = demoTrail;
    for (const stop of stops) expect(path).toContain(stop.point);
    expect(stops[0].point).toBe(path[0]);
    expect(stops[stops.length - 1].point).toBe(path[path.length - 1]);
  });

  it('queda dentro de su propia caja', () => {
    const [[west, south], [east, north]] = pathBounds(demoTrail.path)!;
    for (const { longitude, latitude } of demoTrail.path) {
      expect(longitude).toBeGreaterThanOrEqual(west);
      expect(longitude).toBeLessThanOrEqual(east);
      expect(latitude).toBeGreaterThanOrEqual(south);
      expect(latitude).toBeLessThanOrEqual(north);
    }
  });
});
