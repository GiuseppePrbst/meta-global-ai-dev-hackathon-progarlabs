/**
 * Referencia web de Firebase Facebook Login para José.
 * Requiere instalar SDK `firebase` y configurar valores públicos reales.
 * ESTE FLUJO NO FUNCIONA EN PRODUCCIÓN hasta la activación de PR #42,
 * Meta Developer App y el proveedor Facebook en Firebase.
 * La aplicación oficial de José se mantiene fuera de este ejemplo.
 */

import { initializeApp, type FirebaseOptions } from "firebase/app";
import {
  FacebookAuthProvider,
  getAuth,
  inMemoryPersistence,
  setPersistence,
  signInWithPopup,
  signOut,
} from "firebase/auth";
import { BosqueVivoClient } from "./bosque-vivo-client";

export async function loginWebConFacebook(
  firebaseConfig: FirebaseOptions,
  api: BosqueVivoClient,
): Promise<void> {
  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  const provider = new FacebookAuthProvider();
  // No solicitar scopes adicionales sin justificación y revisión de Meta.
  const result = await signInWithPopup(auth, provider);
  const idToken = await result.user.getIdToken();
  await api.exchangeFirebaseIdToken(idToken);
  // El acceso posterior a Bosque Vivo utiliza la sesión temporal BVS.
  await signOut(auth);
}

// Para web móvil, evaluar el flujo oficial con signInWithRedirect.
// Para Expo iOS/Android, usar desarrollo nativo y las guías oficiales (no Expo Go).
