import { describe, expect, it } from "bun:test";
import { Effect } from "effect";

describe("infrastructure/effect smoke", () => {
  it("Effect.runSync(Effect.succeed(1)) === 1", () => {
    expect(Effect.runSync(Effect.succeed(1))).toBe(1);
  });
});
