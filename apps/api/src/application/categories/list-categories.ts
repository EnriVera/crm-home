import type {
  CategoryRepository,
  CategoryRow,
} from "../../domain/ports/category-repository";

export interface ListCategoriesInput {
  userId: string;
  search: string;
  typeId: string | null;
  limit: number;
}

export interface ListCategoriesDependencies {
  categoryRepository: CategoryRepository;
}

/** Caso de uso: listar las categories del user, filtradas por search/type. */
export class ListCategories {
  constructor(private readonly deps: ListCategoriesDependencies) {}

  execute(input: ListCategoriesInput): Promise<CategoryRow[]> {
    return this.deps.categoryRepository.list({
      userId: input.userId,
      search: input.search,
      typeId: input.typeId,
      limit: input.limit,
    });
  }
}
