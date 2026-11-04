import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';
import { collectedCount } from '@/features/guide/guide';
import type { Walk } from '@/features/journal/walks';

// Niveles del perfil: se derivan de los descubrimientos, nunca se guardan. Un descubrimiento es una
// especie del catálogo sumada a la guía o un recorrido completado. Los umbrales son fijos: con el
// catálogo actual, Oro todavía no es alcanzable solo con especies.

export type LevelId = 'sprout' | 'bronze' | 'silver' | 'gold';

/** En orden; `min` es cuántos descubrimientos hacen falta para alcanzarlo. */
export const LEVELS: readonly { id: LevelId; min: number }[] = [
  { id: 'sprout', min: 0 },
  { id: 'bronze', min: 5 },
  { id: 'silver', min: 20 },
  { id: 'gold', min: 50 },
];

export type LevelProgress = {
  /** Número de nivel desde 1. */
  number: number;
  id: LevelId;
  discoveries: number;
  /** El siguiente nivel; `undefined` en el último. */
  next?: { id: LevelId; min: number };
  /** Niveles aún no alcanzados, para mostrar qué viene. */
  upcoming: { id: LevelId; min: number }[];
};

type Inputs = { catalog: Species[]; entries: GuideEntry[]; walks: Walk[] };

export function countDiscoveries({ catalog, entries, walks }: Inputs): number {
  return collectedCount(catalog, entries) + walks.length;
}

export function levelFor(discoveries: number): LevelProgress {
  const count = Math.max(0, Math.floor(discoveries));
  let index = 0;
  LEVELS.forEach((level, i) => {
    if (count >= level.min) index = i;
  });
  return {
    number: index + 1,
    id: LEVELS[index].id,
    discoveries: count,
    next: LEVELS[index + 1],
    upcoming: LEVELS.slice(index + 1),
  };
}
