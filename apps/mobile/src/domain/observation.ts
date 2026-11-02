import type { GeoPoint } from '@/domain/geo';

export type Observation = {
  id: string;
  /** Especie elegida por una persona; puede faltar. */
  speciesId: string | null;
  notes: string;
  /** Ubicación opcional: una observación sin ella no aparece en el mapa. */
  location: GeoPoint | null;
  createdAt: string;
  verificationStatus: 'unverified';
};
