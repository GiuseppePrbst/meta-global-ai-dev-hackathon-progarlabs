/**
 * Índice del destino bajo `x` (coordenada local de la barra, con `padding` lateral y destinos de igual ancho).
 * Se ajusta a los extremos si el dedo sale de la barra; -1 si no hay destinos.
 */
export function scrubIndex(x: number, width: number, count: number, padding: number): number {
  if (count <= 0) return -1;
  const itemWidth = (width - 2 * padding) / count;
  if (itemWidth <= 0) return 0;
  return Math.min(count - 1, Math.max(0, Math.floor((x - padding) / itemWidth)));
}

/** Centro horizontal del destino `index`, en la misma geometría que `scrubIndex`. */
export function slotCenter(index: number, width: number, count: number, padding: number): number {
  const itemWidth = (width - 2 * padding) / Math.max(1, count);
  return padding + itemWidth * (index + 0.5);
}

/**
 * Borde izquierdo de un resaltado de ancho `highlightWidth` centrado en `center`,
 * sin salirse de la barra más allá de `inset` por cada lado.
 */
export function highlightLeft(center: number, highlightWidth: number, width: number, inset: number): number {
  const max = Math.max(inset, width - inset - highlightWidth);
  return Math.min(max, Math.max(inset, center - highlightWidth / 2));
}
