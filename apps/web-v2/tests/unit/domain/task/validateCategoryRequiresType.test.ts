import { describe, expect, it } from "vitest";
import { validateCategoryRequiresType } from "@/domain/task/entities";

describe("validateCategoryRequiresType", () => {
  it("returns ok when categoryId is null", () => {
    const r = validateCategoryRequiresType({
      typeId: "type-1" as never,
      categoryId: null,
    });
    expect(r.ok).toBe(true);
  });

  it("returns err(validation) when categoryId is set but typeId is null", () => {
    const r = validateCategoryRequiresType({
      typeId: null as never,
      categoryId: "cat-1" as never,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.code).toBe("validation");
      expect(r.error.message).toMatch(/category/i);
    }
  });
});
