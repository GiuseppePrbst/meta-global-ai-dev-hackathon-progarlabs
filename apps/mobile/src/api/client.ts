// Cliente HTTP de la API de Bosque Vivo. Es el único lugar que hace `fetch` al backend: las features
// reciben tipos de `src/domain/` o un `ApiError`, nunca el JSON crudo ni un error de red sin clasificar.
//
// No registra nada: ni URLs con parámetros, ni cuerpos, ni cabeceras. La API es pública para la demo
// (docs/PUBLIC_DEMO.md): ninguna petición envía `Authorization`; la app no tiene sesiones.

/** Por qué falló una petición. La UI elige el mensaje según esto, no según el texto del servidor. */
export type ApiErrorKind =
  /** Falta `EXPO_PUBLIC_API_URL`: la integración no está configurada. */
  | 'not_configured'
  /** Sin conexión, DNS, TLS o CORS (en web el navegador no distingue estos casos). */
  | 'network'
  | 'timeout'
  /** El servidor respondió con un código que no es 2xx. */
  | 'http'
  /** Respondió 2xx pero el cuerpo no es el JSON esperado. */
  | 'invalid_response';

export class ApiError extends Error {
  constructor(
    readonly kind: ApiErrorKind,
    message: string,
    /** Código HTTP si el servidor respondió. */
    readonly status: number | null = null,
    /** `X-Correlation-ID` de la respuesta, para soporte. No es secreto. */
    readonly correlationId: string | null = null,
    /** `Retry-After` en segundos, si vino (429/503). */
    readonly retryAfterSeconds: number | null = null,
    /**
     * Error original de `fetch` en un fallo de red o tiempo agotado (p. ej. «Network request failed»).
     * Solo para diagnóstico en desarrollo; la UI no lo muestra en producción.
     */
    readonly underlying: unknown = null,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Vale la pena reintentar solo, sin que la persona lo pida: GET con fallo de red o del servidor. */
export function isTransient(error: unknown): boolean {
  if (!isApiError(error)) return false;
  if (error.kind === 'network' || error.kind === 'timeout') return true;
  // 501 = capacidad no habilitada: reintentar no cambia nada.
  return error.kind === 'http' && error.status !== null && error.status >= 500 && error.status !== 501;
}

const TIMEOUT_MS = 15_000;
/** Las operaciones de IA esperan a Meta (y a la cola de una operación a la vez): más margen. */
export const AI_TIMEOUT_MS = 60_000;

/** Firma de `fetch` que usa el cliente. Permite inyectar un mock que se comporta como la API. */
export type FetchLike = (url: string, init: RequestInit) => Promise<Response>;

export type RequestOptions = {
  method?: 'GET' | 'POST';
  /** Objeto → JSON; `FormData` → multipart (el boundary lo pone `fetch`, no se fija `Content-Type`). */
  body?: object | FormData;
  signal?: AbortSignal;
  timeoutMs?: number;
  /** `fetch` global por defecto. */
  fetchImpl?: FetchLike;
};

/**
 * URL base de la API, sin barra final. Es pública: vive en `.env` como `EXPO_PUBLIC_API_URL` y Expo la
 * incrusta en el bundle. Debe leerse con la forma literal `process.env.EXPO_PUBLIC_API_URL`.
 */
export function apiBaseUrl(): string {
  const url = process.env.EXPO_PUBLIC_API_URL?.trim();
  if (!url) throw new ApiError('not_configured', 'Falta EXPO_PUBLIC_API_URL');
  return url.replace(/\/+$/, '');
}

/** GET de un JSON contra la API configurada. */
export function getJson<T>(path: string, signal?: AbortSignal): Promise<T> {
  return requestJson<T>(apiBaseUrl(), path, { signal });
}

/** Petición JSON con tiempo límite y errores clasificados. Exportada para las pruebas. */
export async function requestJson<T>(
  baseUrl: string,
  path: string,
  { method = 'GET', body, signal, timeoutMs = TIMEOUT_MS, fetchImpl = fetch }: RequestOptions = {},
): Promise<T> {
  // AbortSignal.any/timeout no están garantizados en Hermes: se combinan a mano.
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const forwardAbort = () => controller.abort();
  if (signal?.aborted) controller.abort();
  signal?.addEventListener('abort', forwardAbort);

  const headers: Record<string, string> = { Accept: 'application/json' };
  let payload: BodyInit | undefined;
  if (body instanceof FormData) {
    payload = body;
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
    payload = JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetchImpl(`${baseUrl}${path}`, { method, headers, body: payload, signal: controller.signal });
  } catch (cause) {
    // Cancelación pedida por quien llama (p. ej. TanStack Query al desmontar): se propaga tal cual.
    if (signal?.aborted) throw cause;
    throw new ApiError(
      timedOut ? 'timeout' : 'network',
      timedOut ? 'Tiempo de espera agotado' : 'Sin conexión con la API',
      null,
      null,
      null,
      cause,
    );
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }

  const correlationId = response.headers.get('X-Correlation-ID');
  if (!response.ok) {
    const retryRaw = response.headers.get('Retry-After');
    const retryAfter = retryRaw !== null && /^\d+$/.test(retryRaw) ? Number(retryRaw) : null;
    throw new ApiError('http', await errorDetail(response), response.status, correlationId, retryAfter);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError('invalid_response', 'La respuesta no es JSON', response.status, correlationId);
  }
}

/**
 * Mensaje del cuerpo de error de FastAPI: `{"detail": "texto"}` o, en validación, `{"detail": [{msg}]}`.
 * Sirve para diagnóstico; la UI no lo muestra tal cual.
 */
async function errorDetail(response: Response): Promise<string> {
  const fallback = `HTTP ${response.status}`;
  try {
    const body: unknown = await response.json();
    const detail = body && typeof body === 'object' && 'detail' in body ? (body as { detail: unknown }).detail : null;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) {
      const messages = detail.map((item) => (item && typeof item === 'object' && 'msg' in item ? String(item.msg) : null)).filter(Boolean);
      if (messages.length) return messages.join('; ');
    }
  } catch {
    // Errores sin cuerpo JSON (p. ej. una página de Cloudflare).
  }
  return fallback;
}
