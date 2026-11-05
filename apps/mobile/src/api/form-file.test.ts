import { describe, expect, it, jest } from '@jest/globals';
// Convertidor real que usa `expo/fetch` en nativo para armar el multipart.
import { convertFormDataAsync } from 'expo/src/winter/fetch/convertFormData';

import { nativeFilePart } from '@/api/form-file';

// expo-file-system simulado: el «archivo» son bytes SINTÉTICOS en memoria, sin disco.
jest.mock('expo-file-system', () => ({
  File: function MockFile() {
    return { bytes: () => Promise.resolve(new Uint8Array([0xff, 0xd8, 0xff, 0xd9])) };
  },
}));

/** FormData mínimo con `entries()`, como el que parchea Expo en nativo. */
function formOf(parts: [string, unknown][]): FormData {
  return { entries: () => parts } as unknown as FormData;
}

const text = (bytes: Uint8Array) => new TextDecoder('latin1').decode(bytes);

describe('parte de archivo para expo/fetch', () => {
  it('la parte de React Native {uri, name, type} falla en expo/fetch (el bug que se corrigió)', async () => {
    const form = formOf([['file', { uri: 'file:///cache/foto.jpg', name: 'foto.jpg', type: 'image/jpeg' }]]);
    await expect(convertFormDataAsync(form, 'LIMITE')).rejects.toThrow('Unsupported FormDataPart implementation');
  });

  it('nativeFilePart se envía con su nombre, su Content-Type exacto y los bytes del archivo', async () => {
    const form = formOf([
      ['file', nativeFilePart('file:///cache/foto.jpg', 'foto.jpg', 'image/jpeg')],
      ['adult_confirmed', 'true'],
    ]);
    const { body } = await convertFormDataAsync(form, 'LIMITE');
    const raw = text(body);
    expect(raw).toContain('content-disposition: form-data; name="file"; filename="foto.jpg"');
    expect(raw).toContain('content-type: image/jpeg');
    expect(raw).toContain('\xff\xd8\xff\xd9');
    expect(raw).toContain('name="adult_confirmed"\r\n\r\ntrue');
    expect(raw.endsWith('--LIMITE--\r\n')).toBe(true);
  });

  it('sirve igual para el WAV de la voz', async () => {
    const { body } = await convertFormDataAsync(
      formOf([['file', nativeFilePart('file:///cache/pregunta.wav', 'pregunta.wav', 'audio/wav')]]), 'LIMITE');
    expect(text(body)).toContain('filename="pregunta.wav"\r\ncontent-type: audio/wav');
  });
});
