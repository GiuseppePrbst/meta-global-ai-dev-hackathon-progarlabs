/** Punto WGS84; la API lo envía como GeoJSON `[longitud, latitud]`. */
export type GeoPoint = { longitude: number; latitude: number };

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
