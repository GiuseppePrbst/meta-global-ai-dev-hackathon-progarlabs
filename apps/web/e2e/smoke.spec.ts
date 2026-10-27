import { expect, test } from "@playwright/test";

test("el catálogo mantiene procedencia y estados con la API desconectada", async ({ page }) => {
  await page.route("**/species", (route) => route.abort());
  await page.goto("/");
  expect((await page.request.get("/icon.svg")).status()).toBe(200);
  await expect(page.getByRole("heading", { level: 1 })).toContainText("El bosque tiene");
  await page.getByRole("navigation").getByRole("link", { name: "Especies", exact: true }).click();
  await expect(page.getByRole("status")).toContainText("datos de demostración");
  await page.getByRole("searchbox").fill("ulmo");
  await expect(page.getByRole("button", { name: "Ver ficha de Ulmo" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ver ficha de Coigüe", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Ver ficha de Ulmo" }).click();
  await expect(page.getByRole("region", { name: "Ficha de Ulmo" })).toContainText("pendientes de validación científica");
  await page.getByRole("searchbox").fill("inexistente");
  await expect(page.getByRole("heading", { name: "No encontramos coincidencias" })).toBeVisible();
});

test("la identificación muestra abstención mock y guarda solo un borrador local", async ({ page }) => {
  await page.route("**/identify", async (route) => {
    await route.fulfill({ json: { status: "insufficient_evidence", provider: "mock", candidates: [], message: "Modo demostración: no se realizó inferencia real.", model: null } });
  });
  await page.goto("/identificar");
  const button = page.getByRole("button", { name: "Probar flujo de identificación" });
  await expect(button).toBeDisabled();
  await page.getByLabel("Seleccionar fotografía").setInputFiles({ name: "hoja.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j4i8AAAAASUVORK5CYII=", "base64") });
  await page.getByLabel("Soy mayor de 18 años.").check();
  await page.getByLabel("Tengo derecho a usar esta imagen", { exact: false }).check();
  await button.click();
  await expect(page.getByRole("heading", { name: "Información insuficiente" })).toBeVisible();
  await expect(page.getByLabel("Resultado de identificación")).toContainText("no se realizó inferencia real");
  await page.getByLabel("Notas de la observación").fill("Borrador sintético para prueba");
  await page.getByRole("button", { name: "Guardar borrador en este dispositivo" }).click();
  await expect(page.getByRole("status")).toContainText("Borrador de demostración guardado");
  const draft = await page.evaluate(() => JSON.parse(localStorage.getItem("bosque-vivo-observation-draft") || "null"));
  expect(draft).toMatchObject({ notes: "Borrador sintético para prueba", provider: "mock" });
  expect(Object.keys(draft)).not.toContain("image");
  await page.reload();
  await page.getByRole("button", { name: "Recuperar borrador de este dispositivo" }).click();
  await expect(page.getByLabel("Notas de la observación")).toHaveValue("Borrador sintético para prueba");
  await expect(page.getByRole("heading", { name: "Tu borrador local" })).toBeVisible();
  await page.evaluate(() => localStorage.setItem("bosque-vivo-observation-draft", '{"notes":123}'));
  await page.reload();
  await page.getByRole("button", { name: "Recuperar borrador de este dispositivo" }).click();
  await expect(page.getByRole("status")).toContainText("no tiene un formato válido");
  await expect(page.getByLabel("Notas de la observación")).toHaveCount(0);
});

test("el atlas y el proyecto mantienen los límites del prototipo", async ({ page }) => {
  await page.route("https://tile.openstreetmap.org/**", (route) => route.abort());
  await page.goto("/atlas");
  await expect(page.getByRole("heading", { name: "El atlas espera sus primeras observaciones" })).toBeVisible();
  await expect(page.getByText("Aún no se calculan alturas", { exact: false })).toBeVisible();
  await page.getByRole("navigation").getByRole("link", { name: "El proyecto" }).click();
  await expect(page.getByText("Su participación competitiva requiere autorización", { exact: false })).toBeVisible();
});
