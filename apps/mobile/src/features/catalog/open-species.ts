import { router } from 'expo-router';

/** Abre la ficha de una especie sobre la pantalla actual. */
export function openSpecies(speciesId: string) {
  router.push({ pathname: '/species/[id]', params: { id: speciesId } });
}
