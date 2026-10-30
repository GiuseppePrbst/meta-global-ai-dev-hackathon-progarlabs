import { Easing } from 'react-native-reanimated';

// Curvas y duraciones compartidas. Las coreografías propias de una pieza (retrasos del entintado,
// la caída de la papeleta) se quedan junto a ella; aquí va solo lo que se repite.

export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
// Ritmo de pluma para el entintado lento: arranca y se posa suave, y entre medio avanza parejo,
// así cada trazo se ve dibujarse en vez de aparecer de golpe.
export const easePen = Easing.bezier(0.45, 0, 0.25, 1);

export const duration = {
  /** Pulgar de un control segmentado al cambiar de opción. */
  toggle: 280,
  /** Fundidos que reemplazan una coreografía con movimiento reducido. */
  reducedIn: 160,
  reducedOut: 120,
};
