export * from "./contracts.js";

import { z } from "zod";
import {
  UserId,
  AccountId,
  TypeId,
  CategoryId,
  ClientId,
  CurrencyId,
} from "../shared/identifiers/index.js";

/**
 * Finance entities — Phase 2 of PRD-v2 §8.6. Schemas are defined here so
 * the frontend can import them for type-safe composables; CRUD use cases
 * land in Phase 2 work.
 */

export const IncomeId = z.string().uuid().brand("IncomeId");
export type IncomeId = z.infer<typeof IncomeId>;

export const Income = z.object({
  id: IncomeId,
  userId: UserId,
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  accountId: AccountId,
  clientId: ClientId.nullable(),
  typeId: TypeId,
  categoryId: CategoryId.nullable(),
  currencyId: CurrencyId,
  amount: z.number().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type Income = z.infer<typeof Income>;

export const ExpenseId = z.string().uuid().brand("ExpenseId");
export type ExpenseId = z.infer<typeof ExpenseId>;

export const Expense = z.object({
  id: ExpenseId,
  userId: UserId,
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  accountId: AccountId,
  clientId: ClientId.nullable(),
  typeId: TypeId,
  categoryId: CategoryId.nullable(),
  currencyId: CurrencyId,
  amount: z.number().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type Expense = z.infer<typeof Expense>;

export const TransferId = z.string().uuid().brand("TransferId");
export type TransferId = z.infer<typeof TransferId>;

export const Transfer = z.object({
  id: TransferId,
  userId: UserId,
  accountFromId: AccountId,
  // exactly one of accountToId / other is set
  accountToId: AccountId.nullable(),
  other: z.string().nullable(),
  currencyId: CurrencyId,
  amount: z.number().positive(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  deletedAt: z.string().datetime().nullable(),
});
export type Transfer = z.infer<typeof Transfer>;
