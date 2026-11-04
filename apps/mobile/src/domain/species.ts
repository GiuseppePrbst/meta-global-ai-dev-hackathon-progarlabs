// Especie del catálogo, tal como la entrega GET /species de la API (ver src/api/species.ts). Solo
// contiene lo que el backend respalda: nada de la ficha se completa con texto local.

export type TaxonomicStatus = 'provisional' | 'validated';

/** De dónde sale la entrada del catálogo y bajo qué condiciones se puede reutilizar. */
export type Provenance = {
  sourceName: string;
  sourceUrl: string;
  accessedAt: string;
  version: string;
  license: string;
  attribution: string;
  /** Condiciones para redistribuir el dato. */
  redistribution: string;
  /** Qué se hizo con la fuente (transcripción, validaciones aplicadas). */
  processing: string;
  validationOwner: string;
  status: 'pending_validation' | 'validated';
};

/** Taxonomía contrastada con el GBIF Backbone. */
export type Taxonomy = {
  gbifId: number;
  /** Estado del nombre en GBIF. */
  status: 'ACCEPTED' | 'SYNONYM';
  sourceUrl: string;
  sourceVersion: string;
  accessedAt: string;
  license: string;
  attribution: string;
};

export type Species = {
  id: string;
  scientificName: string;
  commonName: string;
  taxonomicStatus: TaxonomicStatus;
  provenance: Provenance;
  acceptedName: string | null;
  family: string | null;
  genus: string | null;
  synonyms: string[];
  /** Sin taxonomía verificada, `null`. */
  taxonomy: Taxonomy | null;
  /** Rasgos para reconocerla, una frase cada uno. Puede venir vacío. */
  morphology: string[];
  /** `source_checked`: contrastados con `traitSources`, sin validación de especialistas. */
  traitValidationStatus: 'pending' | 'source_checked';
  traitSources: string[];
  traitSourcesAccessedAt: string | null;
  /** Nativa o introducida; hoy siempre pendiente de revisión. */
  nativeStatus: 'pending';
  conservationStatus: string | null;
};
