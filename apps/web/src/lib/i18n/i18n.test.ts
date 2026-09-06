import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { getI18n, t } from "../../components/vendor/i18n/core";
import { i18n } from "./config";
import es from "./locales/es.json";

/**
 * Smoke test puro (D10): sin DOM, sin red, sin compilador .tsrx.
 * Verifica el idioma default `es`, las cadenas del catálogo y, de forma
 * estática (leyendo fuentes como texto), que las claves usadas por la página
 * de humo y los componentes que compone existen en el catálogo.
 */

function catalogValue(key: string): unknown {
  return key.split(".").reduce<unknown>(
    (node, segment) =>
      node !== null && typeof node === "object"
        ? (node as Record<string, unknown>)[segment]
        : undefined,
    es,
  );
}

describe("i18n scaffold (es default)", () => {
  test("el idioma default es español", () => {
    expect(i18n.language).toBe("es");
    expect(getI18n()).toBe(i18n);
  });

  test("t() devuelve las cadenas del catálogo", () => {
    expect(t("app.title")).toBe("CRM Home");
    expect(t("smoke.description")).toBe(es.smoke.description);
    expect(t("smoke.feature.title")).toBe(es.smoke.feature.title);
    expect(t("smoke.feature.body")).toBe(es.smoke.feature.body);
  });

  test("las claves usadas en la página de humo y su composición existen en el catálogo", () => {
    const sources = [
      "../../components/pages/smoke-page.tsrx",
      "../../components/atoms/app-title.tsrx",
      "../../components/molecules/feature-card.tsrx",
    ];
    const usedKeys = new Set<string>();
    for (const source of sources) {
      const code = readFileSync(join(import.meta.dir, source), "utf8");
      for (const match of code.matchAll(/\bt\(\s*"([^"]+)"/g)) {
        usedKeys.add(match[1]!);
      }
    }

    expect(usedKeys.size).toBeGreaterThanOrEqual(4);
    for (const key of usedKeys) {
      expect(typeof catalogValue(key), `clave ausente en es.json: ${key}`).toBe(
        "string",
      );
      expect(t(key)).not.toBe(key);
    }
  });
});
