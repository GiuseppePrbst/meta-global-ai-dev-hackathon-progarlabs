import { useEffect, useState } from "react";
import { LabError } from "../lib/api";
import { exchangeFederated, myQuota, quotaSummary, type Quota } from "../lib/session";

const env = import.meta.env;
const firebaseConfig = env.VITE_FIREBASE_API_KEY
  ? { apiKey: env.VITE_FIREBASE_API_KEY, authDomain: env.VITE_FIREBASE_AUTH_DOMAIN, projectId: env.VITE_FIREBASE_PROJECT_ID }
  : null;

// Facebook Login via Firebase Authentication (popup en escritorio). Sin scopes adicionales:
// no se piden correo, amigos ni publicaciones. La sesion de Firebase vive en memoria y se cierra
// tras el canje; lo que queda es la sesion bvs_ de 60 min del backend.
async function facebookIdToken(): Promise<string> {
  const { initializeApp, getApps } = await import("firebase/app");
  const { getAuth, setPersistence, inMemoryPersistence, signInWithPopup, FacebookAuthProvider, signOut } = await import("firebase/auth");
  const app = getApps()[0] ?? initializeApp(firebaseConfig!);
  const auth = getAuth(app);
  await setPersistence(auth, inMemoryPersistence);
  const result = await signInWithPopup(auth, new FacebookAuthProvider());
  const idToken = await result.user.getIdToken();
  await signOut(auth);
  return idToken;
}

export function FederatedLogin({ token, onToken }: { token: string; onToken: (value: string) => void }) {
  const [quota, setQuota] = useState<Quota | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token.startsWith("bvs_")) { setQuota(null); return; }
    myQuota(token).then(setQuota).catch(() => setQuota(null));
  }, [token]);

  async function login() {
    setMessage("");
    try { onToken((await exchangeFederated(await facebookIdToken())).access_token); }
    catch (e) { setMessage(e instanceof LabError ? `${e.status}: ${e.message}` : "No se completo el inicio de sesion."); }
  }

  return (
    <div className="session" aria-label="Acceso con Facebook">
      {firebaseConfig && !token && <button type="button" onClick={login}>Entrar con Facebook</button>}
      {quota && <p role="status" aria-label="Cuota">{quotaSummary(quota)}{quota.reason && quota.status !== "available" ? ` · ${quota.reason}` : ""}</p>}
      {message && <p className="notice" role="alert">{message}</p>}
    </div>
  );
}
