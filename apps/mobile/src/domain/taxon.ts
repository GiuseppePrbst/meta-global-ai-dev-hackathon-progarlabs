// Taxón del atlas de biodiversidad, tal como lo entrega GET /taxa/{id} (ver src/api/taxa.ts). Es la
// ficha completa; la lista del catálogo sigue usando `Species` (GET /species). Los campos sin dato
// llegan `null` o vacíos: el backend no los rellena y la app tampoco.

export type TaxonGroup = 'tree' | 'bird' | 'mammal' | 'fungus';

export type SourceKind = 'official' | 'scientific' | 'secondary' | 'platform';

export type SourceRef = {
  title: string;
  url: string;
  accessedAt: string;
  kind: SourceKind;
  license: string | null;
};

export type TaxonMedia = {
  id: string;
  url: string;
  /** Página de la foto en su plataforma: autoría, licencia completa. */
  sourceUrl: string;
  author: string;
  license: string;
  attribution: string;
  /** `agent_visual_check`: un agente miró la foto; no es validación de especialista. */
  reviewStatus: 'platform_label_only' | 'agent_visual_check';
};

export type EvidenceType =
  | 'official_park_presence'
  | 'scientific_georeferenced'
  | 'citizen_validated'
  | 'personal_pending_review'
  | 'potential_habitat'
  | 'documented_ecological_association'
  | 'ai_identification_hypothesis';

/** Evidencia de presencia en el parque. Nunca trae coordenadas de individuos. */
export type ParkEvidence = {
  type: EvidenceType;
  precision: 'park_scale_no_coordinates' | 'generalized';
  reviewStatus: 'source_checked' | 'pending_review';
  source: SourceRef;
};

export type IdentificationStatus =
  | 'educational_catalog'
  | 'recognition_not_evaluated'
  | 'recognition_experimental'
  | 'recognition_candidate'
  | 'recognition_enabled'
  | 'recognition_restricted';

export type Taxon = {
  id: string;
  scientificName: string;
  /** El primero de `commonNames`. */
  commonName: string;
  commonNames: string[];
  group: TaxonGroup;
  classification: { kingdom: string; family: string | null; genus: string | null; order: string | null };
  taxonomy: {
    acceptedName: string;
    authorship: string | null;
    status: 'source_checked' | 'name_discrepancy' | 'unresolved';
    checklist: string;
    gbifId: number | null;
    accessedAt: string;
  };
  profile: {
    description: string | null;
    habitat: string | null;
    distribution: string | null;
    ecology: string | null;
    traits: string[];
    traitValidationStatus: 'source_checked' | 'secondary_source' | 'pending';
    sources: SourceRef[];
    limitations: string[];
  };
  media: TaxonMedia[];
  puyehueStatus: 'documented_in_park' | 'regional_candidate' | 'not_assessed';
  parkEvidence: ParkEvidence[];
  identification: { status: IdentificationStatus; notes: string };
  /** `location_sensitive`: la app nunca muestra una ubicación de este taxón. */
  sensitivity: 'none' | 'location_sensitive';
};

/** Regiones de Chile que abarca Puyehue, con la clave que usa la API. */
export type ParkRegion = 'los-rios' | 'los-lagos';

/** Regiones de Puyehue en el orden en que se muestran. */
export const PARK_REGIONS: ParkRegion[] = ['los-rios', 'los-lagos'];

/** Estado de conservación oficial (RCE, Chile) según GET /taxa/{id}/conservation. */
export type RegionalConservation = {
  recordStatus: 'found' | 'no_rce_record_found';
  /** Categoría RCE por región del parque; `null` si en esa región no tiene. */
  parkRegions: Partial<Record<ParkRegion, string | null>>;
  notes: string[];
  source: { title: string; url: string; versionText: string; accessedAt: string };
};
