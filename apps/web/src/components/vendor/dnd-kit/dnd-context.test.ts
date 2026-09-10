import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * Tests del wrapper vendor `dnd-kit`.
 *
 * Importante: estos tests NO importan desde `./index` porque el upstream
 * `@octanejs/dnd-kit` publica sus bindings como fuente `.tsrx` que requiere
 * el plugin de Octane para resolver (bun:test load las imports transitivas
 * directamente y falla con `SyntaxError: export 'DragDropProvider' not found`).
 *
 * En su lugar, los tests verifican que el wrapper FILE contiene las
 * re-exports esperadas. Los tests E2E (renderizado real + drag/drop en DOM)
 * se cubren en WU11/WU12 con el pipeline de Octane corriendo.
 *
 * Grep gate del spec TRIANGULATE se valida con `bash grep` (no en este test):
 *   `grep -RE "from ['\"]@octanejs/dnd-kit['\"]" apps/web/src/`
 * debe devolver hits únicamente bajo `components/vendor/dnd-kit/`.
 */

const WRAPPER_PATH = join(import.meta.dir, "index.ts");

describe("dnd-kit vendor wrapper — re-exports contract", () => {
  test("el wrapper index.ts re-exporta DndContext", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("export");
    expect(content).toMatch(/DndContext/);
  });

  test("el wrapper re-exporta useDraggable y useDroppable", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("useDraggable");
    expect(content).toContain("useDroppable");
  });

  test("el wrapper apunta al upstream @octanejs/dnd-kit", () => {
    const content = readFileSync(WRAPPER_PATH, "utf-8");
    expect(content).toContain("@octanejs/dnd-kit");
  });
});
