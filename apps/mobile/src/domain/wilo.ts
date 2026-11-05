// Wilo, el guía conversacional (POST /guide/query y /guide/transcribe). No confundir con
// `domain/guide.ts`, que es la guía de campo personal.

/**
 * Declaraciones que hace la persona antes de enviar contenido. Nunca vienen marcadas por defecto:
 * sin ellas el backend responde 422 (docs/PUBLIC_DEMO.md, «Consentimientos»).
 */
export type WiloConsents = {
  /** Mayor de 18 años. */
  adult: boolean;
  /** Acepta que el texto o el audio se procesen fuera del teléfono (Meta Model API). */
  externalProcessing: boolean;
  /** La grabación es suya o tiene derecho a usarla. Solo audio. */
  rights: boolean;
};

export const NO_CONSENTS: WiloConsents = { adult: false, externalProcessing: false, rights: false };

/** Respuesta de Wilo ya convertida desde `GuideAnswer`. */
export type WiloReply = {
  text: string;
  /** `provider: "mock"`: no la generó Meta y la UI la rotula como de prueba. */
  simulated: boolean;
  /** Wilo reconoce que no tiene evidencia suficiente; no es un fallo. */
  insufficientEvidence: boolean;
  limitations: string[];
  /** Fuentes tal como las entrega la API; la UI muestra cuántas hay. */
  sources: Record<string, unknown>[];
  correlationId: string | null;
};

/** Transcripción de una pregunta por voz, para que la persona la revise antes de enviarla. */
export type Transcript = {
  text: string;
  simulated: boolean;
};

/** Audio grabado en el dispositivo, listo para el `FormData`. */
export type RecordedAudio = {
  /** `file://…` en nativo, `blob:…` en web. */
  uri: string;
  /** Siempre `audio/wav` (PCM16 mono a 16 kHz), en todas las plataformas: ver wav.ts. */
  mimeType: string;
  fileName: string;
  durationMs: number;
};

/** Estado de la demo pública (GET /demo/status). */
export type DemoAvailability = {
  active: boolean;
  /** Funciones abiertas ahora: `guide`, `transcribe`, `identify`, `voice`. */
  features: string[];
  notice: string;
  expiresAt: string;
  territoryEligible: boolean | null;
};
