import { describe, expect, it } from '@jest/globals';

import type { RegionalConservation } from '@/domain/taxon';
import { conservationSummary } from '@/features/catalog/taxon';

// Estados RCE SINTÉTICOS: categorías elegidas para ejercitar cada caso, no son de ningún taxón real.
const rc = (overrides: Partial<RegionalConservation>): RegionalConservation => ({
  recordStatus: 'found',
  parkRegions: {},
  notes: [],
  source: { title: 'Nómina sintética', url: 'https://example.invalid', versionText: 'test', accessedAt: '2026-11-04' },
  ...overrides,
});

describe('conservationSummary', () => {
  it('sin registro RCE lo dice, aunque traiga regiones', () => {
    expect(conservationSummary(rc({ recordStatus: 'no_rce_record_found', parkRegions: { 'los-rios': 'LC' } }))).toEqual({ kind: 'no_record' });
  });

  it('una sola categoría si es la misma en ambas regiones', () => {
    expect(conservationSummary(rc({ parkRegions: { 'los-rios': 'NT', 'los-lagos': 'NT' } }))).toEqual({ kind: 'same', category: 'NT' });
  });

  it('una por región si difieren, en orden Los Ríos y Los Lagos', () => {
    expect(conservationSummary(rc({ parkRegions: { 'los-lagos': 'NT', 'los-rios': 'VU' } }))).toEqual({
      kind: 'by_region',
      regions: [{ region: 'los-rios', category: 'VU' }, { region: 'los-lagos', category: 'NT' }],
    });
  });

  it('una región sin categoría también se muestra por región, no como la otra', () => {
    expect(conservationSummary(rc({ parkRegions: { 'los-rios': 'VU', 'los-lagos': null } }))).toEqual({
      kind: 'by_region',
      regions: [{ region: 'los-rios', category: 'VU' }, { region: 'los-lagos', category: null }],
    });
  });

  it('con registro pero sin categoría en el parque, no inventa una', () => {
    expect(conservationSummary(rc({ parkRegions: { 'los-rios': null, 'los-lagos': null } }))).toEqual({ kind: 'not_for_park' });
    expect(conservationSummary(rc({ parkRegions: {} }))).toEqual({ kind: 'not_for_park' });
  });
});
