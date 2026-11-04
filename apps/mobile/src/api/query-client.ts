import { QueryClient } from '@tanstack/react-query';

import { isTransient } from '@/api/client';

/**
 * Caché compartida de las lecturas a la API. Solo reintenta sola las fallas pasajeras (red, 5xx) y
 * como mucho dos veces; un 4xx o un 501 no cambia por insistir. Las mutaciones nunca se reintentan
 * solas: cuando lleguen Wilo o Identificar, un POST repetido puede reservar presupuesto.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => failureCount < 2 && isTransient(error),
    },
    mutations: { retry: false },
  },
});
