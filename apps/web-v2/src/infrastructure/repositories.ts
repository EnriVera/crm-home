/**
 * Composition root for the infrastructure layer. The application layer
 * never imports from this file directly — use cases receive the ports as
 * arguments and the wiring happens in the bootstrap (`src/app/main.ts`).
 *
 * Per PRD-v3 §5 the orpc port implementations live in
 * `infrastructure/api/procedures/<entity>-repository.ts`, NOT one level
 * up. The `infrastructure/api/errors.ts` mapping utility is the only file
 * that stays at the parent level.
 */
import { createOrpcAuthRepository } from "./api/procedures/auth-repository";
import {
 createOrpcTaskRepository,
 createOrpcTaskStateRepository,
 createOrpcTaskFormListersRepository,
} from "./api/procedures/task-repository";

export const authRepository = createOrpcAuthRepository();
export const taskRepository = createOrpcTaskRepository();
export const taskStateRepository = createOrpcTaskStateRepository();
export const taskFormListersRepository =
 createOrpcTaskFormListersRepository();
