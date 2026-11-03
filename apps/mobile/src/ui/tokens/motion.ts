import { Easing } from 'react-native-reanimated';

// Curvas compartidas; las coreografías propias de una pieza se quedan junto a ella. El mapa HTML
// (src/map/atlas-map.tsx) repite esta curva en CSS porque no puede importar Reanimated.

export const easeOutExpo = Easing.bezier(0.16, 1, 0.3, 1);
