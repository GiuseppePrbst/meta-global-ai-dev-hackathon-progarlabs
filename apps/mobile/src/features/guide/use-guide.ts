import type { GuideEntry } from '@/domain/guide';
import { mockGuide } from '@/features/guide/mock-guide';
import { type QueryResult, resolved } from '@/features/query-result';

// MOCK: la guía sale de `mock-guide.ts` (datos de prueba) hasta que Identificar pueda sumar especies.

const guide = resolved(mockGuide);

/** Especies de la guía personal, en el orden en que se sumaron. */
export function useGuide(): QueryResult<GuideEntry[]> {
  return guide;
}

/** La entrada de la guía de una especie, si la persona ya la sumó. */
export function useGuideEntry(speciesId: string): GuideEntry | undefined {
  return useGuide().data?.find((entry) => entry.speciesId === speciesId);
}
