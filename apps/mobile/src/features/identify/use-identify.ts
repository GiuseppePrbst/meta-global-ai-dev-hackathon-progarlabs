import { useMutation } from '@tanstack/react-query';
import { File, Paths } from 'expo-file-system';
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

import { identifyTransport, MAX_IMAGE_BYTES, postIdentify } from '@/api/identify';
import type { CapturedPhoto, IdentifyOutcome } from '@/domain/identification';
import type { Species } from '@/domain/species';
import type { WiloConsents } from '@/domain/wilo';
import { getReferencePhoto } from '@/features/catalog/reference-photos';
import { pickDemoSpecies } from '@/features/identify/wilo-chat';

// Identificar la foto recién tomada con POST /identify (src/api/identify.ts, simulado por defecto).
// En mock, la «candidata» es una especie del catálogo con foto de referencia, elegida al azar sin
// repetir la anterior (`pickDemoSpecies`). La foto se borra del caché apenas termina la petición.
// Nunca se reintenta sola: cada POST real reserva presupuesto.

export type IdentifyAttempt =
  | { kind: 'species'; species: Species; outcome: Extract<IdentifyOutcome, { kind: 'candidate' }> }
  | { kind: 'insufficient'; outcome: Extract<IdentifyOutcome, { kind: 'insufficient' }> }
  /** La API propuso una especie que el catálogo de la app no tiene: no se muestra como encontrada. */
  | { kind: 'not_in_catalog'; outcome: Extract<IdentifyOutcome, { kind: 'candidate' }> };

export function useIdentify(catalog: readonly Species[] | undefined) {
  const lastId = useRef<string | null>(null);
  const controller = useRef<AbortController | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  const mutation = useMutation({
    mutationFn: async ({ photo, given, species: known }: {
      photo: CapturedPhoto;
      given: WiloConsents;
      species: readonly Species[];
    }): Promise<IdentifyAttempt> => {
      controller.current?.abort();
      controller.current = new AbortController();
      // En mock, la candidata sale del catálogo ya cargado; en vivo se ignora.
      const send = identifyTransport(
        () => pickDemoSpecies(known, (id) => !!getReferencePhoto(id), lastId.current)?.id,
      );
      try {
        const outcome = await postIdentify(send, photo, given, controller.current.signal);
        if (outcome.kind === 'insufficient') return { kind: 'insufficient', outcome };
        const species = known.find((s) => s.id === outcome.speciesId);
        if (!species) return { kind: 'not_in_catalog', outcome };
        lastId.current = species.id;
        return { kind: 'species', species, outcome };
      } finally {
        discardPhoto(photo);
      }
    },
  });

  return {
    /** Identifica la foto; la candidata debe estar en el catálogo para mostrarse como especie. */
    identify: (photo: CapturedPhoto, given: WiloConsents) =>
      mutation.mutateAsync({ photo, given, species: catalog ?? [] }),
    isPending: mutation.isPending,
    reset: mutation.reset,
  };
}

/** Foto de la cámara → `CapturedPhoto`, con su tamaño si se puede leer (la API rechaza más de 10 MiB). */
export function toCapturedPhoto(picture: { uri: string; format?: 'jpg' | 'png' }): CapturedPhoto {
  const png = picture.format === 'png' || picture.uri.startsWith('data:image/png');
  const mimeType = png ? 'image/png' : 'image/jpeg';
  let sizeBytes: number | null = null;
  if (Platform.OS !== 'web') {
    try {
      sizeBytes = new File(picture.uri).size;
    } catch {
      sizeBytes = null;
    }
  }
  return { uri: picture.uri, mimeType, fileName: png ? 'foto.png' : 'foto.jpg', sizeBytes };
}

const API_IMAGE_TYPES = new Set<CapturedPhoto['mimeType']>(['image/jpeg', 'image/png', 'image/webp']);

/**
 * Foto elegida de la galería (expo-image-picker) → `CapturedPhoto`, o `null` si está en un formato que
 * la API no admite (p. ej. HEIC que el sistema no convirtió): la API respondería 415.
 */
export function libraryPhoto(asset: { uri: string; mimeType?: string | null; fileSize?: number | null }): CapturedPhoto | null {
  const fromUri = asset.uri.match(/^data:(image\/[a-z]+)/i)?.[1];
  const mimeType = (asset.mimeType ?? fromUri ?? guessFromExtension(asset.uri))?.toLowerCase();
  if (!mimeType || !API_IMAGE_TYPES.has(mimeType as CapturedPhoto['mimeType'])) return null;
  const extension = mimeType === 'image/png' ? 'png' : mimeType === 'image/webp' ? 'webp' : 'jpg';
  return {
    uri: asset.uri,
    mimeType: mimeType as CapturedPhoto['mimeType'],
    fileName: `foto.${extension}`,
    sizeBytes: asset.fileSize ?? null,
  };
}

function guessFromExtension(uri: string): string | undefined {
  const ext = uri.split('?')[0].split('.').pop()?.toLowerCase();
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'png') return 'image/png';
  if (ext === 'webp') return 'image/webp';
  return undefined;
}

export function isTooLarge(photo: CapturedPhoto): boolean {
  return photo.sizeBytes !== null && photo.sizeBytes > MAX_IMAGE_BYTES;
}

/**
 * Borra la foto del caché de la app. Solo toca archivos dentro de ese caché: la cámara y el selector
 * de galería dejan ahí su copia, así que el original de la galería nunca se borra. En web la foto es
 * un data URI en memoria: no hay archivo.
 */
export function discardPhoto(photo: CapturedPhoto): void {
  if (Platform.OS === 'web' || !isInCache(photo.uri)) return;
  try {
    new File(photo.uri).delete();
  } catch {
    // Si ya no existe, no hay nada que borrar.
  }
}

function isInCache(uri: string): boolean {
  try {
    return uri.startsWith(Paths.cache.uri);
  } catch {
    return false;
  }
}
