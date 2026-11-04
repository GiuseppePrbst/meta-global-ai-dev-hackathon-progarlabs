import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';

import { ApiError, isTransient, requestJson } from '@/api/client';

// `fetch` simulado: ninguna prueba sale a la red. URLs con dominio reservado `.invalid`.
const BASE = 'https://api.example.invalid';

type FakeResponse = { ok: boolean; status: number; headers: { get: (name: string) => string | null }; json: () => Promise<unknown> };

function respond(status: number, body: unknown, headers: Record<string, string> = {}): FakeResponse {
  const lower = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: (name) => lower[name.toLowerCase()] ?? null },
    json: () => (body instanceof Error ? Promise.reject(body) : Promise.resolve(body)),
  };
}

const realFetch = globalThis.fetch;
let fetchMock: jest.Mock<(...args: unknown[]) => Promise<FakeResponse>>;

beforeEach(() => {
  fetchMock = jest.fn<(...args: unknown[]) => Promise<FakeResponse>>();
  globalThis.fetch = fetchMock as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
});

async function failure(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof ApiError) return error;
    throw error;
  }
  throw new Error('se esperaba un ApiError');
}

describe('requestJson', () => {
  it('devuelve el JSON y pide la ruta bajo la URL base', async () => {
    fetchMock.mockResolvedValue(respond(200, [{ id: 'a' }]));
    await expect(requestJson(BASE, '/species')).resolves.toEqual([{ id: 'a' }]);
    expect(fetchMock.mock.calls[0][0]).toBe(`${BASE}/species`);
  });

  it('un 404 trae el detalle de FastAPI y el código de soporte', async () => {
    fetchMock.mockResolvedValue(respond(404, { detail: 'Especie no encontrada' }, { 'X-Correlation-ID': 'corr-1' }));
    const error = await failure(requestJson(BASE, '/species/x'));
    expect(error).toMatchObject({ kind: 'http', status: 404, message: 'Especie no encontrada', correlationId: 'corr-1' });
  });

  it('une los mensajes de una validación de Pydantic', async () => {
    fetchMock.mockResolvedValue(respond(422, { detail: [{ msg: 'campo a' }, { msg: 'campo b' }] }));
    expect((await failure(requestJson(BASE, '/x'))).message).toBe('campo a; campo b');
  });

  it('lee Retry-After en segundos', async () => {
    fetchMock.mockResolvedValue(respond(429, { detail: 'lento' }, { 'Retry-After': '30' }));
    expect((await failure(requestJson(BASE, '/x'))).retryAfterSeconds).toBe(30);
  });

  it('un error sin JSON (p. ej. página de Cloudflare) queda como HTTP con su código', async () => {
    fetchMock.mockResolvedValue(respond(502, new Error('no json')));
    expect(await failure(requestJson(BASE, '/x'))).toMatchObject({ kind: 'http', status: 502, message: 'HTTP 502' });
  });

  it('un 200 que no es JSON es una respuesta inválida, no datos vacíos', async () => {
    fetchMock.mockResolvedValue(respond(200, new Error('no json')));
    expect((await failure(requestJson(BASE, '/x'))).kind).toBe('invalid_response');
  });

  it('una falla de fetch es un error de red', async () => {
    fetchMock.mockRejectedValue(new TypeError('Network request failed'));
    expect((await failure(requestJson(BASE, '/x'))).kind).toBe('network');
  });

  it('una cancelación pedida por quien llama no se disfraza de error de red', async () => {
    const controller = new AbortController();
    controller.abort();
    const abort = new Error('Aborted');
    fetchMock.mockRejectedValue(abort);
    await expect(requestJson(BASE, '/x', { signal: controller.signal })).rejects.toBe(abort);
  });
});

describe('isTransient', () => {
  it('reintenta solo red, tiempo agotado y 5xx distintos de 501', () => {
    expect(isTransient(new ApiError('network', ''))).toBe(true);
    expect(isTransient(new ApiError('timeout', ''))).toBe(true);
    expect(isTransient(new ApiError('http', '', 503))).toBe(true);
    expect(isTransient(new ApiError('http', '', 501))).toBe(false);
    expect(isTransient(new ApiError('http', '', 404))).toBe(false);
    expect(isTransient(new ApiError('http', '', 429))).toBe(false);
    expect(isTransient(new ApiError('not_configured', ''))).toBe(false);
    expect(isTransient(new Error('otro'))).toBe(false);
  });
});
