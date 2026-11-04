import { describe, expect, it } from '@jest/globals';

import type { components } from '@/api/schema.gen';
import { toConservation, toTaxon } from '@/api/taxa';

// Respuestas SINTÉTICAS con la forma de los schemas `Taxon` y `RegionalConservation`: datos inventados.
const minimal: components['schemas']['Taxon'] = {
  id: 'fictus-primus',
  scientific_name: 'Fictus primus',
  common_names: ['Árbol de prueba', 'Otro nombre'],
  group: 'tree',
  classification: { kingdom: 'Plantae' },
  taxonomy: { checklist: 'Lista sintética', accepted_name: 'Fictus primus', status: 'source_checked', accessed_at: '2026-11-04' },
  profile: { trait_validation_status: 'pending', review_status: 'pending' },
  puyehue_status: 'not_assessed',
  sensitivity: 'none',
  identification: { status: 'educational_catalog', level: 0, notes: 'Sintético' },
};

const source: components['schemas']['SourceRef'] = {
  title: 'Fuente sintética', url: 'https://example.invalid/fuente', accessed_at: '2026-11-01', kind: 'official',
};

describe('toTaxon', () => {
  it('toma el primer nombre común y deja vacío lo que no vino, sin inventar', () => {
    const taxon = toTaxon(minimal);
    expect(taxon.commonName).toBe('Árbol de prueba');
    expect(taxon.commonNames).toEqual(['Árbol de prueba', 'Otro nombre']);
    expect(taxon.classification).toEqual({ kingdom: 'Plantae', family: null, genus: null, order: null });
    expect(taxon.taxonomy).toMatchObject({ authorship: null, gbifId: null });
    expect(taxon.profile).toEqual({
      description: null, habitat: null, distribution: null, ecology: null,
      traits: [], traitValidationStatus: 'pending', sources: [], limitations: [],
    });
    expect(taxon.media).toEqual([]);
    expect(taxon.parkEvidence).toEqual([]);
  });

  it('sin nombre común usa el científico', () => {
    expect(toTaxon({ ...minimal, common_names: [] }).commonName).toBe('Fictus primus');
  });

  it('conserva perfil, fotos con su crédito y evidencia en el parque', () => {
    const taxon = toTaxon({
      ...minimal,
      classification: { kingdom: 'Plantae', family: 'Testaceae', genus: 'Fictus' },
      taxonomy: { ...minimal.taxonomy, authorship: 'Autor', gbif_backbone_id: 123 },
      profile: {
        trait_validation_status: 'source_checked', review_status: 'draft_sourced',
        description: 'Descripción X', habitat: 'Hábitat X', traits: ['Hoja X'], sources: [source], limitations: ['Límite X'],
      },
      media: [{
        media_id: 'm1', media_url: 'https://example.invalid/foto.jpg', source_url: 'https://example.invalid/pagina',
        author: 'Autora X', license: 'CC BY 4.0', attribution: 'Autora X, CC BY 4.0', redistribution: 'with_attribution',
        review_status: 'agent_visual_check',
      }],
      park_evidence: [{
        park_id: 'puyehue', evidence_type: 'official_park_presence', scale: 'park', source,
        precision: 'park_scale_no_coordinates', review_status: 'source_checked',
      }],
    });
    expect(taxon.classification.family).toBe('Testaceae');
    expect(taxon.taxonomy).toMatchObject({ authorship: 'Autor', gbifId: 123 });
    expect(taxon.profile).toMatchObject({ description: 'Descripción X', habitat: 'Hábitat X', traits: ['Hoja X'], limitations: ['Límite X'] });
    expect(taxon.profile.sources).toEqual([
      { title: 'Fuente sintética', url: 'https://example.invalid/fuente', accessedAt: '2026-11-01', kind: 'official', license: null },
    ]);
    expect(taxon.media[0]).toMatchObject({ id: 'm1', url: 'https://example.invalid/foto.jpg', author: 'Autora X', reviewStatus: 'agent_visual_check' });
    expect(taxon.parkEvidence[0]).toMatchObject({ type: 'official_park_presence', precision: 'park_scale_no_coordinates' });
  });
});

describe('toConservation', () => {
  const base: components['schemas']['RegionalConservation'] = {
    taxon_id: 'fictus-primus', system: 'RCE', record_status: 'found', region: null, regional_status: 'indeterminate',
    applicable_category: null, applicable_scope: null, scopes: [], notes: ['Nota X'],
    park_regions: { 'los-rios': 'VU', 'los-lagos': null, 'otra-region': 'EN' },
    source: {
      title: 'Nómina sintética', url: 'https://example.invalid/rce', file_name: 'x.xlsx', sha256: '0'.repeat(64),
      version_text: 'Proceso X', accessed_at: '2026-11-01', redistribution: 'n/a', review_status: 'imported_unreviewed',
    },
  };

  it('solo conserva las regiones de Puyehue, con su categoría o null', () => {
    expect(toConservation(base).parkRegions).toEqual({ 'los-rios': 'VU', 'los-lagos': null });
  });

  it('trae la fuente y las notas', () => {
    expect(toConservation(base)).toMatchObject({
      recordStatus: 'found',
      notes: ['Nota X'],
      source: { title: 'Nómina sintética', versionText: 'Proceso X', accessedAt: '2026-11-01' },
    });
  });
});
