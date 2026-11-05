import type { FetchLike } from '@/api/client';
import type { Identification } from '@/api/identify';
import { correlations, field, fields, isFormData, json, MOCK_LATENCY_MS, mockDemoStatus, pathOf, wait } from '@/api/mock/mock-http';

// MOCK de POST /identify con la firma de `fetch`: recibe el FormData tal como saldría a la red y
// responde con un `Response` del schema `Identification`. NO sale a la red, NO analiza la foto y NO
// llama a Meta.
//
// Valida como el backend (services/api/src/bosque_api/main.py, ruta /identify, cliente anónimo), con
// los mismos códigos y mensajes: consentimientos (422), una sola foto sin segmentación (422), formato
// JPEG/PNG/WebP (415) y 10 MiB (413, solo cuando el tamaño se conoce: en nativo el archivo es una URI).
//
// Respuesta: la especie que entrega `pickCandidate` (la pantalla elige una del catálogo con foto de
// referencia), como candidata aceptada y rotulada `provider: "mock"`. Sin especie, se abstiene como el
// MockIdentifier del backend.

/** Especie a proponer, o `undefined` para abstenerse. */
export type PickCandidate = () => string | undefined;

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const MOCK_EVIDENCE =
  'Modo de prueba: especie elegida al azar entre las del catálogo con foto de referencia. No se analizó la imagen.';

export function createIdentifyMockFetch({
  pickCandidate,
  latencyMs = MOCK_LATENCY_MS,
}: { pickCandidate: PickCandidate; latencyMs?: number }): FetchLike {
  const nextCorrelation = correlations('identify');
  return async (url, init) => {
    const correlation = nextCorrelation();
    await wait(latencyMs, init.signal ?? undefined);
    const path = pathOf(url);
    const method = init.method ?? 'GET';
    if (method === 'GET' && path === '/demo/status') return json(200, mockDemoStatus(), correlation);
    if (method === 'POST' && path === '/identify') return identify(init.body, pickCandidate, correlation);
    return json(404, { detail: 'Ruta no simulada' }, correlation);
  };
}

function identify(body: RequestInit['body'], pick: PickCandidate, correlation: string): Response {
  if (!isFormData(body)) return json(422, { detail: [{ msg: 'Se espera multipart/form-data' }] }, correlation);
  const file = field(body, 'file');
  if (!file || typeof file === 'string') return json(422, { detail: [{ msg: 'Falta file' }] }, correlation);
  if (field(body, 'adult_confirmed') !== 'true' || field(body, 'rights_confirmed') !== 'true') {
    return json(422, { detail: 'Se requiere mayoría de edad y derechos de uso de la imagen' }, correlation);
  }
  if (field(body, 'external_processing_confirmed') !== 'true') {
    return json(422, { detail: 'Falta permiso de procesamiento externo de la imagen' }, correlation);
  }
  if (fields(body, 'additional_files').length > 0 || field(body, 'use_segmentation') === 'true') {
    return json(422, { detail: 'La demostración pública admite una sola fotografía' }, correlation);
  }
  const { type, size } = file as { type?: unknown; size?: unknown };
  if (typeof type !== 'string' || !IMAGE_TYPES.has(type)) {
    return json(415, { detail: 'Formato no admitido: utiliza JPEG, PNG o WebP' }, correlation);
  }
  if (typeof size === 'number' && size > MAX_IMAGE_BYTES) {
    return json(413, { detail: 'La imagen supera el límite de 10 MiB' }, correlation);
  }

  const speciesId = pick();
  const limitations = ['Resultado simulado: no se analizó la foto ni se llamó a Meta Model API.'];
  const result: Identification = speciesId
    ? {
      status: 'candidates',
      provider: 'mock',
      execution_status: 'mock',
      message: 'Modo de prueba: candidata simulada, sin inferencia.',
      acceptance: 'accepted',
      catalog_assessment: 'supported_candidate',
      evidence_status: 'candidates',
      accepted_species_id: speciesId,
      candidates: [{ species_id: speciesId, evidence: MOCK_EVIDENCE, contradictory_evidence: [] }],
      exploratory_candidates: [],
      observed_traits: [],
      missing_traits: [],
      similar_out_of_catalog: [],
      recommended_next_photo: null,
      segmentation_status: 'disabled',
      limitations,
      sources: [],
      identification_id: null,
      correlation_id: correlation,
    }
    : {
      status: 'insufficient_evidence',
      provider: 'mock',
      execution_status: 'mock',
      message: 'Modo demostración: imagen recibida sin inferencia. No hay evidencia de IA para proponer una especie.',
      acceptance: 'not_applicable',
      catalog_assessment: 'not_assessed',
      evidence_status: 'insufficient_evidence',
      accepted_species_id: null,
      candidates: [],
      exploratory_candidates: [],
      observed_traits: [],
      missing_traits: [],
      similar_out_of_catalog: [],
      recommended_next_photo: null,
      segmentation_status: 'disabled',
      limitations,
      sources: [],
      identification_id: null,
      correlation_id: correlation,
    };
  return json(200, result, correlation);
}
