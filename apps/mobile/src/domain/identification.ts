// Identificación fotográfica (POST /identify). Un candidato es una SUGERENCIA, nunca una
// identificación verificada, aunque la API la acepte (docs/PUBLIC_DEMO.md).

/** Foto tomada con la cámara, lista para el `FormData`. Vive en caché hasta enviarla. */
export type CapturedPhoto = {
  /** `file://…` en nativo; `data:…` en web. */
  uri: string;
  mimeType: 'image/jpeg' | 'image/png' | 'image/webp';
  fileName: string;
  /** Tamaño en bytes si se pudo leer; la API rechaza más de 10 MiB. */
  sizeBytes: number | null;
};

/** Siguiente foto que pide la API para decidir. */
export type NextPhoto = 'leaf_underside' | 'bark' | 'complete_leaf' | 'flowers_or_fruit_if_present' | 'closer_view';

type Common = {
  /** `provider: "mock"`: no lo produjo Meta; la UI lo rotula como de prueba. */
  simulated: boolean;
  message: string;
  limitations: string[];
  correlationId: string | null;
};

export type IdentifyOutcome =
  | (Common & {
    kind: 'candidate';
    speciesId: string;
    /** `acceptance: "accepted"`: la API la apoya; sigue siendo una sugerencia. */
    accepted: boolean;
    evidence: string;
    contradictoryEvidence: string[];
    observedTraits: string[];
  })
  | (Common & {
    kind: 'insufficient';
    /** La foto no sirve para decidir (`non_diagnostic_photo`) o la especie parece fuera del catálogo. */
    reason: 'insufficient_evidence' | 'out_of_catalog' | 'non_diagnostic';
    nextPhoto: NextPhoto | null;
    missingTraits: string[];
  });
