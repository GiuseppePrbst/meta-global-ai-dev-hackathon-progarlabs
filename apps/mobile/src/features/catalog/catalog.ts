import type { Species } from '@/domain/species';

// Lógica pura sobre un catálogo ya cargado, sin importar de dónde vino.

/** Número de pliego: posición estable en el catálogo, solo para orientarse. */
export function sheetNumber(catalog: Species[], id: string): string {
  const index = catalog.findIndex((species) => species.id === id);
  return String(index + 1).padStart(2, '0');
}

function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('es-CL');
}

/** Especies cuyo nombre común o científico contiene `query`, sin distinguir tildes ni mayúsculas. */
export function filterSpecies(species: Species[], query: string): Species[] {
  const term = fold(query.trim());
  if (!term) return species;
  return species.filter((item) => fold(`${item.commonName} ${item.scientificName}`).includes(term));
}
