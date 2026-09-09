import { describe, expect, test } from "bun:test";
import { createTokenHasher } from "./token-hasher";

describe("createTokenHasher", () => {
  test("hash produce SHA-256 en hex (64 caracteres)", () => {
    const hasher = createTokenHasher();
    const hash = hasher.hash("token-1");

    expect(hash).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(hash)).toBe(true);
  });

  test("verify positivo con el mismo token", () => {
    const hasher = createTokenHasher();
    const hash = hasher.hash("token-1");

    expect(hasher.verify("token-1", hash)).toBe(true);
  });

  test("verify negativo con token distinto", () => {
    const hasher = createTokenHasher();
    const hash = hasher.hash("token-1");

    expect(hasher.verify("token-2", hash)).toBe(false);
  });

  test("tokens de distinta longitud no verifican", () => {
    const hasher = createTokenHasher();
    const hash = hasher.hash("short");

    expect(hasher.verify("different-length-token", hash)).toBe(false);
  });

  test("hash es determinista para el mismo token", () => {
    const hasher = createTokenHasher();

    expect(hasher.hash("token-1")).toBe(hasher.hash("token-1"));
  });
});
