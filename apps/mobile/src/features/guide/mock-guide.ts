import type { GuideEntry } from '@/domain/guide';

// Mock local de PRUEBA: dos especies para ver la guía con avance. Nadie las identificó en terreno;
// la pantalla las rotula como datos de prueba. Se reemplaza cuando exista sumar desde Identificar.
export const mockGuide: GuideEntry[] = [
  { speciesId: 'nothofagus-dombeyi', addedAt: '2026-10-28' },
  { speciesId: 'eucryphia-cordifolia', addedAt: '2026-10-29' },
];
