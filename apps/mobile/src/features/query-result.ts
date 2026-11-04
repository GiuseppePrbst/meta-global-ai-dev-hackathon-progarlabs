import { isApiError } from '@/api/client';

// Forma del resultado de los hooks de datos, la misma que entrega TanStack Query (`data`,
// `isPending`, `error`, `refetch`): al conectar la API, cada hook cambia por dentro y las pantallas no.

export type QueryResult<T> = {
  data: T | undefined;
  isPending: boolean;
  error: Error | null;
  /** Vuelve a pedir los datos, p. ej. desde el botón «Reintentar» de un error. */
  refetch: () => void;
};

/** Resultado ya resuelto de un mock local: nunca está cargando ni falla. */
export function resolved<T>(data: T): QueryResult<T> {
  return { data, isPending: false, error: null, refetch: () => {} };
}

/**
 * Un 404 de la API no es un error para la pantalla: el recurso no existe y se muestra así. Sin `id`
 * (consulta desactivada) no hay nada que esperar.
 */
export function withoutNotFound<T>(
  id: string | null | undefined,
  result: Omit<QueryResult<T>, 'refetch'> & { refetch: () => unknown },
): QueryResult<T> {
  const notFound = isApiError(result.error) && result.error.status === 404;
  return {
    data: notFound ? undefined : result.data,
    isPending: Boolean(id) && result.isPending,
    error: notFound ? null : result.error,
    refetch: result.refetch,
  };
}
