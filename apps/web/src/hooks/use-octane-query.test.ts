import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * Tests type-only para `useOctaneQuery`
 * (`apps/web/src/hooks/use-octane-query.ts`).
 *
 * Mismo patrón que `use-fetch.test.ts`: el hook usa primitives de octane
 * que no corren en bun:test (no hay renderer). Los hooks de UI se
 * cubren con el pipeline E2E — aquí validamos el contrato de la API
 * + las invariantes críticas.
 *
 * El contrato debe ser **idéntico al de `useFetch`** para que la
 * migración sea 1-a-1 (ver `odd/tanstack-query-migration/tasks.md`).
 */

const HOOK_PATH = join(import.meta.dir, "use-octane-query.ts");

describe("useOctaneQuery hook — type contract", () => {
  test("exporta useOctaneQuery como función named export", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/export function useOctaneQuery\b/);
  });

  test("exporta OctaneQueryResult<T> interface idéntico al de useFetch", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/interface OctaneQueryResult\b/);
    expect(content).toContain("loading: boolean");
    expect(content).toContain("error: string | null");
    expect(content).toContain("data: T | null");
    expect(content).toContain("refetch:");
  });

  test("acepta fetcher y deps como parámetros (igual que useFetch)", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/function useOctaneQuery<T>\(\s*fetcher:\s*Fetcher<T>/);
    expect(content).toMatch(/deps:\s*ReadonlyArray<unknown>/);
  });

  test(
    "importa useState/useEffect/useCallback de octane (mismas primitives que useFetch)",
    () => {
      const content = readFileSync(HOOK_PATH, "utf-8");
      expect(content).toMatch(/from "octane"/);
      expect(content).toContain("useState");
      expect(content).toContain("useEffect");
      expect(content).toContain("useCallback");
    },
  );

  test("usa @tanstack/query-core (NO @tanstack/react-query)", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    // Hard rule del .pi/skills/tanstack/SKILL.md: NO usar el React
    // adapter porque arrastra el scheduler de React y rompe octane.
    expect(content).toContain('from "@tanstack/query-core"');
    expect(content).not.toContain('from "@tanstack/react-query"');
  });

  test("expone getQueryClient() singleton para tests/integración futura", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toMatch(/export function getQueryClient\b/);
    expect(content).toMatch(/new QueryClient\(/);
  });

  test("mapea errors a string vía errorMessage helper", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toContain("function errorMessage");
    // Distingue null/undefined de error real (igual que useFetch).
    expect(content).toContain("err instanceof Error");
  });

  test(
    "loading cubre primer fetch (status=pending) y re-fetch (fetchStatus=fetching)",
    () => {
      const content = readFileSync(HOOK_PATH, "utf-8");
      // Mapeo del contrato: usa OR lógico entre los dos casos. Coincide
      // con el useFetch original (loading=true mientras fetcher no resolvió).
      expect(content).toMatch(
        /fetchStatus\s*===\s*["']fetching["']\s*\|\|\s*\w+\.status\s*===\s*["']pending["']/,
      );
    },
  );

  test(
    "refetch llama observer.refetch() — sin throw si no hay abort",
    () => {
      const content = readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("observer.refetch()");
      // El wrapper ignora la Promise devuelta (void) — fire-and-forget
      // como useFetch original.
      expect(content).toContain("void observer.refetch()");
    },
  );

  test(
    "tiene shallowChanged() para evitar setState redundantes cuando el snapshot no cambió",
    () => {
      const content = readFileSync(HOOK_PATH, "utf-8");
      // Octane (como React) compara via Object.is — si retornamos el mismo
      // objeto, no re-renderiza. shallowChanged() garantiza que solo
      // setState cuando un campo relevante realmente cambió.
      expect(content).toContain("function shallowChanged");
      expect(content).toMatch(/a\.data\s*!==\s*b\.data/);
      expect(content).toMatch(/a\.error\s*!==\s*b\.error/);
      expect(content).toMatch(/a\.status\s*!==\s*b\.status/);
      expect(content).toMatch(/a\.fetchStatus\s*!==\s*b\.fetchStatus/);
    },
  );

  test(
    "useEffect resetea opciones del observer en cada cambio de deps + se desuscribe al cleanup",
    () => {
      const content = readFileSync(HOOK_PATH, "utf-8");
      // setOptions + subscribe + unsubscribe en el cleanup cubren los
      // dos invariantes críticas: re-fetch cuando deps cambian y
      // no-leak al desmontar (QueryObserver lo maneja por diseño).
      expect(content).toContain("observer.setOptions");
      expect(content).toContain("observer.subscribe");
      expect(content).toMatch(/return\s*\(\s*\)\s*=>\s*{\s*unsubscribe\(\)/);
    },
  );

  test("default options del QueryClient: staleTime 30s, retry 1, sin refetchOnWindowFocus", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    expect(content).toContain("staleTime: 30_000");
    expect(content).toContain("retry: 1");
    expect(content).toContain("refetchOnWindowFocus: false");
  });

  test("comment block documenta surface idéntica a useFetch", () => {
    const content = readFileSync(HOOK_PATH, "utf-8");
    // El contracto idéntico es la razón de ser de este wrapper. Si
    // alguien lo rompe, el test bloquea y señala el por qué.
    expect(content).toContain("idéntica a `useFetch`");
    expect(content).toContain("odd/tanstack-query-migration");
  });

  test(
    "advertise explícito: NO usa el React adapter (scheduler rompería octane)",
    () => {
      const content = readFileSync(HOOK_PATH, "utf-8");
      expect(content).toContain("scheduler de React");
    },
  );
});
