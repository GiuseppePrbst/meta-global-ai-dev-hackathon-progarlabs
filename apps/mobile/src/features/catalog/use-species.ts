import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

import { isApiError } from '@/api/client';
import { fetchSpecies, fetchSpeciesCatalog } from '@/api/species';
import type { Species } from '@/domain/species';
import type { QueryResult } from '@/features/query-result';

// Catálogo desde la API pública (GET /species y GET /species/{id}). Los hooks devuelven `QueryResult`,
// así las pantallas no saben que detrás hay TanStack Query.

const CATALOG_KEY = ['species'] as const;
const detailKey = (id: string) => ['species', id] as const;

/** El catálogo cambia solo con un despliegue del backend: no hace falta pedirlo en cada pantalla. */
const STALE_MS = 10 * 60_000;

/** Catálogo completo, en el orden de la API. */
export function useSpeciesCatalog(): QueryResult<Species[]> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: ({ signal }) => fetchSpeciesCatalog(signal),
    staleTime: STALE_MS,
  });
  return { data, isPending, error, refetch };
}

/**
 * Una especie buscada en el catálogo ya cargado, para mostrar nombres (Mapa, Diario, Perfil) sin una
 * petición por especie. Sin `id` (p. ej. una observación sin especie elegida) no hay datos.
 */
export function useSpecies(id: string | null | undefined): QueryResult<Species> {
  const { data, isPending, error, refetch } = useSpeciesCatalog();
  return useMemo(
    () => ({ data: id ? data?.find((species) => species.id === id) : undefined, isPending, error, refetch }),
    [data, error, id, isPending, refetch],
  );
}

/**
 * Ficha de una especie desde GET /species/{id}. Mientras llega, muestra la versión del catálogo si ya
 * está en caché. Un 404 no es un error: `data` y `error` quedan vacíos y la pantalla dice «no está en
 * el catálogo».
 */
export function useSpeciesDetail(id: string | null | undefined): QueryResult<Species> {
  const client = useQueryClient();
  const { data, isPending, error, refetch } = useQuery<Species, Error, Species, ReturnType<typeof detailKey>>({
    queryKey: detailKey(id ?? ''),
    queryFn: ({ signal }) => fetchSpecies(id!, signal),
    enabled: Boolean(id),
    staleTime: STALE_MS,
    placeholderData: () => client.getQueryData<Species[]>(CATALOG_KEY)?.find((species) => species.id === id),
  });
  const notFound = isApiError(error) && error.status === 404;
  return {
    data: notFound ? undefined : data,
    // Sin id no hay nada que esperar.
    isPending: Boolean(id) && isPending,
    error: notFound ? null : error,
    refetch,
  };
}
