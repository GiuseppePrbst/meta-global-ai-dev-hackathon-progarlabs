import { space } from '@/ui';

// Zonas que se reparten las piezas flotantes sobre el mapa. Van juntas porque cada una deja libre
// el lugar de otra: si cambia una, las demás deben seguirla.

/** Columna de controles a la derecha: botones de 48 dp más sus márgenes. */
export const CONTROLS_GUTTER = space.md + 48 + space.lg;
/** Alto sobre el borde inferior donde empiezan los controles, por encima de la atribución. */
export const CONTROLS_BOTTOM = 56;
/** Alto sobre el borde inferior donde se apoya la papeleta, por encima de la escala. */
export const CARD_BOTTOM = 44;
