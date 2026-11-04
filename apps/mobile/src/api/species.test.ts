import { describe, expect, it } from '@jest/globals';

import type { components } from '@/api/schema.gen';
import { toSpecies } from '@/api/species';

// Respuesta SINTÉTICA con la forma del schema `Species` del OpenAPI: datos inventados.
const provenance: components['schemas']['Provenance'] = {
  source_name: 'Fuente sintética',
  source_url: 'https://example.invalid/fuente',
  accessed_at: '2026-11-04',
  version: 'test-1',
  license: 'n/a',
  attribution: 'Sintético',
  redistribution: 'No redistribuir',
  processing: 'Ninguno',
  validation_owner: 'Nadie',
  status: 'pending_validation',
};

const minimal: components['schemas']['Species'] = {
  id: 'fictus-primus',
  scientific_name: 'Fictus primus',
  common_name: 'Árbol de prueba',
  taxonomic_status: 'provisional',
  provenance,
  native_status: 'pending',
  trait_validation_status: 'pending',
};

describe('toSpecies', () => {
  it('convierte nombres y procedencia a camelCase', () => {
    const species = toSpecies(minimal);
    expect(species).toMatchObject({ id: 'fictus-primus', scientificName: 'Fictus primus', commonName: 'Árbol de prueba' });
    expect(species.provenance).toEqual({
      sourceName: 'Fuente sintética',
      sourceUrl: 'https://example.invalid/fuente',
      accessedAt: '2026-11-04',
      version: 'test-1',
      license: 'n/a',
      attribution: 'Sintético',
      redistribution: 'No redistribuir',
      processing: 'Ninguno',
      validationOwner: 'Nadie',
      status: 'pending_validation',
    });
  });

  it('rellena los campos opcionales ausentes con vacío, sin inventar datos', () => {
    expect(toSpecies(minimal)).toMatchObject({
      acceptedName: null, family: null, genus: null, synonyms: [], taxonomy: null,
      morphology: [], traitSources: [], traitSourcesAccessedAt: null, conservationStatus: null,
    });
  });

  it('conserva rasgos, fuentes y taxonomía GBIF', () => {
    const species = toSpecies({
      ...minimal,
      family: 'Testaceae',
      genus: 'Fictus',
      morphology: ['Hoja X', 'Corteza X'],
      trait_validation_status: 'source_checked',
      trait_sources: ['https://example.invalid/rasgos'],
      trait_source_accessed_at: '2026-11-01',
      taxonomy: {
        gbif_id: 123,
        status: 'ACCEPTED',
        source_url: 'https://example.invalid/gbif',
        source_version: 'test',
        accessed_at: '2026-11-01',
        license: 'CC-BY-4.0',
        attribution: 'Sintético',
        verification_status: 'source_checked',
      },
    });
    expect(species.morphology).toEqual(['Hoja X', 'Corteza X']);
    expect(species.traitValidationStatus).toBe('source_checked');
    expect(species.traitSources).toEqual(['https://example.invalid/rasgos']);
    expect(species.taxonomy).toMatchObject({ gbifId: 123, status: 'ACCEPTED', license: 'CC-BY-4.0' });
  });
});
