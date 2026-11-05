import { describe, expect, it } from '@jest/globals';

import { isTooLarge, libraryPhoto } from '@/features/identify/use-identify';

// URIs SINTÉTICAS: no existen archivos ni fotos reales.

describe('libraryPhoto', () => {
  it('acepta JPEG, PNG y WebP con el tipo y el tamaño que da el selector', () => {
    expect(libraryPhoto({ uri: 'file:///cache/a.jpg', mimeType: 'image/jpeg', fileSize: 1234 })).toEqual({
      uri: 'file:///cache/a.jpg', mimeType: 'image/jpeg', fileName: 'foto.jpg', sizeBytes: 1234,
    });
    expect(libraryPhoto({ uri: 'file:///cache/b', mimeType: 'image/png' })?.fileName).toBe('foto.png');
    expect(libraryPhoto({ uri: 'file:///cache/c', mimeType: 'image/webp' })?.mimeType).toBe('image/webp');
  });

  it('rechaza HEIC u otros formatos que la API respondería con 415', () => {
    expect(libraryPhoto({ uri: 'file:///cache/a.heic', mimeType: 'image/heic' })).toBeNull();
    expect(libraryPhoto({ uri: 'file:///cache/a.gif', mimeType: 'image/gif' })).toBeNull();
  });

  it('sin mimeType lo deduce del data URI (web) o de la extensión', () => {
    expect(libraryPhoto({ uri: 'data:image/png;base64,AAAA' })?.mimeType).toBe('image/png');
    expect(libraryPhoto({ uri: 'file:///cache/foto.JPEG?x=1' })?.mimeType).toBe('image/jpeg');
    expect(libraryPhoto({ uri: 'file:///cache/sin-extension' })).toBeNull();
  });

  it('sin tamaño conocido no lo da por grande', () => {
    const photo = libraryPhoto({ uri: 'file:///cache/a.jpg', mimeType: 'image/jpeg', fileSize: null });
    expect(photo?.sizeBytes).toBeNull();
    expect(photo && isTooLarge(photo)).toBe(false);
    const big = libraryPhoto({ uri: 'file:///cache/a.jpg', mimeType: 'image/jpeg', fileSize: 10 * 1024 * 1024 + 1 });
    expect(big && isTooLarge(big)).toBe(true);
  });
});
