import { describe, expect, it } from "vitest";
import { ORPCError } from "@orpc/client";
import { mapOrpcError } from "@/infrastructure/api/errors";

describe("mapOrpcError", () => {
  it("maps BAD_REQUEST to code:validation", () => {
    const err = mapOrpcError(new ORPCError("BAD_REQUEST", { message: "bad" }));
    expect(err.code).toBe("validation");
  });

  it("maps UNAUTHORIZED to code:unauthenticated", () => {
    const err = mapOrpcError(new ORPCError("UNAUTHORIZED", { message: "no" }));
    expect(err.code).toBe("unauthenticated");
  });

  it("maps RATE_LIMITED to code:rate_limited and preserves the orpcCode detail", () => {
    const orpcErr = new ORPCError("RATE_LIMITED", { message: "slow" });
    const err = mapOrpcError(orpcErr);
    expect(err.code).toBe("rate_limited");
    expect(err.details).toMatchObject({ orpcCode: "RATE_LIMITED" });
  });
});
