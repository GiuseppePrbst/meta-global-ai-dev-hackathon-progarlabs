import { useEffect, useState } from "react";
import { LabError } from "../lib/api";
import { exchangeInvitation, logout, refreshSession, sessionInfo, type SessionInfo } from "../lib/session";

// Acceso de evaluadores: canje de invitacion -> token temporal. Nunca credenciales permanentes.
export function SessionPanel({ token, onToken }: { token: string; onToken: (value: string) => void }) {
  const [invitation, setInvitation] = useState("");
  const [info, setInfo] = useState<SessionInfo | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token.startsWith("bvs_")) { setInfo(null); return; }
    sessionInfo(token).then(setInfo).catch((e: unknown) => {
      setInfo(null);
      setMessage(e instanceof LabError && e.status === 401 ? "La sesion expiro o fue revocada: canjea una invitacion nueva." : "No se pudo consultar la sesion.");
    });
  }, [token]);

  async function run(action: () => Promise<void>) {
    setMessage("");
    try { await action(); }
    catch (e) { setMessage(e instanceof LabError ? `${e.status}: ${e.message}` : "Error de red."); }
  }

  return (
    <div className="session" aria-label="Sesion temporal">
      {info ? (
        <p role="status">Sesion activa: <strong>{info.identity}</strong> · permisos {info.scopes?.join(", ") || "todos"}
          {info.expires_at && <> · vence {new Date(info.expires_at).toLocaleTimeString()}</>}</p>
      ) : (
        <form onSubmit={(e) => { e.preventDefault(); run(async () => { const s = await exchangeInvitation(invitation); setInvitation(""); onToken(s.access_token); }); }}>
          <label className="token">Invitacion de evaluador (un solo uso)
            <input type="password" autoComplete="off" value={invitation} onChange={(e) => setInvitation(e.target.value)} placeholder="bvi_..." aria-label="Invitacion de evaluador" />
          </label>
          <button type="submit" disabled={invitation.trim().length < 20}>Canjear invitacion</button>
        </form>
      )}
      {info && (
        <p>
          <button type="button" onClick={() => run(async () => onToken((await refreshSession(token)).access_token))}>Renovar sesion</button>{" "}
          <button type="button" onClick={() => run(async () => { await logout(token); onToken(""); })}>Cerrar sesion</button>
        </p>
      )}
      {message && <p className="notice" role="alert">{message}</p>}
    </div>
  );
}
