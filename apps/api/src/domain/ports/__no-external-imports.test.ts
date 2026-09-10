import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "bun:test";

/**
 * TRIANGULATE gate (spec `vendor-bindings`): los puertos de dominio son interfaces
 * puras. NO deben importar `kysely`, `h3`, `nitro`, ni SDKs externos — esas
 * dependencias se concretan en los adapters (WU5) y el composition root (WU6).
 *
 * Si una violación aparece, el spec `tasks` queda comprometido: los use cases
 * (WU4) no podrían testearse con repos in-memory.
 */

const PORTS_DIR = join(import.meta.dir);
const FORBIDDEN_IMPORTS = ["kysely", "h3", "nitro", "pg", "nodemailer"];

interface ImportViolation {
  file: string;
  line: number;
  matched: string;
}

function findForbiddenImports(filePath: string): ImportViolation[] {
  const content = readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations: ImportViolation[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    // Captura: import ... from "kysely" / from 'h3' / from "kysely/..."
    const importMatch = line.match(/(?:from|import)\s+["']([^"']+)["']/);
    if (!importMatch) continue;
    const modulePath = importMatch[1];
    if (!modulePath) continue;
    for (const forbidden of FORBIDDEN_IMPORTS) {
      if (modulePath === forbidden || modulePath.startsWith(`${forbidden}/`)) {
        violations.push({
          file: filePath,
          line: i + 1,
          matched: modulePath,
        });
      }
    }
  }

  return violations;
}

describe("domain ports purity gate", () => {
  test("ningún puerto de dominio importa kysely/h3/nitro/pg/nodemailer", () => {
    // Sólo los ports creados por WU3: attachment-repository, category-lookup,
    // client-lookup, task-repository, task-state-repository, type-lookup.
    const newPorts = [
      "attachment-repository.ts",
      "category-lookup-repository.ts",
      "client-lookup-repository.ts",
      "task-repository.ts",
      "task-state-repository.ts",
      "type-lookup-repository.ts",
    ];

    const allViolations: ImportViolation[] = [];
    for (const port of newPorts) {
      const filePath = join(PORTS_DIR, port);
      allViolations.push(...findForbiddenImports(filePath));
    }

    expect(allViolations).toEqual([]);
  });
});
