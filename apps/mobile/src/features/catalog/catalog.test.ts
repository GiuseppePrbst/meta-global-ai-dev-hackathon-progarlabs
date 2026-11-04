import { describe, expect, it } from '@jest/globals';

import type { Species } from '@/domain/species';
import { applyFilter, familiesOf, filterSpecies } from '@/features/catalog/catalog';

// Especies SINTÉTICAS: los nombres son inventados y solo ejercitan la búsqueda.
function synthetic(id: string, commonName: string, scientificName: string, family = 'Testaceae', group: Species['group'] = 'tree'): Species {
  const traits = { family, habit: '', whereToLook: '' };
  return {
    id,
    commonName,
    scientificName,
    taxonomicStatus: 'provisional',
    provenance: {
      sourceName: 'Fixture sintético de pruebas',
      sourceUrl: 'https://example.invalid/',
      accessedAt: '2026-10-28',
      version: 'test',
      license: 'n/a',
      attribution: 'n/a',
      validationOwner: 'n/a',
      status: 'pending_validation',
    },
    ...(group === 'tree'
      ? { group, traits: { ...traits, leaf: '', bark: '' } }
      : { group, traits: { ...traits, fruitingBody: '', substrate: '' } }),
  };
}

const catalog = [
  synthetic('a', 'Árbol de prueba', 'Fictus primus'),
  synthetic('b', 'Arbusto ñandú', 'Fictus secundus'),
  synthetic('c', 'Helecho', 'Pseudofilix tertia', 'Fictaceae'),
  synthetic('d', 'Seta de prueba', 'Mycena imaginaria', 'Fungaceae', 'fungus'),
];

describe('filterSpecies', () => {
  it('devuelve el catálogo entero con una búsqueda vacía o solo de espacios', () => {
    expect(filterSpecies(catalog, '')).toBe(catalog);
    expect(filterSpecies(catalog, '   ')).toBe(catalog);
  });

  it('no distingue tildes ni mayúsculas', () => {
    expect(filterSpecies(catalog, 'ARBOL').map((s) => s.id)).toEqual(['a']);
    expect(filterSpecies(catalog, 'árbol').map((s) => s.id)).toEqual(['a']);
  });

  it('busca también en el nombre científico', () => {
    expect(filterSpecies(catalog, 'fictus').map((s) => s.id)).toEqual(['a', 'b']);
    expect(filterSpecies(catalog, ' tertia ').map((s) => s.id)).toEqual(['c']);
  });

  it('trata la ñ como n', () => {
    expect(filterSpecies(catalog, 'nandu').map((s) => s.id)).toEqual(['b']);
  });

  it('devuelve una lista vacía si nada coincide', () => {
    expect(filterSpecies(catalog, 'roble')).toEqual([]);
  });
});

describe('familiesOf', () => {
  it('lista cada familia una vez, en orden de aparición', () => {
    expect(familiesOf(catalog)).toEqual(['Testaceae', 'Fictaceae', 'Fungaceae']);
  });
});

describe('applyFilter', () => {
  it('deja todo con el filtro «todas»', () => {
    expect(applyFilter(catalog, { kind: 'all' })).toBe(catalog);
  });

  it('filtra por familia', () => {
    expect(applyFilter(catalog, { kind: 'family', family: 'Fictaceae' }).map((s) => s.id)).toEqual(['c']);
  });

  it('filtra por grupo: árboles u hongos', () => {
    expect(applyFilter(catalog, { kind: 'group', group: 'fungus' }).map((s) => s.id)).toEqual(['d']);
    expect(applyFilter(catalog, { kind: 'group', group: 'tree' }).map((s) => s.id)).toEqual(['a', 'b', 'c']);
  });

  it('filtra por guardadas, sin guardadas vacío', () => {
    expect(applyFilter(catalog, { kind: 'saved' }, new Set(['b'])).map((s) => s.id)).toEqual(['b']);
    expect(applyFilter(catalog, { kind: 'saved' })).toEqual([]);
  });
});
