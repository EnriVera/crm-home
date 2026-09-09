import { describe, expect, test } from "bun:test";
import { createIdGenerator } from "./id-generator";

describe("createIdGenerator", () => {
  test("genera UUIDv7 con formato correcto", () => {
    const generate = createIdGenerator();
    const id = generate();

    expect(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)).toBe(true);
  });

  test("valida versión 7 y variant bits", () => {
    const generate = createIdGenerator();
    const id = generate();
    const parts = id.split("-");

    const versionGroup = parts[2];
    const variantGroup = parts[3];
    if (!versionGroup || !variantGroup) {
      throw new Error("invalid UUID format");
    }

    // Version nibble is the first char of the third group
    expect(versionGroup[0]).toBe("7");
    // Variant nibble: 8, 9, a, or b
    const variant = variantGroup[0]!;
    expect(["8", "9", "a", "b"].includes(variant)).toBe(true);
  });

  test("cada llamada genera un id distinto", () => {
    const generate = createIdGenerator();
    const ids = new Set<string>();
    for (let i = 0; i < 100; i += 1) {
      ids.add(generate());
    }

    expect(ids.size).toBe(100);
  });
});
