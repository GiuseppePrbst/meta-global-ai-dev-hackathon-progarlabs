import { pathLengthKm } from '@/domain/geo';
import { demoTrailFor } from '@/features/atlas/demo-trail';
import type { Walk } from '@/features/journal/walks';

// Mock local de PRUEBA: dos recorridos de un sendero inventado para ver el Diario con cifras. Nadie
// los caminó y el sendero no existe; la pantalla los rotula como datos de demostración. La distancia
// es el largo del trazado sintético, calculado, no una medición.
const demoTrail = demoTrailFor('demo-walk', 'Sendero de demostración');
const km = pathLengthKm(demoTrail.path);

export const mockWalks: Walk[] = [
  { trailId: demoTrail.id, trailName: demoTrail.name, completedAt: '2026-10-29', km },
  { trailId: demoTrail.id, trailName: demoTrail.name, completedAt: '2026-11-01', km },
];
