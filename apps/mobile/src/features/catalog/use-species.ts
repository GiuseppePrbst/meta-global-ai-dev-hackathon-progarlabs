import { useQuery } from '@tanstack/react-query';
import { useMemo } from 'react';

import { fetchSpeciesCatalog } from '@/api/species';
import type { Species } from '@/domain/species';
import type { QueryResult } from '@/features/query-result';

// Catálogo desde la API pública (GET /species). Los hooks devuelven `QueryResult`, así las pantallas no
// saben que detrás hay TanStack Query. La ficha completa sale de GET /taxa/{id} (use-taxon.ts).

const CATALOG_KEY = ['species'] as const;

/** El catálogo cambia solo con un despliegue del backend: no hace falta pedirlo en cada pantalla. */
export const STALE_MS = 10 * 60_000;

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
