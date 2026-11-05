import { expect, test, type Page, type Route } from "@playwright/test";

// Session flows against HTTP mocks that mirror the backend's real codes and messages
// (services/api/src/bosque_api/sessions.py). No real tokens and no Meta calls.
const VALID = "bvi_invitacion_sintetica_valida_000000";
const future = (minutes: number) => new Date(Date.now() + minutes * 60_000).toISOString();
const sessionToken = (token: string) => ({
  access_token: token, token_type: "Bearer", expires_in: 3600, expires_at: future(60),
  access_expires_at: future(14 * 24 * 60), session_id: "00000000-0000-4000-8000-000000000001",
  identity: "beta-sintetica", scopes: ["guide", "identify", "transcribe"],
});
const detail = (route: Route, status: number, message: string, headers: Record<string, string> = {}) =>
  route.fulfill({ status, json: { detail: message }, headers });
const bearerOf = (route: Route) => (route.request().headers().authorization ?? "").replace("Bearer ", "");

async function backend(page: Page, opts: { meStatus?: number } = {}) {
  const live = new Set<string>();
  await page.route("**/sessions/exchange", async (route) => {
    const { invitation } = route.request().postDataJSON() as { invitation: string };
    if (invitation !== VALID) return detail(route, 401, "Invitación inválida, expirada, usada o revocada");
    live.add("bvs_uno");
    return route.fulfill({ status: 201, json: sessionToken("bvs_uno") });
  });
  await page.route("**/sessions/me", (route) => {
    if (opts.meStatus === 401 || !live.has(bearerOf(route))) return detail(route, 401, "Sesión inválida, expirada o revocada");
    return route.fulfill({ json: {
      identity: "beta-sintetica", auth: "session", scopes: ["guide", "identify", "transcribe"],
      session_id: "s", expires_at: future(60), access_expires_at: future(9999),
    } });
  });
  await page.route("**/sessions/refresh", (route) => {
    if (!live.delete(bearerOf(route))) return detail(route, 401, "Sesión expirada; canjea una invitación nueva");
    live.add("bvs_dos");
    return route.fulfill({ status: 201, json: sessionToken("bvs_dos") });
  });
  await page.route("**/sessions/logout", (route) => {
    live.delete(bearerOf(route));
    return route.fulfill({ status: 204, body: "" });
  });
  return live;
}

async function redeem(page: Page, invitation = VALID) {
  await page.goto("/");
  await page.getByLabel("Invitacion de evaluador").fill(invitation);
  await page.getByRole("button", { name: "Canjear invitacion" }).click();
}

test("canje, renovacion y cierre de sesion sin guardar el token en localStorage", async ({ page }) => {
  const live = await backend(page);
  await redeem(page);
  await expect(page.getByRole("status").filter({ hasText: "Sesion activa" })).toContainText("beta-sintetica");
  await page.getByRole("button", { name: "Renovar sesion" }).click();
  await expect.poll(() => [...live]).toEqual(["bvs_dos"]);
  await expect(page.getByLabel("Token demo del backend")).toHaveValue("bvs_dos");
  expect(await page.evaluate(() => JSON.stringify(localStorage))).toBe("{}");
  expect(page.url()).not.toContain("bvs_");
  await page.getByRole("button", { name: "Cerrar sesion" }).click();
  await expect(page.getByLabel("Invitacion de evaluador")).toBeVisible();
  await expect(page.getByLabel("Token demo del backend")).toHaveValue("");
  expect(live.size).toBe(0);
});

test("invitacion reutilizada o invalida muestra 401 sin crear sesion", async ({ page }) => {
  await backend(page);
  await redeem(page, "bvi_invitacion_ya_usada_0000000000000");
  await expect(page.getByRole("alert")).toContainText("401: Invitación inválida, expirada, usada o revocada");
  await expect(page.getByRole("button", { name: "Cerrar sesion" })).toHaveCount(0);
});

test("token expirado o revocado vuelve a pedir invitacion", async ({ page }) => {
  await backend(page, { meStatus: 401 });
  await page.goto("/");
  await page.getByLabel("Token demo del backend").fill("bvs_revocado");
  await expect(page.getByRole("alert")).toContainText("expiro o fue revocada");
  await expect(page.getByLabel("Invitacion de evaluador")).toBeVisible();
});

