import type { Observation } from '@/domain/observation';
import { mockObservations } from '@/features/atlas/mock-observations';
import { type QueryResult, resolved } from '@/features/query-result';

// MOCK: observaciones SINTÉTICAS de `mock-observations.ts` hasta conectar GET /observations.
// El resultado es una constante de módulo: el DOM component del mapa recibe la misma referencia
// en cada render y no vuelve a cargar los puntos.

const observations = resolved(mockObservations);

export function useObservations(): QueryResult<Observation[]> {
  return observations;
}
