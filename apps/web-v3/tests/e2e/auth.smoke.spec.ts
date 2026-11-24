import { expect, test } from "@playwright/test";
import { cleanupE2eData } from "./cleanup";
import { login, uniqueEmail } from "./helpers";

/**
 * Smoke e2e del camino de login (PRD-v4 §18).
 *
 * Cubre lo mínimo para que el pipeline signifique algo: la app real
 * levanta, la API responde y el código de acceso llega al correo y deja
 * entrar. Un smoke que no llega al dashboard no prueba nada.
 */
test.describe("login", () => {
  // El e2e crea un usuario real en la base para poder entrar: sin esta
  // limpieza, cada corrida deja un usuario `e2e-*` en la base.
  test.afterAll(async () => {
    await cleanupE2eData();
  });

  test("el código de acceso deja entrar al dashboard", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/login");
    // The auth layout brings its own h1 (the brand headline) next to the
    // view's one: naming the heading keeps the assertion unambiguous.
    await expect(
      page.getByRole("heading", { name: "Iniciar sesión" }),
    ).toBeVisible();

    const code = await login(page, email);

    // El código es de 6 dígitos: el input lo reparte en seis celdas.
    expect(code).toMatch(/^\d{6}$/);

    // Con la sesión abierta, el guard global deja pasar al dashboard.
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByTestId("dashboard-empty")).toBeVisible();
  });

  test("sin sesión, una ruta protegida devuelve al login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });
});
