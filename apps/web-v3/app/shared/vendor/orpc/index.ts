export {
  callAccounts,
  callAuth,
  callCategoriesByType,
  callClients,
  callConfig,
  callFinance,
  callTasks,
  callTimers,
} from "./client";
export type {
  AccountProcedure,
  AccountProcedureMap,
  AccountWire,
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
  ExpenseWire,
  FinanceProcedure,
  FinanceProcedureMap,
  IncomeWire,
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
