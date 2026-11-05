import { useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

import { fetchDemoStatus } from '@/api/demo-status';
import { postGuideQuery, postTranscribe, WILO_LIVE, wiloBaseUrl, wiloTransport } from '@/api/wilo';
import type { Species } from '@/domain/species';
import type { RecordedAudio, WiloConsents, WiloReply } from '@/domain/wilo';
import { aiErrorMessage, canRetryAi } from '@/features/api-error-message';
import { getDemoTraits } from '@/features/identify/demo-traits';
import { cannedAnswerFor, questionsFor } from '@/features/identify/wilo-chat';
import { discard, type RecorderError, useVoiceRecorder } from '@/features/wilo/use-voice-recorder';
import { type ConsentNeed, missingConsents, wiloConsentStore } from '@/features/wilo/wilo-consent';
import { t } from '@/i18n/es-CL';

// Conversación con Wilo tras la foto. Tres entradas y un solo destino: una pregunta sugerida, el texto
// escrito o la transcripción de la voz terminan en POST /guide/query (src/api/wilo.ts, simulado por
// defecto). La voz va en dos etapas: /guide/transcribe deja el texto en el input para revisarlo.
// Nada se reintenta solo: cada POST real reserva presupuesto.

export type ChatMessage =
  | { id: number; from: 'you'; text: string }
  | { id: number; from: 'wilo'; text: string; reply?: WiloReply }
  /** `retryQuestion`: se puede reintentar a mano; 403 y 410 no lo traen. */
  | { id: number; from: 'error'; text: string; retryQuestion?: string };

/** Un mensaje sin `id`: lo asigna `push`. Distributivo sobre la unión. */
type NewMessage = ChatMessage extends infer M ? (M extends ChatMessage ? Omit<M, 'id'> : never) : never;

type Pending = { need: ConsentNeed; run: (consents: WiloConsents) => void };

const DEMO_STATUS_STALE_MS = 60_000;

function isAbort(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function useWiloChat(species: Species) {
  const demo = useMemo(() => getDemoTraits(species.id), [species.id]);
  const questions = useMemo(() => questionsFor(species, demo), [species, demo]);
  const speciesContext = t.identify.queryContext(species.commonName, species.scientificName);
  const send = useMemo(() => wiloTransport(cannedAnswerFor(questions)), [questions]);
  const consents = wiloConsentStore.useValue();
  const recorder = useVoiceRecorder();

  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    { id: 0, from: 'wilo', text: t.identify.greeting(species.commonName, demo?.group === 'fungus') },
  ]);
  const [draft, setDraft] = useState('');
  const [draftNote, setDraftNote] = useState<string | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const nextId = useRef(1);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const status = useQuery({
    queryKey: ['wilo', 'demo-status', WILO_LIVE],
    queryFn: ({ signal }) => fetchDemoStatus(send, wiloBaseUrl(), signal),
    staleTime: DEMO_STATUS_STALE_MS,
  });

  const query = useMutation({
    mutationFn: ({ question, given, signal }: { question: string; given: WiloConsents; signal: AbortSignal }) =>
      postGuideQuery(send, question, given, signal, speciesContext),
  });
  const transcription = useMutation({
    mutationFn: ({ audio, given, signal }: { audio: RecordedAudio; given: WiloConsents; signal: AbortSignal }) =>
      postTranscribe(send, audio, given, signal),
  });

  const push = (message: NewMessage) => {
    setMessages((current) => [...current, { ...message, id: nextId.current++ } as ChatMessage]);
  };

  const freshSignal = () => {
    controller.current?.abort();
    controller.current = new AbortController();
    return controller.current.signal;
  };

  const runQuery = (question: string, given: WiloConsents, echo = true) => {
    if (echo) push({ from: 'you', text: question });
    query.mutate({ question, given, signal: freshSignal() }, {
      onSuccess: (reply) => {
        push({ from: 'wilo', text: reply.text, reply });
        AccessibilityInfo.announceForAccessibility(`${t.identify.wilo}: ${reply.text}`);
      },
      onError: (error) => {
        if (isAbort(error)) return;
        push({
          from: 'error',
          text: aiErrorMessage(error),
          retryQuestion: canRetryAi(error) ? question : undefined,
        });
      },
    });
  };

  /** Ejecuta `run` si ya están los consentimientos; si no, abre la hoja y lo deja pendiente. */
  const withConsent = (need: ConsentNeed, run: (given: WiloConsents) => void) => {
    if (missingConsents(consents, need)) setPending({ need, run });
    else run(consents);
  };

  const status_ = status.data;
  const closed = status_ && !status_.active ? t.identify.unavailable : null;
  const guideOpen = !closed && (!status_ || status_.features.includes('guide'));
  const voiceOpen = guideOpen && (!status_ || status_.features.includes('transcribe'));
  const busy = query.isPending || transcription.isPending;

  /** Reintento manual de una pregunta que falló, sin repetir la burbuja de la persona. */
  const retry = (question: string) => {
    if (!busy) runQuery(question, wiloConsentStore.get(), false);
  };

  const askSuggestion = (id: string) => {
    const suggestion = questions.find((q) => q.id === id);
    if (!suggestion || busy || !guideOpen) return;
    withConsent('text', (given) => runQuery(suggestion.question, given));
  };

  const sendDraft = () => {
    const question = draft.trim();
    if (!question || busy || !guideOpen) return;
    withConsent('text', (given) => {
      setDraft('');
      setDraftNote(null);
      runQuery(question, given);
    });
  };

  const toggleMic = async () => {
    if (busy || !voiceOpen) return;
    if (!recorder.recording) {
      withConsent('voice', () => void recorder.start());
      return;
    }
    const audio = await recorder.stop();
    if (!audio) return;
    transcription.mutate({ audio, given: wiloConsentStore.get(), signal: freshSignal() }, {
      onSuccess: (transcript) => {
        setDraft(transcript.text);
        setDraftNote(transcript.simulated ? t.identify.transcriptSimulated : t.identify.transcriptReview);
      },
      onError: (error) => {
        if (!isAbort(error)) push({ from: 'error', text: aiErrorMessage(error) });
      },
      onSettled: () => discard(audio),
    });
  };

  const consent = {
    visible: pending !== null,
    need: pending?.need ?? 'text',
    notice: status_?.notice ?? null,
    accept: (given: WiloConsents) => {
      wiloConsentStore.set(() => given);
      const run = pending?.run;
      setPending(null);
      run?.(given);
    },
    dismiss: () => setPending(null),
  };

  return {
    messages,
    questions,
    /** Las sugerencias solo se ofrecen al principio: desaparecen con la primera consulta, sea cual sea. */
    showSuggestions: !messages.some((m) => m.from === 'you'),
    typing: query.isPending,
    transcribing: transcription.isPending,
    busy,
    closedReason: closed ?? (guideOpen ? null : t.identify.featureClosed),
    voiceOpen,
    draft,
    setDraft: (text: string) => {
      setDraft(text);
      if (!text) setDraftNote(null);
    },
    draftNote,
    sendDraft,
    askSuggestion,
    retry,
    mic: { recording: recorder.recording, error: recorderMessage(recorder.error), toggle: toggleMic },
    consent,
  };
}

function recorderMessage(error: RecorderError | null): string | null {
  switch (error) {
    case 'denied': return t.identify.micDenied;
    case 'unavailable': return t.identify.micUnavailable;
    case 'too_short': return t.identify.micTooShort;
    default: return null;
  }
}
