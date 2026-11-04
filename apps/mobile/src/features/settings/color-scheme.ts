import AsyncStorage from '@react-native-async-storage/async-storage';

import { type ColorScheme, setColorScheme } from '@/ui';

// Preferencia de modo oscuro elegida en Ajustes. Persiste en el dispositivo (AsyncStorage; en web,
// localStorage). Si el almacenamiento falla la app sigue en modo claro y el cambio dura la sesión.

const KEY = 'bosque-vivo/color-scheme/v1';

let loading: Promise<void> | undefined;

/** Aplica la preferencia guardada; se llama una vez al arrancar, antes de ocultar el splash. */
export function loadColorScheme(): Promise<void> {
  loading ??= AsyncStorage.getItem(KEY)
    .then((value) => {
      if (value === 'dark') setColorScheme('dark');
    })
    .catch(() => {
      // Sin almacenamiento se queda el modo claro.
    });
  return loading;
}

/** Cambia el modo de toda la app y lo recuerda para los próximos inicios. */
export function saveColorScheme(scheme: ColorScheme) {
  setColorScheme(scheme);
  AsyncStorage.setItem(KEY, scheme).catch(() => {
    // Si no se puede escribir, el cambio vale mientras la app esté abierta.
  });
}
