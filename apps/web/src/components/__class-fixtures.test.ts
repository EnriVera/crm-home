import { describe, expect, test } from "bun:test";

/**
 * Class-string regression tests (theme-quieter-minimalist).
 *
 * Strategy: substring probes against the canonical component source files.
 * The suite has no DOM harness (testing-library deferred per
 * `openspec/config.yaml` frontend.diferidos); file-text assertions on
 * `class=...` and `VARIANT_CLASS.ghost` constants are the cheapest reliable
 * check that the closed-list of green uses is honoured.
 *
 * Source of truth: `openspec/changes/theme-quieter-minimalist/design.md`
 * §3.2–§3.5 (diffs pinned) and §3.6 (out-of-scope, allowed usages).
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));

function read(relPath: string): string {
  return readFileSync(resolve(HERE, relPath), "utf8");
}

const BUTTON = read("./atoms/button.tsrx");
const NAV_GROUP = read("./molecules/nav-group.tsrx");
const OTP_INPUT = read("./vendor/otp-input/otp-input.tsrx");
const SKIP_LINK = read("./atoms/skip-link.tsrx");

// Out-of-scope (must keep their allowed primary usages):
const NAV_ITEM = read("./molecules/nav-item.tsrx");
const STATUS_MESSAGE = read("./atoms/status-message.tsrx");
const LOGIN_VERIFICATION = read("./pages/login-verification-page.tsrx");
const ROUTES_INDEX = read("../routes/index.tsrx");

/** Slice a class string starting at a marker; returns the value up to the next quote. */
function classFrom(start: number, source: string): string {
  // walk forward until matching closing quote (assumes single- or double-quoted)
  const open = source[start];
  if (open !== '"' && open !== "'" && open !== "`") return "";
  let i = start + 1;
  while (i < source.length) {
    const ch = source[i];
    if (ch === open) return source.slice(start + 1, i);
    i += 1;
  }
  return "";
}

/** Locate the index of `marker` and return the class string that follows it. */
function classAfter(marker: string, source: string): string {
  const idx = source.indexOf(marker);
  if (idx === -1) throw new Error(`marker not found: ${marker}`);
  // find first quote after marker
  const quoteIdx = (() => {
    for (let i = idx + marker.length; i < source.length; i += 1) {
      const ch = source[i];
      if (ch === '"' || ch === "'" || ch === "`") return i;
    }
    throw new Error(`quote not found after marker: ${marker}`);
  })();
  return classFrom(quoteIdx, source);
}

describe("components/atoms/button.tsrx — ghost variant", () => {
  const ghost = classAfter("ghost:", BUTTON);

  test("ghost ya no usa text-primary-700", () => {
    expect(ghost).not.toContain("text-primary-700");
  });

  test("ghost ya no usa dark:text-primary-400", () => {
    expect(ghost).not.toContain("dark:text-primary-400");
  });

  test("ghost usa text-text-primary (claro)", () => {
    expect(ghost).toContain("text-text-primary");
  });

  test("ghost usa dark:text-text-primary (oscuro)", () => {
    expect(ghost).toContain("dark:text-text-primary");
  });

  test("ghost preserva hover:bg-surface (affordance neutral)", () => {
    expect(ghost).toContain("hover:bg-surface");
  });

  test("primary variant sigue intacto (lista cerrada: CTA fill)", () => {
    const primary = classAfter("primary:", BUTTON);
    expect(primary).toContain("bg-primary");
    expect(primary).toContain("text-white");
  });
});

describe("components/molecules/nav-group.tsrx — active header", () => {
  // The active-branch ternary literal is "text-text-primary font-medium".
  // We assert both substrings on the active branch and absence of old primary.
  test("rama activa usa text-text-primary", () => {
    // After `props.active` ternary, the active branch is the first quoted
    // string following the `?` operator. Anchor on "? \"".
    const idx = NAV_GROUP.indexOf('? "');
    expect(idx).toBeGreaterThan(-1);
    const active = classFrom(idx + 2, NAV_GROUP);
    expect(active).toContain("text-text-primary");
  });

  test("rama activa usa font-medium (jerarquía por peso)", () => {
    const idx = NAV_GROUP.indexOf('? "');
    expect(idx).toBeGreaterThan(-1);
    const active = classFrom(idx + 2, NAV_GROUP);
    expect(active).toContain("font-medium");
  });

  test("rama activa NO usa text-primary-700", () => {
    const idx = NAV_GROUP.indexOf('? "');
    expect(idx).toBeGreaterThan(-1);
    const active = classFrom(idx + 2, NAV_GROUP);
    expect(active).not.toContain("text-primary-700");
  });

  test("rama activa NO usa dark:text-primary-400", () => {
    const idx = NAV_GROUP.indexOf('? "');
    expect(idx).toBeGreaterThan(-1);
    const active = classFrom(idx + 2, NAV_GROUP);
    expect(active).not.toContain("dark:text-primary-400");
  });

  test("rama inactiva sigue usando text-text-secondary", () => {
    expect(NAV_GROUP).toContain('"text-text-secondary"');
  });
});

