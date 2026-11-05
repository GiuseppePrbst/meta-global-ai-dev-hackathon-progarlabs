import type { DemoStatus } from '@/api/demo-status';

// Piezas comunes de los mocks con firma de `fetch` (wilo-mock.ts, identify-mock.ts): responden como la
// API (JSON, X-Correlation-ID, errores de FastAPI) sin salir a la red.

/** Latencia simulada, para que la UI muestre los estados de espera. */
export const MOCK_LATENCY_MS = 900;

/** Ruta de una URL. `URL.pathname` no está implementado en el URL de React Native: se corta a mano. */
export function pathOf(url: string): string {
  return url.replace(/^[a-z]+:\/\/[^/]+/i, '').split('?')[0];
}

export function isFormData(body: unknown): body is FormData {
  return typeof FormData !== 'undefined' && body instanceof FormData;
}

/** Valores de un campo. El FormData de React Native no tiene `get`, solo `getAll`. */
export function fields(form: FormData, name: string): unknown[] {
  return form.getAll(name);
}

export function field(form: FormData, name: string): unknown {
  return fields(form, name)[0];
}

/** Respuesta JSON con el código de soporte, como la API. */
export function json(status: number, body: unknown, correlation: string): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', 'X-Correlation-ID': correlation },
  });
}

/** Espera cancelable: al abortar rechaza con un `AbortError`, como `fetch`. */
export function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const abortError = () => Object.assign(new Error('Aborted'), { name: 'AbortError' });
    if (signal?.aborted) return reject(abortError());
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortError());
    };
    signal?.addEventListener('abort', onAbort);
  });
}

/** Contador de códigos de soporte `mock-<prefijo>-N`. */
export function correlations(prefix: string): () => string {
  let sequence = 0;
  return () => `mock-${prefix}-${++sequence}`;
}

// Aviso de /demo/status tal como lo publica el backend (schema DemoStatus, valor por defecto).
const NOTICE =
  'Solo para mayores de 18 años. Tu texto, audio o foto se envían a Meta Model API. Mientras la campaña use créditos promocionales, Meta indica que el contenido puede usarse para mejorar sus productos: no envíes datos personales ni confidenciales.';

/** GET /demo/status simulado: demo activa con las cuatro funciones. */
export function mockDemoStatus(): DemoStatus {
  return {
    public_demo_enabled: true,
    status: 'active',
    expires_at: '2026-11-10T05:00:00Z',
    seconds_remaining: 0,
    features: ['guide', 'transcribe', 'identify', 'voice'],
    budget_status: 'available',
    territory_eligible: true,
    notice: NOTICE,
  };
}
