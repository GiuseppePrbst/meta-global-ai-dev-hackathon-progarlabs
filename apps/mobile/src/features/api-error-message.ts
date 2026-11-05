import { isApiError } from '@/api/client';
import { t } from '@/i18n/es-CL';

/**
 * Texto para la persona según por qué falló una lectura de la API, con el código de soporte
 * (`X-Correlation-ID`) cuando el servidor lo envió. Nunca muestra el detalle crudo del servidor.
 */
export function apiErrorMessage(error: Error | null): string {
  const m = t.apiError;
  // Un error que no viene de la API (un bug de la app, un archivo ilegible) no es «sin conexión».
  if (!isApiError(error)) return withDevDetail(error ? m.app : m.network, error);
  const body = (() => {
    switch (error.kind) {
      case 'not_configured': return m.notConfigured;
      case 'network': return m.network;
      case 'timeout': return m.timeout;
      case 'invalid_response': return m.invalidResponse;
      case 'http':
        if (error.status === 429) return m.rateLimited(error.retryAfterSeconds);
        if (error.status !== null && error.status >= 500) return m.server;
        return m.unexpected(error.status ?? 0);
    }
  })();
  const text = error.correlationId ? `${body} ${m.support(error.correlationId)}` : body;
  return error.kind === 'network' || error.kind === 'timeout' ? withDevDetail(text, error.underlying) : text;
}

/**
 * Solo en desarrollo (`__DEV__`), agrega el nombre y el mensaje del error original para diagnosticar
 * desde el teléfono. En producción la persona nunca ve detalles técnicos.
 */
export function withDevDetail(text: string, cause: unknown, dev: boolean = __DEV__): string {
  if (!dev || !(cause instanceof Error)) return text;
  return `${text} [${cause.name}: ${cause.message}]`;
}

/**
 * Lo mismo para las operaciones de IA (Wilo), que tienen códigos propios: 403 territorio o función
 * cerrada, 410 fin de la demo, 413/415 audio, 422 consentimiento o pregunta, 502/503 proveedor.
 */
export function aiErrorMessage(error: Error | null, media: 'audio' | 'photo' = 'audio'): string {
  const m = t.apiError;
  if (!isApiError(error) || error.kind !== 'http') return apiErrorMessage(error);
  const body = (() => {
    switch (error.status) {
      case 403: return m.aiForbidden;
      case 410: return m.aiEnded;
      case 413:
      case 415: return media === 'photo' ? m.aiPhoto : m.aiAudio;
      case 400:
      case 422: return m.aiInvalid;
      case 429: return m.rateLimited(error.retryAfterSeconds);
      case 501:
      case 502:
      case 503: return m.aiUnavailable;
      default: return null;
    }
  })();
  if (body === null) return apiErrorMessage(error);
  return error.correlationId ? `${body} ${m.support(error.correlationId)}` : body;
}

/** 410 (demo terminada) y 403 no cambian por insistir: la UI no ofrece «Reintentar». */
export function canRetryAi(error: Error | null): boolean {
  return !(isApiError(error) && (error.status === 410 || error.status === 403));
}
