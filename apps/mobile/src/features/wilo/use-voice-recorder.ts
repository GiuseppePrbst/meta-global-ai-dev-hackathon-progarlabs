import { type AudioStreamBuffer, requestRecordingPermissionsAsync, setAudioModeAsync, useAudioStream } from 'expo-audio';
import { File, Paths } from 'expo-file-system';
import { useEffect, useRef, useState } from 'react';

import type { RecordedAudio } from '@/domain/wilo';
import { MAX_RECORDING_SECONDS, MIN_RECORDING_MS, toApiWav } from '@/features/wilo/wav';

// Grabación de la pregunta por voz en Android e iOS, compatible con Expo Go. En web la reemplaza
// use-voice-recorder.web.ts (Metro elige el archivo por plataforma).
//
// POST /guide/transcribe exige WAV PCM16 mono de 16 o 24 kHz. MediaRecorder de Android no graba WAV,
// así que no se usa `useAudioRecorder`: `useAudioStream` (expo-audio ≥ 58) entrega el PCM crudo del
// micrófono y aquí se arma el WAV (wav.ts). Se piden 16 kHz, pero el hardware puede entregar otra
// frecuencia (en Android suele ser 48 kHz): `toApiWav` remuestrea a 16 kHz con la que llegó.
//
// El audio vive en memoria mientras se graba y luego en un archivo del caché hasta transcribirlo;
// `discard` lo borra. Nunca se registra ni se guarda en otro lugar.

export { MAX_RECORDING_SECONDS, MIN_RECORDING_MS };

export type RecorderError = 'denied' | 'unavailable' | 'too_short';

type Capture = { chunks: Int16Array[]; samples: number; sampleRate: number; channels: number };

export function useVoiceRecorder() {
  const [recording, setRecording] = useState(false);
  const [error, setError] = useState<RecorderError | null>(null);
  const capture = useRef<Capture | null>(null);

  const { stream } = useAudioStream({
    sampleRate: 16_000,
    channels: 1,
    encoding: 'int16',
    onBuffer: (buffer: AudioStreamBuffer) => {
      const current = capture.current;
      if (!current) return;
      current.sampleRate = buffer.sampleRate;
      current.channels = buffer.channels;
      // A los 60 s deja de acumular: la persona igual debe tocar para terminar.
      if (current.samples >= buffer.sampleRate * buffer.channels * MAX_RECORDING_SECONDS) return;
      // Copia: el ArrayBuffer puede reutilizarse en el siguiente evento.
      const chunk = new Int16Array(buffer.data.slice(0));
      current.chunks.push(chunk);
      current.samples += chunk.length;
    },
  });

  // Al salir de la pantalla no se sigue grabando.
  useEffect(() => () => {
    capture.current = null;
    try {
      stream.stop();
    } catch {
      // Ya estaba detenido.
    }
  }, [stream]);

  const start = async (): Promise<boolean> => {
    setError(null);
    try {
      const permission = await requestRecordingPermissionsAsync();
      if (!permission.granted) {
        setError('denied');
        return false;
      }
      await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
      capture.current = { chunks: [], samples: 0, sampleRate: 16_000, channels: 1 };
      await stream.start();
      setRecording(true);
      return true;
    } catch {
      capture.current = null;
      setError('unavailable');
      return false;
    }
  };

  /** Detiene la grabación. Devuelve el WAV en el caché, o `null` si falló o fue demasiado corta. */
  const stop = async (): Promise<RecordedAudio | null> => {
    setRecording(false);
    const captured = capture.current;
    capture.current = null;
    try {
      stream.stop();
      await setAudioModeAsync({ allowsRecording: false });
    } catch {
      setError('unavailable');
      return null;
    }
    if (!captured) {
      setError('unavailable');
      return null;
    }
    const wav = toApiWav(captured.chunks, captured.sampleRate, captured.channels);
    if (wav.durationMs < MIN_RECORDING_MS) {
      setError('too_short');
      return null;
    }
    try {
      const file = new File(Paths.cache, `pregunta-${Date.now()}.wav`);
      file.create({ overwrite: true });
      await file.write(wav.bytes);
      return { uri: file.uri, mimeType: 'audio/wav', fileName: 'pregunta.wav', durationMs: wav.durationMs };
    } catch {
      setError('unavailable');
      return null;
    }
  };

  return { recording, error, start, stop, clearError: () => setError(null) };
}

/** Borra la grabación del caché. */
export function discard(audio: RecordedAudio): void {
  try {
    new File(audio.uri).delete();
  } catch {
    // Si ya no existe, no hay nada que borrar.
  }
}
