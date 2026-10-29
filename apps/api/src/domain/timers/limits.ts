/**
 * Límites del timer que la API garantiza (PRD-v2 §8.4).
 *
 * Vive en `domain/` porque lo usan dos casos de uso: el arranque (que
 * cierra la corrida anterior) y la consulta del timer corriente (que
 * auto-cierra la corrida abandonada).
 */

/** El timer se auto-cierra a las 12 horas. */
export const MAX_TIMER_MS = 12 * 60 * 60 * 1000;
