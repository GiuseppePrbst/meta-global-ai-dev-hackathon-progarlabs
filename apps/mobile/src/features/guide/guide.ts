import type { GuideEntry } from '@/domain/guide';
import type { Species } from '@/domain/species';

// Lógica pura sobre la guía personal y el catálogo ya cargados.

/**
 * Especies del catálogo que ya están en la guía. Una entrada cuya especie no está en el catálogo no
 * cuenta: el avance nunca supera el total.
 */
export function collectedCount(catalog: Species[], entries: GuideEntry[]): number {
  const added = new Set(entries.map((entry) => entry.speciesId));
  return catalog.filter((species) => added.has(species.id)).length;
}
