import { useQuery } from '@tanstack/react-query';

import { fetchTaxon, fetchTaxonConservation } from '@/api/taxa';
import type { RegionalConservation, Taxon } from '@/domain/taxon';
import { STALE_MS } from '@/features/catalog/use-species';
import { type QueryResult, withoutNotFound } from '@/features/query-result';

// Ficha completa desde GET /taxa/{id} y su estado RCE desde GET /taxa/{id}/conservation. Son dos
// consultas independientes: si la conservación falla, la ficha se ve igual y solo esa sección lo dice.

const taxonKey = (id: string) => ['taxa', id] as const;
const conservationKey = (id: string) => ['taxa', id, 'conservation'] as const;

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
