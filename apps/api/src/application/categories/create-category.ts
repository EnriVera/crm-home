import type {
  CategoryRepository,
  CategoryRow,
} from "../../domain/ports/category-repository";
import type { TypeRepository } from "../../domain/ports/type-repository";
import { InvalidCategoryInput } from "./errors";

export interface CreateCategoryInput {
  userId: string;
  name: string;
  typeId: string;
}

export interface CreateCategoryDependencies {
  categoryRepository: CategoryRepository;
  typeRepository: TypeRepository;
}

/**
 * Caso de uso: crear una category nueva para el user.
 *
 * Validaciones (defensa en profundidad, el contract Zod ya valida):
 * - `name` 1-255 chars tras trim.
 * - `typeId` pertenece al MISMO user: la FK de `categories.cate_type_id`
 *   no conoce de tenants y aceptaría el type de otro user.
 */
export class CreateCategory {
  constructor(private readonly deps: CreateCategoryDependencies) {}

  async execute(input: CreateCategoryInput): Promise<CategoryRow> {
    const trimmedName = input.name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 255) {
      throw new InvalidCategoryInput("category name must be 1-255 chars");
    }
    if (input.typeId.trim().length === 0) {
      throw new InvalidCategoryInput("category typeId is required");
    }

    const type = await this.deps.typeRepository.findById({
      userId: input.userId,
      typeId: input.typeId,
    });
    if (!type) {
      throw new InvalidCategoryInput("category typeId does not exist");
    }

    return this.deps.categoryRepository.insert({
      userId: input.userId,
      name: trimmedName,
      typeId: input.typeId,
    });
  }
}
