import { PARK_REGIONS, type ParkRegion, type RegionalConservation } from '@/domain/taxon';

// Lógica pura sobre el estado RCE de un taxón, sin importar de dónde vino.

export type ConservationSummary =
  /** La nómina RCE no tiene registro del taxón. No significa que no esté amenazado. */
  | { kind: 'no_record' }
  /** La misma categoría en todas las regiones del parque. */
  | { kind: 'same'; category: string }
  /** Categorías distintas, o alguna región sin categoría. */
  | { kind: 'by_region'; regions: { region: ParkRegion; category: string | null }[] }
  /** Tiene registro RCE, pero sin categoría para las regiones del parque. */
  | { kind: 'not_for_park' };

/**
 * Qué decir del estado de conservación en Puyehue, que abarca Los Ríos y Los Lagos. La API no elige
 * una categoría sin región; la app tampoco: si difieren, muestra una por región.
 */
export function conservationSummary(conservation: RegionalConservation): ConservationSummary {
  if (conservation.recordStatus === 'no_rce_record_found') return { kind: 'no_record' };
  const regions = PARK_REGIONS
    .filter((region) => region in conservation.parkRegions)
    .map((region) => ({ region, category: conservation.parkRegions[region] ?? null }));
  const categories = regions.map((r) => r.category);
  if (categories.every((category) => category === null)) return { kind: 'not_for_park' };
  if (categories.every((category) => category === categories[0])) return { kind: 'same', category: categories[0]! };
  return { kind: 'by_region', regions };
}
