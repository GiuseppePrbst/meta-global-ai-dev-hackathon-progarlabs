import { describe, expect, it } from '@jest/globals';

import {
  clampDuration, concatInt16, encodeWav, float32ToInt16, MAX_RECORDING_SECONDS, resample, TARGET_SAMPLE_RATE, toApiWav,
  toMono,
} from '@/features/wilo/wav';

// Audio SINTÉTICO: rampas y constantes inventadas, sin grabaciones reales.

function header(bytes: Uint8Array) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number, length: number) =>
    String.fromCharCode(...Array.from(bytes.subarray(offset, offset + length)));
  return {
    riff: text(0, 4),
    riffSize: view.getUint32(4, true),
    wave: text(8, 4),
    fmt: text(12, 4),
    format: view.getUint16(20, true),
    channels: view.getUint16(22, true),
    sampleRate: view.getUint32(24, true),
    byteRate: view.getUint32(28, true),
    blockAlign: view.getUint16(32, true),
    bits: view.getUint16(34, true),
    data: text(36, 4),
    dataSize: view.getUint32(40, true),
    sample: (i: number) => view.getInt16(44 + i * 2, true),
  };
}

describe('encodeWav', () => {
  it('escribe un WAV PCM16 mono válido, little-endian', () => {
    const bytes = encodeWav(Int16Array.from([0, 1000, -1000, 32767, -32768]), 16_000);
    const h = header(bytes);
    expect(bytes.byteLength).toBe(44 + 10);
    expect(h).toMatchObject({
      riff: 'RIFF', riffSize: 36 + 10, wave: 'WAVE', fmt: 'fmt ', format: 1, channels: 1,
      sampleRate: 16_000, byteRate: 32_000, blockAlign: 2, bits: 16, data: 'data', dataSize: 10,
    });
    expect([0, 1, 2, 3, 4].map(h.sample)).toEqual([0, 1000, -1000, 32767, -32768]);
  });
});

describe('resample', () => {
  it('no toca el audio si ya está en la frecuencia pedida', () => {
    const samples = Int16Array.from([1, 2, 3]);
    expect(resample(samples, 16_000, 16_000)).toBe(samples);
  });

  it('de 48 a 16 kHz deja un tercio de las muestras, promediando cada ventana', () => {
    const out = resample(Int16Array.from([3, 6, 9, 30, 60, 90]), 48_000, 16_000);
    expect(Array.from(out)).toEqual([6, 60]);
  });

  it('una señal constante sigue constante al bajar desde 44,1 kHz', () => {
    const out = resample(new Int16Array(44_100).fill(500), 44_100, 16_000);
    expect(out.length).toBe(16_000);
    expect(out.every((s) => s === 500)).toBe(true);
  });

  it('al subir interpola linealmente', () => {
    expect(Array.from(resample(Int16Array.from([0, 100]), 8_000, 16_000))).toEqual([0, 50, 100, 100]);
  });
});

describe('conversiones', () => {
  it('float32 → int16 recorta lo que sale de [-1, 1]', () => {
    expect(Array.from(float32ToInt16(Float32Array.from([0, 1, -1, 2, -2, 0.5])))).toEqual([0, 32767, -32768, 32767, -32768, 16384]);
  });

  it('mezcla estéreo intercalado a mono promediando', () => {
    expect(Array.from(toMono(Int16Array.from([10, 20, -10, -30]), 2))).toEqual([15, -20]);
    const mono = Int16Array.from([1, 2]);
    expect(toMono(mono, 1)).toBe(mono);
  });

  it('une trozos en orden', () => {
    expect(Array.from(concatInt16([Int16Array.from([1, 2]), Int16Array.from([3])]))).toEqual([1, 2, 3]);
  });

  it('recorta a 60 s', () => {
    expect(clampDuration(new Int16Array(16_000 * 61), 16_000).length).toBe(16_000 * MAX_RECORDING_SECONDS);
  });
});

describe('toApiWav', () => {
  it('lo que entrega un Android a 48 kHz estéreo termina en WAV mono de 16 kHz con la duración correcta', () => {
    // 2 s a 48 kHz estéreo, en trozos de 4800 muestras intercaladas.
    const chunks = Array.from({ length: 40 }, () => new Int16Array(4800).fill(100));
    const wav = toApiWav(chunks, 48_000, 2);
    const h = header(wav.bytes);
    expect(h.sampleRate).toBe(TARGET_SAMPLE_RATE);
    expect(h.channels).toBe(1);
    expect(h.dataSize).toBe(16_000 * 2 * 2);
    expect(wav.durationMs).toBe(2000);
  });

  it('60 s de WAV a 16 kHz quedan bajo el tope de 3 MiB de la API', () => {
    const wav = toApiWav([new Int16Array(16_000 * 70)], 16_000, 1);
    expect(wav.durationMs).toBe(60_000);
    expect(wav.bytes.byteLength).toBeLessThan(3 * 1024 * 1024);
  });
});
