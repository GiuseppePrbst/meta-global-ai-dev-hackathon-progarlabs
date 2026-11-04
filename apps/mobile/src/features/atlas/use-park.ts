import { useQuery } from '@tanstack/react-query';

import { fetchPark, fetchParkTrails } from '@/api/parks';
import type { ParkProfile, ParkTrail } from '@/domain/park';
import { STALE_MS } from '@/features/catalog/use-species';
import { type QueryResult, withoutNotFound } from '@/features/query-result';

// Ficha del parque (GET /parks/{id}) y sus senderos (GET /parks/{id}/trails), consultas independientes:
// si los senderos fallan, la ficha se ve igual. El atlas cambia solo con un despliegue del backend.

const parkKey = (id: string) => ['parks', id] as const;
const trailsKey = (id: string) => ['parks', id, 'trails'] as const;

export function usePark(id: string | null | undefined): QueryResult<ParkProfile> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: parkKey(id ?? ''),
    queryFn: ({ signal }) => fetchPark(id!, signal),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
  return withoutNotFound(id, { data, isPending, error, refetch });
}

export function useParkTrails(id: string | null | undefined): QueryResult<ParkTrail[]> {
  const { data, isPending, error, refetch } = useQuery({
    queryKey: trailsKey(id ?? ''),
    queryFn: ({ signal }) => fetchParkTrails(id!, signal),
    enabled: Boolean(id),
    staleTime: STALE_MS,
  });
  return withoutNotFound(id, { data, isPending, error, refetch });
}
