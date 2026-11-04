import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError } from '@/api/client';
import { fetchParkTrails, toParkProfile, toParkTrail } from '@/api/parks';
import type { components } from '@/api/schema.gen';

// Respuestas SINTÉTICAS con la forma de `ParkOut` y `TrailOut`: parque, sendero y fuente inventados.
// `fetch` simulado contra un dominio reservado `.invalid`: ninguna prueba sale a la red.

const source: components['schemas']['SourceOut'] = {
  id: 'atlas:fictus-parque', title: 'Fuente sintética', url: 'https://example.invalid/ficha', type: 'official',
  accessed_at: '2026-11-01', confidence: 'medium', review_status: 'source_checked',
};

const park: components['schemas']['ParkOut'] = {
  id: 'fictus-parque', name: 'Parque Ficticio', regions: ['los-lagos'], provinces: null, communes: null,
  area_ha: null, area_source_text: null, sectors: [], visit_notice: null, access_text: null, trail_count: 0,
  trail_section_status: null, official_url: 'https://example.invalid/parque', linked_taxa: [], conflicts: [],
  sources: [source], limitations: ['Limitación sintética'], knowledge_version: 'v-test', live_status: 'not_verified',
};

const trail: components['schemas']['TrailOut'] = {
  id: 'fictus-sendero', park_id: 'fictus-parque', name: 'Sendero Ficticio', sector: null, kind: null, difficulty: null,
  distance_m: null, duration_minutes: null, geometry_available: false, opening_status: 'not_verified',
  source_status: 'official_named_only', sources: [source], limitations: [],
};

describe('toParkProfile', () => {
  it('conserva lo que vino y deja en null lo que falta, sin inventar', () => {
    const profile = toParkProfile(park);
    expect(profile).toMatchObject({
      id: 'fictus-parque', name: 'Parque Ficticio', regions: ['los-lagos'], areaHa: null, provinces: null,
      visitNotice: null, accessText: null, liveStatus: 'not_verified', limitations: ['Limitación sintética'], knowledgeVersion: 'v-test',
    });
    expect(profile.sources[0]).toEqual({
      id: 'atlas:fictus-parque', title: 'Fuente sintética', url: 'https://example.invalid/ficha', type: 'official',
      accessedAt: '2026-11-01', version: null, confidence: 'medium', reviewStatus: 'source_checked',
    });
  });
});

describe('toParkTrail', () => {
  it('los opcionales ausentes quedan en null o vacíos', () => {
    expect(toParkTrail(trail)).toMatchObject({
      distanceM: null, durationMinutes: null, durationMinMinutes: null, durationMaxMinutes: null, winterDifficulty: null,
      publishedClosure: null, risks: null, conditions: [], openingStatus: 'not_verified', sourceStatus: 'official_named_only',
    });
  });

  it('conserva un cierre publicado', () => {
    const closed = toParkTrail({ ...trail, opening_status: 'published_closure', published_closure: 'Cerrado por nieve (sintético)' });
    expect(closed.openingStatus).toBe('published_closure');
    expect(closed.publishedClosure).toBe('Cerrado por nieve (sintético)');
  });
});

describe('fetchParkTrails', () => {
  const realFetch = globalThis.fetch;
  const realUrl = process.env.EXPO_PUBLIC_API_URL;
  let fetchMock: jest.Mock<(...args: unknown[]) => Promise<unknown>>;
  const respond = (body: unknown) => ({ ok: true, status: 200, headers: { get: () => null }, json: () => Promise.resolve(body) });

  beforeEach(() => {
    process.env.EXPO_PUBLIC_API_URL = 'https://api.example.invalid';
    fetchMock = jest.fn<(...args: unknown[]) => Promise<unknown>>();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    process.env.EXPO_PUBLIC_API_URL = realUrl;
  });

  it('pide también los de referencia secundaria y convierte la lista', async () => {
    fetchMock.mockResolvedValue(respond([trail]));
    const trails = await fetchParkTrails('fictus parque');
    expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.invalid/parks/fictus%20parque/trails?include_secondary=true');
    expect(trails.map((t) => t.id)).toEqual(['fictus-sendero']);
  });

  it('una respuesta que no es lista es `invalid_response`', async () => {
    fetchMock.mockResolvedValue(respond({ items: [] }));
    await expect(fetchParkTrails('fictus-parque')).rejects.toMatchObject({ kind: 'invalid_response' });
    await expect(fetchParkTrails('fictus-parque')).rejects.toBeInstanceOf(ApiError);
  });
});