describe("components/vendor/otp-input/otp-input.tsrx — CELL_CLASS caret", () => {
  const cell = classAfter("CELL_CLASS =", OTP_INPUT).trim();

  test("CELL_CLASS ya no usa caret-primary", () => {
    expect(cell).not.toContain("caret-primary");
  });

  test("CELL_CLASS usa caret-text-primary", () => {
    expect(cell).toContain("caret-text-primary");
  });

  test("CELL_CLASS mantiene text-text-primary del texto", () => {
    expect(cell).toContain("text-text-primary");
  });

  test("CELL_CLASS mantiene focus-visible:outline-focus (canónico verde de foco)", () => {
    expect(cell).toContain("focus-visible:outline-focus");
  });

  test("CELL_CLASS documenta el soporte del caret-color (Chrome 57+, FF 53+, Safari 11.1+)", () => {
    expect(OTP_INPUT).toMatch(/Chrome 57\+/);
    expect(OTP_INPUT).toMatch(/Firefox 53\+/);
    expect(OTP_INPUT).toMatch(/Safari 11\.1\+/);
  });
});

describe("components/atoms/skip-link.tsrx — focus fill", () => {
  // Extract the `class="..."` of the anchor: anchored on `class=` and grab until `>`.
  function anchorClass(): string {
    const start = SKIP_LINK.indexOf("class=");
    expect(start).toBeGreaterThan(-1);
    const quote = SKIP_LINK[start + "class=".length];
    if (quote !== '"' && quote !== "'") throw new Error(`unexpected quote: ${quote}`);
    const close = SKIP_LINK.indexOf(quote, start + "class=".length + 1);
    return SKIP_LINK.slice(start + "class=".length + 1, close);
  }

  const cls = anchorClass();

  test("skip-link ya no usa focus:bg-primary", () => {
    expect(cls).not.toContain("focus:bg-primary");
  });

  test("skip-link ya no usa focus:text-white", () => {
    expect(cls).not.toContain("focus:text-white");
  });

  test("skip-link usa focus:bg-text-primary", () => {
    expect(cls).toContain("focus:bg-text-primary");
  });

  test("skip-link usa focus:text-background", () => {
    expect(cls).toContain("focus:text-background");
  });

  test("skip-link preserva focus-visible:outline-focus (canónico verde de foco)", () => {
    expect(cls).toContain("focus-visible:outline-focus");
  });

  test("skip-link fill ordering: bg-text-primary aparece ANTES que text-background (anti-swap)", () => {
    const fillIdx = cls.indexOf("bg-text-primary");
    const textIdx = cls.indexOf("text-background");
    expect(fillIdx).toBeGreaterThan(-1);
    expect(textIdx).toBeGreaterThan(-1);
    expect(fillIdx).toBeLessThan(textIdx);
  });
});

describe("out-of-scope (allowed primary usages preservados)", () => {
  test("nav-item.tsrx activo sigue usando text-primary-700/dark:text-primary-400", () => {
    expect(NAV_ITEM).toContain("text-primary-700");
    expect(NAV_ITEM).toContain("dark:text-primary-400");
  });

  test("status-message.tsrx success sigue usando text-success (token semántico, no raw primary)", () => {
    expect(STATUS_MESSAGE).toContain("text-success");
  });

  test("login-verification-page.tsrx back link sigue usando primary-700/dark:primary-400 (link inline)", () => {
    expect(LOGIN_VERIFICATION).toContain("text-primary-700");
    expect(LOGIN_VERIFICATION).toContain("dark:text-primary-400");
  });

  test("routes/index.tsrx fallback sigue usando primary-700/dark:primary-400 (link inline)", () => {
    expect(ROUTES_INDEX).toContain("text-primary-700");
    expect(ROUTES_INDEX).toContain("dark:text-primary-400");
  });
});
