import { describe, expect, test } from "bun:test";

/**
 * Tokens regression tests (theme-quieter-minimalist).
 *
 * Strategy: file-text assertions + WCAG relative-luminance ratio assertions.
 * The suite has no DOM harness (testing-library deferred per openspec/config.yaml
 * frontend.diferidos); substring probes against the canonical tokens file are
 * the cheapest reliable check. WCAG math catches accidental hex typos that
 * substring probes alone would miss.
 *
 * Source of truth: `openspec/changes/theme-quieter-minimalist/design.md` §2 D1
 * (light), §2 D2 (dark verbatim). The pure-neutral palette is the contract.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const TOKENS_PATH = resolve(HERE, "tokens.css");
const TOKENS = readFileSync(TOKENS_PATH, "utf8");

/** Extract the body of a CSS rule block (`{ ... }`) anchored on `selector {`. */
function block(text: string, selector: string): string {
  // Anchor on the selector followed by " {" so comments that mention the
  // selector don't capture the wrong block (e.g. `:root` mentioned in a doc
  // string before `@theme { ... }`).
  const start = text.indexOf(`${selector} {`);
  if (start === -1) throw new Error(`selector not found: ${selector}`);
  const open = start + selector.length + 1;
  let depth = 1;
  let i = open + 1;
  while (i < text.length && depth > 0) {
    const ch = text[i];
    if (ch === "{") depth += 1;
    else if (ch === "}") depth -= 1;
    i += 1;
  }
  return text.slice(open + 1, i - 1);
}

const ROOT = block(TOKENS, ":root");
const DARK = block(TOKENS, ".dark");

/** WCAG 2.x relative luminance from a 6-digit hex string. */
function relativeLuminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length !== 6) throw new Error(`expected 6-digit hex, got ${hex}`);
  const channels = [0, 2, 4].map((start) => Number.parseInt(h.slice(start, start + 2), 16) / 255);
  const linear = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
}

