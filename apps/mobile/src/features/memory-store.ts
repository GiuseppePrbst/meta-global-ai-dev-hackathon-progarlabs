import { useSyncExternalStore } from 'react';

// Estado de módulo en memoria que varias pantallas leen y cambian (guardadas, recorridos). Se pierde
// al cerrar la app: cuando exista almacenamiento local, cada store persiste por dentro y sus
// consumidores siguen igual.

export type MemoryStore<T> = {
  /** Reemplaza el valor; los consumidores se re-renderizan solo si cambia la referencia. */
  set: (update: (current: T) => T) => void;
  /** Valor actual como hook de React. */
  useValue: () => T;
  /** Valor actual fuera del render (p. ej. en un callback asíncrono). */
  get: () => T;
};

export function createMemoryStore<T>(initial: T): MemoryStore<T> {
  let value = initial;
  const listeners = new Set<() => void>();
  const subscribe = (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  };
  const get = () => value;
  return {
    set: (update) => {
      const next = update(value);
      if (Object.is(next, value)) return;
      value = next;
      listeners.forEach((listener) => listener());
    },
    useValue: () => useSyncExternalStore(subscribe, get, get),
    get,
  };
}
