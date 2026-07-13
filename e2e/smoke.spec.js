import { test, expect } from "@playwright/test";

async function esperarApp(page) {
  await page.waitForFunction(() => typeof window.mostrar === "function", { timeout: 20000 });
}

async function reiniciarSesion(page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await esperarApp(page);
}

test.describe("Mundos Mágicos — flujo principal", () => {
  test("muestra pantalla de nombre al iniciar", async ({ page }) => {
    await reiniciarSesion(page);
    await expect(page.locator("#pantallaNombre.activa")).toBeVisible({ timeout: 15000 });
    await expect(page.locator("#gridAvatares .avatar-opcion").first()).toBeVisible();
    await expect(page.locator("#inputNombre")).toBeVisible();
  });

  test("permite crear personaje y llegar a la historia", async ({ page }) => {
    await reiniciarSesion(page);
    await page.waitForSelector("#pantallaNombre.activa", { timeout: 15000 });
    await page.locator(".avatar-opcion").first().click();
    await page.locator("#inputNombre").fill("TesterE2E");
    await page.getByRole("button", { name: /Empezar aventura/i }).click();

    await expect(page.locator("#historia.activa, #selectorMundos.activa")).toBeVisible({ timeout: 10000 });
  });

  test("selector muestra tarjetas de mundos", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("nombreJugador", "E2E");
      localStorage.setItem("historiaVista", "true");
      localStorage.setItem("tutorialCompletado", "true");
    });
    await page.reload();
    await esperarApp(page);
    await page.waitForSelector("#selectorMundos.activa", { timeout: 20000 });
    await expect(page.locator(".tarjeta-mundo").first()).toBeVisible();
    await expect(page.locator("#heroBienvenida")).toBeVisible();
  });

  test("panel familias tiene gráficos y botón exportar", async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem("nombreJugador", "E2E");
      localStorage.setItem("historiaVista", "true");
      localStorage.setItem("tutorialCompletado", "true");
    });
    await page.reload();
    await esperarApp(page);
    await page.waitForSelector("#selectorMundos.activa", { timeout: 20000 });
    await page.locator(".bottom-nav button[title='Familia']").click();
    await expect(page.locator("#panel.activa")).toBeVisible();
    await expect(page.locator("#graficosAreaPanel")).toBeVisible();
    await expect(page.locator(".boton-exportar-resumen")).toBeVisible();
  });
});
