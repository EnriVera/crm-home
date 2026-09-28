import type {
  TypeModule,
  TypeRepository,
  TypeRow,
} from "../../domain/ports/type-repository";
import { InvalidTypeInput } from "./errors";

const TYPE_MODULES: readonly TypeModule[] = [
  "tasks",
  "incomes",
  "expenses",
  "schedules",
];

export interface CreateTypeInput {
  userId: string;
  name: string;
  module: TypeModule;
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
 * - `module` pertenece al set cerrado (tasks/incomes/expenses/schedules).
 */
export class CreateType {
  constructor(private readonly deps: CreateTypeDependencies) {}

  async execute(input: CreateTypeInput): Promise<TypeRow> {
    const trimmedName = input.name.trim();
    if (trimmedName.length === 0 || trimmedName.length > 100) {
      throw new InvalidTypeInput("type name must be 1-100 chars");
    }
    if (!TYPE_MODULES.includes(input.module)) {
      throw new InvalidTypeInput(
        `type module must be one of: ${TYPE_MODULES.join(", ")}`,
      );
    }

    return this.deps.typeRepository.insert({
      userId: input.userId,
      name: trimmedName,
      module: input.module,
    });
  }
}
