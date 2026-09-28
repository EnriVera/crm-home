import type { Transaction } from "./transaction";

/**
 * `apps` — registro global seedeado de los módulos de la aplicación
 * (PRD §8.7 línea 254: tasks, schedule, finance…). Visible solo lectura
 * para end users en el MVP. Las FK de `task_type` y `task_category`
 * apuntan a esta tabla.
 *
 * Patrón: el type y el port conviven en este archivo (mismo patrón que
 * `user-repository.ts`).
 */
export interface App {
  id: string;
  name: string;
}

export interface AppRepository {
  /** Lista todos los módulos (sin paginación — el seed actual es chico). */
  list(trx?: Transaction): Promise<App[]>;
}
