import { describe, expect, it } from '@jest/globals';

import { ApiError, requestJson } from '@/api/client';
import type { Identification } from '@/api/identify';
import { createIdentifyMockFetch, MOCK_EVIDENCE } from '@/api/mock/identify-mock';

// Pruebas del mock de POST /identify: imágenes y especies SINTÉTICAS. Ninguna sale a la red.
const BASE = 'https://identify-mock.invalid';

function photoForm(fields: Record<string, string> = ok, type = 'image/jpeg', bytes = 8): FormData {
  const form = new FormData();
  form.append('file', new Blob([new Uint8Array(bytes)], { type }), 'foto.jpg');
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}
const ok = { adult_confirmed: 'true', rights_confirmed: 'true', external_processing_confirmed: 'true' };

function identify(form: FormData, pick: () => string | undefined = () => 'especie-sintetica') {
  const send = createIdentifyMockFetch({ pickCandidate: pick, latencyMs: 0 });
  return requestJson<Identification>(BASE, '/identify', { method: 'POST', body: form, fetchImpl: send });
}

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('se esperaba un ApiError');
}

describe('mock de POST /identify', () => {
  it('propone la especie elegida como candidata aceptada y rotulada mock', async () => {
    const result = await identify(photoForm());
    expect(result).toMatchObject({
      status: 'candidates', provider: 'mock', execution_status: 'mock', acceptance: 'accepted',
      catalog_assessment: 'supported_candidate', accepted_species_id: 'especie-sintetica',
    });
    expect(result.candidates).toEqual([{ species_id: 'especie-sintetica', evidence: MOCK_EVIDENCE, contradictory_evidence: [] }]);
    expect(result.limitations?.join(' ')).toMatch(/simulado/i);
  });

  it('sin especie que proponer se abstiene, como el MockIdentifier del backend', async () => {
    const result = await identify(photoForm(), () => undefined);
    expect(result).toMatchObject({ status: 'insufficient_evidence', provider: 'mock', candidates: [] });
  });

  it('valida consentimientos con los mensajes del backend', async () => {
    expect(await failure(identify(photoForm({ ...ok, rights_confirmed: 'false' })))).toMatchObject({
      status: 422, message: 'Se requiere mayoría de edad y derechos de uso de la imagen',
    });
    expect(await failure(identify(photoForm({ ...ok, adult_confirmed: 'false' })))).toMatchObject({ status: 422 });
    expect(await failure(identify(photoForm({ ...ok, external_processing_confirmed: 'false' })))).toMatchObject({
      status: 422, message: 'Falta permiso de procesamiento externo de la imagen',
    });
  });

  it('el modo público admite una sola foto y sin segmentación', async () => {
    const extra = photoForm();
    extra.append('additional_files', new Blob(['x'], { type: 'image/jpeg' }), 'otra.jpg');
    expect((await failure(identify(extra))).status).toBe(422);
    expect((await failure(identify(photoForm({ ...ok, use_segmentation: 'true' })))).status).toBe(422);
  });

  it('rechaza formatos no admitidos (415) y fotos de más de 10 MiB (413)', async () => {
    expect((await failure(identify(photoForm(ok, 'image/gif')))).status).toBe(415);
    expect((await failure(identify(photoForm(ok, 'image/jpeg', 10 * 1024 * 1024 + 1)))).status).toBe(413);
  });

  it('sin archivo responde 422 y trae código de soporte', async () => {
    const form = new FormData();
    Object.entries(ok).forEach(([k, v]) => form.append(k, v));
    const error = await failure(identify(form));
    expect(error.status).toBe(422);
    expect(error.correlationId).toMatch(/^mock-identify-/);
  });

  it('también simula GET /demo/status', async () => {
    const send = createIdentifyMockFetch({ pickCandidate: () => undefined, latencyMs: 0 });
    const status = await requestJson<{ features: string[] }>(BASE, '/demo/status', { fetchImpl: send });
    expect(status.features).toContain('identify');
  });
});
