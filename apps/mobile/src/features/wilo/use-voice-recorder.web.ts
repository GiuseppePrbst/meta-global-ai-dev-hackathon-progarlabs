import { useEffect, useRef, useState } from 'react';

import type { RecordedAudio } from '@/domain/wilo';
import { float32ToInt16, MAX_RECORDING_SECONDS, MIN_RECORDING_MS, toApiWav } from '@/features/wilo/wav';

// Grabación de la pregunta por voz en web. En web, `useAudioStream` de expo-audio no está implementado
// (devuelve `stream: null`) y MediaRecorder no graba WAV, así que se captura PCM con la Web Audio API
// (getUserMedia + AudioContext) y se arma el WAV en JS (wav.ts), igual que en nativo
// (use-voice-recorder.ts, misma interfaz).
//
// `ScriptProcessorNode` está en desuso, pero funciona en todos los navegadores y no exige servir un
// módulo de AudioWorklet aparte. El audio vive en memoria y luego en un `blob:` hasta transcribirlo;
// `discard` lo libera.

export { MAX_RECORDING_SECONDS, MIN_RECORDING_MS };

export type RecorderError = 'denied' | 'unavailable' | 'too_short';

type Session = {
  media: MediaStream;
  context: AudioContext;
  source: MediaStreamAudioSourceNode;
  processor: ScriptProcessorNode;
  chunks: Int16Array[];
  samples: number;
};

const BUFFER_SIZE = 4096;

function close(session: Session): void {
  session.processor.onaudioprocess = null;
  session.source.disconnect();
  session.processor.disconnect();
  session.media.getTracks().forEach((track) => track.stop());
  void session.context.close().catch(() => {});
}

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<RecorderError | null>(null);
  const session = useRef<Session | null>(null);

  // Al salir de la pantalla se suelta el micrófono.
  useEffect(() => () => {
    if (session.current) close(session.current);
    session.current = null;
  }, []);

  const start = async (): Promise<boolean> => {
    setError(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('unavailable');
      return false;
    }
    let media: MediaStream;
    try {
      media = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true } });
    } catch (cause) {
      const denied = cause instanceof DOMException && (cause.name === 'NotAllowedError' || cause.name === 'SecurityError');
      setError(denied ? 'denied' : 'unavailable');
      return false;
    }
    try {
      const context = new AudioContext();
      const source = context.createMediaStreamSource(media);
      const processor = context.createScriptProcessor(BUFFER_SIZE, 1, 1);
      const current: Session = { media, context, source, processor, chunks: [], samples: 0 };
      processor.onaudioprocess = (event) => {
        // A los 60 s deja de acumular: la persona igual debe tocar para terminar.
        if (current.samples >= context.sampleRate * MAX_RECORDING_SECONDS) return;
        const chunk = float32ToInt16(event.inputBuffer.getChannelData(0));
        current.chunks.push(chunk);
        current.samples += chunk.length;
      };
      source.connect(processor);
      // Sin conectarlo a la salida, algunos navegadores no llaman a onaudioprocess. No suena: la salida
      // del procesador queda en silencio porque no se escribe en `outputBuffer`.
      processor.connect(context.destination);
      session.current = current;
      setRecording(true);
      return true;
    } catch {
      media.getTracks().forEach((track) => track.stop());
      setError('unavailable');
      return false;
    }
  };

  /** Detiene la grabación. Devuelve el WAV como `blob:`, o `null` si falló o fue demasiado corta. */
  const stop = async (): Promise<RecordedAudio | null> => {
    setRecording(false);
    const current = session.current;
    session.current = null;
    if (!current) {
      setError('unavailable');
      return null;
    }
    const sampleRate = current.context.sampleRate;
    close(current);
    const wav = toApiWav(current.chunks, sampleRate, 1);
    if (wav.durationMs < MIN_RECORDING_MS) {
      setError('too_short');
      return null;
    }
    const uri = URL.createObjectURL(new Blob([wav.bytes as BlobPart], { type: 'audio/wav' }));
    return { uri, mimeType: 'audio/wav', fileName: 'pregunta.wav', durationMs: wav.durationMs };
  };

  return { recording, error, start, stop, clearError: () => setError(null) };
}

/** Libera el `blob:` de la grabación. */
export function discard(audio: RecordedAudio): void {
  if (audio.uri.startsWith('blob:')) URL.revokeObjectURL(audio.uri);
}
