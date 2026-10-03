import type {
  UserConfig,
  UpdateUserConfigInput,
  Type,
  Category,
  Account,
  App,
  Currency,
} from "@crm/contract/config";
import type { Result } from "../shared/result";
import type { DomainError } from "../shared/errors";

export interface ConfigRepository {
  getUserConfig(): Promise<Result<UserConfig, DomainError>>;
  updateUserConfig(
    input: UpdateUserConfigInput,
  ): Promise<Result<UserConfig, DomainError>>;
  listTypes(): Promise<Result<Type[], DomainError>>;
  listCategories(): Promise<Result<Category[], DomainError>>;
  listAccounts(): Promise<Result<Account[], DomainError>>;
  listApps(): Promise<Result<App[], DomainError>>;
  listCurrencies(): Promise<Result<Currency[], DomainError>>;
}

export type {
  UserConfig,
  UpdateUserConfigInput,
  Type,
  Category,
  Account,
  App,
  Currency,
};
