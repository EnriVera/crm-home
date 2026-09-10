import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * Tests del wrapper vendor `lexical`.
 *
 * Importante: estos tests NO importan desde `./index` porque el upstream
 * `@octanejs/lexical` publica sus bindings como fuente `.tsrx` que requiere
 * el plugin de Octane para resolver (bun:test load las imports transitivas
 * directamente y falla con `SyntaxError: export 'LexicalComposer' not found`).
 *
 * En su lugar, los tests verifican que el wrapper FILE contiene las
 * declaraciones y exports esperados. Los tests E2E (renderizado real del
 * editor) se cubren en WU11/WU12 con el pipeline de Octane corriendo.
 *
 * Grep gate del spec TRIANGULATE se valida con `bash grep` (no en este test):
 *   `grep -RE "from ['\"]@octanejs/lexical['\"]" apps/web/src/`
 * debe devolver hits únicamente bajo `components/vendor/lexical/`.
 */

const WRAPPER_PATH = join(import.meta.dir, "index.ts");

describe("lexical vendor wrapper — type contract", () => {
  test("RichTextEditorProps está exportado con las 4 props esperadas", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("RichTextEditorProps");
    expect(content).toContain("value:");
    expect(content).toContain("onChange:");
    expect(content).toContain("placeholder:");
    expect(content).toContain("maxLength?:");
  });

  test("RichTextEditor está exportado como componente", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toMatch(/export function RichTextEditor|export const RichTextEditor/);
  });

  test("el wrapper re-exporta primitivas del binding crudo", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("LexicalComposer");
    expect(content).toContain("ContentEditable");
    expect(content).toContain("@octanejs/lexical");
  });
});
