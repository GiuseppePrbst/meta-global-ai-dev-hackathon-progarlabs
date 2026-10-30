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
