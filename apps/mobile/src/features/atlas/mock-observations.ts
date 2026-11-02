import type { Observation } from '@/domain/observation';

// Mock local SINTÉTICO para ver el mapa con puntos. No son registros de terreno: las coordenadas
// se eligieron a mano cerca del sendero sintético de demostración y no indican dónde crece ninguna
// especie.
// Se reemplaza por GET /observations cuando la app se conecte con la API.
const SYNTHETIC_NOTE = 'Observación sintética de demostración; no es un registro de terreno.';

const entries: [id: string, speciesId: string | null, location: [lon: number, lat: number] | null, createdAt: string][] = [
  ['mock-01', 'nothofagus-dombeyi', [-72.1478, -40.7027], '2026-10-21'],
  ['mock-02', 'eucryphia-cordifolia', [-72.1462, -40.6927], '2026-10-22'],
  ['mock-03', 'aextoxicon-punctatum', [-72.1372, -40.6958], '2026-10-23'],
  ['mock-04', 'weinmannia-trichosperma', [-72.1338, -40.6893], '2026-10-24'],
  ['mock-05', 'laureliopsis-philippiana', [-72.1262, -40.6935], '2026-10-25'],
  ['mock-06', 'nothofagus-pumilio', [-72.1198, -40.6858], '2026-10-26'],
  ['mock-07', null, [-72.1285, -40.6801], '2026-10-26'],
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
