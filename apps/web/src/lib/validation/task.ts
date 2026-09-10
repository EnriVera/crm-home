/**
 * Validadores puros del módulo tasks (sin DOM, sin imports de UI).
 * Devuelven la clave i18n del mensaje de error (string) o `null` si pasa.
 *
 * Las constantes (200 chars, 50_000 chars) matchean los `*Schema` del contract
 * `@crm/types` (TASK_TITLE_MAX, TASK_DESCRIPTION_MAX).
 */

export const TASK_TITLE_MAX = 200;
export const TASK_DESCRIPTION_MAX = 50_000;

export function taskTitleRequired(value: string): string | null {
  const trimmed = value.trim();
  if (trimmed.length === 0) return "tasks.form.titleRequired";
  if (trimmed.length > TASK_TITLE_MAX) return "tasks.form.titleTooLong";
  return null;
}

export function taskDescriptionLength(value: string | null): string | null {
  if (value === null) return null;
  if (value.length > TASK_DESCRIPTION_MAX) {
    return "tasks.form.descriptionTooLong";
  }
  return null;
}
