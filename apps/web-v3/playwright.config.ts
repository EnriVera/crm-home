import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright para el smoke e2e de `apps/web-v3` (PRD-v4 §18).
 *
 * El config apunta a los servidores que levanta el job `e2e` del workflow:
 * la API en el 3000 y el Nuxt en el 5175. `webServer` no se usa porque el
 * job ya los levanta con su propio health check: dos arrancadores
 * apuntando al mismo puerto se pelean.
 */
export default defineConfig({
  testDir: "./tests/e2e",
  // La suite es chica: un solo worker alcanza y evita que dos navegadores
  // compitan por la misma cookie de sesión.
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 10_000 },
  reporter: process.env.CI
    ? [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]]
    : [["list"]],
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:5175",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
});
