import type { GuideEntry } from '@/domain/guide';

// Mock local de PRUEBA: cuatro especies para ver la guía con avance. Nadie las identificó en terreno;
// la pantalla las rotula como datos de prueba. Se reemplaza cuando exista sumar desde Identificar.
export const mockGuide: GuideEntry[] = [
  { speciesId: 'nothofagus-dombeyi', addedAt: '2026-10-28' },
  { speciesId: 'eucryphia-cordifolia', addedAt: '2026-10-29' },
  { speciesId: 'aextoxicon-punctatum', addedAt: '2026-10-30' },
  { speciesId: 'nothofagus-pumilio', addedAt: '2026-11-01' },
];
