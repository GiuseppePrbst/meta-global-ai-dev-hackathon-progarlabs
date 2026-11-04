import { expect, test, type Page } from "@playwright/test";

// Fake microphone: a 440 Hz tone through a real Web Audio graph, so the lab's
// ScriptProcessor → resample → WAV path runs exactly as with a physical mic.
async function fakeMicrophone(page: Page) {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const ctx = new AudioContext();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 440; gain.gain.value = 0.3;
      const dest = ctx.createMediaStreamDestination();
      osc.connect(gain).connect(dest); osc.start();
      return dest.stream;
    };
  });
}

async function openWilo(page: Page, token = "") {
  await page.goto("/");
  if (token) await page.getByLabel("Token demo del backend").fill(token);
  await page.getByRole("button", { name: "Habla con Wilo", exact: true }).click();
  await page.getByLabel("Soy mayor de 18 anos.").check();
  await page.getByLabel("Tengo derecho a usar mi voz.").check();
  await page.getByLabel(/Acepto que el backend envie audio/).check();
}

function parseWav(bytes: Buffer) {
  const at = bytes.indexOf("RIFF");
  // The multipart body continues after the file (closing boundary): cut at RIFF size + 8.
  const wav = bytes.subarray(at, at + 8 + bytes.readUInt32LE(at + 4));
  const v = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const tag = (o: number) => wav.subarray(o, o + 4).toString("ascii");
  const dataBytes = v.getUint32(40, true);
  let sumSquares = 0;
  for (let i = 0; i < dataBytes / 2; i++) sumSquares += (v.getInt16(44 + i * 2, true) / 32768) ** 2;
  return {
    riff: tag(0), wave: tag(8), fmt: tag(12), data: tag(36),
    riffSize: v.getUint32(4, true), format: v.getUint16(20, true), channels: v.getUint16(22, true),
    rate: v.getUint32(24, true), byteRate: v.getUint32(28, true), bits: v.getUint16(34, true),
    dataBytes, seconds: dataBytes / 2 / 16000, rms: Math.sqrt(sumSquares / (dataBytes / 2)),
    wav,
  };
}

test("el WAV enviado es RIFF PCM16 mono 16 kHz, no vacio y de duracion real", async ({ page }, info) => {
  await fakeMicrophone(page);
  let captured: Buffer | null = null;
  await page.route("**/guide/transcribe", async (route) => {
    captured = route.request().postDataBuffer();
    await route.fulfill({ json: { transcript: "hola wilo", provider: "mock", model: null, execution_status: "mock",
      audio_duration_ms: 0, latency_ms: 0, usage: {}, limitations: [] } });
  });
  await openWilo(page);
  await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
  await page.waitForTimeout(1600);
  await page.getByRole("button", { name: /Detener y transcribir/ }).click();
  await expect(page.getByLabel(/Transcripcion editable/)).toHaveValue("hola wilo");
  expect(captured).not.toBeNull();
  const w = parseWav(captured!);
  await info.attach("captured.wav", { body: w.wav, contentType: "audio/wav" });
  expect([w.riff, w.wave, w.fmt, w.data]).toEqual(["RIFF", "WAVE", "fmt ", "data"]);
  expect({ format: w.format, channels: w.channels, rate: w.rate, bits: w.bits }).toEqual({ format: 1, channels: 1, rate: 16000, bits: 16 });
  expect(w.byteRate).toBe(32000);
  expect(w.riffSize).toBe(36 + w.dataBytes);
  expect(w.wav.length).toBe(44 + w.dataBytes);
  expect(w.seconds).toBeGreaterThan(1.0);
  expect(w.seconds).toBeLessThan(3.5);
  expect(w.rms).toBeGreaterThan(0.05); // tone, not silence
});

test("microfono denegado: mensaje claro y el texto sigue disponible", async ({ page }) => {
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => { throw new DOMException("denied", "NotAllowedError"); };
  });
  await openWilo(page);
  await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
  await expect(page.getByRole("alert")).toContainText("No se pudo usar el microfono");
  await expect(page.getByLabel("Tu pregunta (texto siempre disponible)")).toBeEditable();
  await expect(page.getByRole("button", { name: "Grabar en WAV 16 kHz" })).toBeEnabled();
});

test("cancelar la grabacion y la transcripcion en curso", async ({ page }) => {
  await fakeMicrophone(page);
  await page.route("**/guide/transcribe", async () => { /* never answers: the user cancels */ });
  await openWilo(page);
  await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
  await page.getByRole("button", { name: "Cancelar grabacion" }).click();
  await expect(page.getByRole("status").filter({ hasText: "Operacion cancelada" })).toBeVisible();
  await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
  await page.getByRole("button", { name: /Detener y transcribir/ }).click();
  await expect(page.getByText("Transcribiendo…")).toBeVisible();
  await page.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.getByRole("status").filter({ hasText: "Operacion cancelada" })).toBeVisible();
});

