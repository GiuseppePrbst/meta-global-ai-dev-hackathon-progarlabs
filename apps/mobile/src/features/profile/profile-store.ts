import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect } from 'react';

import { createMemoryStore } from '@/features/memory-store';
import { parseStoredProfile, type Profile } from '@/features/profile/profile';

// Perfil local persistido en el dispositivo (AsyncStorage; en web, localStorage). No sale del
// dispositivo ni se asocia a una cuenta. Si el almacenamiento falla, el perfil sigue en memoria
// mientras la app está abierta.

const KEY = 'bosque-vivo/profile/v1';

/** `undefined` mientras se lee del dispositivo. */
const profile = createMemoryStore<Profile | undefined>(undefined);
let loading: Promise<void> | undefined;

function load() {
  loading ??= AsyncStorage.getItem(KEY)
    .catch(() => null)
    .then((raw) => profile.set((current) => current ?? parseStoredProfile(raw)));
  return loading;
}

/** El perfil local; `undefined` mientras se lee. */
export function useProfile(): Profile | undefined {
  useEffect(() => {
    load();
  }, []);
  return profile.useValue();
}

/** Guarda un perfil ya validado. Resuelve `false` si no se pudo persistir (queda solo en memoria). */
export function saveProfile(next: Profile): Promise<boolean> {
  profile.set(() => next);
  return AsyncStorage.setItem(KEY, JSON.stringify(next)).then(() => true, () => false);
}
