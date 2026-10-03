export * from "./types-contracts.js";

import { z } from "zod";
import {
  UserId,
  TypeId,
  CategoryId,
  AccountId,
  AppId,
  CurrencyId,
  ClientId,
} from "../shared/identifiers/index.js";
import { UserTheme } from "../auth/index.js";

export const Type = z.object({
  id: TypeId,
  userId: UserId,
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  color: z.string().nullable(),
  icon: z.string().nullable(),
  appId: AppId,
});
export type Type = z.infer<typeof Type>;

export const Category = z.object({
  id: CategoryId,
  userId: UserId,
  title: z.string().min(1).max(255),
  description: z.string().nullable(),
  icon: z.string().nullable(),
  color: z.string().nullable(),
  appId: AppId,
});
export type Category = z.infer<typeof Category>;

export const Account = z.object({
  id: AccountId,
  userId: UserId,
  title: z.string().min(1).max(255),
  icon: z.string(),
  color: z.string(),
  currencyId: CurrencyId,
  initialAmount: z.number().finite(),
});
export type Account = z.infer<typeof Account>;

export const App = z.object({
  id: AppId,
  name: z.string().min(1).max(255),
  description: z.string().nullable(),
  url: z.string().nullable(),
  active: z.boolean(),
});
export type App = z.infer<typeof App>;

export const Currency = z.object({
  id: CurrencyId,
  title: z.string().min(1).max(255),
  code: z.string().min(1).max(8),
  symbol: z.string().min(1).max(4),
  decimal: z.number().int().min(0).max(6),
});
export type Currency = z.infer<typeof Currency>;

/** UserConfig — what /config reads and writes (besides the per-entity CRUDs). */
export const UserConfig = z.object({
  theme: UserTheme,
});
export type UserConfig = z.infer<typeof UserConfig>;

export const UpdateUserConfigInput = UserConfig.partial();
export type UpdateUserConfigInput = z.infer<typeof UpdateUserConfigInput>;

/** TypeCategoriesClient — the cross-reference between Type, Category and Client. */
export const TypeCategoryClientRef = z.object({
  typeId: TypeId,
  categoryId: CategoryId,
  clientId: ClientId.nullable(), // null = global
});
export type TypeCategoryClientRef = z.infer<typeof TypeCategoryClientRef>;