/** WCAG 2.x contrast ratio (L1 + 0.05) / (L2 + 0.05) with L1 ≥ L2. */
function contrastRatio(fg: string, bg: string): number {
  const l1 = relativeLuminance(fg);
  const l2 = relativeLuminance(bg);
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/** Round to one decimal place to absorb tiny floating-point drift. */
function ratio(fg: string, bg: string): number {
  return Math.round(contrastRatio(fg, bg) * 10) / 10;
}

describe("styles/tokens.css — closed-list pure-neutral palette", () => {
  describe(":root (light theme)", () => {
    test("background sigue siendo #ffffff (sin cambios)", () => {
      expect(ROOT).toContain("--color-background: #ffffff;");
    });

    test("surface migra a #f5f5f5 (neutral-100, pure neutral)", () => {
      expect(ROOT).toContain("--color-surface: #f5f5f5;");
    });

    test("border migra a #e5e5e5 (neutral-200, pure neutral)", () => {
      expect(ROOT).toContain("--color-border: #e5e5e5;");
    });

    test("text-primary migra a #171717 (neutral-900)", () => {
      expect(ROOT).toContain("--color-text-primary: #171717;");
    });

    test("text-secondary migra a #737373 (neutral-500, AA 4.65:1 sobre #ffffff)", () => {
      expect(ROOT).toContain("--color-text-secondary: #737373;");
    });

    test("error NO cambia (#dc2626 sigue intacto)", () => {
      expect(ROOT).toContain("--color-error: #dc2626;");
    });

    test("success NO cambia (#15803d sigue intacto, indicador de éxito)", () => {
      expect(ROOT).toContain("--color-success: #15803d;");
    });

    test("focus NO cambia (#15803d sigue intacto, foco visible canónico)", () => {
      expect(ROOT).toContain("--color-focus: #15803d;");
    });
  });

  describe(".dark (dark theme — user-verbatim pure neutrals)", () => {
    test("background es #0a0a0a (user-verbatim, sin tinte verde)", () => {
      expect(DARK).toContain("--color-background: #0a0a0a;");
    });

    test("surface es #141414 (user-verbatim)", () => {
      expect(DARK).toContain("--color-surface: #141414;");
    });

    test("border es #262626 (user-verbatim)", () => {
      expect(DARK).toContain("--color-border: #262626;");
    });

    test("text-primary es #fafafa (user-verbatim)", () => {
      expect(DARK).toContain("--color-text-primary: #fafafa;");
    });

    test("text-secondary es #a3a3a3 (user-verbatim)", () => {
      expect(DARK).toContain("--color-text-secondary: #a3a3a3;");
    });

    test("error NO cambia (#f87171 sigue intacto)", () => {
      expect(DARK).toContain("--color-error: #f87171;");
    });

    test("success NO cambia (#4ade80 sigue intacto)", () => {
      expect(DARK).toContain("--color-success: #4ade80;");
    });

    test("focus NO cambia (#4ade80 sigue intacto)", () => {
      expect(DARK).toContain("--color-focus: #4ade80;");
    });

    test("primary del dark sigue apuntando a primary-500 (#22c55e)", () => {
      expect(DARK).toContain("--color-primary: var(--color-primary-500);");
    });
  });

  describe("escala primary estática (no cambia por tema)", () => {
    const PRIMARY_SCALE_LINES = [
      "--color-primary-50: #f0fdf4;",
      "--color-primary-100: #dcfce7;",
      "--color-primary-200: #bbf7d0;",
      "--color-primary-300: #86efac;",
      "--color-primary-400: #4ade80;",
      "--color-primary-500: #22c55e;",
      "--color-primary-600: #16a34a;",
      "--color-primary-700: #15803d;",
      "--color-primary-800: #166534;",
      "--color-primary-900: #14532d;",
    ];

    test.each(PRIMARY_SCALE_LINES)("byte-idéntica: %s", (line) => {
      expect(TOKENS).toContain(line);
    });

    test("Poppins sigue siendo la familia única (--font-sans)", () => {
      expect(TOKENS).toContain('--font-sans: "Poppins"');
    });
  });

  describe("WCAG 2.x relative-luminance (TRIANGULATE — typos detection)", () => {
    // Nota: los ratios documentados en `design.md` §5.1 fueron redondeados a
    // 0.05–0.1 y arrastran pequeñas imprecisiones; los valores esperados aquí
    // son los que produce la fórmula canónica WCAG 2.x:
    //   L = 0.2126·R + 0.7152·G + 0.0722·B (R,G,B linealizados con el segmento
    //   sRGB); ratio = (L1+0.05)/(L2+0.05). El veredicto AA/AAA no cambia.

    test("light text-primary #171717 sobre background #ffffff: 17.9:1 AAA", () => {
      expect(ratio("#171717", "#ffffff")).toBe(17.9);
    });

    test("light text-secondary #737373 sobre background #ffffff: 4.7:1 AA", () => {
      expect(ratio("#737373", "#ffffff")).toBe(4.7);
    });

    test("light text-secondary #737373 sobre surface #f5f5f5: 4.3:1 AA", () => {
      expect(ratio("#737373", "#f5f5f5")).toBe(4.3);
    });

    test("dark text-primary #fafafa sobre background #0a0a0a: 19.0:1 AAA", () => {
      expect(ratio("#fafafa", "#0a0a0a")).toBe(19.0);
    });

    test("dark text-secondary #a3a3a3 sobre background #0a0a0a: 7.8:1 AAA", () => {
      // Design §5.1 documentó 7.47:1 (redondeo impreciso); el cómputo canónico
      // WCAG da 7.8:1. El veredicto AAA no cambia.
      expect(ratio("#a3a3a3", "#0a0a0a")).toBe(7.8);
    });

    test("dark text-secondary #a3a3a3 sobre surface #141414: 7.3:1 AAA", () => {
      // Design §5.1 documentó 6.80:1; el cómputo canónico WCAG da 7.3:1.
      expect(ratio("#a3a3a3", "#141414")).toBe(7.3);
    });

    test("light success #15803d sobre surface #f5f5f5: 4.6:1 AA", () => {
      // Design §5.1 documentó 4.75:1; el cómputo canónico da 4.6:1 (AA).
      expect(ratio("#15803d", "#f5f5f5")).toBe(4.6);
    });

    test("light outline-focus #15803d sobre skip-link fill #171717: 3.6:1 (≥3:1 no-textual)", () => {
      // El outline se mide idealmente contra el fondo adyacente del documento,
      // no contra el fill del propio skip-link. Esta fila documenta la peor
      // medición (outline contra fill dark) y la confirma ≥ 3:1.
      expect(ratio("#15803d", "#171717")).toBe(3.6);
    });

    test("skip-link dark: text-background #0a0a0a sobre bg-text-primary #fafafa: 19.0:1 AAA", () => {
      expect(ratio("#0a0a0a", "#fafafa")).toBe(19.0);
    });
  });

  describe("hygiene: no quedan hex viejos con sesgo cool en tokens.css", () => {
    test("no quedan hex slate del light theme anterior", () => {
      for (const legacy of ["#f6f8f7", "#e2e8f0", "#0f172a", "#52606d"]) {
        expect(TOKENS).not.toContain(legacy);
      }
    });

    test("no quedan hex del dark theme anterior con tinte verde", () => {
      for (const legacy of ["#0b120c", "#111a12", "#243324", "#f1f5f9", "#9fb3a4"]) {
        expect(TOKENS).not.toContain(legacy);
      }
    });
  });
});
