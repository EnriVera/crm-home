export {
  callAuth,
  callCategoriesByType,
  callClients,
  callConfig,
  callTasks,
  callTimers,
} from "./client";
export type {
  AppWire,
  AuthProcedure,
  AuthProcedureMap,
  CategoryWire,
  ClientProcedure,
  ClientProcedureMap,
  ClientWire,
  ConfigProcedure,
  ConfigProcedureMap,
  CurrencyWire,
  TaskProcedure,
  TaskProcedureMap,
  TaskStateConfigWire,
  TaskStateWire,
  TaskWire,
  TimerProcedure,
  TimerProcedureMap,
  TimerWire,
  TypeWire,
} from "./client";

// ORPCError is re-exported so consumers can do `instanceof` checks without
// importing @orpc/client themselves (PRD-v4 §10.3).
export { ORPCError } from "@orpc/client";
