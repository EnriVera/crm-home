import { describe, expect, test } from "bun:test";
import { Glob } from "bun";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getI18n, t } from "../../components/vendor/i18n/core";
import { NAV_TREE } from "../nav/tree";
import { i18n } from "./config";
import es from "./locales/es.json";

/**
 * Test de escaneo i18n (D10): sin DOM, sin red, sin compilador .tsrx.
 * Verifica el idioma default `es` y, de forma estática (leyendo TODAS las
 * fuentes como texto, glob de `src` para extensiones .ts y .tsrx), que toda
 * clave literal `t("...")` usada en el código existe en el catálogo `es.json`.
 */

const SRC_DIR = join(import.meta.dir, "../..");

function catalogValue(key: string): unknown {
  return key.split(".").reduce<unknown>(
    (node, segment) =>
      node !== null && typeof node === "object"
        ? (node as Record<string, unknown>)[segment]
        : undefined,
    es,
  );
}

/** Escanea todas las fuentes y devuelve el set de claves literales `t("...")`. */
function scanUsedKeys(): Set<string> {
  const usedKeys = new Set<string>();
  const glob = new Glob("**/*.{ts,tsrx}");
  for (const file of glob.scanSync({ cwd: SRC_DIR, absolute: true })) {
    if (file.endsWith(".test.ts")) continue; // los tests no son fuentes de UI
    const code = readFileSync(file, "utf8");
    for (const match of code.matchAll(/\bt\(\s*"([^"]+)"/g)) {
      usedKeys.add(match[1]!);
    }
  }
  return usedKeys;
}

describe("i18n (es default)", () => {
  test("el idioma default es español", () => {
    expect(i18n.language).toBe("es");
    expect(getI18n()).toBe(i18n);
  });

  test("t() devuelve las cadenas del catálogo", () => {
    expect(t("app.title")).toBe("CRM Home");
    expect(t("nav.ariaLabel")).toBe(es.nav.ariaLabel);
    expect(t("shell.skipToContent")).toBe(es.shell.skipToContent);
  });

  test('toda clave literal t("...") de src (.ts/.tsrx) existe en es.json', () => {
    const usedKeys = scanUsedKeys();

    // Sanidad del propio escaneo: si el glob o el regex se rompen, este piso
    // lo delata (app/shell/nav/theme ya suman claves literales en las fuentes).
    expect(usedKeys.size).toBeGreaterThanOrEqual(8);
    expect(usedKeys.has("app.title")).toBe(true);
    expect(usedKeys.has("nav.ariaLabel")).toBe(true);

    for (const key of usedKeys) {
      expect(typeof catalogValue(key), `clave ausente en es.json: ${key}`).toBe(
        "string",
      );
      expect(t(key), `t() devolvió la propia clave: ${key}`).not.toBe(key);
    }
  });

  test("las labelKey dinámicas del árbol de nav existen en es.json", () => {
    // El sidebar traduce `t(node.labelKey)` (dinámico: el escaneo regex no lo
    // captura); se verifican contra el catálogo de forma explícita.
    const labelKeys = NAV_TREE.flatMap((node) =>
      node.type === "group"
        ? [node.labelKey, ...node.children.map((child) => child.labelKey)]
        : [node.labelKey],
    );
    expect(labelKeys.length).toBe(9);
    for (const key of labelKeys) {
      expect(typeof catalogValue(key), `labelKey ausente en es.json: ${key}`).toBe(
        "string",
      );
    }
  });

  test("auto-verificación: una clave borrada es detectada como ausente", () => {
    // Las claves smoke.* del scaffold fueron retiradas con su página; el
    // verificador debe verlas como ausentes (prueba de que el chequeo muerde).
    expect(catalogValue("smoke.description")).toBeUndefined();
    expect(scanUsedKeys().has("smoke.description")).toBe(false);
  });
});
