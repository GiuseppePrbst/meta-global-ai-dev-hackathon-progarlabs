/**
 * Bosque Vivo — cliente TypeScript de referencia para José.
 * Sin dependencias ni secretos administrativos; NO modificar el frontend oficial automáticamente.
 *
 * Estado: sesiones de invitación y lecturas ya están en producción.
 * Las funciones federadas y de cuota corresponden a PR #42 y aún NO están desplegadas.
 * Metadatos/shape contrastados contra OpenAPI de PR #42 (2026-11-04).
 */

export const BOSQUE_VIVO_API = "https://api-bosquevivo.progarlabs.com";

export type Scope = "guide" | "transcribe" | "identify" | "raster";
export type QuotaStatus =
  | "available"
  | "daily_limit"
  | "trial_exhausted"
  | "ai_disabled"
  | "suspended"
  | "no_cohort";

export interface SessionToken {
  access_token: string;
  token_type: "Bearer";
  expires_in: number;
  expires_at: string;
  access_expires_at: string;
  session_id: string;
  identity: string;
  scopes: Scope[];
}

export interface SessionInfo {
  identity: string;
  auth: "session" | "operator";
  scopes: Scope[] | null;
  session_id?: string | null;
  expires_at?: string | null;
  access_expires_at?: string | null;
}

export interface UserQuota {
  identity: string;
  plan: string | null;
  status: QuotaStatus;
  reason?: string | null;
  features: Scope[];
  units_limit: number | null;
  units_reserved: number;
  units_available: number | null;
  daily_requests_limit: number | null;
  daily_requests_used: number;
  estimate?: string;
}

export interface UserPermissions {
  identity: string;
  role: "public_trial" | "team_developer" | "internal_qa" | "administrator" | null;
  scopes: Scope[] | null;
  administrator: boolean;
  ai_enabled: boolean;
}

export interface GuideAnswer {
  answer: string;
  provider: "mock" | "meta";
  execution_status: "mock" | "completed";
  insufficient_evidence: boolean;
  sources: Record<string, unknown>[];
  claims: Record<string, unknown>[];
  entities: Record<string, unknown>[];
  limitations: string[];
  correlation_id?: string | null;
  speech_text?: string | null;
}

export interface Transcription {
  transcript: string;
  provider: "mock" | "meta";
  execution_status: "mock" | "completed";
  audio_duration_ms: number;
  latency_ms: number;
  model?: string | null;
  limitations?: string[];
}

export interface Identification {
  status: "candidates" | "insufficient_evidence";
  provider: "mock" | "meta";
  message: string;
  acceptance?: "accepted" | "not_accepted" | "not_applicable";
  catalog_assessment?:
    | "supported_candidate"
    | "insufficient_evidence"
    | "out_of_catalog_suspected"
    | "non_diagnostic_photo"
    | "not_assessed";
  accepted_species_id?: string | null;
  candidates?: Record<string, unknown>[];
  limitations?: string[];
  evidence_status?: string;
  recommended_next_photo?: string | null;
  correlation_id?: string | null;
}

/** Los errores no deben contener Authorization ni los cuerpos de audio/foto. */
export class BosqueApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly correlationId: string | null,
    public readonly retryAfterSeconds: number | null,
  ) {
    super(message);
    this.name = "BosqueApiError";
  }
}

export function microUsdToApproxUsd(value: number | null): string {
  return value === null ? "No disponible" : `~USD ${(value / 1_000_000).toFixed(2)}`;
}

/**
 * Mantén el token en memoria para web. En Expo native, inyecta lectura/escritura
 * mediante expo-secure-store (no localStorage ni AsyncStorage).
 */
export class BosqueVivoClient {
  private token: string | null = null;
  private refreshInFlight: Promise<SessionToken> | null = null;

  constructor(private readonly baseUrl: string = BOSQUE_VIVO_API) {}

  setSessionToken(token: string | null): void {
    this.token = token;
  }

  get hasSession(): boolean {
    return !!this.token;
  }

