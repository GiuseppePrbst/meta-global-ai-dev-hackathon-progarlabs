import { afterEach, describe, expect, it, vi } from "vitest";
import {
  encodeWavPcm16,
  isValidBbox,
  openingLabel,
  queryGuide,
  resampleTo16k,
  sourceLabel,
  transcribeWav,
  WiloError,
  type Trail,
} from "../lib/wilo";

afterEach(() => vi.unstubAllGlobals());

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });
}

describe("WAV PCM16 mono 16 kHz (contrato /guide/transcribe)", () => {
  it("codifica cabecera RIFF/WAVE mono 16 bits a 16 kHz", async () => {
    const blob = encodeWavPcm16(new Float32Array([0, 0.5, -0.5, 1]));
    expect(blob.type).toBe("audio/wav");
    expect(blob.size).toBe(44 + 8);
    const bytes = new DataView(await blob.arrayBuffer());
    const text = (o: number, n: number) => String.fromCharCode(...Array.from({ length: n }, (_, i) => bytes.getUint8(o + i)));
    expect(text(0, 4)).toBe("RIFF");
    expect(text(8, 4)).toBe("WAVE");
    expect(bytes.getUint16(22, true)).toBe(1);
    expect(bytes.getUint32(24, true)).toBe(16000);
    expect(bytes.getUint16(34, true)).toBe(16);
  });
  it("remuestrea 48 kHz a 16 kHz sin cambiar la duracion", () => {
    const out = resampleTo16k(new Float32Array(48000).fill(0.25), 48000);
    expect(out.length).toBe(16000);
    expect(out[0]).toBeCloseTo(0.25);
  });
});

describe("mapas y senderos sin inventar geometria ni apertura", () => {
  it("solo acepta bbox [oeste,sur,este,norte] validos en WGS84", () => {
    expect(isValidBbox([-72.5, -41.2, -71.8, -40.4])).toBe(true);
    expect(isValidBbox(null)).toBe(false);
    expect(isValidBbox([-71.8, -40.4, -72.5, -41.2])).toBe(false);
    expect(isValidBbox([0, 0, 1])).toBe(false);
  });
  it("nunca presenta not_verified como abierto", () => {
    const trail = { opening_status: "not_verified", published_closure: null } as Trail;
    expect(openingLabel(trail)).toContain("no verificada");
    expect(openingLabel(trail)).not.toMatch(/^Abierto/);
    expect(sourceLabel("secondary_reference")).toContain("no oficial");
  });
});

describe("consumo de /guide/* sin clave Meta en el frontend", () => {
  it("query envia Bearer demo y JSON, y distingue el mock", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      answer: "Modo mock: no se consulto Muse ni se genero respuesta botanica.",
      provider: "mock", insufficient_evidence: true, sources: [], claims: [],
      entities: [], map: null, tools_used: [], limitations: [],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const answer = await queryGuide("¿Que senderos tiene Puyehue?", { token: "demo-local" });
    expect(answer.provider).toBe("mock");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer demo-local");
    expect(String(init.body)).not.toContain("MODEL_API_KEY");
    expect(JSON.parse(String(init.body)).question).toContain("Puyehue");
  });
  it("transcribe envia WAV con permisos e idioma, nunca WebM/M4A", async () => {
    const fetchMock = vi.fn(async () => jsonResponse({
      transcript: "¿Que trees hay en Queulat?", provider: "meta", model: "muse-voice-transcribe-1.0",
      audio_duration_ms: 1200, latency_ms: 2000, limitations: [],
    }));
    vi.stubGlobal("fetch", fetchMock);
    const result = await transcribeWav(encodeWavPcm16(new Float32Array(1600)), { token: "t", languageHint: "auto" });
    expect(result.transcript).toContain("trees");
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    const form = init.body as FormData;
    expect((form.get("file") as File).type).toBe("audio/wav");
    expect(form.get("language_hint")).toBe("auto");
    expect(form.get("rights_confirmed")).toBe("true");
  });
  it("mapea 401 y 429 con Retry-After sin reintento automatico", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ detail: { code: "llm_error_rate_limited", message: "Limite" } }, 429, { "Retry-After": "7" })));
    await expect(queryGuide("hola", { token: "t" })).rejects.toMatchObject({ status: 429, retryAfter: 7 });
    vi.stubGlobal("fetch", vi.fn(async () => jsonResponse({ detail: "sin token" }, 401)));
    const err = await queryGuide("hola", { token: "" }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(WiloError);
    expect((err as WiloError).status).toBe(401);
  });
});
