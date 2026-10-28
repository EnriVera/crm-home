export { callAuth, callTasks } from "./client";
export type {
  AuthProcedure,
  AuthProcedureMap,
  TaskProcedure,
  TaskProcedureMap,
} from "./client";

// ORPCError is re-exported so consumers can do `instanceof` checks without
// importing @orpc/client themselves (PRD-v4 §10.3).
export { ORPCError } from "@orpc/client";
