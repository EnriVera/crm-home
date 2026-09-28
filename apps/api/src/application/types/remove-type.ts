import type { TypeRepository, TypeRow } from "../../domain/ports/type-repository";
import { TypeNotFound } from "./errors";

export interface RemoveTypeInput {
  userId: string;
  typeId: string;
}

export interface RemoveTypeDependencies {
  typeRepository: TypeRepository;
}

/**
 * Caso de uso: soft-delete de un type del user.
 *
 * El repo setea `type_deleted_at = NOW()`. Si el type no existe o ya
 * estaba borrado, `softDelete` no encuentra la fila y tira — lo
 * traducimos a `TypeNotFound` (404 en el handler).
 *
 * Nota sobre dependencias rotas:
 * El campo `categories.cate_type_id` referencia `types.type_id`. Soft-delete
 * NO corta la FK (no hay ON DELETE), por lo que:
 *   - Las categorías existentes de un type borrado siguen activas
 *     (cate_type_id dangling hacia un type borrado).
 *   - El form de nueva tarea / income / expense ya filtra los types por
 *     `type_deleted_at IS NULL`, así que el type borrado desaparece del
 *     selector — pero las filas históricas quedan.
 * El comportamiento es consistente con `delete-expense` (las expenses
 * guardan `category: string` libre y se siguen mostrando). Si en el futuro
 * se quiere bloquear el borrado cuando hay categorías activas, agregar
 * un check acá contra `CategoryLookupRepository.findByTypeId`.
 */
export class RemoveType {
  constructor(private readonly deps: RemoveTypeDependencies) {}

  async execute(input: RemoveTypeInput): Promise<TypeRow> {
    try {
      return await this.deps.typeRepository.softDelete(input);
    } catch (err) {
      if (
        err instanceof Error &&
        (err.message.includes("no result") || err.message.includes("not found"))
      ) {
        throw new TypeNotFound();
      }
      throw err;
    }
  }
}
