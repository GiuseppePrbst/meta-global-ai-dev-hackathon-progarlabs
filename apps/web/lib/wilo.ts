import { apiUrl } from "./api";

// Contratos reales de docs/api/openapi.json y docs/WILO_VOICE_API_HANDOFF.md.
// El frontend nunca recibe MODEL_API_KEY: solo envia el token demo de /guide/*.
export type LanguageHint = "auto" | "es" | "en" | "mixed";

export type WiloSource = {
  id?: string;
  title?: string | null;
  url?: string | null;
  type?: string | null;
  scope?: string | null;
  confidence?: string | null;
};

export type WiloEntity = { type: string; id: string };

export type WiloMapRef = {
  park_id?: string;
  geometry_available?: boolean;
  bbox?: number[] | null;
  map_resource_url?: string | null;
};

export type GuideAnswer = {
  answer: string;
  provider: "mock" | "meta";
  model?: string | null;
  execution_status?: string;
  insufficient_evidence: boolean;
  sources: WiloSource[];
  claims: { text: string; source_ids?: string[] }[];
  speech_text?: string | null;
  entities: WiloEntity[];
  map?: WiloMapRef | null;
  knowledge_version?: string | null;
  tools_used: string[];
  limitations: string[];
  latency_ms?: number | Record<string, number | null>;
  correlation_id?: string | null;
};

export type Transcription = {
  transcript: string;
  provider: "mock" | "meta";
  model?: string | null;
  execution_status?: string;
  audio_duration_ms: number;
  latency_ms: number;
  limitations: string[];
  correlation_id?: string | null;
};

export type Trail = {
  id: string;
  park_id: string;
  name: string;
  sector: string | null;
  distance_m: number | null;
  difficulty: string | null;
  source_status: "official_reviewed" | "official_named_only" | "secondary_reference";
  opening_status: "not_verified" | "published_closure";
  published_closure: string | null;
  geometry_available: false;
  geometry: null;
  limitations: string[];
};

export type ParkMap = {
  park_id: string;
  bbox: number[] | null;
  boundary_geometry: null;
  boundary_unavailable_reason: string;
  trails: Trail[];
  map_resources: { id: string; kind: string; url: string | null }[];
  limitations: string[];
  knowledge_version: string;
};

export class WiloError extends Error {
  status: number;
  code?: string;
  retryAfter?: number;
  constructor(status: number, message: string, code?: string, retryAfter?: number) {
    super(message);
    this.status = status;
    this.code = code;
    this.retryAfter = retryAfter;
  }
}

async function parseError(response: Response): Promise<WiloError> {
  const retryAfter = Number(response.headers.get("Retry-After") || "") || undefined;
  const body = (await response.json().catch(() => null)) as
    | { detail?: string | { code?: string; message?: string } }
    | null;
  const detail = body?.detail;
  if (typeof detail === "string") return new WiloError(response.status, detail, undefined, retryAfter);
  if (detail && typeof detail === "object") {
    return new WiloError(response.status, detail.message || `El servicio respondio ${response.status}.`, detail.code, retryAfter);
  }
  return new WiloError(response.status, `El servicio respondio ${response.status}. Intenta nuevamente.`, undefined, retryAfter);
}

function authHeaders(token: string): Record<string, string> {
  return token.trim() ? { Authorization: `Bearer ${token.trim()}` } : {};
}

export async function transcribeWav(
  wav: Blob,
  opts: { token: string; languageHint: LanguageHint; signal?: AbortSignal },
): Promise<Transcription> {
  const form = new FormData();
  form.append("file", wav, "wilo-pregunta.wav");
  form.append("adult_confirmed", "true");
  form.append("rights_confirmed", "true");
  form.append("external_processing_confirmed", "true");
  form.append("language_hint", opts.languageHint);
  const response = await fetch(`${apiUrl}/guide/transcribe`, {
    method: "POST",
    headers: authHeaders(opts.token),
    body: form,
    signal: opts.signal ?? AbortSignal.timeout(30000),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as Transcription;
}

export async function queryGuide(
  question: string,
  opts: { token: string; signal?: AbortSignal },
): Promise<GuideAnswer> {
  const response = await fetch(`${apiUrl}/guide/query`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...authHeaders(opts.token) },
    body: JSON.stringify({
      question: question.trim(),
      adult_confirmed: true,
      external_processing_confirmed: true,
    }),
    // Spark tardo 20-37 s el 03-11; el backend corta en META_TIMEOUT_SECONDS=90.
    signal: opts.signal ?? AbortSignal.timeout(95000),
  });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as GuideAnswer;
}

