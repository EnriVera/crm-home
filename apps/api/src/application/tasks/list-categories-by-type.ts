import type { CategoryLookupRepository } from "../../domain/ports/category-lookup-repository";
import type { CategoryRow } from "../../domain/tasks/types";

export interface ListCategoriesByTypeInput {
 userId: string;
 typeId: string;
}

export interface ListCategoriesByTypeDependencies {
 categoryLookupRepository: CategoryLookupRepository;
}

/**
 * Caso de uso: alimentar el select dependiente de categorías en el form de tasks.
 * Devuelve las categorías del usuario que pertenecen al `typeId` dado.
 */
export class ListCategoriesByType {
 constructor(private readonly deps: ListCategoriesByTypeDependencies) {}

 async execute(input: ListCategoriesByTypeInput): Promise<CategoryRow[]> {
  return this.deps.categoryLookupRepository.listByType({
   userId: input.userId,
   typeId: input.typeId,
  });
 }
}
