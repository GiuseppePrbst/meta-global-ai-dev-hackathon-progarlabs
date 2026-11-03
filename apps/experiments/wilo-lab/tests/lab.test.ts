import { afterEach, describe, expect, it, vi } from "vitest";
import { encodeWavPcm16, isValidBbox, openingLabel, queryGuide, resampleTo16k, sourceLabel, type Trail } from "../src/lib/wilo";
import { assessmentLabel, identifyPhoto, validatePhoto } from "../src/lib/identify";

afterEach(() => vi.unstubAllGlobals());
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } });

describe("Wilo WAV y mapas", () => {
  it("codifica WAV PCM16 mono 16 kHz y remuestrea", async () => {
    const blob = encodeWavPcm16(new Float32Array([0, 0.5, -0.5]));
    const v = new DataView(await blob.arrayBuffer());
    expect(blob.type).toBe("audio/wav");
    expect(v.getUint16(22, true)).toBe(1);
    expect(v.getUint32(24, true)).toBe(16000);
    expect(resampleTo16k(new Float32Array(48000), 48000).length).toBe(16000);
  });
  it("bbox estricto y sendero nunca abierto", () => {
    expect(isValidBbox([-72.5, -41.2, -71.8, -40.4])).toBe(true);
    expect(isValidBbox(null)).toBe(false);
    const t = { opening_status: "not_verified", published_closure: null } as Trail;
    expect(openingLabel(t)).toContain("no verificada");
    expect(sourceLabel("secondary_reference")).toContain("no oficial");
  });
  it("query usa Bearer demo, jamas la clave Meta", async () => {
    const f = vi.fn(async () => json({ answer: "mock", provider: "mock", insufficient_evidence: true, sources: [], claims: [], entities: [], map: null, tools_used: [], limitations: [] }));
    vi.stubGlobal("fetch", f);
    await queryGuide("hola", { token: "demo" });
    const [, init] = f.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer demo");
    expect(String(init.body)).not.toContain("MODEL_API_KEY");
  });
});

describe("Identificacion sin puntajes inventados", () => {
  it("valida formato y tamano como el backend (10 MiB)", () => {
    expect(validatePhoto({ type: "image/jpeg", size: 10 * 1024 * 1024 })).toBeNull();
    expect(validatePhoto({ type: "image/gif", size: 10 })).toContain("JPEG");
    expect(validatePhoto({ type: "image/png", size: 0 })).toContain("contenido");
  });
  it("el mock se presenta como mock, sin candidatos", async () => {
    const fetchMock = vi.fn(async () => json({
      status: "insufficient_evidence", provider: "mock", model: null, candidates: [],
      message: "Modo demostración: imagen recibida sin inferencia.", limitations: [],
      catalog_assessment: "not_assessed", acceptance: "not_applicable", accepted_species_id: null,
      exploratory_candidates: [], similar_out_of_catalog: [], observed_traits: [], missing_traits: [],
      recommended_next_photo: null, sources: [], strategy: null,
    }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await identifyPhoto(new File([new Uint8Array([1])], "hoja.png", { type: "image/png" }));
    const [, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string> | undefined)?.Authorization).toBeUndefined();
    expect(r.provider).toBe("mock");
    expect(r.candidates).toEqual([]);
    expect(assessmentLabel("out_of_catalog_suspected")).toContain("fuera del catalogo");
  });
});
