import { describe, expect, it } from '@jest/globals';

import { sketchLength, sketchPoints } from '@/features/journal/trail-sketch';

// Trazados SINTÉTICOS mínimos.
const line = [{ longitude: 0, latitude: 0 }, { longitude: 0.01, latitude: 0 }];
const corner = [{ longitude: 0, latitude: 0 }, { longitude: 0, latitude: 0.01 }, { longitude: 0.01, latitude: 0.01 }];

describe('sketchPoints', () => {
  it('cabe dentro de la caja con su margen y deja el norte arriba', () => {
    const pts = sketchPoints(corner, 100, 100, 10);
    for (const { x, y } of pts) {
      expect(x).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(x).toBeLessThanOrEqual(90 + 1e-9);
      expect(y).toBeGreaterThanOrEqual(10 - 1e-9);
      expect(y).toBeLessThanOrEqual(90 + 1e-9);
    }
    expect(pts[1].y).toBeLessThan(pts[0].y); // más al norte, más arriba
  });

  it('centra un trazado plano en vez de deformarlo', () => {
    const pts = sketchPoints(line, 100, 60, 0);
    expect(pts[0].y).toBeCloseTo(30);
    expect(pts[1].x - pts[0].x).toBeCloseTo(100);
  });

  it('tolera trazados vacíos o de un solo punto', () => {
    expect(sketchPoints([], 10, 10)).toEqual([]);
    expect(sketchPoints([line[0]], 10, 10, 2)).toEqual([{ x: 5, y: 5 }]);
  });
});

describe('sketchLength', () => {
  it('suma los tramos', () => {
    expect(sketchLength([{ x: 0, y: 0 }, { x: 3, y: 4 }, { x: 3, y: 10 }])).toBeCloseTo(11);
  });
});
