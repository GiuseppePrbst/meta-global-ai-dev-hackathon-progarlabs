import { isApiError } from '@/api/client';
import { t } from '@/i18n/es-CL';

/**
 * Texto para la persona según por qué falló una lectura de la API, con el código de soporte
 * (`X-Correlation-ID`) cuando el servidor lo envió. Nunca muestra el detalle crudo del servidor.
 */
export function apiErrorMessage(error: Error | null): string {
  const m = t.apiError;
  if (!isApiError(error)) return m.network;
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
  return error.correlationId ? `${body} ${m.support(error.correlationId)}` : body;
}
