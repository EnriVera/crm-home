import { randomInt } from "node:crypto";
import type { OtpGenerator } from "../../domain/ports/otp-generator";

/**
 * Genera códigos OTP de 6 dígitos decimales.
 *
 * `crypto.randomInt(0, 1_000_000)` devuelve enteros uniformemente distribuidos
 * en [0, 999999] sin sesgo por módulo (la implementación interna descarta
 * valores fuera del rango completo de bloques). El resultado se formatea con
 * `padStart(6, '0')` para preservar ceros a la izquierda.
 */
export function createOtpGenerator(): OtpGenerator["generate"] {
  return () => randomInt(0, 1_000_000).toString().padStart(6, "0");
}
