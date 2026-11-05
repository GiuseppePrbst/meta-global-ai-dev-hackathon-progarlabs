import { expect, test } from "@playwright/test";

test("recuerda el token solo durante la sesion", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Token demo del backend").fill("token-de-prueba");
  await page.getByLabel("Recordar solo en esta sesion").check();
  await page.reload();
  await expect(page.getByLabel("Token demo del backend")).toHaveValue("token-de-prueba");
  await expect(page.getByLabel("Recordar solo en esta sesion")).toBeChecked();
  await page.getByLabel("Recordar solo en esta sesion").uncheck();
  await page.reload();
  await expect(page.getByLabel("Token demo del backend")).toHaveValue("");
});

test("libera el microfono al salir de Wilo durante la grabacion", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const stream = new AudioContext().createMediaStreamDestination().stream;
      Object.assign(window, { testStream: stream });
      return stream;
    };
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Habla con Wilo", exact: true }).click();
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel("Tengo derecho a usar mi voz.").check();
  await page.getByLabel(/Acepto que el backend envie audio/).check();
  await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
  await expect(page.getByRole("button", { name: /Detener y transcribir/ })).toBeVisible();
  await page.getByRole("button", { name: "Inicio", exact: true }).click();
  expect(await page.evaluate(() => (window as unknown as { testStream: MediaStream }).testStream.getTracks()[0].readyState)).toBe("ended");
});

const mockAnswer = {
  answer: "Modo mock: no se consultó Muse ni se generó respuesta botánica.", provider: "mock", model: null,
  insufficient_evidence: true, sources: [], claims: [], entities: [{ type: "park", id: "puyehue" }],
  map: { park_id: "puyehue", geometry_available: false }, knowledge_version: "sha256:test", tools_used: [], limitations: [],
};

async function stubAtlas(page: import("@playwright/test").Page) {
  await page.route("**/knowledge/status", (r) => r.fulfill({ json: { knowledge_version: "sha256:test", counts: { Park: 46, Trail: 199, Taxon: 20 }, stale: false } }));
  await page.route("**/parks?limit=12", (r) => r.fulfill({ json: { items: [{ id: "puyehue", name: "Parque Nacional Puyehue", trail_count: 3, has_bbox: true }], total: 1 } }));
  await page.route("**/parks/puyehue", (r) => r.fulfill({ json: { id: "puyehue", name: "Parque Nacional Puyehue", area_ha: 112755, official_url: "https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/", live_status: "not_verified" } }));
  await page.route(/\/parks\/puyehue\/trails.*/, (r) => r.fulfill({ json: [{ id: "puyehue-el-indio", park_id: "puyehue", name: "El Indio", sector: null, distance_m: null, difficulty: null, source_status: "official_named_only", opening_status: "not_verified", published_closure: null, geometry_available: false, geometry: null, limitations: [] }] }));
  await page.route("**/parks/puyehue/map", (r) => r.fulfill({ json: { park_id: "puyehue", bbox: [-72.3, -40.95, -71.85, -40.42], boundary_geometry: null, boundary_unavailable_reason: "sin limite", trails: [], map_resources: [], limitations: [], knowledge_version: "sha256:test" } }));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
}

test("inicio diferencia los dos modulos y Wilo responde en mock con historial", async ({ page }) => {
  await stubAtlas(page);
  await page.route("**/guide/query", (r) => r.fulfill({ json: mockAnswer }));
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "knows what it cannot verify" })).toBeVisible();
  await expect(page.getByRole("button", { name: /MODULO A Habla con Wilo/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /MODULO B Explora una especie/ })).toBeVisible();
  await page.getByRole("button", { name: "Habla con Wilo", exact: true }).click();
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel(/Acepto que el backend envie audio y pregunta a Meta/).check();
  await page.getByRole("button", { name: "A · Puyehue" }).click();
  await page.getByRole("button", { name: "Preguntar a Wilo" }).click();
  await expect(page.getByLabel("Respuesta de Wilo")).toBeVisible();
  await expect(page.getByLabel("Historial de la conversacion")).toContainText("Modo mock: sin inferencia real");
  await page.getByRole("button", { name: /Parque Nacional Puyehue · 3 senderos/ }).click();
  await expect(page.getByRole("heading", { name: "Senderos documentados" })).toBeVisible();
  await expect(page.getByText("Apertura no verificada: consulta el aviso CONAF vigente")).toBeVisible();
});

test("especies: el mock se abstiene y nunca inventa candidatos ni puntajes", async ({ page }) => {
  await page.route("**/species", (r) => r.fulfill({ json: [
    { id: "nothofagus-dombeyi", scientific_name: "Nothofagus dombeyi", common_name: "Coigüe" },
    { id: "eucryphia-cordifolia", scientific_name: "Eucryphia cordifolia", common_name: "Ulmo" },
  ] }));
  await page.route("**/identify", (r) => r.fulfill({ json: {
    status: "insufficient_evidence", provider: "mock", model: null, candidates: [],
    message: "Modo demostración: imagen recibida sin inferencia. No hay evidencia de IA para proponer una especie.",
    limitations: [], catalog_assessment: "not_assessed", acceptance: "not_applicable", accepted_species_id: null,
    exploratory_candidates: [], similar_out_of_catalog: [], observed_traits: [], missing_traits: [],
    recommended_next_photo: null, sources: [], strategy: "verify",
  } }));
  await page.goto("/");
  await page.getByRole("button", { name: "Explora una especie", exact: true }).click();
  const analyze = page.getByRole("button", { name: "Analizar fotografia" });
  await expect(analyze).toBeDisabled();
  await page.getByLabel("Seleccionar o capturar fotografia").setInputFiles({
    name: "hoja.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGPUqLBhwAaYsIoOWgkAsRwA7P2qqMgAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel(/Tengo derecho a usar esta imagen/).check();
  await page.getByLabel(/envie esta imagen a Meta/).check();
  await analyze.click();
  await expect(page.getByLabel("Resultado del reconocimiento")).toContainText("sin inferencia");
  await expect(page.getByLabel("Resultado del reconocimiento")).toContainText("Modo mock: sin inferencia real");
  await expect(page.getByLabel("Resultado del reconocimiento")).not.toContainText("%");
  await page.getByRole("button", { name: "Probar con otra imagen" }).click();
  await expect(page.getByLabel("Resultado del reconocimiento")).toHaveCount(0);
});