test("canje bloqueado por intentos fallidos respeta 429", async ({ page }) => {
  await page.route("**/sessions/exchange", (r) => detail(r, 429, "Demasiados intentos; espera", { "Retry-After": "900" }));
  await redeem(page, "bvi_intento_numero_once_000000000000");
  await expect(page.getByRole("alert")).toContainText("429: Demasiados intentos; espera");
});

async function askWilo(page: Page) {
  await page.getByRole("button", { name: "Habla con Wilo", exact: true }).click();
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel(/Acepto que el backend envie audio y pregunta a Meta/).check();
  await page.getByLabel("Tu pregunta (texto siempre disponible)").fill("¿Qué senderos tiene Puyehue?");
  await page.getByRole("button", { name: "Preguntar a Wilo" }).click();
}

const wiloCases: [number, string, string][] = [
  [503, "Meta no habilitado/configurado", "Meta no habilitado/configurado"],
  [401, "Sesión inválida, expirada o revocada", "canjea una invitacion de evaluador"],
  [403, "La sesión no tiene permiso para 'guide'", "no tiene permiso"],
  [429, "Límite global o por identidad alcanzado", "Reintenta en 30 s"],
];
for (const [status, message, expected] of wiloCases) {
  test(`Wilo con sesion: ${status} se muestra honestamente`, async ({ page }) => {
    await backend(page);
    await page.route("**/guide/query", (r) => detail(r, status, message, status === 429 ? { "Retry-After": "30", "Access-Control-Expose-Headers": "X-Correlation-ID, Retry-After" } : {}));
    await redeem(page);
    await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
    await askWilo(page);
    await expect(page.getByText(expected).first()).toBeVisible();
    await expect(page.getByLabel("Respuesta de Wilo")).toHaveCount(0);
  });
}

test("identificacion con Meta deshabilitado: 501 explicito, sin candidatos", async ({ page }) => {
  await backend(page);
  await page.route("**/species", (r) => r.fulfill({ json: [
    { id: "nothofagus-dombeyi", scientific_name: "Nothofagus dombeyi", common_name: "Coigüe" },
  ] }));
  await page.route("**/identify", (r) => detail(r, 501, "Meta deshabilitado: requiere habilitación y controles de acceso"));
  await redeem(page);
  await expect(page.getByRole("button", { name: "Cerrar sesion" })).toBeVisible();
  await page.getByRole("button", { name: "Explora una especie", exact: true }).click();
  await page.getByLabel("Seleccionar o capturar fotografia").setInputFiles({
    name: "hoja.png", mimeType: "image/png",
    buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAFElEQVR4nGPUqLBhwAaYsIoOWgkAsRwA7P2qqMgAAAAASUVORK5CYII=", "base64"),
  });
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel(/Tengo derecho a usar esta imagen/).check();
  await page.getByLabel(/envie esta imagen a Meta/).check();
  await page.getByLabel(/Backend en SERVICE_MODE=demo/).check();
  await page.getByRole("button", { name: "Analizar fotografia" }).click();
  await expect(page.getByRole("alert")).toContainText("Meta deshabilitado: requiere habilitación y controles de acceso (501)");
  await expect(page.getByLabel("Resultado del reconocimiento")).toHaveCount(0);
});

test("cuota visible tras el canje y boton de Facebook oculto sin configuracion de Firebase", async ({ page }) => {
  await backend(page);
  await page.route("**/me/quota", (route) => route.fulfill({ json: {
    identity: "beta-sintetica", plan: "Prueba gratuita", status: "trial_exhausted",
    reason: "Cuota acumulada agotada; no se renueva", features: ["guide"], units_limit: 300000,
    units_reserved: 300000, units_available: 0, daily_requests_limit: 8, daily_requests_used: 3,
  } }));
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Entrar con Facebook" })).toHaveCount(0);
  await redeem(page);
  await expect(page.getByLabel("Cuota")).toContainText("Cuota de prueba agotada (no se renueva)");
  await expect(page.getByLabel("Cuota")).toContainText("~USD 0.00 (estimado) · hoy 3/8");
});
