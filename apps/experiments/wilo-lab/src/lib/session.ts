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

// Login federado: Facebook -> Firebase Authentication -> ID token -> sesion bvs_ del backend.
// El token de Facebook nunca sale del SDK de Firebase; el backend verifica el ID token.
export async function exchangeFederated(idToken: string): Promise<Session> {
  const r = await fetch(`${apiUrl}/sessions/federated/exchange`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_token: idToken }),
  });
  if (!r.ok) throw await parseLabError(r);
  return r.json();
}

export type QuotaStatus = "available" | "daily_limit" | "trial_exhausted" | "ai_disabled" | "suspended" | "no_cohort";
export interface Quota {
  identity: string;
  plan: string | null;
  status: QuotaStatus;
  reason: string | null;
  features: string[];
  units_limit: number | null;
  units_reserved: number;
  units_available: number | null;
  daily_requests_limit: number | null;
  daily_requests_used: number;
}

export async function myQuota(token: string): Promise<Quota> {
  const r = await fetch(`${apiUrl}/me/quota`, { headers: bearer(token) });
  if (!r.ok) throw await parseLabError(r);
  return r.json();
}

// Textos distintos para cada estado; el saldo es una estimacion por reservas, no un saldo contable.
export const QUOTA_TEXT: Record<QuotaStatus, string> = {
  available: "IA disponible",
  daily_limit: "Limite diario agotado: vuelve manana",
  trial_exhausted: "Cuota de prueba agotada (no se renueva)",
  ai_disabled: "IA temporalmente deshabilitada",
  suspended: "Cuenta suspendida",
  no_cohort: "Sin grupo asignado",
};

export function quotaSummary(q: Quota): string {
  const usd = (u: number) => `~USD ${(u / 1_000_000).toFixed(2)}`;
  const left = q.units_available === null ? "" : ` · disponible ${usd(q.units_available)} (estimado)`;
  const daily = q.daily_requests_limit === null ? "" : ` · hoy ${q.daily_requests_used}/${q.daily_requests_limit}`;
  return `${q.plan ?? "Sin plan"}: ${QUOTA_TEXT[q.status]}${left}${daily}`;
}
