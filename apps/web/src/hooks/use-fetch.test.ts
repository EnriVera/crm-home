import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * Tests type-only para `useFetch` (apps/web/src/hooks/use-fetch.ts).
 *
 * El hook usa `useState`/`useEffect` de octane, que no corren en
 * bun:test (no hay renderer). El proyecto testea lógica pura con
 * helpers separados — los hooks de UI se cubren con el pipeline E2E.
 * Verificamos el contrato API + las invariantes críticas que motivan
 * la existencia del hook (cancelled/finally).
 */

const HOOK_PATH = join(import.meta.dir, "use-fetch.ts");

describe("useFetch hook — type contract", () => {
  test("exporta useFetch como función named export", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/export function useFetch\b/);
  });

  test("exporta UseFetchResult<T> interface", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/export interface UseFetchResult\b/);
    expect(content).toContain("loading: boolean");
    expect(content).toContain("error: string | null");
    expect(content).toContain("data: T | null");
    expect(content).toContain("refetch:");
  });

  test("acepta fetcher y deps como parámetros", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(
      /function useFetch<T>\(\s*fetcher:\s*\(\)\s*=>\s*Promise<T>/,
    );
    expect(content).toContain("deps: ReadonlyArray<unknown>");
  });

  test("importa useState/useEffect/useCallback de octane", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/from "octane"/);
    expect(content).toContain("useState");
    expect(content).toContain("useEffect");
    expect(content).toContain("useCallback");
  });

  test("tiene bloque finally que SIEMPRE setea loading=false", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    // La invariante crítica: sin finally, el loading se puede quedar
    // atascado en true si la RPC se cuelga. Esto fue un bug latente
    // en tasks-config-page, client-detail-page y config-page.
    expect(content).toMatch(/}\s*finally\s*{/);
    expect(content).toMatch(/setLoading\(false\)/);
  });

  test("usa cancelled flag para evitar setState post-unmount", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toContain("let cancelled = false");
    expect(content).toMatch(/return\s*\(\)\s*=>\s*{\s*cancelled\s*=\s*true/);
  });

  test("refetch incrementa un refreshKey interno", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toContain("refreshKey");
    expect(content).toMatch(/setRefreshKey\(\(k\)\s*=>\s*k\s*\+\s*1\)/);
  });

  test("incluye deps y refreshKey en el array de dependencias del useEffect", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    // El useEffect debe re-ejecutar cuando cambian deps O refreshKey.
    expect(content).toMatch(/\[\.\.\.deps, refreshKey\]/);
  });
});
