import type { Clock } from "../../domain/ports/clock";

export function createFixedClock(time: Date): Clock {
  return {
    now(): Date {
      return new Date(time);
    },
  };
}
