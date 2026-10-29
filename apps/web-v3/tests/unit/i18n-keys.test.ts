import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test, vi } from "vitest";

/**
 * Gate de claves i18n.
 *
 * Un `t("clave.que.no.existe")` no rompe la app: vue-i18n devuelve la
 * clave cruda y el usuario lee "schedules.loadError" en pantalla (así
 * se colaron los errores sin traducir y los links legales del pie de
 * login). Este test recorre el código y falla si alguna clave literal
 * no existe en los mensajes.
 */
vi.stubGlobal(
  "defineI18nConfig",
  (factory: () => unknown) => factory(),
);

// El import es dinámico a propósito: `i18n.config.ts` llama al
// auto-import de Nuxt `defineI18nConfig` al evaluarse, así que el stub
// del global tiene que estar puesto ANTES de que el módulo corra. Un
// import estático se hoistearía por encima del stub y el módulo
// fallaría con ReferenceError.
const config = (await import("../../i18n/i18n.config")).default as {
  messages: { es: Record<string, unknown> };
};

const APP_DIR = join(import.meta.dirname, "../../app");

function walk(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      files.push(...walk(full));
    } else if (full.endsWith(".vue") || full.endsWith(".ts")) {
      files.push(full);
    }
  }
  return files;
}

function resolve(messages: Record<string, unknown>, key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>(
      (node, part) =>
        node && typeof node === "object"
          ? (node as Record<string, unknown>)[part]
          : undefined,
      messages,
    );
}

const LITERAL_KEY = /\bt\(\s*['"]([A-Za-z0-9_.]+)['"]/g;

const usedKeys = new Map<string, string>();
for (const file of walk(APP_DIR)) {
  const source = readFileSync(file, "utf-8");
  for (const match of source.matchAll(LITERAL_KEY)) {
    const key = match[1];
    if (!key) continue;
    if (!usedKeys.has(key)) usedKeys.set(key, file);
  }
}

describe("claves i18n", () => {
  test("el código usa al menos una clave (el escaneo no está vacío)", () => {
    expect(usedKeys.size).toBeGreaterThan(20);
  });

  test("toda clave literal existe en los mensajes", () => {
    const missing = [...usedKeys.entries()]
      .filter(([key]) => resolve(config.messages.es, key) === undefined)
      .map(([key, file]) => `${key} (${file})`);
    expect(missing).toEqual([]);
  });
});
