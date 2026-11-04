import { ApiError, getJson } from '@/api/client';
import type { components, operations } from '@/api/schema.gen';
import type { Species } from '@/domain/species';

// GET /species: público, sin token, también en modo demo. Alimenta la lista del catálogo; la ficha usa
// GET /taxa/{id} (src/api/taxa.ts). Contrato: docs/api/openapi.json (schema `Species`). Documentado en
// docs/api/migration/.

type ApiSpecies = components['schemas']['Species'];
type CatalogResponse = operations['species_species_get']['responses'][200]['content']['application/json'];

/** Convierte una especie del JSON de la API al tipo de dominio. `synonym_review` no se usa en la app. */
export function toSpecies(api: ApiSpecies): Species {
  const p = api.provenance;
  const tax = api.taxonomy;
  return {
    id: api.id,
    scientificName: api.scientific_name,
    commonName: api.common_name,
    taxonomicStatus: api.taxonomic_status,
    provenance: {
      sourceName: p.source_name,
      sourceUrl: p.source_url,
      accessedAt: p.accessed_at,
      version: p.version,
      license: p.license,
      attribution: p.attribution,
      redistribution: p.redistribution,
      processing: p.processing,
      validationOwner: p.validation_owner,
      status: p.status,
    },
    acceptedName: api.accepted_name ?? null,
    family: api.family ?? null,
    genus: api.genus ?? null,
    synonyms: api.synonyms ?? [],
    taxonomy: tax
      ? {
        gbifId: tax.gbif_id,
        status: tax.status,
        sourceUrl: tax.source_url,
        sourceVersion: tax.source_version,
        accessedAt: tax.accessed_at,
        license: tax.license,
        attribution: tax.attribution,
      }
      : null,
    morphology: api.morphology ?? [],
    traitValidationStatus: api.trait_validation_status ?? 'pending',
    traitSources: api.trait_sources ?? [],
    traitSourcesAccessedAt: api.trait_source_accessed_at ?? null,
    nativeStatus: api.native_status ?? 'pending',
    conservationStatus: api.conservation_status ?? null,
  };
}

/** Catálogo completo, en el orden de la API. */
export async function fetchSpeciesCatalog(signal?: AbortSignal): Promise<Species[]> {
  const body = await getJson<CatalogResponse>('/species', signal);
  if (!Array.isArray(body)) throw new ApiError('invalid_response', 'GET /species no devolvió una lista');
  return body.map(toSpecies);
}
