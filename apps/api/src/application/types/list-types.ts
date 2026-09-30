import type {
 TypeModules,
 TypeRepository,
 TypeRow,
} from "../../domain/ports/type-repository";

export interface ListTypesInput {
 userId: string;
 search: string;
 modules: TypeModules;
 limit: number;
}

export interface ListTypesDependencies {
 typeRepository: TypeRepository;
}

/**
 * Caso de uso: listar los types del user.
 *
 * El limit se capa en [1, 100] igual que en los demás módulos (clients,
 * incomes, expenses). El repository ya filtra por user + deleted_at IS NULL.
 *
 * `modules` vacío = sin filtro (mostrar todos). No vacío = filtrar por
 * "any of" los módulos seleccionados (OR).
 */
export class ListTypes {
 constructor(private readonly deps: ListTypesDependencies) {}

 async execute(input: ListTypesInput): Promise<TypeRow[]> {
  const limit = Math.min(Math.max(input.limit, 1), 100);
  return this.deps.typeRepository.list({
   userId: input.userId,
   search: input.search,
   modules: input.modules,
   limit,
  });
 }
}
