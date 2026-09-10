import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * Tests type-only para SearchInput molecule. Los `.tsrx` no resuelven en
 * bun:test (requieren plugin Octane). Verificamos el contenido del wrapper
 * file para confirmar el contrato API. Los tests E2E (debounce real,
 * input change) se cubren con el pipeline de Octane corriendo.
 */

const WRAPPER_PATH = join(import.meta.dir, "search-input.tsrx");

describe("search-input molecule — type contract", () => {
  test("exporta SearchInput como función", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toMatch(/export function SearchInput|export const SearchInput/);
  });

  test("acepta props value, onChange, delayMs opcional", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("value:");
    expect(content).toContain("onChange:");
    expect(content).toContain("delayMs?:");
  });

  test("usa useDebounceValue del wrapper vendor/hooks (regla §9)", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("useDebounceValue");
    expect(content).toContain('from "../../vendor/hooks"');
  });

  test("usa la i18n key tasks.search.placeholder", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("tasks.search.placeholder");
  });
});
