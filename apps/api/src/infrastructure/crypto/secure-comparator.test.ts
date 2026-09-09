import { describe, expect, test } from "bun:test";
import { createSecureComparator } from "./secure-comparator";

describe("createSecureComparator", () => {
  test("cadenas iguales son iguales", () => {
    const comparator = createSecureComparator();
    expect(comparator.areEqual("041283", "041283")).toBe(true);
  });

  test("cadenas distintas no son iguales", () => {
    const comparator = createSecureComparator();
    expect(comparator.areEqual("041283", "041284")).toBe(false);
  });

  test("cadenas de distinta longitud no son iguales", () => {
    const comparator = createSecureComparator();
    expect(comparator.areEqual("041283", "41283")).toBe(false);
  });

  test("preserva ceros a la izquierda", () => {
    const comparator = createSecureComparator();
    expect(comparator.areEqual("000000", "000000")).toBe(true);
    expect(comparator.areEqual("000000", "000001")).toBe(false);
  });
});
