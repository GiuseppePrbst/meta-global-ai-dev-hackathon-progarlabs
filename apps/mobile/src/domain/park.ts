// Parques y senderos del Knowledge Atlas (GET /parks/{id}, GET /parks/{id}/trails). Solo fichas: la API
// no entrega polígonos ni trazados (`geometry_available` siempre es `false`), así que el dibujo del mapa
// sale de datos locales (src/features/atlas/parks.ts y demo-trail.ts).

/** Cita de una ficha del atlas (schema `SourceOut`). */
export type AtlasSource = {
  id: string;
  title: string | null;
  url: string | null;
  type: string | null;
  accessedAt: string;
  version: string | null;
  confidence: string;
  reviewStatus: string;
};

export type ParkProfile = {
  id: string;
  name: string;
  /** Slugs de región, p. ej. `los-lagos`. */
  regions: string[];
  areaHa: number | null;
  provinces: string | null;
  communes: string | null;
  sectors: string[];
  visitNotice: string | null;
  accessText: string | null;
  officialUrl: string;
  /** La API no tiene estado de apertura en vivo: siempre `not_verified`, que no significa abierto. */
  liveStatus: 'not_verified';
  limitations: string[];
  sources: AtlasSource[];
  knowledgeVersion: string;
};

export type TrailOpeningStatus = 'not_verified' | 'published_closure';
export type TrailSourceStatus = 'official_reviewed' | 'official_named_only' | 'secondary_reference';

export type ParkTrail = {
  id: string;
  parkId: string;
  name: string;
  sector: string | null;
  kind: string | null;
  difficulty: string | null;
  winterDifficulty: string | null;
  distanceM: number | null;
  durationMinutes: number | null;
  durationMinMinutes: number | null;
  durationMaxMinutes: number | null;
  /** `not_verified` no significa abierto; `published_closure` es un cierre publicado. */
  openingStatus: TrailOpeningStatus;
  publishedClosure: string | null;
  risks: string | null;
  conditions: string[];
  sourceStatus: TrailSourceStatus;
  limitations: string[];
  sources: AtlasSource[];
};
