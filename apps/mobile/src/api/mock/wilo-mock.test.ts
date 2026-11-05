import { describe, expect, it } from '@jest/globals';

import { ApiError, requestJson } from '@/api/client';
import { createWiloMockFetch, MOCK_ABSTENTION, MOCK_TRANSCRIPT } from '@/api/mock/wilo-mock';
import type { GuideAnswer, Transcription } from '@/api/wilo';

// Pruebas del mock de Wilo: preguntas y respuestas SINTÉTICAS. Ninguna sale a la red.
const BASE = 'https://wilo-mock.invalid';
const CANNED_Q = 'Sobre Árbol sintético (Arbor syntheticus): ¿cómo son sus hojas?';
const send = createWiloMockFetch({ cannedAnswer: (q) => (q === CANNED_Q ? 'Hoja X' : undefined), latencyMs: 0 });

const query = (body: object) => requestJson<GuideAnswer>(BASE, '/guide/query', { method: 'POST', body, fetchImpl: send });
const consented = { adult_confirmed: true, external_processing_confirmed: true, capture_id: null };

async function status(promise: Promise<unknown>): Promise<number | null> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error.status;
    throw error;
  }
  return 200;
}

function audioForm(fields: Record<string, string>, type = 'audio/wav'): FormData {
  const form = new FormData();
  form.append('file', new Blob(['sintetico'], { type }), 'pregunta.wav');
  for (const [key, value] of Object.entries(fields)) form.append(key, value);
  return form;
}
const audioOk = { adult_confirmed: 'true', rights_confirmed: 'true', external_processing_confirmed: 'true', language_hint: 'es' };
const transcribe = (form: FormData) =>
  requestJson<Transcription>(BASE, '/guide/transcribe', { method: 'POST', body: form, fetchImpl: send });

describe('mock de POST /guide/query', () => {
  it('a una pregunta sugerida responde con el texto de demostración, rotulado como mock', async () => {
    const answer = await query({ question: CANNED_Q, ...consented });
    expect(answer).toMatchObject({ answer: 'Hoja X', provider: 'mock', execution_status: 'mock', insufficient_evidence: false });
    expect(answer.limitations?.length).toBeGreaterThan(0);
  });

  it('a cualquier otra pregunta se abstiene', async () => {
    const answer = await query({ question: '¿Qué hora es?', ...consented });
    expect(answer).toMatchObject({ answer: MOCK_ABSTENTION, provider: 'mock', insufficient_evidence: true });
    expect(answer.sources).toEqual([]);
  });

  it('valida como el backend: consentimientos y largo de la pregunta', async () => {
    expect(await status(query({ question: 'q', ...consented, adult_confirmed: false }))).toBe(422);
    expect(await status(query({ question: 'q', ...consented, external_processing_confirmed: false }))).toBe(422);
    expect(await status(query({ question: '', ...consented }))).toBe(422);
    expect(await status(query({ question: 'x'.repeat(2001), ...consented }))).toBe(422);
  });

  it('el error trae código de soporte, como la API', async () => {
    try {
      await query({ question: 'q', adult_confirmed: false });
      throw new Error('se esperaba 422');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as ApiError).correlationId).toMatch(/^mock-/);
      expect((error as ApiError).message).toBe('Guía exclusivo para adultos');
    }
  });

  it('cancelar con signal aborta la respuesta', async () => {
    const slow = createWiloMockFetch({ cannedAnswer: () => undefined, latencyMs: 10_000 });
    const controller = new AbortController();
    const pending = requestJson(BASE, '/guide/query', {
      method: 'POST', body: { question: 'q', ...consented }, signal: controller.signal, fetchImpl: slow,
    });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});

describe('mock de POST /guide/transcribe', () => {
  it('devuelve una transcripción simulada', async () => {
    const result = await transcribe(audioForm(audioOk));
    expect(result).toMatchObject({ transcript: MOCK_TRANSCRIPT, provider: 'mock', execution_status: 'mock' });
  });

  it('avisa que un audio que no es WAV fallaría en la API real', async () => {
    const result = await transcribe(audioForm(audioOk, 'audio/mp4'));
    expect(result.limitations?.join(' ')).toMatch(/415/);
  });

  it('sin archivo o sin consentimientos responde 422', async () => {
    const noFile = new FormData();
    Object.entries(audioOk).forEach(([k, v]) => noFile.append(k, v));
    expect(await status(transcribe(noFile))).toBe(422);
    expect(await status(transcribe(audioForm({ ...audioOk, rights_confirmed: 'false' })))).toBe(422);
    expect(await status(transcribe(audioForm({ ...audioOk, external_processing_confirmed: 'false' })))).toBe(422);
  });
});

describe('mock de GET /demo/status', () => {
  it('informa la demo activa con su aviso', async () => {
    const result = await requestJson<{ status: string; notice: string; features: string[] }>(BASE, '/demo/status', { fetchImpl: send });
    expect(result.status).toBe('active');
    expect(result.features).toContain('guide');
    expect(result.notice).toMatch(/18 años/);
  });
});
