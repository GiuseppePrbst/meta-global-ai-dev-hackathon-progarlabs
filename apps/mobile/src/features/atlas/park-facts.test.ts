import { describe, expect, it } from '@jest/globals';

import type { ParkProfile, ParkTrail } from '@/domain/park';
import { formatThousands, parkFacts, regionLabel, trailMeta, trailNote, trailRows } from '@/features/atlas/park-facts';

// Fichas SINTÉTICAS con la forma de dominio: datos inventados.

const trail: ParkTrail = {
  id: 'fictus-sendero', parkId: 'fictus-parque', name: 'Sendero Ficticio', sector: null, kind: null, difficulty: null,
  winterDifficulty: null, distanceM: null, durationMinutes: null, durationMinMinutes: null, durationMaxMinutes: null,
  openingStatus: 'not_verified', publishedClosure: null, risks: null, conditions: [], sourceStatus: 'secondary_reference',
  limitations: [], sources: [],
};

const park: ParkProfile = {
  id: 'fictus-parque', name: 'Parque Ficticio', regions: [], areaHa: null, provinces: null, communes: null, sectors: [],
  visitNotice: null, accessText: null, officialUrl: 'https://example.invalid', liveStatus: 'not_verified', limitations: [],
  sources: [], knowledgeVersion: 'v-test',
};

describe('formatThousands', () => {
  it('separa miles con punto', () => {
    expect(formatThousands(112755)).toBe('112.755');
    expect(formatThousands(950)).toBe('950');
    expect(formatThousands(1234567.4)).toBe('1.234.567');
  });
});

describe('regionLabel', () => {
  it('nombra una o varias regiones y deja tal cual un slug desconocido', () => {
    expect(regionLabel([])).toBeNull();
    expect(regionLabel(['los-lagos'])).toBe('Región de Los Lagos');
    expect(regionLabel(['los-lagos', 'los-rios'])).toBe('Regiones de Los Lagos y Los Ríos');
    expect(regionLabel(['region-ficticia'])).toBe('Región de region-ficticia');
  });
});

describe('parkFacts', () => {
  it('solo muestra cifras que vinieron', () => {
    expect(parkFacts(park)).toEqual([]);
    expect(parkFacts({ ...park, areaHa: 1500, sectors: ['A'] })).toEqual([
      { value: '1.500', label: 'hectáreas' },
      { value: '1', label: 'sector' },
    ]);
  });
});

describe('trailMeta', () => {
  it('sin datos lo dice, sin estimar', () => {
    expect(trailMeta(trail).meta).toBe('Sin datos de distancia ni dificultad');
  });

  it('usa metros bajo 1 km y kilómetros con coma sobre 1 km', () => {
    expect(trailMeta({ ...trail, distanceM: 200 }).meta).toBe('200 m');
    expect(trailMeta({ ...trail, distanceM: 2600, difficulty: 'moderada', durationMinutes: 90 }).meta).toBe('2,6 km · moderada · 1 h 30 min');
  });

  it('muestra un rango de duración si la fuente lo da', () => {
    expect(trailMeta({ ...trail, durationMinMinutes: 60, durationMaxMinutes: 120 }).meta).toBe('1 h a 2 h');
  });
});

describe('trailNote', () => {
  it('prioriza un cierre publicado sobre el tipo de fuente', () => {
    expect(trailNote(trail)).toBe('Fuente secundaria, no oficial');
    expect(trailNote({ ...trail, openingStatus: 'published_closure', publishedClosure: 'Cierre sintético' })).toBe('Cierre publicado: Cierre sintético');
  });
});

describe('trailRows', () => {
  it('omite lo que no vino y siempre aclara que la apertura no está verificada', () => {
    const rows = trailRows(trail);
    expect(rows.map(([label]) => label)).toEqual(['Apertura', 'Fuente']);
    expect(rows[0][1]).toBe('No verificada: no significa que esté abierto');
  });

  it('traduce el tipo conocido y deja tal cual uno desconocido', () => {
    expect(trailRows({ ...trail, kind: 'walking' })).toContainEqual(['Tipo', 'A pie']);
    expect(trailRows({ ...trail, kind: 'kayak' })).toContainEqual(['Tipo', 'kayak']);
  });
});
