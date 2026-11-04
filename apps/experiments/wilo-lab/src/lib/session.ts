import { apiUrl, bearer, parseLabError } from "./api";

// Sesion temporal del backend (POST /sessions/exchange). La invitacion es de un solo uso;
// el token bvs_ dura 60 min y solo vive en memoria (o sessionStorage si se pide recordar).
export interface Session {
  access_token: string;
  expires_at: string;
  access_expires_at: string;
  identity: string;
  scopes: string[];
}
export interface SessionInfo {
  identity: string;
  auth: "session" | "operator";
  scopes: string[] | null;
  expires_at?: string | null;
}

export async function exchangeInvitation(invitation: string): Promise<Session> {
  const r = await fetch(`${apiUrl}/sessions/exchange`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ invitation: invitation.trim() }),
  });
  if (!r.ok) throw await parseLabError(r);
  return r.json();
}

export async function sessionInfo(token: string): Promise<SessionInfo> {
  const r = await fetch(`${apiUrl}/sessions/me`, { headers: bearer(token) });
  if (!r.ok) throw await parseLabError(r);
  return r.json();
}

export async function refreshSession(token: string): Promise<Session> {
  const r = await fetch(`${apiUrl}/sessions/refresh`, { method: "POST", headers: bearer(token) });
  if (!r.ok) throw await parseLabError(r);
  return r.json();
}

export async function logout(token: string): Promise<void> {
  const r = await fetch(`${apiUrl}/sessions/logout`, { method: "POST", headers: bearer(token) });
  if (!r.ok && r.status !== 401) throw await parseLabError(r);
}
