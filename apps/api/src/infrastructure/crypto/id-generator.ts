import { uuidv7 } from "uuidv7";
import type { IdGenerator } from "../../domain/ports/id-generator";

export function createIdGenerator(): IdGenerator {
  return {
    generate(): string {
      return uuidv7();
    },
  };
}
