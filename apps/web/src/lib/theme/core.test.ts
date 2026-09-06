import { describe, expect, test } from "bun:test";

/**
 * Tests puros de la resolución de tema (D7): `resolveTheme` y `isPublicPath`.
 * RED: el módulo `lib/theme/core.ts` todavía no existe — este test debe fallar.
 * La misma lista de rutas públicas rige el script anti-FOUC de `index.html`
 * (duplicación deliberada pre-paint, comentarios cruzados en ambos archivos).
 */
describe("lib/theme/core", () => {
  test("resolveTheme: setting explícito gana sobre el SO", async () => {
    const { resolveTheme } = await import("./core");
    expect(resolveTheme("light", false)).toBe("light");
    expect(resolveTheme("light", true)).toBe("light");
    expect(resolveTheme("dark", false)).toBe("dark");
    expect(resolveTheme("dark", true)).toBe("dark");
  });

  test("resolveTheme: 'system' sigue al SO", async () => {
    const { resolveTheme } = await import("./core");
    expect(resolveTheme("system", true)).toBe("dark");
    expect(resolveTheme("system", false)).toBe("light");
  });

  test("resolveTheme: setting desconocido cae a 'system'", async () => {
    const { resolveTheme } = await import("./core");
    expect(resolveTheme("sepia" as never, true)).toBe("dark");
    expect(resolveTheme("sepia" as never, false)).toBe("light");
  });

  test("isPublicPath: login, verificación y legales son públicas", async () => {
    const { isPublicPath } = await import("./core");
    expect(isPublicPath("/login")).toBe(true);
    expect(isPublicPath("/login-verification")).toBe(true);
    expect(isPublicPath("/terms")).toBe(true);
    expect(isPublicPath("/privacy")).toBe(true);
    expect(isPublicPath("/cookies")).toBe(true);
  });

  test("isPublicPath: rutas del shell y raíz no son públicas", async () => {
    const { isPublicPath } = await import("./core");
    expect(isPublicPath("/dashboard")).toBe(false);
    expect(isPublicPath("/")).toBe(false);
    expect(isPublicPath("/config")).toBe(false);
  });

  test("isPublicPath: prefijos y query strings", async () => {
    const { isPublicPath } = await import("./core");
    expect(isPublicPath("/login-verification?email=a%40b.co")).toBe(true);
    expect(isPublicPath("/terms/seccion-1")).toBe(true);
    expect(isPublicPath("/dashboard?tab=1")).toBe(false);
    expect(isPublicPath("/loginx")).toBe(false);
  });

  test("PUBLIC_PATHS: lista exportada reutilizable", async () => {
    const { PUBLIC_PATHS, isPublicPath } = await import("./core");
    expect(PUBLIC_PATHS).toContain("/login");
    expect(PUBLIC_PATHS).toContain("/login-verification");
    for (const path of PUBLIC_PATHS) {
      expect(isPublicPath(path)).toBe(true);
    }
  });
});
