export type TaxonomicStatus = 'provisional' | 'validated';

export type Provenance = {
  sourceName: string;
  sourceUrl: string;
  accessedAt: string;
  version: string;
  license: string;
  attribution: string;
  validationOwner: string;
  status: 'pending_validation' | 'validated';
};

/** Rasgos descriptivos de la ficha. En el mock son texto de demostración sin validar. */
export type SpeciesTraits = {
  family: string;
  leaf: string;
  bark: string;
  habit: string;
  whereToLook: string;
};

export type Species = {
  id: string;
  scientificName: string;
  commonName: string;
  taxonomicStatus: TaxonomicStatus;
  provenance: Provenance;
  traits: SpeciesTraits;
};
