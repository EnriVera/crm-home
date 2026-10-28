import type {
  CategoryRepository,
  CategoryRow,
} from "../../domain/ports/category-repository";
import { CategoryNotFound } from "./errors";

export interface RemoveCategoryInput {
  userId: string;
  categoryId: string;
}

export interface RemoveCategoryDependencies {
  categoryRepository: CategoryRepository;
}

/**
 * Caso de uso: borrado lógico de una category del user.
 *
 * Devuelve la fila soft-deleted para que el response refleje lo que
 * se hizo; si no existe tira `CategoryNotFound`.
 */
export class RemoveCategory {
  constructor(private readonly deps: RemoveCategoryDependencies) {}

  async execute(input: RemoveCategoryInput): Promise<CategoryRow> {
    const existing = await this.deps.categoryRepository.findById({
      userId: input.userId,
      categoryId: input.categoryId,
    });
    if (!existing) {
      throw new CategoryNotFound();
    }

    return this.deps.categoryRepository.softDelete({
      userId: input.userId,
      categoryId: input.categoryId,
    });
  }
}
