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
 * Tipo de módulo:
 * - `tasks` → type visible en el form de nueva tarea
 * - `incomes` / `expenses` → type visible en el form de income/expense
 * - `schedules` → type visible en el form de schedule
 *   (otros módulos se agregan cuando se necesiten)
 *
 * El repo NO valida que `type_module` pertenezca a un set cerrado: la
 * validación queda en el contract Zod de `packages/types/src/contracts/types.ts`.
 */
export type TypeModule = "tasks" | "incomes" | "expenses" | "schedules";

export interface TypeRow {
  id: string;
  userId: string;
  name: string;
  module: TypeModule;
  createdAt: Date;
}

export interface TypeRepository {
  list(params: {
    userId: string;
    search: string;
    module: TypeModule | null;
    limit: number;
  }): Promise<TypeRow[]>;

  findById(params: {
    userId: string;
    typeId: string;
  }): Promise<TypeRow | null>;

  insert(params: {
    userId: string;
    name: string;
    module: TypeModule;
  }): Promise<TypeRow>;

  update(params: {
    userId: string;
    typeId: string;
    name?: string;
    module?: TypeModule;
  }): Promise<TypeRow>;

  softDelete(params: {
    userId: string;
    typeId: string;
  }): Promise<TypeRow>;
}
