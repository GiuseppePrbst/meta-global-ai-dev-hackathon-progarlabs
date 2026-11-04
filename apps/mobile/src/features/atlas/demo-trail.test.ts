import { describe, expect, it } from '@jest/globals';

import { pathBounds } from '@/domain/geo';
import {
  DEMO_SHAPE_BY_TRAIL, DEMO_SHAPES, demoShapeIndex, demoTrailFor, estimatedMinutes,
} from '@/features/atlas/demo-trail';

describe('estimatedMinutes', () => {
  it('estima a 3 km/h redondeando a 5 minutos', () => {
    expect(estimatedMinutes(3)).toBe(60);
    expect(estimatedMinutes(3.8)).toBe(75);
  });

  it('nunca baja de 5 minutos', () => {
    expect(estimatedMinutes(0)).toBe(5);
  });
});

describe('trazados de demostración', () => {
  // Encuadre CONAF de Puyehue (el mismo del mapa).
  const FRAME = { west: -(72 + 20 / 60), east: -(71 + 50 / 60), south: -(40 + 57 / 60), north: -(40 + 25 / 60) };
  const knownIds = Object.keys(DEMO_SHAPE_BY_TRAIL);
  const trails = knownIds.map((id) => demoTrailFor(id, `Sendero ${id}`));

  it.each(trails.map((trail) => [trail.id, trail] as const))(
    '%s tiene sus paradas en orden sobre el trazado, de extremo a extremo',
    (_, { path, stops }) => {
      const positions = stops.map((stop) => path.indexOf(stop.point));
      expect(positions).not.toContain(-1);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(positions[0]).toBe(0);
      expect(positions[positions.length - 1]).toBe(path.length - 1);
    },
  );

  it.each(DEMO_SHAPES.map((shape, i) => [i, shape] as const))('el trazado %i queda dentro del encuadre de Puyehue', (_, { path }) => {
    for (const { longitude, latitude } of path) {
      expect(longitude).toBeGreaterThan(FRAME.west);
      expect(longitude).toBeLessThan(FRAME.east);
      expect(latitude).toBeGreaterThan(FRAME.south);
      expect(latitude).toBeLessThan(FRAME.north);
    }
  });

  it('cada sendero conocido tiene un trazado distinto', () => {
    const indices = knownIds.map(demoShapeIndex);
    expect(new Set(indices).size).toBe(knownIds.length);
    expect(new Set(trails.map((trail) => trail.path)).size).toBe(knownIds.length);
    for (const index of indices) expect(DEMO_SHAPES[index]).toBeDefined();
  });

  it('un sendero desconocido recibe siempre el mismo trazado', () => {
    const index = demoShapeIndex('parque-ficticio-sendero-x');
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(DEMO_SHAPES.length);
    expect(demoShapeIndex('parque-ficticio-sendero-x')).toBe(index);
    expect(demoTrailFor('parque-ficticio-sendero-x', 'X').path).toBe(DEMO_SHAPES[index].path);
  });

  it('usa el id y el nombre del sendero, y devuelve la misma referencia', () => {
    const trail = demoTrailFor('puyehue-el-indio', 'El Indio');
    expect(trail.id).toBe('puyehue-el-indio');
    expect(trail.name).toBe('El Indio');
    expect(demoTrailFor('puyehue-el-indio', 'El Indio')).toBe(trail);
  });

  it('las paradas tienen ids únicos entre senderos: el mapa identifica marcadores por id', () => {
    const stopIds = trails.flatMap((trail) => trail.stops.map((stop) => stop.id));
    expect(new Set(stopIds).size).toBe(stopIds.length);
  });

  it('cada trazado queda dentro de su propia caja', () => {
    for (const { path } of DEMO_SHAPES) {
      const [[west, south], [east, north]] = pathBounds(path)!;
      for (const { longitude, latitude } of path) {
        expect(longitude).toBeGreaterThanOrEqual(west);
        expect(longitude).toBeLessThanOrEqual(east);
        expect(latitude).toBeGreaterThanOrEqual(south);
        expect(latitude).toBeLessThanOrEqual(north);
      }
    }
  });
});
