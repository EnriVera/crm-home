import { describe, expect, it } from "vitest";
import { ok, err } from "@/domain/shared/result";

describe("Result", () => {
  it("ok(value) returns { ok: true, value }", () => {
    const r = ok(42);
    expect(r).toEqual({ ok: true, value: 42 });
  });

  it("err(e) returns { ok: false, error: e }", () => {
    const e = { code: "x" as const, message: "boom" };
    const r = err(e);
    expect(r).toEqual({ ok: false, error: e });
  });

  it("ok branch reports ok === true", () => {
    expect(ok("v").ok).toBe(true);
  });

  it("err branch reports ok === false", () => {
    expect(err({ code: "x" as const, message: "x" }).ok).toBe(false);
  });
});
