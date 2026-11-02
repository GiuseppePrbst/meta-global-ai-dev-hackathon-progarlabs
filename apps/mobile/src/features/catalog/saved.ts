import { createMemoryStore } from '@/features/memory-store';

// Especies guardadas con el marcador de la lista. Viven en memoria mientras la app está abierta:
// todavía no hay almacenamiento local, así que se pierden al cerrarla.

const saved = createMemoryStore<ReadonlySet<string>>(new Set());

/** Agrega o quita una especie de las guardadas. */
export function toggleSaved(speciesId: string) {
  saved.set((current) => {
    const next = new Set(current);
    if (!next.delete(speciesId)) next.add(speciesId);
    return next;
  });
}

/** Ids de las especies guardadas; cambia de referencia solo cuando cambian. */
export const useSaved = saved.useValue;
