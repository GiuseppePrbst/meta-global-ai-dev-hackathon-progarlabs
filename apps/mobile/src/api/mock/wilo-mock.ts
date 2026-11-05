import type { FetchLike } from '@/api/client';
import { correlations, field, isFormData, json, MOCK_LATENCY_MS, mockDemoStatus, pathOf, wait } from '@/api/mock/mock-http';
import type { GuideAnswer, GuideQuery, Transcription } from '@/api/wilo';

// MOCK de Wilo con la firma de `fetch`: recibe la petición tal como saldría a la red (JSON serializado
// o FormData) y responde con un `Response` del contrato OpenAPI. NO sale a la red ni llama a Meta.
//
// Valida como el backend (services/api/src/bosque_api/wilo.py), con los mismos códigos y mensajes:
// pregunta de 1 a 2000 caracteres, `adult_confirmed`, `external_processing_confirmed` y, en audio,
// `rights_confirmed` y el archivo. Diferencia conocida: acepta audio que no es WAV y lo avisa en
// `limitations` (la API real respondería 415); la app ya graba WAV en todas las plataformas.
//
// Respuestas: a una pregunta sugerida, el texto de demostración que da la pantalla (`cannedAnswer`,
// sin validación botánica); a cualquier otra, una abstención con `insufficient_evidence: true`. La
// transcripción es un texto fijo: el mock no escucha el audio.

/** Respuesta de demostración para una pregunta exacta, o `undefined` si no es una sugerida. */
export type CannedAnswer = (question: string) => string | undefined;

export { MOCK_LATENCY_MS };

export const MOCK_TRANSCRIPT = '¿Dónde puedo ver este árbol en Puyehue?';

export const MOCK_ABSTENTION =
  'Estoy en modo de prueba y todavía no consulto el Atlas ni a Meta, así que no puedo responder eso con evidencia. Prueba con una de las preguntas sugeridas.';

const WAV_TYPES = new Set(['audio/wav', 'audio/x-wav', 'audio/wave']);
const MAX_QUESTION = 2000;

export function createWiloMockFetch({
  cannedAnswer,
  latencyMs = MOCK_LATENCY_MS,
}: { cannedAnswer: CannedAnswer; latencyMs?: number }): FetchLike {
  const nextCorrelation = correlations('wilo');
  return async (url, init) => {
    const correlation = nextCorrelation();
    await wait(latencyMs, init.signal ?? undefined);
    const path = pathOf(url);
    const method = init.method ?? 'GET';

    if (method === 'GET' && path === '/demo/status') return json(200, mockDemoStatus(), correlation);
    if (method === 'POST' && path === '/guide/query') return guideQuery(init.body, cannedAnswer, correlation);
    if (method === 'POST' && path === '/guide/transcribe') return transcribe(init.body, correlation);
    return json(404, { detail: 'Ruta no simulada' }, correlation);
  };
}

function guideQuery(body: RequestInit['body'], canned: CannedAnswer, correlation: string): Response {
  let item: Partial<GuideQuery>;
  try {
    item = JSON.parse(String(body)) as Partial<GuideQuery>;
  } catch {
    return json(422, { detail: [{ msg: 'JSON inválido' }] }, correlation);
  }
  const question = typeof item.question === 'string' ? item.question : '';
  if (question.length < 1 || question.length > MAX_QUESTION) {
    return json(422, { detail: [{ msg: 'question debe tener entre 1 y 2000 caracteres' }] }, correlation);
  }
  if (item.adult_confirmed !== true) return json(422, { detail: 'Guía exclusivo para adultos' }, correlation);
  if (item.external_processing_confirmed !== true) {
    return json(422, { detail: 'Falta permiso de procesamiento externo' }, correlation);
  }

  const text = canned(question);
  const answer: GuideAnswer = {
    answer: text ?? MOCK_ABSTENTION,
    provider: 'mock',
    execution_status: 'mock',
    insufficient_evidence: text === undefined,
    sources: [],
    claims: [],
    entities: [],
    limitations: text === undefined
      ? ['Modo de prueba: no se consultó el Atlas ni Meta Model API.']
      : ['Respuesta simulada con rasgos de demostración, sin validación botánica.'],
    map: null,
    model: null,
    knowledge_version: null,
    speech_text: null,
    latency_ms: 0,
    prompt_version: 'wilo-guide-v3',
    tools_used: [],
    usage: {},
    correlation_id: correlation,
  };
  return json(200, answer, correlation);
}

function transcribe(body: RequestInit['body'], correlation: string): Response {
  if (!isFormData(body)) return json(422, { detail: [{ msg: 'Se espera multipart/form-data' }] }, correlation);
  const file = field(body, 'file');
  if (!file || typeof file === 'string') return json(422, { detail: [{ msg: 'Falta file' }] }, correlation);
  if (field(body, 'adult_confirmed') !== 'true' || field(body, 'rights_confirmed') !== 'true') {
    return json(422, { detail: 'Audio requiere mayoría de edad y derechos de uso' }, correlation);
  }
  if (field(body, 'external_processing_confirmed') !== 'true') {
    return json(422, { detail: 'Falta permiso de procesamiento externo del audio' }, correlation);
  }
  const type = (file as { type?: unknown }).type;
  const limitations = ['Transcripción simulada: el mock no escucha el audio.'];
  if (typeof type !== 'string' || !WAV_TYPES.has(type)) {
    limitations.push('El audio no es WAV: la API real respondería 415.');
  }
  const result: Transcription = {
    transcript: MOCK_TRANSCRIPT,
    provider: 'mock',
    execution_status: 'mock',
    audio_duration_ms: 0,
    latency_ms: 0,
    model: null,
    limitations,
    turns: [],
    usage: {},
    correlation_id: correlation,
  };
  return json(200, result, correlation);
}
