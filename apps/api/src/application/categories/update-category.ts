import type {
  CategoryRepository,
  CategoryRow,
} from "../../domain/ports/category-repository";
import type { TypeRepository } from "../../domain/ports/type-repository";
import type { DataColor } from "../../domain/types";
import { CategoryNotFound, InvalidCategoryInput } from "./errors";

export interface UpdateCategoryInput {
  userId: string;
  categoryId: string;
  name?: string;
  typeId?: string;
  /** Color de dato (token del design system). `null` = quitar el color. */
  color?: DataColor | null;
}

export interface UpdateCategoryDependencies {
  categoryRepository: CategoryRepository;
  typeRepository: TypeRepository;
}

/**
 * Caso de uso: renombrar / re-typed una category del user.
 *
 * Devuelve la fila actualizada; si no existe (o es de otro user,
 * indistinguible en multi-tenant) tira `CategoryNotFound`. Un
 * `typeId` nuevo debe pertenecer al mismo user (la FK no lo valida).
 */
export class UpdateCategory {
  constructor(private readonly deps: UpdateCategoryDependencies) {}

  async execute(input: UpdateCategoryInput): Promise<CategoryRow> {
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length === 0 || trimmed.length > 255) {
        throw new InvalidCategoryInput("category name must be 1-255 chars");
      }
    }

    const existing = await this.deps.categoryRepository.findById({
      userId: input.userId,
      categoryId: input.categoryId,
    });
    if (!existing) {
      throw new CategoryNotFound();
    }

    if (input.typeId !== undefined) {
      const type = await this.deps.typeRepository.findById({
        userId: input.userId,
        typeId: input.typeId,
      });
      if (!type) {
        throw new InvalidCategoryInput("category typeId does not exist");
      }
    }

    return this.deps.categoryRepository.update({
      userId: input.userId,
      categoryId: input.categoryId,
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.typeId !== undefined ? { typeId: input.typeId } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
    });
  }
}
