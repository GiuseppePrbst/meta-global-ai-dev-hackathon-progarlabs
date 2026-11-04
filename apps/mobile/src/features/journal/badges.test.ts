import { describe, expect, it } from '@jest/globals';

import type { Species } from '@/domain/species';
import { type Badge, computeBadges, nextBadge, totalKm } from '@/features/journal/badges';

// Especies SINTÉTICAS: solo importan el id y el género del nombre científico.
const catalog = [
  ['a', 'Nothofagus prima'],
  ['b', 'Nothofagus secunda'],
  ['c', 'Fictus tertius'],
  ['d', 'Fictus quartus'],
].map(([id, scientificName]) => ({ id, scientificName }) as Species);

const byId = (badges: ReturnType<typeof computeBadges>) => Object.fromEntries(badges.map((b) => [b.id, b]));

describe('computeBadges', () => {
  it('no otorga nada con la guía y los recorridos vacíos', () => {
    const badges = computeBadges({ catalog, entries: [], walks: [] });
    expect(badges.every((b) => !b.earned)).toBe(true);
  });

  it('otorga las de la guía según las especies del catálogo sumadas', () => {
    const badges = byId(computeBadges({
      catalog,
      entries: [
        { speciesId: 'a', addedAt: '2026-10-28' },
        { speciesId: 'b', addedAt: '2026-10-29' },
        { speciesId: 'fuera', addedAt: '2026-10-29' },
      ],
      walks: [],
    }));
    expect(badges['first-species'].earned).toBe(true);
    expect(badges['half-guide'].earned).toBe(true);
    expect(badges['full-guide']).toMatchObject({ earned: false, progress: 2, goal: 4 });
    expect(badges['all-nothofagus']).toMatchObject({ earned: true, progress: 2, goal: 2 });
  });

  it('otorga las de recorridos según su número y la distancia total, sin pasar la meta', () => {
    const walks = [4, 4, 4].map((km, i) => ({ trailId: 't', completedAt: `2026-10-2${i}`, km }));
    const badges = byId(computeBadges({ catalog, entries: [], walks }));
    expect(badges['first-walk'].earned).toBe(true);
    expect(badges['ten-km']).toMatchObject({ earned: true, progress: 10, goal: 10 });
  });

  it('no otorga «Nothofagus» si el catálogo no tiene ninguno', () => {
    const badges = byId(computeBadges({ catalog: catalog.slice(2), entries: [{ speciesId: 'c', addedAt: '2026-10-28' }], walks: [] }));
    expect(badges['all-nothofagus'].earned).toBe(false);
  });
});

describe('totalKm', () => {
  it('suma la distancia de los recorridos', () => {
    expect(totalKm([{ trailId: 't', completedAt: '2026-10-28', km: 1.5 }, { trailId: 't', completedAt: '2026-10-29', km: 2 }])).toBe(3.5);
  });
});

describe('nextBadge', () => {
  const b = (id: Badge['id'], progress: number, goal: number): Badge => ({ id, progress, goal, earned: progress >= goal });

  it('elige la insignia sin ganar con mayor avance relativo', () => {
    expect(nextBadge([b('first-species', 1, 1), b('half-guide', 1, 4), b('ten-km', 7, 10)])?.id).toBe('ten-km');
  });

  it('en empate se queda con la primera del orden fijo', () => {
    expect(nextBadge([b('half-guide', 1, 2), b('all-nothofagus', 2, 4)])?.id).toBe('half-guide');
  });

  it('no propone nada si ya están todas ganadas o no hay metas', () => {
    expect(nextBadge([b('first-species', 1, 1)])).toBeUndefined();
    expect(nextBadge([{ id: 'full-guide', progress: 0, goal: 0, earned: false }])).toBeUndefined();
  });
});
