export { callAuth, callConfig, callTasks } from "./client";
export type {
  AppWire,
  AuthProcedure,
  AuthProcedureMap,
  ConfigProcedure,
  ConfigProcedureMap,
  CurrencyWire,
  TaskProcedure,
  TaskProcedureMap,
  TaskStateConfigWire,
  TypeWire,
} from "./client";

// ORPCError is re-exported so consumers can do `instanceof` checks without
// importing @orpc/client themselves (PRD-v4 §10.3).
export { ORPCError } from "@orpc/client";
