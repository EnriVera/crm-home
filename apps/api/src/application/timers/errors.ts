/**
 * Errores de dominio del módulo /schedules → timer.
 */

export class TimerNotFound extends Error {
  readonly code = "TIMER_NOT_FOUND" as const;

  constructor(message = "Timer not found") {
    super(message);
    this.name = "TimerNotFound";
  }
}

export class InvalidTimerInput extends Error {
  readonly code = "INVALID_TIMER_INPUT" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidTimerInput";
  }
}
