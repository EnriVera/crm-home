/**
 * Validación de formato de email (D9): client-side, TS puro, testeable sin
 * DOM (`email.test.ts`). Es una puerta de UX, no de seguridad — el servidor
 * valida de verdad cuando exista el change de auth.
 *
 * Regla: local part sin espacios ni `@`, un solo `@`, dominio con al menos un
 * punto y TLD no vacío. Se toleran espacios ALREDEDOR (trim), nunca dentro.
 */

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** ¿El string tiene formato de email válido (tras trim)? */
export function isValidEmail(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "") return false;
  // Un solo `@` (la regex admite varios en el local part al no anclar clases).
  if (trimmed.indexOf("@") !== trimmed.lastIndexOf("@")) return false;
  return EMAIL_PATTERN.test(trimmed);
}