test("fallo de transcripcion 502 y reintento manual exitoso", async ({ page }) => {
  await fakeMicrophone(page);
  let calls = 0;
  await page.route("**/guide/transcribe", async (route) => {
    calls += 1;
    if (calls === 1) return route.fulfill({ status: 502, json: { detail: { code: "stt_error", message: "Transcripción no disponible" } } });
    return route.fulfill({ json: { transcript: "segundo intento", provider: "mock", model: null, execution_status: "mock",
      audio_duration_ms: 0, latency_ms: 0, usage: {}, limitations: [] } });
  });
  await openWilo(page);
  for (const _ of [1, 2]) {
    await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
    await page.waitForTimeout(400);
    await page.getByRole("button", { name: /Detener y transcribir/ }).click();
    if (calls === 1) await expect(page.getByRole("alert")).toContainText("Transcripción no disponible");
  }
  await expect(page.getByLabel(/Transcripcion editable/)).toHaveValue("segundo intento");
  expect(calls).toBe(2); // no automatic retries
});

test("backend no disponible: mensaje claro, sin texto crudo del navegador", async ({ page }) => {
  await page.route("**/guide/query", (route) => route.abort("connectionrefused"));
  await openWilo(page);
  await page.getByLabel("Tu pregunta (texto siempre disponible)").fill("¿Senderos de Puyehue?");
  await page.getByRole("button", { name: "Preguntar a Wilo" }).click();
  await expect(page.getByRole("alert")).toContainText("No fue posible conectar con la API");
  await expect(page.getByRole("alert")).not.toContainText("Failed to fetch");
});

test("autenticacion: sin token e invalido llevan a sin acceso; el token nunca va en la URL", async ({ page }) => {
  const seen: { auth?: string; url: string }[] = [];
  await page.route("**/guide/query", async (route) => {
    const auth = route.request().headers().authorization;
    seen.push({ auth, url: route.request().url() });
    if (auth !== "Bearer token-valido") return route.fulfill({ status: 401, json: { detail: "Identidad de demostración requerida" } });
    return route.fulfill({ json: { answer: "ok", provider: "mock", model: null, insufficient_evidence: true, sources: [], claims: [],
      entities: [], map: null, tools_used: [], limitations: [], status: "mock" } });
  });
  const logs: string[] = [];
  page.on("console", (m) => logs.push(m.text()));
  for (const token of ["", "token-invalido", "token-valido"]) {
    await openWilo(page, token);
    await page.getByLabel("Tu pregunta (texto siempre disponible)").fill("hola");
    await page.getByRole("button", { name: "Preguntar a Wilo" }).click();
    if (token === "token-valido") await expect(page.getByLabel("Respuesta de Wilo")).toBeVisible();
    else await expect(page.getByText("canjea una invitacion de evaluador")).toBeVisible();
  }
  expect(seen.map((s) => s.auth)).toEqual([undefined, "Bearer token-invalido", "Bearer token-valido"]);
  expect(seen.every((s) => !s.url.includes("token"))).toBe(true);
  expect(page.url()).not.toContain("token");
  expect(logs.join(" ")).not.toContain("token-valido");
});

test("token renovado reemplaza al anterior en sesion", async ({ page }) => {
  await page.goto("/");
  await page.getByLabel("Token demo del backend").fill("token-viejo");
  await page.getByLabel("Recordar solo en esta sesion").check();
  await page.getByLabel("Token demo del backend").fill("token-nuevo");
  await page.reload();
  await expect(page.getByLabel("Token demo del backend")).toHaveValue("token-nuevo");
  expect(await page.evaluate(() => localStorage.length)).toBe(0); // never persisted beyond the tab session
});

test("el laboratorio declara favicon y no produce 404 propios", async ({ page }) => {
  const missing: string[] = [];
  page.on("response", (r) => { if (r.status() === 404) missing.push(r.url()); });
  await page.goto("/");
  const icon = await page.locator('link[rel="icon"]').getAttribute("href");
  expect(icon).toBe("/icon.svg");
  expect((await page.request.get(icon!)).status()).toBe(200);
  expect(missing.filter((u) => u.startsWith(new URL(page.url()).origin))).toEqual([]);
});

// Optional: send the browser-made WAV through the REAL backend (mock provider still runs
// prepare_audio). Run with WILO_LAB_REAL_API=1 against a lab built with VITE_API_URL.
test("WAV del navegador aceptado por prepare_audio del backend real", async ({ page }) => {
  test.skip(!process.env.WILO_LAB_REAL_API, "requiere backend real (WILO_LAB_REAL_API=1)");
  await fakeMicrophone(page);
  const response = page.waitForResponse("**/guide/transcribe");
  await openWilo(page, process.env.WILO_LAB_TOKEN ?? "");
  await page.getByRole("button", { name: "Grabar en WAV 16 kHz" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: /Detener y transcribir/ }).click();
  const r = await response;
  expect(r.status()).toBe(200);
  const body = await r.json();
  expect(body.audio_duration_ms).toBeGreaterThan(1000);
});
