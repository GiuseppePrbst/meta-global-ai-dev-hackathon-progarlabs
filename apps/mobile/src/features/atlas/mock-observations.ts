import type { Observation } from '@/domain/observation';

// Mock local SINTÉTICO para ver el Atlas con puntos. No son registros de terreno: las coordenadas
// se eligieron a mano dentro del encuadre CONAF y no indican dónde crece ninguna especie.
// Se reemplaza por GET /observations cuando la app se conecte con la API.
const SYNTHETIC_NOTE = 'Observación sintética de demostración; no es un registro de terreno.';

const entries: [id: string, speciesId: string | null, location: [lon: number, lat: number] | null, createdAt: string][] = [
  ['mock-01', 'nothofagus-dombeyi', [-72.18, -40.62], '2026-10-21'],
  ['mock-02', 'eucryphia-cordifolia', [-72.27, -40.73], '2026-10-22'],
  ['mock-03', 'aextoxicon-punctatum', [-72.12, -40.81], '2026-10-23'],
  ['mock-04', 'weinmannia-trichosperma', [-72.03, -40.69], '2026-10-24'],
  ['mock-05', 'laureliopsis-philippiana', [-71.95, -40.55], '2026-10-25'],
  ['mock-06', 'nothofagus-pumilio', [-71.9, -40.78], '2026-10-26'],
  ['mock-07', null, [-72.22, -40.88], '2026-10-26'],
  ['mock-08', 'podocarpus-nubigenus', null, '2026-10-27'],
];

export const mockObservations: Observation[] = entries.map(([id, speciesId, location, createdAt]) => ({
  id,
  speciesId,
  notes: SYNTHETIC_NOTE,
  location: location && { longitude: location[0], latitude: location[1] },
  createdAt,
  verificationStatus: 'unverified',
}));
