import { describe, expect, it } from "vitest";
import { parseOtp } from "@/domain/auth/entities";

describe("parseOtp", () => {
  it("accepts '041283' (leading zeros, PRD-v2 §8.1 acceptance)", () => {
    const r = parseOtp("041283");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.value).toBe("041283");
  });

  it("rejects a too-short code", () => {
    const r = parseOtp("12345");
    expect(r.ok).toBe(false);
  });

  it("rejects non-digits", () => {
    const r = parseOtp("abcdef");
    expect(r.ok).toBe(false);
  });
});
