import { describe, expect, it, jest } from '@jest/globals';

import type { FetchLike } from '@/api/client';
import { IDENTIFY_LIVE, type Identification, identifyForm, postIdentify, toOutcome } from '@/api/identify';
import type { CapturedPhoto } from '@/domain/identification';
import type { WiloConsents } from '@/domain/wilo';

// Datos SINTÉTICOS; el transporte es un espía, nada sale a la red.
const given: WiloConsents = { adult: true, externalProcessing: true, rights: true };
const photo: CapturedPhoto = { uri: 'file:///sintetica.jpg', mimeType: 'image/jpeg', fileName: 'foto.jpg', sizeBytes: 100 };
const base = { provider: 'meta', execution_status: 'completed', message: 'M' } as const;

describe('modo por defecto', () => {
  it('sin EXPO_PUBLIC_IDENTIFY_LIVE=true, Identificar usa el mock', () => {
    expect(IDENTIFY_LIVE).toBe(false);
  });
});

describe('FormData de POST /identify', () => {
  it('lleva una sola foto y los tres consentimientos, sin vistas adicionales ni segmentación', () => {
    const form = identifyForm(photo, given, new Blob(['x'], { type: 'image/jpeg' }));
    expect(form.getAll('file')).toHaveLength(1);
    expect(form.getAll('adult_confirmed')).toEqual(['true']);
    expect(form.getAll('rights_confirmed')).toEqual(['true']);
    expect(form.getAll('external_processing_confirmed')).toEqual(['true']);
    expect(form.getAll('additional_files')).toEqual([]);
    expect(form.getAll('use_segmentation')).toEqual([]);
    expect(form.getAll('views')).toEqual([]);
  });

  it('hace POST a /identify por el transporte dado, sin Authorization', async () => {
    const spy = jest.fn<FetchLike>().mockResolvedValue(new Response(JSON.stringify({
      ...base, status: 'candidates', acceptance: 'accepted', accepted_species_id: 'a',
      candidates: [{ species_id: 'a', evidence: 'E' }],
    }), { status: 200, headers: { 'Content-Type': 'application/json' } }));

    const outcome = await postIdentify(spy, photo, given);

    const [url, init] = spy.mock.calls[0];
    expect(url).toMatch(/\/identify$/);
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.headers as Record<string, string>).Authorization).toBeUndefined();
    expect(outcome).toMatchObject({ kind: 'candidate', speciesId: 'a', accepted: true, simulated: false });
  });
});

describe('toOutcome', () => {
  it('prefiere la especie aceptada aunque no sea la primera candidata', () => {
    const api = {
      ...base, status: 'candidates', acceptance: 'accepted', accepted_species_id: 'b',
      candidates: [{ species_id: 'a', evidence: 'Ea' }, { species_id: 'b', evidence: 'Eb', contradictory_evidence: ['C'] }],
    } as unknown as Identification;
    expect(toOutcome(api)).toMatchObject({ kind: 'candidate', speciesId: 'b', evidence: 'Eb', contradictoryEvidence: ['C'] });
  });

  it('una candidata no aceptada sigue siendo candidata, sin aceptar', () => {
    const api = { ...base, status: 'candidates', acceptance: 'not_accepted', candidates: [{ species_id: 'a', evidence: 'E' }] } as unknown as Identification;
    expect(toOutcome(api)).toMatchObject({ kind: 'candidate', accepted: false });
  });

  it('sin candidatos es «no se pudo decidir», con la siguiente foto y el motivo', () => {
    const api = {
      ...base, status: 'insufficient_evidence', catalog_assessment: 'non_diagnostic_photo', recommended_next_photo: 'bark',
      candidates: [],
    } as unknown as Identification;
    expect(toOutcome(api)).toMatchObject({ kind: 'insufficient', reason: 'non_diagnostic', nextPhoto: 'bark' });
    expect(toOutcome({ ...api, catalog_assessment: 'out_of_catalog_suspected' } as Identification)).toMatchObject({ reason: 'out_of_catalog' });
  });

  it('una respuesta mock queda rotulada como simulada', () => {
    expect(toOutcome({ ...base, provider: 'mock', status: 'insufficient_evidence' } as unknown as Identification).simulated).toBe(true);
  });
});
