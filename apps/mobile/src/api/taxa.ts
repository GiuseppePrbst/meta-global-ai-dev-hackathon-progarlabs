import { ApiError, getJson } from '@/api/client';
import type { components, operations } from '@/api/schema.gen';
import { PARK_REGIONS, type RegionalConservation, type SourceRef, type Taxon } from '@/domain/taxon';

// GET /taxa/{taxon_id} y GET /taxa/{taxon_id}/conservation: públicos, sin token, también en modo demo.
// Contrato: docs/api/openapi.json (schemas `Taxon`, `RegionalConservation`). Documentado en
// docs/api/migration/. Lo que la ficha no usa (p. ej. `col_xr_key`, `identification.level`) no se mapea.

type ApiTaxon = components['schemas']['Taxon'];
type ApiSource = components['schemas']['SourceRef'];
type ApiConservation = components['schemas']['RegionalConservation'];
type TaxonResponse = operations['taxon_detail_taxa__taxon_id__get']['responses'][200]['content']['application/json'];
type ConservationResponse = operations['taxon_conservation_taxa__taxon_id__conservation_get']['responses'][200]['content']['application/json'];

function toSource(api: ApiSource): SourceRef {
  return { title: api.title, url: api.url, accessedAt: api.accessed_at, kind: api.kind, license: api.license ?? null };
}

/** Convierte un taxón del JSON de la API al tipo de dominio. */
export function toTaxon(api: ApiTaxon): Taxon {
  const { classification: c, taxonomy: tx, profile: p } = api;
  return {
    id: api.id,
    scientificName: api.scientific_name,
    commonName: api.common_names[0] ?? api.scientific_name,
    commonNames: api.common_names,
    group: api.group,
    classification: { kingdom: c.kingdom, family: c.family ?? null, genus: c.genus ?? null, order: c.order ?? null },
    taxonomy: {
      acceptedName: tx.accepted_name,
      authorship: tx.authorship ?? null,
      status: tx.status,
      checklist: tx.checklist,
      gbifId: tx.gbif_backbone_id ?? null,
      accessedAt: tx.accessed_at,
    },
    profile: {
      description: p.description ?? null,
      habitat: p.habitat ?? null,
      distribution: p.distribution ?? null,
      ecology: p.ecology ?? null,
      traits: p.traits ?? [],
      traitValidationStatus: p.trait_validation_status,
      sources: (p.sources ?? []).map(toSource),
      limitations: p.limitations ?? [],
    },
    media: (api.media ?? []).map((m) => ({
      id: m.media_id,
      url: m.media_url,
      sourceUrl: m.source_url,
      author: m.author,
      license: m.license,
      attribution: m.attribution,
      reviewStatus: m.review_status,
    })),
    puyehueStatus: api.puyehue_status,
    parkEvidence: (api.park_evidence ?? []).map((e) => ({
      type: e.evidence_type,
      precision: e.precision,
      reviewStatus: e.review_status,
      source: toSource(e.source),
    })),
    identification: { status: api.identification.status, notes: api.identification.notes },
    sensitivity: api.sensitivity,
  };
}

/** Convierte el estado RCE. Solo conserva las regiones de Puyehue. */
export function toConservation(api: ApiConservation): RegionalConservation {
  const parkRegions: RegionalConservation['parkRegions'] = {};
  for (const region of PARK_REGIONS) {
    if (region in (api.park_regions ?? {})) parkRegions[region] = api.park_regions[region] ?? null;
  }
  return {
    recordStatus: api.record_status,
    parkRegions,
    notes: api.notes ?? [],
    source: {
      title: api.source.title,
      url: api.source.url,
      versionText: api.source.version_text,
      accessedAt: api.source.accessed_at,
    },
  };
}

/** Un taxón. Un 404 llega como `ApiError` con `status: 404` (no está en el atlas). */
export async function fetchTaxon(id: string, signal?: AbortSignal): Promise<Taxon> {
  const body = await getJson<TaxonResponse>(`/taxa/${encodeURIComponent(id)}`, signal);
  if (!body || typeof body !== 'object' || typeof body.id !== 'string' || !body.profile) {
    throw new ApiError('invalid_response', 'GET /taxa/{id} no devolvió un taxón');
  }
  return toTaxon(body);
}

/** Estado de conservación RCE de un taxón, para las dos regiones del parque. */
export async function fetchTaxonConservation(id: string, signal?: AbortSignal): Promise<RegionalConservation> {
  const body = await getJson<ConservationResponse>(`/taxa/${encodeURIComponent(id)}/conservation`, signal);
  if (!body || typeof body !== 'object' || typeof body.record_status !== 'string' || !body.source) {
    throw new ApiError('invalid_response', 'GET /taxa/{id}/conservation no devolvió un estado de conservación');
  }
  return toConservation(body);
}
