import { describe, expect, it } from '@jest/globals';

import { pointInPolygon } from '@/domain/geo';
import { DEMO_SHAPES } from '@/features/atlas/demo-trail';
import { getPark, parks, puyehue } from '@/features/atlas/parks';

describe('parques del mapa', () => {
  it('el límite de Puyehue es un anillo abierto en WGS84 sobre el área del parque', () => {
    const { boundary } = puyehue;
    expect(boundary.length).toBeGreaterThan(100);
    expect(boundary[0]).not.toEqual(boundary[boundary.length - 1]);
    for (const { longitude, latitude } of boundary) {
      expect(longitude).toBeGreaterThan(-72.4);
      expect(longitude).toBeLessThan(-71.8);
      expect(latitude).toBeGreaterThan(-41);
      expect(latitude).toBeLessThan(-40.4);
    }
  });

  it('la etiqueta queda dentro del polígono y un punto lejano queda fuera', () => {
    expect(pointInPolygon(puyehue.labelPoint, puyehue.boundary)).toBe(true);
    // Osorno, a unos 80 km al oeste.
    expect(pointInPolygon({ longitude: -73.13, latitude: -40.57 }, puyehue.boundary)).toBe(false);
  });

  it('los trazados de demostración de los senderos quedan dentro de su límite', () => {
    for (const shape of DEMO_SHAPES) {
      for (const point of shape.path) expect(pointInPolygon(point, puyehue.boundary)).toBe(true);
    }
  });

  it('busca parques por id', () => {
    expect(parks).toHaveLength(1);
    expect(getPark('puyehue')).toBe(puyehue);
    expect(getPark('otro')).toBeUndefined();
  });
});
