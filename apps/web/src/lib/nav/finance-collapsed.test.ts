import { describe, expect, test } from "bun:test";

import { parseFinanceCollapsed } from "./finance-collapsed";

describe("parseFinanceCollapsed (pure decoder)", () => {
  test("null → false (default expanded)", () => {
    expect(parseFinanceCollapsed(null)).toBe(false);
  });

  test("'1' → true (persistido colapsado)", () => {
    expect(parseFinanceCollapsed("1")).toBe(true);
  });

  test("'0' → false (persistido expandido)", () => {
    expect(parseFinanceCollapsed("0")).toBe(false);
  });

  test("cualquier string distinta de '1' → false (defensivo)", () => {
    expect(parseFinanceCollapsed("true")).toBe(false);
    expect(parseFinanceCollapsed("")).toBe(false);
    expect(parseFinanceCollapsed("yes")).toBe(false);
  });
});
