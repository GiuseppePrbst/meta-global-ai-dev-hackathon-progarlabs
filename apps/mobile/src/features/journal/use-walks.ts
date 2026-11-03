import { mockWalks } from '@/features/journal/mock-walks';
import type { Walk } from '@/features/journal/walks';
import { createMemoryStore } from '@/features/memory-store';
import { type QueryResult, resolved } from '@/features/query-result';

// MOCK: los recorridos parten de `mock-walks.ts`. Completar el sendero de demostración en el Mapa
// suma uno en memoria, para que el Diario lo refleje; se pierde al cerrar la app.

const walks = createMemoryStore(resolved(mockWalks));

/** Fecha local AAAA-MM-DD (no UTC: un recorrido de noche no pasa al día siguiente). */
function localIsoDate(date: Date): string {
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map((n) => String(n).padStart(2, '0')).join('-');
}

/** Registra un recorrido completado hoy. */
export function recordWalk(walk: Omit<Walk, 'completedAt'>, today = new Date()) {
  walks.set((current) => resolved([...(current.data ?? []), { ...walk, completedAt: localIsoDate(today) }]));
}

/** Recorridos completados, del más antiguo al más reciente. */
export const useWalks: () => QueryResult<Walk[]> = walks.useValue;
