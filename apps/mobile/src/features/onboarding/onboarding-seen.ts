import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { createMemoryStore } from '@/features/memory-store';
import { preloadWilo } from '@/features/onboarding/wilo';

// Marca de que la presentación de Wilo ya se vio. Persiste en el dispositivo (AsyncStorage; en web,
// localStorage) para que aparezca solo en el primer inicio. Si el almacenamiento falla se muestra
// igual: es una presentación corta y nunca bloquea la app.

const KEY = 'bosque-vivo/onboarding-seen/v1';

/** TEMPORAL, para pruebas: muestra la presentación en cada inicio. Volver a `false` antes de publicar. */
const ALWAYS_SHOW = true;

/** `undefined` mientras se lee del dispositivo. */
const seen = createMemoryStore<boolean | undefined>(undefined);
let loading: Promise<void> | undefined;

function load() {
  loading ??= AsyncStorage.getItem(KEY)
    .then((value) => !ALWAYS_SHOW && value === '1')
    .catch(() => false)
    // Si toca mostrarla, las poses de Wilo se precargan mientras el splash sigue visible.
    .then(async (value) => {
      if (!value) await preloadWilo();
      return value;
    })
    .then((value) => seen.set((current) => current ?? value));
  return loading;
}

/** Si la presentación ya se vio; `undefined` mientras se consulta. */
export function useOnboardingSeen(): boolean | undefined {
  useEffect(() => {
    load();
  }, []);
  return seen.useValue();
}

/** Vuelve a mostrar la presentación ahora y en el próximo inicio, hasta que se cierre otra vez. */
export function resetOnboardingSeen() {
  seen.set(() => false);
  AsyncStorage.removeItem(KEY).catch(() => {
    // Si no se puede borrar, la presentación se muestra igual ahora; el próximo inicio puede omitirla.
  });
}

/** Cierra la presentación y la recuerda para los próximos inicios. */
export function markOnboardingSeen() {
  seen.set(() => true);
  AsyncStorage.setItem(KEY, '1').catch(() => {
    // Sin almacenamiento la presentación vuelve a aparecer en el próximo inicio; no es un error para la persona.
  });
}
