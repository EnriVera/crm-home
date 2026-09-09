import type { Clock } from "../../domain/ports/clock";

export function createSystemClock(): Clock {
  return {
    now(): Date {
      return new Date();
    },
  };
}
