import {
  TYPE_MODULE_NAMES,
  type TypeModuleName,
  type TypeModules,
  type TypeRepository,
  type TypeRow,
} from "../../domain/ports/type-repository";
import { InvalidTypeInput } from "./errors";

export interface CreateTypeInput {
  userId: string;
  name: string;
  modules: TypeModules;
}

export interface CreateTypeDependencies {
  typeRepository: TypeRepository;
}

/**
 * Caso de uso: crear un type nuevo para el user.
 *
 * Validaciones (defensa en profundidad — el contract Zod ya valida, pero
 * un caller directo como un seeder podría saltárselas):
 * - `name` 1-100 chars tras trim.
 * - `modules` es un array; cada elemento ∈ set cerrado.
 * - Vacío `[]` permitido (= "all modules").
 * - Dedup + orden estable (sort) antes de persistir.
 */
export class CreateType {
  constructor(private readonly deps: CreateTypeDependencies) {}

  async execute(input: CreateTypeInput): Promise<TypeRow> {
    const trimmedName = input.name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      throw new InvalidTypeInput("type name must be 1-100 chars");
    }
    for (const module of input.modules) {
      if (!TYPE_MODULE_NAMES.includes(module as TypeModuleName)) {
        throw new InvalidTypeInput(
          `type modules must be a subset of: ${TYPE_MODULE_NAMES.join(", ")}`,
        );
      }
    }
    const normalized: TypeModules = Array.from(
      new Set(input.modules),
    ).sort() as TypeModules;

    return this.deps.typeRepository.insert({
      userId: input.userId,
      name: trimmedName,
      modules: normalized,
    });
  }
}
