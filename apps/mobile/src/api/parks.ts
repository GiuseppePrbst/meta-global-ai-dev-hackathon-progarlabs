import { ApiError, getJson } from '@/api/client';
import type { components, operations } from '@/api/schema.gen';
import type { AtlasSource, ParkProfile, ParkTrail } from '@/domain/park';

// GET /parks/{park_id} y GET /parks/{park_id}/trails: públicos, sin token, también en modo demo.
// Contrato: docs/api/openapi.json (schemas `ParkOut`, `TrailOut`, `SourceOut`). Documentado en
// docs/api/migration/. La API no trae geometría: `TrailOut.geometry` es siempre null y no se mapea.

type ApiPark = components['schemas']['ParkOut'];
type ApiTrail = components['schemas']['TrailOut'];
type ApiSource = components['schemas']['SourceOut'];
type ParkResponse = operations['park_parks__park_id__get']['responses'][200]['content']['application/json'];
type TrailsResponse = operations['trails_parks__park_id__trails_get']['responses'][200]['content']['application/json'];

function toSource(api: ApiSource): AtlasSource {
  return {
    id: api.id,
    title: api.title,
    url: api.url,
    type: api.type,
    accessedAt: api.accessed_at,
    version: api.version ?? null,
    confidence: api.confidence,
    reviewStatus: api.review_status,
  };
}

/** Convierte la ficha de un parque. `conflicts`, `linked_taxa` y `trail_count` no se usan en la app. */
export function toParkProfile(api: ApiPark): ParkProfile {
  return {
    id: api.id,
    name: api.name,
    regions: api.regions,
    areaHa: api.area_ha,
    provinces: api.provinces,
    communes: api.communes,
    sectors: api.sectors,
    visitNotice: api.visit_notice,
    accessText: api.access_text,
    officialUrl: api.official_url,
    liveStatus: api.live_status ?? 'not_verified',
    limitations: api.limitations,
    sources: api.sources.map(toSource),
    knowledgeVersion: api.knowledge_version,
  };
}

/** Convierte un sendero. Lo que no vino queda en `null` o vacío: la app no estima distancias ni tiempos. */
export function toParkTrail(api: ApiTrail): ParkTrail {
  return {
    id: api.id,
    parkId: api.park_id,
    name: api.name,
    sector: api.sector,
    kind: api.kind,
    difficulty: api.difficulty,
    winterDifficulty: api.winter_difficulty ?? null,
    distanceM: api.distance_m,
    durationMinutes: api.duration_minutes,
    durationMinMinutes: api.duration_min_minutes ?? null,
    durationMaxMinutes: api.duration_max_minutes ?? null,
    openingStatus: api.opening_status,
    publishedClosure: api.published_closure ?? null,
    risks: api.risks ?? null,
    conditions: api.conditions ?? [],
    sourceStatus: api.source_status,
    limitations: api.limitations,
    sources: api.sources.map(toSource),
  };
}

export async function fetchPark(parkId: string, signal?: AbortSignal): Promise<ParkProfile> {
  return toParkProfile(await getJson<ParkResponse>(`/parks/${encodeURIComponent(parkId)}`, signal));
}

/**
 * Senderos del parque, en el orden de la API (primero los revisados de fuente oficial). Pide también
 * los de referencia secundaria (`include_secondary`): la app los rotula como tales, no los da por oficiales.
 */
export async function fetchParkTrails(parkId: string, signal?: AbortSignal): Promise<ParkTrail[]> {
  const path = `/parks/${encodeURIComponent(parkId)}/trails?include_secondary=true`;
  const body = await getJson<TrailsResponse>(path, signal);
  if (!Array.isArray(body)) throw new ApiError('invalid_response', `GET /parks/${parkId}/trails no devolvió una lista`);
  return body.map(toParkTrail);
}
