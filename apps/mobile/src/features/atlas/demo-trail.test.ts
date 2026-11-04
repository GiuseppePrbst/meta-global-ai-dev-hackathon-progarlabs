import { describe, expect, it } from '@jest/globals';

import { pathBounds } from '@/domain/geo';
import { demoTrail, demoTrails, estimatedMinutes, getDemoTrail } from '@/features/atlas/demo-trail';

describe('estimatedMinutes', () => {
  it('estima a 3 km/h redondeando a 5 minutos', () => {
    expect(estimatedMinutes(3)).toBe(60);
    expect(estimatedMinutes(3.8)).toBe(75);
  });

  it('nunca baja de 5 minutos', () => {
    expect(estimatedMinutes(0)).toBe(5);
  });
});

describe('demoTrails', () => {
  // Encuadre CONAF de Puyehue (el mismo del mapa).
  const FRAME = { west: -(72 + 20 / 60), east: -(71 + 50 / 60), south: -(40 + 57 / 60), north: -(40 + 25 / 60) };

  it.each(demoTrails.map((trail) => [trail.id, trail] as const))(
    '%s tiene sus paradas en orden sobre el trazado, de extremo a extremo',
    (_, { path, stops }) => {
      const positions = stops.map((stop) => path.indexOf(stop.point));
      expect(positions).not.toContain(-1);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(positions[0]).toBe(0);
      expect(positions[positions.length - 1]).toBe(path.length - 1);
    },
  );

  it.each(demoTrails.map((trail) => [trail.id, trail] as const))('%s queda dentro del encuadre de Puyehue', (_, { path }) => {
    for (const { longitude, latitude } of path) {
      expect(longitude).toBeGreaterThan(FRAME.west);
      expect(longitude).toBeLessThan(FRAME.east);
      expect(latitude).toBeGreaterThan(FRAME.south);
      expect(latitude).toBeLessThan(FRAME.north);
    }
  });

  it('tienen ids y paradas únicos: el mapa identifica marcadores por id', () => {
    const ids = demoTrails.map((trail) => trail.id);
    const stopIds = demoTrails.flatMap((trail) => trail.stops.map((stop) => stop.id));
    expect(new Set(ids).size).toBe(ids.length);
    expect(new Set(stopIds).size).toBe(stopIds.length);
  });

  it('busca por id y cae en el principal si no existe', () => {
    expect(getDemoTrail('demo-loop').name).toBe('Circuito de demostración');
    expect(getDemoTrail('inexistente')).toBe(demoTrail);
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
