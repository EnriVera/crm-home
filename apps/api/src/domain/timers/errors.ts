/**
 * Errores de dominio del contexto `timers`.
 *
 * Vive en `domain/` (y no en `application/`) porque lo usan las dos
 * capas de adentro del hexágono: el adapter de kysely lo lanza cuando
 * la base rechaza el insert (índice parcial único de la migración
 * 009) y el caso de uso `StartTimer` lo usa para reintentar el
 * arranque.
 */

/**
 * Ya hay una corrida abierta para ese usuario y la base la rechazó.
 *
 * La base garantiza "una sola corrida abierta por usuario" con un
 * índice parcial único: dos arranques simultáneos (doble click, dos
 * tabs) no pueden dejar dos corridas colgadas. El que pierde la
 * carrera recibe este error y reintenta (cerrando la corrida que
 * quedó abierta), así que el usuario nunca ve un 500 por un doble
 * click.
 */
export class TimerAlreadyRunningError extends Error {
  readonly code = "TIMER_ALREADY_RUNNING" as const;

  constructor(message = "A timer is already running for this user") {
    super(message);
    this.name = "TimerAlreadyRunningError";
  }
}
