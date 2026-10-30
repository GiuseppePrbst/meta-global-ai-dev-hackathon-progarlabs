import { useMemo } from 'react';

import type { Species } from '@/domain/species';
import { mockSpecies } from '@/features/catalog/mock-species';
import { type QueryResult, resolved } from '@/features/query-result';

// MOCK: el catálogo sale de `mock-species.ts` hasta conectar GET /species. Al conectarlo, estos
// hooks pasan a TanStack Query sobre `src/api/` y las pantallas siguen igual.

const catalog = resolved(mockSpecies);

/** Catálogo completo, en su orden estable (el del número de pliego). */
export function useSpeciesCatalog(): QueryResult<Species[]> {
  return catalog;
}

/** Una especie del catálogo; sin `id` (p. ej. una observación sin especie elegida) no hay datos. */
export function useSpecies(id: string | null | undefined): QueryResult<Species> {
  const { data, isPending, error, refetch } = useSpeciesCatalog();
  return useMemo(
    () => ({ data: id ? data?.find((species) => species.id === id) : undefined, isPending, error, refetch }),
    [data, error, id, isPending, refetch],
  );
}
