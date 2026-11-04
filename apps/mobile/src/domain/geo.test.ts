import { describe, expect, it } from '@jest/globals';

import { distanceKm, pathBounds, pathLengthKm, pointInPolygon } from '@/domain/geo';

describe('distanceKm', () => {
  it('es cero entre un punto y sí mismo', () => {
    expect(distanceKm({ longitude: -72, latitude: -40 }, { longitude: -72, latitude: -40 })).toBe(0);
  });

  it('mide un grado de latitud en unos 111 km', () => {
    expect(distanceKm({ longitude: -72, latitude: -40 }, { longitude: -72, latitude: -41 })).toBeCloseTo(111.2, 0);
  });
});

describe('pathLengthKm', () => {
  it('suma los tramos de un trazado', () => {
    const a = { longitude: -72, latitude: -40 };
    const b = { longitude: -72, latitude: -40.01 };
    const c = { longitude: -72, latitude: -40.02 };
    expect(pathLengthKm([a, b, c])).toBeCloseTo(distanceKm(a, c), 6);
  });

  it('es cero con menos de dos puntos', () => {
    expect(pathLengthKm([])).toBe(0);
    expect(pathLengthKm([{ longitude: -72, latitude: -40 }])).toBe(0);
  });
});

describe('pathBounds', () => {
  it('es null sin puntos', () => {
    expect(pathBounds([])).toBeNull();
  });

  it('devuelve [[oeste, sur], [este, norte]]', () => {
    expect(pathBounds([
      { longitude: -72.1, latitude: -40.7 },
      { longitude: -72.3, latitude: -40.6 },
      { longitude: -72.2, latitude: -40.8 },
    ])).toEqual([[-72.3, -40.8], [-72.1, -40.6]]);
  });
});

describe('pointInPolygon', () => {
  const square = [
    { longitude: -72, latitude: -40 }, { longitude: -71, latitude: -40 },
    { longitude: -71, latitude: -41 }, { longitude: -72, latitude: -41 },
  ];

  it('distingue dentro de fuera', () => {
    expect(pointInPolygon({ longitude: -71.5, latitude: -40.5 }, square)).toBe(true);
    expect(pointInPolygon({ longitude: -70.5, latitude: -40.5 }, square)).toBe(false);
    expect(pointInPolygon({ longitude: -71.5, latitude: -39.5 }, square)).toBe(false);
  });
});
