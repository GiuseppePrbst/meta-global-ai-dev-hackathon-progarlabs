import { Platform } from 'react-native';

import { AI_TIMEOUT_MS, apiBaseUrl, type FetchLike, requestJson } from '@/api/client';
import { appendFile } from '@/api/form-file';
import { createIdentifyMockFetch, type PickCandidate } from '@/api/mock/identify-mock';
import type { components } from '@/api/schema.gen';
import type { CapturedPhoto, IdentifyOutcome } from '@/domain/identification';
import type { WiloConsents } from '@/domain/wilo';

// Identificar una foto: POST /identify. Pública sin token mientras la demo esté activa, con UNA sola
// foto y sin segmentación (docs/PUBLIC_DEMO.md). Contrato: docs/api/openapi.json.
//
// SIMULADO POR DEFECTO, como Wilo (src/api/wilo.ts): el FormData se arma completo y pasa por
// `requestJson`, pero lo responde `createIdentifyMockFetch`. Para llamar a la API real basta
// `EXPO_PUBLIC_IDENTIFY_LIVE=true` en `.env.local`: la foto se envía a Meta y consume presupuesto.

export type Identification = components['schemas']['Identification'];
export type Candidate = components['schemas']['Candidate'];

/** `true` solo si `.env.local` lo pide de forma literal. */
export const IDENTIFY_LIVE = process.env.EXPO_PUBLIC_IDENTIFY_LIVE === 'true';

/** Límite de la API por imagen. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

/**
 * Transporte de Identificar. En vivo es `fetch`; si no, el mock, que propone la especie que entrega
 * `pickCandidate` (ignorado en vivo).
 */
export function identifyTransport(pickCandidate: PickCandidate = () => undefined): FetchLike {
  return IDENTIFY_LIVE ? fetch : createIdentifyMockFetch({ pickCandidate });
}

/** En mock la URL no sale del dispositivo: no exige `EXPO_PUBLIC_API_URL`. */
export function identifyBaseUrl(): string {
  return IDENTIFY_LIVE ? apiBaseUrl() : 'https://identify-mock.invalid';
}

/**
 * `FormData` exacto de POST /identify en modo público: una foto y los tres consentimientos. Sin
 * `additional_files`, `views` ni `use_segmentation` (con ellos la API pública responde 422).
 */
export function identifyForm(photo: CapturedPhoto, consents: WiloConsents, file?: Blob): FormData {
  const form = new FormData();
  appendFile(form, 'file', { uri: photo.uri, name: photo.fileName, type: photo.mimeType }, file);
  form.append('adult_confirmed', String(consents.adult));
  form.append('rights_confirmed', String(consents.rights));
  form.append('external_processing_confirmed', String(consents.externalProcessing));
  return form;
}

export async function postIdentify(
  send: FetchLike,
  photo: CapturedPhoto,
  consents: WiloConsents,
  signal?: AbortSignal,
): Promise<IdentifyOutcome> {
  // En web la foto es un data URI y el FormData necesita el Blob en sí.
  const file = Platform.OS === 'web' ? await (await fetch(photo.uri)).blob() : undefined;
  const result = await requestJson<Identification>(identifyBaseUrl(), '/identify', {
    method: 'POST',
    body: identifyForm(photo, consents, file),
    signal,
    timeoutMs: AI_TIMEOUT_MS,
    fetchImpl: send,
  });
  return toOutcome(result);
}

/**
 * `Identification` → resultado de dominio. Hay candidata solo con `status: "candidates"` y al menos
 * un candidato; manda `accepted_species_id` si vino. Todo lo demás es «no se pudo decidir».
 */
export function toOutcome(api: Identification): IdentifyOutcome {
  const common = {
    simulated: api.provider === 'mock',
    message: api.message,
    limitations: api.limitations ?? [],
    correlationId: api.correlation_id ?? null,
  };
  const candidates = api.candidates ?? [];
  const top = candidates.find((c) => c.species_id === api.accepted_species_id) ?? candidates[0];
  if (api.status === 'candidates' && top) {
    return {
      ...common,
      kind: 'candidate',
      speciesId: top.species_id,
      accepted: api.acceptance === 'accepted',
      evidence: top.evidence,
      contradictoryEvidence: top.contradictory_evidence ?? [],
      observedTraits: api.observed_traits ?? [],
    };
  }
  return {
    ...common,
    kind: 'insufficient',
    reason: api.catalog_assessment === 'out_of_catalog_suspected'
      ? 'out_of_catalog'
      : api.catalog_assessment === 'non_diagnostic_photo' ? 'non_diagnostic' : 'insufficient_evidence',
    nextPhoto: api.recommended_next_photo ?? null,
    missingTraits: api.missing_traits ?? [],
  };
}