async function publicGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`${apiUrl}${path}`, { signal: signal ?? AbortSignal.timeout(15000) });
  if (!response.ok) throw await parseError(response);
  return (await response.json()) as T;
}

export const fetchParks = (q: string, signal?: AbortSignal) =>
  publicGet<{ items: { id: string; name: string; trail_count: number; has_bbox: boolean }[]; total: number }>(
    q.trim() ? `/parks?q=${encodeURIComponent(q.trim())}&limit=12` : "/parks?limit=12",
    signal,
  );
export const fetchPark = (id: string, signal?: AbortSignal) =>
  publicGet<{ id: string; name: string; area_ha: number | null; sectors: string[]; official_url: string; live_status: string; limitations: string[] }>(`/parks/${id}`, signal);
export const fetchParkTrails = (id: string, signal?: AbortSignal) =>
  publicGet<Trail[]>(`/parks/${id}/trails?include_secondary=true`, signal);
export const fetchParkMap = (id: string, signal?: AbortSignal) => publicGet<ParkMap>(`/parks/${id}/map`, signal);
export const fetchTaxaDemo = (signal?: AbortSignal) =>
  publicGet<{ items: { id: string; common_names: string[]; scientific_name: string; demo_status: string; collectible: boolean }[] }>("/taxa?demo_only=true&limit=20", signal);
export const fetchKnowledgeStatus = (signal?: AbortSignal) =>
  publicGet<{ knowledge_version: string; counts: Record<string, number>; stale: boolean }>("/knowledge/status", signal);

// --- WAV PCM16 mono 16 kHz: unico formato que acepta /guide/transcribe ---
export function isValidBbox(bbox: unknown): bbox is [number, number, number, number] {
  return (
    Array.isArray(bbox) &&
    bbox.length === 4 &&
    bbox.every((n) => typeof n === "number" && Number.isFinite(n)) &&
    bbox[0] < bbox[2] &&
    bbox[1] < bbox[3] &&
    bbox[0] >= -180 && bbox[2] <= 180 && bbox[1] >= -90 && bbox[3] <= 90
  );
}

export function resampleTo16k(input: Float32Array, inputRate: number): Float32Array {
  if (inputRate === 16000) return input;
  const ratio = inputRate / 16000;
  const out = new Float32Array(Math.max(1, Math.floor(input.length / ratio)));
  for (let i = 0; i < out.length; i++) {
    const pos = i * ratio;
    const lo = Math.floor(pos);
    const hi = Math.min(input.length - 1, lo + 1);
    out[i] = input[lo] + (input[hi] - input[lo]) * (pos - lo);
  }
  return out;
}

export function encodeWavPcm16(samples: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeText = (offset: number, text: string) => {
    for (let i = 0; i < text.length; i++) view.setUint8(offset + i, text.charCodeAt(i));
  };
  writeText(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeText(8, "WAVEfmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeText(36, "data");
  view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    const clamped = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(44 + i * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Blob([buffer], { type: "audio/wav" });
}

export function openingLabel(trail: Trail): string {
  if (trail.opening_status === "published_closure") {
    return trail.published_closure ? `Cierre publicado: ${trail.published_closure}` : "Cierre publicado en la ficha CONAF";
  }
  return "Apertura no verificada: consulta el aviso CONAF vigente";
}

export function sourceLabel(status: Trail["source_status"]): string {
  if (status === "official_reviewed") return "CONAF revisado";
  if (status === "official_named_only") return "CONAF: solo nombrado";
  return "Referencia no oficial";
}
