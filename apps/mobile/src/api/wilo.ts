import { Platform } from 'react-native';

import { AI_TIMEOUT_MS, apiBaseUrl, type FetchLike, requestJson } from '@/api/client';
import { appendFile } from '@/api/form-file';
import { createWiloMockFetch, type CannedAnswer } from '@/api/mock/wilo-mock';
import type { components } from '@/api/schema.gen';
import type { RecordedAudio, Transcript, WiloConsents, WiloReply } from '@/domain/wilo';

// Wilo: POST /guide/query y POST /guide/transcribe (GET /demo/status, en demo-status.ts). Públicas sin token mientras la
// demo esté activa (docs/PUBLIC_DEMO.md). Contrato: docs/api/openapi.json.
//
// SIMULADO POR DEFECTO. Las peticiones se arman completas (mismo método, ruta, cabeceras y body) y
// pasan por `requestJson`, pero las responde `createWiloMockFetch` en vez de la red. Para llamar a la
// API real basta `EXPO_PUBLIC_WILO_LIVE=true` en `.env.local`: consume presupuesto real compartido.

export type GuideQuery = components['schemas']['GuideQuery'];
export type GuideAnswer = components['schemas']['GuideAnswer'];
export type Transcription = components['schemas']['Transcription'];

/** `true` solo si `.env.local` lo pide de forma literal. */
export const WILO_LIVE = process.env.EXPO_PUBLIC_WILO_LIVE === 'true';

/**
 * Transporte de Wilo. En vivo es `fetch`; si no, el mock con las respuestas de demostración que da
 * la pantalla (`cannedAnswer`, ignorado en vivo).
 */
export function wiloTransport(cannedAnswer: CannedAnswer = () => undefined): FetchLike {
  return WILO_LIVE ? fetch : createWiloMockFetch({ cannedAnswer });
}

/**
 * URL base. En mock no exige `EXPO_PUBLIC_API_URL`: la URL no sale del dispositivo, y así el chat de
 * prueba funciona aunque falte la configuración.
 */
export function wiloBaseUrl(): string {
  return WILO_LIVE ? apiBaseUrl() : 'https://wilo-mock.invalid';
}

const MAX_QUESTION = 2000;
const QUESTION_MARKER = '\nPregunta: ';

/**
 * Antepone el contexto (de qué especie se habla) a la pregunta. `GuideQuery` no tiene un campo para
 * eso (extra="forbid"), así que va en el texto; la burbuja de la persona muestra solo su pregunta.
 * Se recorta la pregunta para no pasar del máximo de 2000 caracteres del backend.
 */
export function questionWithContext(question: string, context?: string): string {
  if (!context) return question;
  const prefix = `Contexto: ${context}${QUESTION_MARKER}`;
  return prefix + question.slice(0, Math.max(0, MAX_QUESTION - prefix.length));
}

/** La pregunta de la persona sin el contexto antepuesto por `questionWithContext`. */
export function stripQuestionContext(text: string): string {
  const at = text.indexOf(QUESTION_MARKER);
  return text.startsWith('Contexto: ') && at >= 0 ? text.slice(at + QUESTION_MARKER.length) : text;
}

/** Body exacto de POST /guide/query. Exportado para las pruebas. */
export function guideQueryBody(question: string, consents: WiloConsents, context?: string): GuideQuery {
  return {
    question: questionWithContext(question, context),
    adult_confirmed: consents.adult,
    external_processing_confirmed: consents.externalProcessing,
    capture_id: null,
  };
}

export async function postGuideQuery(
  send: FetchLike,
  question: string,
  consents: WiloConsents,
  signal?: AbortSignal,
  context?: string,
): Promise<WiloReply> {
  const answer = await requestJson<GuideAnswer>(wiloBaseUrl(), '/guide/query', {
    method: 'POST',
    body: guideQueryBody(question, consents, context),
    signal,
    timeoutMs: AI_TIMEOUT_MS,
    fetchImpl: send,
  });
  return toWiloReply(answer);
}

/** `FormData` exacto de POST /guide/transcribe. Exportado para las pruebas. */
export function transcribeForm(audio: RecordedAudio, consents: WiloConsents, file?: Blob): FormData {
  const form = new FormData();
  appendFile(form, 'file', { uri: audio.uri, name: audio.fileName, type: audio.mimeType }, file);
  form.append('adult_confirmed', String(consents.adult));
  form.append('rights_confirmed', String(consents.rights));
  form.append('external_processing_confirmed', String(consents.externalProcessing));
  form.append('language_hint', 'es');
  return form;
}

export async function postTranscribe(
  send: FetchLike,
  audio: RecordedAudio,
  consents: WiloConsents,
  signal?: AbortSignal,
): Promise<Transcript> {
  // En web la grabación es un `blob:` y el FormData necesita el Blob en sí.
  const file = Platform.OS === 'web' ? await (await fetch(audio.uri)).blob() : undefined;
  const result = await requestJson<Transcription>(wiloBaseUrl(), '/guide/transcribe', {
    method: 'POST',
    body: transcribeForm(audio, consents, file),
    signal,
    timeoutMs: AI_TIMEOUT_MS,
    fetchImpl: send,
  });
  return { text: result.transcript, simulated: result.provider === 'mock' };
}

export function toWiloReply(answer: GuideAnswer): WiloReply {
  return {
    text: answer.answer,
    simulated: answer.provider === 'mock',
    insufficientEvidence: answer.insufficient_evidence ?? true,
    limitations: answer.limitations ?? [],
    sources: answer.sources ?? [],
    correlationId: answer.correlation_id ?? null,
  };
}
