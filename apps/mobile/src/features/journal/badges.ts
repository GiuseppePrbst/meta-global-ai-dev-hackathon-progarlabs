import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import { collectedCount } from '@/features/guide/guide';
import type { Walk } from '@/features/journal/walks';

// Insignias del Diario: se derivan de la guía y de los recorridos, nunca se guardan ni se inventan.

export type BadgeId = 'first-species' | 'half-guide' | 'full-guide' | 'all-nothofagus' | 'first-walk' | 'ten-km';

export type Badge = { id: BadgeId; earned: boolean; /** Avance hacia la meta, para mostrar «3 de 4». */ progress: number; goal: number };

type Inputs = { catalog: Species[]; entries: GuideEntry[]; walks: Walk[] };

/** Kilómetros de todos los recorridos. */
export function totalKm(walks: Walk[]): number {
  return walks.reduce((sum, walk) => sum + walk.km, 0);
}

function badge(id: BadgeId, progress: number, goal: number): Badge {
  return { id, progress: Math.min(progress, goal), goal, earned: goal > 0 && progress >= goal };
}

/** Todas las insignias con su estado, en orden fijo. */
export function computeBadges({ catalog, entries, walks }: Inputs): Badge[] {
  const collected = collectedCount(catalog, entries);
  const added = new Set(entries.map((entry) => entry.speciesId));
  const nothofagus = catalog.filter((species) => species.scientificName.startsWith('Nothofagus '));
  const nothofagusCollected = nothofagus.filter((species) => added.has(species.id)).length;
  return [
    badge('first-species', collected, 1),
    badge('half-guide', collected, Math.ceil(catalog.length / 2)),
    badge('full-guide', collected, catalog.length),
    badge('all-nothofagus', nothofagusCollected, nothofagus.length),
    badge('first-walk', walks.length, 1),
    badge('ten-km', Math.floor(totalKm(walks) * 10) / 10, 10),
  ];
}
