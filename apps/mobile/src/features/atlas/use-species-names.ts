import { useSpecies } from '@/features/catalog/use-species';
import { t } from '@/i18n/es-CL';

/**
 * Nombre visible de la especie de una observación. Distingue la que no tiene especie elegida de la
 * que todavía carga o no se pudo cargar: ninguna de esas se muestra como «sin elegir».
 */
export function useSpeciesNames(speciesId: string | null) {
  const { data: species, isPending } = useSpecies(speciesId);
  if (species) return { common: species.commonName, scientific: species.scientificName };
  if (!speciesId) return { common: t.atlas.noSpecies, scientific: undefined };
  return { common: isPending ? t.atlas.speciesLoading : t.atlas.speciesUnavailable, scientific: undefined };
}
