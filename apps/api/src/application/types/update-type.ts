import {
  TYPE_MODULE_NAMES,
  type TypeModuleName,
  type TypeModules,
  type TypeRepository,
  type TypeRow,
} from "../../domain/ports/type-repository";
import { InvalidTypeInput, TypeNotFound } from "./errors";

export interface UpdateTypeInput {
  userId: string;
  typeId: string;
  name?: string;
  modules?: TypeModules;
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
    if (input.modules !== undefined) {
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
      input = { ...input, modules: normalized };
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
