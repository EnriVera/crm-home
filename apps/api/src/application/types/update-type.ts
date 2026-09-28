import type {
  TypeModule,
  TypeRepository,
  TypeRow,
} from "../../domain/ports/type-repository";
import { InvalidTypeInput, TypeNotFound } from "./errors";

const TYPE_MODULES: readonly TypeModule[] = [
  "tasks",
  "incomes",
  "expenses",
  "schedules",
];

export interface UpdateTypeInput {
  userId: string;
  typeId: string;
  name?: string;
  module?: TypeModule;
}

export interface UpdateTypeDependencies {
  typeRepository: TypeRepository;
}

/**
 * Caso de uso: actualizar un type del user.
 *
 * Solo se actualizan los campos provistos (los `undefined` se omiten en
 * el repo). Si el type no existe o pertenece a otro user, `update` retorna
 * "no row" — lo traducimos a `TypeNotFound` (404 en el handler).
 */
export class UpdateType {
  constructor(private readonly deps: UpdateTypeDependencies) {}

  async execute(input: UpdateTypeInput): Promise<TypeRow> {
    if (input.name !== undefined) {
      const trimmed = input.name.trim();
      if (trimmed.length === 0 || trimmed.length > 100) {
        throw new InvalidTypeInput("type name must be 1-100 chars");
      }
      input = { ...input, name: trimmed };
    }
    if (input.module !== undefined && !TYPE_MODULES.includes(input.module)) {
      throw new InvalidTypeInput(
        `type module must be one of: ${TYPE_MODULES.join(", ")}`,
      );
    }

    try {
      return await this.deps.typeRepository.update(input);
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
