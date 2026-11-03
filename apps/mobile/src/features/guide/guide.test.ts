import { describe, expect, it } from '@jest/globals';

import type { Species } from '@/domain/species';
import { collectedCount } from '@/features/guide/guide';

// Especies SINTÉTICAS: solo el id importa para contar el avance.
const catalog = ['sintetica-a', 'sintetica-b', 'sintetica-c'].map((id) => ({ id }) as Species);

describe('collectedCount', () => {
  it('es cero con la guía vacía', () => {
    expect(collectedCount(catalog, [])).toBe(0);
  });

  it('cuenta las especies del catálogo que están en la guía', () => {
    const entries = [
      { speciesId: 'sintetica-a', addedAt: '2026-10-28' },
      { speciesId: 'sintetica-c', addedAt: '2026-10-29' },
    ];
    expect(collectedCount(catalog, entries)).toBe(2);
  });

  it('no cuenta dos veces una especie ni las que no están en el catálogo', () => {
    const entries = [
      { speciesId: 'sintetica-a', addedAt: '2026-10-28' },
      { speciesId: 'sintetica-a', addedAt: '2026-10-30' },
      { speciesId: 'fuera-del-catalogo', addedAt: '2026-10-29' },
    ];
    expect(collectedCount(catalog, entries)).toBe(1);
  });
});
