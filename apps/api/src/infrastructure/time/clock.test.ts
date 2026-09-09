import { describe, expect, test } from "bun:test";
import { createFixedClock } from "./fixed-clock";
import { createSystemClock } from "./system-clock";

describe("createSystemClock", () => {
  test("now devuelve una fecha cercana a Date.now()", () => {
    const clock = createSystemClock();
    const before = Date.now();
    const now = clock.now().getTime();
    const after = Date.now();

    expect(now).toBeGreaterThanOrEqual(before);
    expect(now).toBeLessThanOrEqual(after);
  });
});

describe("createFixedClock", () => {
  test("now devuelve siempre la misma fecha", () => {
    const fixed = new Date("2025-01-15T12:00:00.000Z");
    const clock = createFixedClock(fixed);

    expect(clock.now()).toEqual(fixed);
    expect(clock.now()).toEqual(fixed);
  });

  test("no muta la fecha original", () => {
    const fixed = new Date("2025-01-15T12:00:00.000Z");
    const clock = createFixedClock(fixed);
    const first = clock.now();
    first.setFullYear(2030);

    expect(clock.now()).toEqual(fixed);
  });
});
