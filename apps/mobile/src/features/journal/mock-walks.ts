import { pathLengthKm } from '@/domain/geo';
import { demoTrail } from '@/features/atlas/demo-trail';
import type { Walk } from '@/features/journal/walks';

// Mock local de PRUEBA: dos recorridos del sendero de demostración para ver el Diario con cifras.
// Nadie los caminó; la pantalla los rotula como datos de demostración. La distancia es el largo del
// trazado sintético, calculado, no una medición.
const km = pathLengthKm(demoTrail.path);

export const mockWalks: Walk[] = [
  { trailId: demoTrail.id, completedAt: '2026-10-29', km },
  { trailId: demoTrail.id, completedAt: '2026-11-01', km },
];
