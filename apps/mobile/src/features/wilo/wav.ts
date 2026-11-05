// WAV PCM16 mono a 16 kHz, el formato que exige POST /guide/transcribe (hasta 60 s y 3 MiB). Lógica
// pura, sin dependencias: la usan la grabación nativa (use-voice-recorder.ts) y la web
// (use-voice-recorder.web.ts), porque el micrófono no siempre entrega 16 kHz (en Android suele ser
// 48 kHz) y la API solo acepta 16 o 24 kHz.

/** Frecuencia que se envía a la API. */
export const TARGET_SAMPLE_RATE = 16_000;
/** Límite de la API. */
export const MAX_RECORDING_SECONDS = 60;
/** Por debajo de esto, lo más probable es un toque accidental. */
export const MIN_RECORDING_MS = 500;

const WAV_HEADER_BYTES = 44;

/** Une los trozos que entrega el micrófono, en orden. */
export function concatInt16(chunks: readonly Int16Array[]): Int16Array {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Int16Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

/** Float32 en [-1, 1] (Web Audio) → Int16, recortando lo que se salga del rango. */
export function float32ToInt16(samples: Float32Array): Int16Array {
  const out = new Int16Array(samples.length);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    out[i] = s < 0 ? Math.round(s * 0x8000) : Math.round(s * 0x7fff);
  }
  return out;
}

/** Muestras intercaladas [L, R, L, R…] → mono, promediando los canales. */
export function toMono(samples: Int16Array, channels: number): Int16Array {
  if (channels <= 1) return samples;
  const frames = Math.floor(samples.length / channels);
  const out = new Int16Array(frames);
  for (let f = 0; f < frames; f++) {
    let sum = 0;
    for (let c = 0; c < channels; c++) sum += samples[f * channels + c];
    out[f] = Math.round(sum / channels);
  }
  return out;
}

/**
 * Cambia la frecuencia de muestreo. Al bajar (p. ej. 48 → 16 kHz) promedia cada ventana de muestras,
 * un filtro paso bajo simple que evita el aliasing más notorio; al subir, interpola linealmente.
 * Suficiente para voz destinada a transcripción, no para música.
 */
export function resample(samples: Int16Array, fromRate: number, toRate: number): Int16Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const ratio = fromRate / toRate;
  const length = Math.floor(samples.length / ratio);
  const out = new Int16Array(length);
  if (ratio > 1) {
    for (let i = 0; i < length; i++) {
      const start = Math.floor(i * ratio);
      const end = Math.min(samples.length, Math.max(start + 1, Math.floor((i + 1) * ratio)));
      let sum = 0;
      for (let j = start; j < end; j++) sum += samples[j];
      out[i] = Math.round(sum / (end - start));
    }
  } else {
    for (let i = 0; i < length; i++) {
      const pos = i * ratio;
      const left = Math.floor(pos);
      const right = Math.min(samples.length - 1, left + 1);
      out[i] = Math.round(samples[left] + (samples[right] - samples[left]) * (pos - left));
    }
  }
  return out;
}

/** Recorta a los primeros `seconds` segundos. */
export function clampDuration(samples: Int16Array, sampleRate: number, seconds = MAX_RECORDING_SECONDS): Int16Array {
  const max = sampleRate * seconds;
  return samples.length > max ? samples.subarray(0, max) : samples;
}

/** Duración en milisegundos de muestras mono. */
export function durationMs(samples: Int16Array, sampleRate: number): number {
  return Math.round((samples.length / sampleRate) * 1000);
}

/** Muestras PCM16 mono → archivo WAV (RIFF, little-endian) completo. */
export function encodeWav(samples: Int16Array, sampleRate: number): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(WAV_HEADER_BYTES + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  ascii(0, 'RIFF');
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, 'WAVE');
  ascii(12, 'fmt ');
  view.setUint32(16, 16, true); // tamaño del bloque fmt
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true); // bytes por segundo
  view.setUint16(32, 2, true); // bytes por muestra
  view.setUint16(34, 16, true); // bits por muestra
  ascii(36, 'data');
  view.setUint32(40, dataBytes, true);
  for (let i = 0; i < samples.length; i++) view.setInt16(WAV_HEADER_BYTES + i * 2, samples[i], true);
  return new Uint8Array(buffer);
}

/**
 * Lo que entrega el micrófono → WAV listo para la API: mezcla a mono, baja a 16 kHz y recorta a 60 s.
 * Devuelve también la duración para descartar toques accidentales.
 */
export function toApiWav(chunks: readonly Int16Array[], sampleRate: number, channels: number) {
  const mono = toMono(concatInt16(chunks), channels);
  const samples = clampDuration(resample(mono, sampleRate, TARGET_SAMPLE_RATE), TARGET_SAMPLE_RATE);
  return { bytes: encodeWav(samples, TARGET_SAMPLE_RATE), durationMs: durationMs(samples, TARGET_SAMPLE_RATE) };
}
