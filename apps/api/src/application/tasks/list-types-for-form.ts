import type { TypeLookupRepository } from "../../domain/ports/type-lookup-repository";
import type { TypeCategoriesClientRow } from "../../domain/tasks/types";

export interface ListTypesForFormInput {
  userId: string;
  clieId?: string;
}

export interface ListTypesForFormDependencies {
  typeLookupRepository: TypeLookupRepository;
}

/**
 * Caso de uso: alimentar el select de tipos en el form de tasks.
 *
 * - Sin `clieId` ⇒ devuelve las filas GLOBALES (`tccl_clie_id IS NULL`).
 * - Con `clieId` ⇒ devuelve las filas asociadas al cliente seleccionado.
 *
 * El adapter materializa el filtro `tccl_clie_id`; aquí sólo se pasa el input.
 */
export class ListTypesForForm {
  constructor(private readonly deps: ListTypesForFormDependencies) {}

  async execute(input: ListTypesForFormInput): Promise<TypeCategoriesClientRow[]> {
    return this.deps.typeLookupRepository.listForForm({
      userId: input.userId,
      clieId: input.clieId,
    });
  }
}
