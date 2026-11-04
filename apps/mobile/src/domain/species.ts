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

/** Grupo de la especie en el catálogo: decide qué rasgos tiene su ficha. */
export type SpeciesGroup = 'tree' | 'fungus';

/** Rasgos comunes de la ficha. En el mock son texto de demostración sin validar. */
type BaseTraits = {
  family: string;
  /** Resumen corto: porte del árbol, o temporada y uso del hongo. Lo muestra la tarjeta del catálogo. */
  habit: string;
  whereToLook: string;
};

export type TreeTraits = BaseTraits & { leaf: string; bark: string };

export type FungusTraits = BaseTraits & {
  /** Seta o cuerpo fructífero: forma, color, superficie. */
  fruitingBody: string;
  /** Dónde y sobre qué crece: suelo, madera, ramas vivas, asociaciones. */
  substrate: string;
};

type SpeciesBase = {
  id: string;
  scientificName: string;
  commonName: string;
  taxonomicStatus: TaxonomicStatus;
  provenance: Provenance;
};

export type Species =
  | (SpeciesBase & { group: 'tree'; traits: TreeTraits })
  | (SpeciesBase & { group: 'fungus'; traits: FungusTraits });
