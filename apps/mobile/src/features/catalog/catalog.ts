import type { Species } from '@/domain/species';

// Lógica pura sobre un catálogo ya cargado, sin importar de dónde vino.

/** Minúsculas sin diacríticos («Coigüe» → «coigue», «ñ» → «n») para comparar búsquedas. */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-CL');
}

/** Especies cuyo nombre común o científico contiene `query`, sin distinguir tildes ni mayúsculas. */
export function filterSpecies(species: Species[], query: string): Species[] {
  const term = fold(query.trim());
  if (!term) return species;
  return species.filter((item) => fold(`${item.commonName} ${item.scientificName}`).includes(term));
}

/** Familias del catálogo, sin repetir, en el orden en que aparecen. Una especie sin familia no suma. */
export function familiesOf(species: Species[]): string[] {
  return [...new Set(species.flatMap((item) => (item.family ? [item.family] : [])))];
}

/** Filtro de las listas: todas, una familia o, en el catálogo, las guardadas. */
export type SpeciesFilter =
  | { kind: 'all' }
  | { kind: 'saved' }
  | { kind: 'family'; family: string };

export function applyFilter(species: Species[], filter: SpeciesFilter, saved: ReadonlySet<string> = new Set()): Species[] {
  if (filter.kind === 'saved') return species.filter((item) => saved.has(item.id));
  if (filter.kind === 'family') return species.filter((item) => item.family === filter.family);
  return species;
}
