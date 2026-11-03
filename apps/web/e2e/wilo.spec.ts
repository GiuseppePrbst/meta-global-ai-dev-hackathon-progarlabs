import { expect, test } from "@playwright/test";

const parks = {
  items: [{ id: "puyehue", name: "Parque Nacional Puyehue", regions: ["los-lagos"], area_ha: 112755, trail_count: 3, trail_section_status: "not_listed", has_bbox: true }],
  total: 1, limit: 12, offset: 0, knowledge_version: "sha256:test",
};
const park = {
  id: "puyehue", name: "Parque Nacional Puyehue", regions: ["los-lagos"], provinces: "Osorno", communes: "Puyehue",
  area_ha: 112755, area_source_text: "112.755", sectors: ["Anticura"], visit_notice: null, access_text: null,
  trail_count: 3, trail_section_status: "not_listed", official_url: "https://www.conaf.cl/parque_nacionales/parque-nacional-puyehue/",
  linked_taxa: [], conflicts: [], live_status: "not_verified", sources: [], limitations: [], knowledge_version: "sha256:test",
};
const trails = [{
  id: "puyehue-el-indio", park_id: "puyehue", name: "El Indio", sector: null, kind: null, distance_m: null,
  difficulty: null, source_status: "official_named_only", opening_status: "not_verified", published_closure: null,
  geometry_available: false, geometry: null, sources: [], limitations: [],
}];
const parkMap = {
  park_id: "puyehue", boundary_geometry: null, boundary_source: null, boundary_unavailable_reason: "Sin limite redistribuible",
  crs: "EPSG:4326", bbox: [-72.3, -40.95, -71.85, -40.42], bbox_source: null, trails,
  map_resources: [], geometry_status: "bbox_only", source_status: "official_profile_and_reference_bbox",
  limitations: [], knowledge_version: "sha256:test",
};

async function mockApi(page: import("@playwright/test").Page, guideStatus = 200) {
  await page.route("**/knowledge/status", (r) => r.fulfill({ json: { knowledge_version: "sha256:test", counts: { Park: 46, Trail: 199, Taxon: 20 }, stale: false } }));
  await page.route("**/parks?limit=12", (r) => r.fulfill({ json: parks }));
  await page.route("**/parks/puyehue", (r) => r.fulfill({ json: park }));
  await page.route(/\/parks\/puyehue\/trails.*/, (r) => r.fulfill({ json: trails }));
  await page.route("**/parks/puyehue/map", (r) => r.fulfill({ json: parkMap }));
  await page.route("**/taxa?demo_only=true&limit=20", (r) => r.fulfill({ json: { items: [{ id: "nothofagus-dombeyi", common_names: ["Coigüe"], scientific_name: "Nothofagus dombeyi", demo_status: "demo_ready", collectible: true }] } }));
  await page.route("https://tile.openstreetmap.org/**", (r) => r.abort());
  if (guideStatus === 200) {
    await page.route("**/guide/query", (r) => r.fulfill({ json: {
      answer: "Modo mock: no se consultó Muse ni se generó respuesta botánica.", provider: "mock", model: null,
      insufficient_evidence: true, sources: [], claims: [], entities: [{ type: "park", id: "puyehue" }],
      map: { park_id: "puyehue", geometry_available: false }, knowledge_version: "sha256:test", tools_used: [], limitations: [],
    } }));
  } else {
    await page.route("**/guide/query", (r) => r.fulfill({ status: guideStatus, json: { detail: "Identidad de demostración requerida" } }));
  }
}

test("Wilo: recorridos A-D escriben la pregunta y el mock se identifica", async ({ page }) => {
  await mockApi(page);
  await page.goto("/wilo");
  await expect(page.getByRole("heading", { name: "Preguntale al bosque, con fuentes." })).toBeVisible();
  await page.getByRole("button", { name: "A · Puyehue" }).click();
  await expect(page.getByLabel("Tu pregunta (texto siempre disponible)")).toHaveValue(/Puyehue/);
  await page.getByRole("button", { name: "D · English" }).click();
  await expect(page.getByLabel("Tu pregunta (texto siempre disponible)")).toHaveValue(/answer in English/);
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel("Acepto que el backend envie mi audio y mi pregunta a Meta", { exact: false }).check();
  await page.getByRole("button", { name: "Preguntar a Wilo" }).click();
  await expect(page.getByText("Modo mock: sin inferencia real")).toBeVisible();
  await expect(page.getByLabel("Respuesta de Wilo")).toContainText("no se consultó Muse");
});

test("Wilo + Atlas: la ficha encuadra el bbox y nunca abre el sendero", async ({ page }) => {
  await mockApi(page);
  await page.goto("/wilo");
  await page.getByRole("button", { name: /Parque Nacional Puyehue · 3 senderos/ }).click();
  await expect(page.getByText("112.755 ha (CONAF)")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Senderos documentados" })).toBeVisible();
  await expect(page.getByText("Apertura no verificada: consulta el aviso CONAF vigente")).toBeVisible();
  await expect(page.getByText("Sin trazados GPS: ningun sendero se dibuja ni se ofrece navegacion. not_verified nunca significa abierto.")).toBeVisible();
});

test("Wilo sin token muestra el estado sin-acceso (401)", async ({ page }) => {
  await mockApi(page, 401);
  await page.goto("/wilo");
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel("Acepto que el backend envie mi audio y mi pregunta a Meta", { exact: false }).check();
  await page.getByLabel("Tu pregunta (texto siempre disponible)").fill("¿Qué senderos hay en Puyehue?");
  await page.getByRole("button", { name: "Preguntar a Wilo" }).click();
  await expect(page.getByText("Pide acceso a la demo")).toBeVisible();
});
