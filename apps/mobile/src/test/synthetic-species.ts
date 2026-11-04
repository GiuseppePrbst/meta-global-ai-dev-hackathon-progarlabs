import type { Species } from '@/domain/species';

/**
 * Especie SINTÉTICA para pruebas: nombres y datos inventados, no son del catálogo ni describen una
 * especie real. Solo la importan archivos `*.test.ts`.
 */
export function syntheticSpecies(overrides: Partial<Species> & Pick<Species, 'id'>): Species {
  return {
    commonName: overrides.id,
    scientificName: overrides.id,
    taxonomicStatus: 'provisional',
    provenance: {
      sourceName: 'Fixture sintético de pruebas',
      sourceUrl: 'https://example.invalid/',
      accessedAt: '2026-11-04',
      version: 'test',
      license: 'n/a',
      attribution: 'n/a',
      redistribution: 'n/a',
      processing: 'n/a',
      validationOwner: 'n/a',
      status: 'pending_validation',
    },
    acceptedName: null,
    family: null,
    genus: null,
    synonyms: [],
    taxonomy: null,
    morphology: [],
    traitValidationStatus: 'pending',
    traitSources: [],
    traitSourcesAccessedAt: null,
    nativeStatus: 'pending',
    conservationStatus: null,
    ...overrides,
  };
}
