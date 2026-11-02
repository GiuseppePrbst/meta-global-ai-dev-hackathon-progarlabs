/**
 * Especie que una persona sumó a su guía de campo tras identificarla con una foto. La persona la
 * eligió: un candidato no entra solo. La foto no se guarda; solo la especie y la fecha.
 */
export type GuideEntry = {
  speciesId: string;
  /** Fecha ISO (AAAA-MM-DD) en que la sumó. */
  addedAt: string;
};
