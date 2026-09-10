import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * TRIANGULATE gate: `attachment-repository.ts` es un stub de Fase 2 — el MVP no
 * expone endpoints sobre attachments. Si alguien lo cablea al composition root
 * por error, este test rompe el gate.
 *
 * Cuando Fase 2 arranque, este test se borra (no se relaja: se elimina, junto
 * con el port stub si no se usa).
 */

const COMPOSITION_ROOT = join(
  import.meta.dir,
  "..",
  "..",
  "http",
  "composition-root.ts",
);

describe("attachment-repository not wired (MVP gate)", () => {
  test("composition-root.ts NO importa attachment-repository", () => {
    const content = readFileSync(COMPOSITION_ROOT, "utf-8");
    const lines = content.split("\n");
    const offenders: number[] = [];

    for (let i = 0; i < lines.length; i += 1) {
      const line = lines[i];
      if (!line) continue;
      if (line.includes("attachment-repository")) {
        offenders.push(i + 1);
      }
    }

    expect(offenders).toEqual([]);
  });
});
