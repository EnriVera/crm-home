import type { Transaction } from "./transaction";

/**
 * Puerto CRUD del módulo /config → tipos.
 *
 * Cada user tiene sus propios types (`type_user_id` filtra por sesión). El
 * lookup global (para forms) vive en `TypeLookupRepository` — este puerto
 * es para el CRUD del user.
 *
 * Multi-tenant: filtra por user + `type_deleted_at IS NULL` en toda
 * operación. El repo nunca devuelve filas de otro user.
 *
 * Multi-módulo:
 * - Un `type` pertenece a N módulos (0..4). Vacío `[]` = "aplica a todos
 *   los módulos" (semántica all-modules).
 * - Set cerrado enforced por CHECK en DB (migration 007) Y por
 *   validación en el use case `CreateType` / `UpdateType`.
 * - El filter del list usa array-overlap (Postgres `&&`) para matchear
 *   un type que tenga AL MENOS uno de los módulos seleccionados.
 */
export const TYPE_MODULE_NAMES = [
  "tasks",
  "incomes",
  "expenses",
  "schedules",
] as const;

export type TypeModuleName = (typeof TYPE_MODULE_NAMES)[number];

/** Array de módulos. Vacío = sin filtro. */
export type TypeModules = readonly TypeModuleName[];

export interface TypeRow {
  id: string;
  userId: string;
  name: string;
  modules: TypeModules;
  createdAt: Date;
}

export interface TypeRepository {
  list(params: {
    userId: string;
    search: string;
    /**
     * Filtro multi-módulo. Vacío `[]` = sin filtro (mostrar todos).
     * No vacío = "el type tiene AL MENOS uno de estos módulos" (OR).
     */
    modules: TypeModules;
    limit: number;
  }): Promise<TypeRow[]>;

  findById(params: { userId: string; typeId: string }): Promise<TypeRow | null>;

  insert(params: {
    userId: string;
    name: string;
    modules: TypeModules;
  }): Promise<TypeRow>;

  update(params: {
    userId: string;
    typeId: string;
    name?: string;
    modules?: TypeModules;
  }): Promise<TypeRow>;

  softDelete(params: { userId: string; typeId: string }): Promise<TypeRow>;
}
