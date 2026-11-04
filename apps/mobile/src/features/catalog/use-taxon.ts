import { useQuery } from '@tanstack/react-query';

import { isApiError } from '@/api/client';
import { fetchTaxon, fetchTaxonConservation } from '@/api/taxa';
import type { RegionalConservation, Taxon } from '@/domain/taxon';
import { STALE_MS } from '@/features/catalog/use-species';
import type { QueryResult } from '@/features/query-result';

// Ficha completa desde GET /taxa/{id} y su estado RCE desde GET /taxa/{id}/conservation. Son dos
// consultas independientes: si la conservación falla, la ficha se ve igual y solo esa sección lo dice.

const taxonKey = (id: string) => ['taxa', id] as const;
const conservationKey = (id: string) => ['taxa', id, 'conservation'] as const;

/** Un 404 no es un error: el taxón no está en el atlas y la pantalla lo dice así. */
function withoutNotFound<T>(id: string | null | undefined, result: Omit<QueryResult<T>, 'refetch'> & { refetch: () => unknown }): QueryResult<T> {
  const notFound = isApiError(result.error) && result.error.status === 404;
  return {
    data: notFound ? undefined : result.data,
    // Sin id no hay nada que esperar.
    isPending: Boolean(id) && result.isPending,
    error: notFound ? null : result.error,
    refetch: result.refetch,
  };
}

export function useTaxon(id: string | null | undefined): QueryResult<Taxon> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: taxonKey(id ?? ''),
    queryFn: ({ signal }) => fetchTaxon(id!, signal),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
  return withoutNotFound(id, { data, isPending, error, refetch });
}

export function useTaxonConservation(id: string | null | undefined): QueryResult<RegionalConservation> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: conservationKey(id ?? ''),
    queryFn: ({ signal }) => fetchTaxonConservation(id!, signal),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
  return withoutNotFound(id, { data, isPending, error, refetch });
}