  private async request<T>(path: string, init: RequestInit = {}, authenticated = false): Promise<T> {
    const headers = new Headers(init.headers);
    if (authenticated) {
      if (!this.token) throw new BosqueApiError(401, "Falta iniciar sesión", null, null);
      headers.set("Authorization", `Bearer ${this.token}`);
    }
    // FormData genera su propio boundary; no establecer Content-Type para multipart.
    if (init.body && !(init.body instanceof FormData) && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
    const response = await fetch(`${this.baseUrl}${path}`, {
      ...init,
      headers,
      cache: "no-store",
    });
    if (!response.ok) {
      const correlationId = response.headers.get("X-Correlation-ID");
      const retryRaw = response.headers.get("Retry-After");
      const retryAfterSeconds = retryRaw !== null && /^\d+$/.test(retryRaw) ? Number(retryRaw) : null;
      let detail = `Error HTTP ${response.status}`;
      try {
        const payload: unknown = await response.json();
        if (payload && typeof payload === "object" && "detail" in payload) {
          const value = (payload as { detail: unknown }).detail;
          if (typeof value === "string") detail = value;
        }
      } catch { /* permitir errores sin JSON */ }
      throw new BosqueApiError(response.status, detail, correlationId, retryAfterSeconds);
    }
    if (response.status === 204) return undefined as T;
    return response.json() as Promise<T>;
  }

  /** En producción: invitaciones de beta cerrada. */
  async exchangeInvitation(invitation: string): Promise<SessionToken> {
    const session = await this.request<SessionToken>("/sessions/exchange", {
      method: "POST",
      body: JSON.stringify({ invitation: invitation.trim() }),
    });
    this.token = session.access_token;
    return session;
  }

  /** PR #42: solo después de configurar Firebase/Meta y desplegar migración 008. */
  async exchangeFirebaseIdToken(idToken: string): Promise<SessionToken> {
    const session = await this.request<SessionToken>("/sessions/federated/exchange", {
      method: "POST",
      body: JSON.stringify({ id_token: idToken }),
    });
    this.token = session.access_token;
    return session;
  }

  getSession(): Promise<SessionInfo> {
    return this.request<SessionInfo>("/sessions/me", {}, true);
  }

  /** Serializa renovaciones concurrentes: el token anterior se revoca al renovar. */
  async refreshSession(): Promise<SessionToken> {
    if (!this.refreshInFlight) {
      this.refreshInFlight = this.request<SessionToken>("/sessions/refresh", { method: "POST" }, true)
        .then((session) => {
          this.token = session.access_token;
          return session;
        })
        .finally(() => { this.refreshInFlight = null; });
    }
    return this.refreshInFlight;
  }

  async logout(): Promise<void> {
    try {
      await this.request<void>("/sessions/logout", { method: "POST" }, true);
    } finally {
      this.token = null;
    }
  }

  /** PR #42, todavía no habilitado en producción. */
  getQuota(): Promise<UserQuota> {
    return this.request<UserQuota>("/me/quota", {}, true);
  }

  /** PR #42, todavía no habilitado en producción. */
  getPermissions(): Promise<UserPermissions> {
    return this.request<UserPermissions>("/me/permissions", {}, true);
  }

  getParks(region = "los-lagos"): Promise<unknown> {
    return this.request<unknown>(`/parks?region=${encodeURIComponent(region)}`);
  }

  getSpecies(): Promise<unknown> {
    return this.request<unknown>("/species");
  }

  getAtlasStatus(): Promise<unknown> {
    return this.request<unknown>("/knowledge/status");
  }

  /** Requiere scope guide y Meta habilitado. No reintentar automáticamente. */
  askWilo(question: string, signal?: AbortSignal): Promise<GuideAnswer> {
    return this.request<GuideAnswer>("/guide/query", {
      method: "POST",
      body: JSON.stringify({
        question,
        adult_confirmed: true,
        external_processing_confirmed: true,
        capture_id: null,
      }),
      signal,
    }, true);
  }

  /** WAV PCM16 mono a 16/24 kHz, máximo 60 s y 3 MiB. */
  transcribeWav(file: Blob, signal?: AbortSignal): Promise<Transcription> {
    const form = new FormData();
    form.append("file", file, "pregunta.wav");
    form.append("adult_confirmed", "true");
    form.append("rights_confirmed", "true");
    form.append("external_processing_confirmed", "true");
    form.append("language_hint", "auto");
    return this.request<Transcription>("/guide/transcribe", { method: "POST", body: form, signal }, true);
  }

  /** Archivo JPEG/PNG/WebP <=10 MiB. Candidatos no equivalen a identificación confirmada. */
  identifyPhoto(file: Blob, filename = "especie.jpg", signal?: AbortSignal): Promise<Identification> {
    const form = new FormData();
    form.append("file", file, filename);
    form.append("adult_confirmed", "true");
    form.append("rights_confirmed", "true");
    return this.request<Identification>("/identify", { method: "POST", body: form, signal }, true);
  }

  /** Los navegadores no permiten cabeceras arbitrarias al abrir un WebSocket. */
  createVoiceWebSocket(): WebSocket {
    if (!this.token) throw new BosqueApiError(401, "Falta iniciar sesión", null, null);
    const socketUrl = this.baseUrl.replace(/^http/, "ws") + "/guide/voice/stream";
    const token = this.token;
    const socket = new WebSocket(socketUrl);
    socket.addEventListener("open", () => {
      socket.send(JSON.stringify({
        type: "start",
        token,
        adult_confirmed: true,
        rights_confirmed: true,
        external_processing_confirmed: true,
        audio_encoding: "PCM_16KHZ",
        language_hint: "auto",
        answer: true,
      }));
    });
    // Esperar evento ready antes de emitir frames PCM16.
    return socket;
  }
}
