import { beforeEach, describe, expect, test } from "bun:test";
import type {
  AccountRepository,
  AccountRow,
} from "../../domain/ports/account-repository";
import type {
  Currency,
  CurrencyRepository,
} from "../../domain/ports/currency-repository";
import { CreateAccount } from "./create-account";
import { InvalidAccountInput } from "./errors";

const CURRENCY: Currency = {
  id: "curr-1",
  name: "Peso argentino",
  symbol: "$",
  decimals: 2,
};

function makeDeps(overrides: {
  currency?: Currency | null;
  inserted?: AccountRow;
} = {}) {
  const inserted: AccountRow = overrides.inserted ?? {
    id: "acco-1",
    userId: "user-1",
    name: "Banco Nación",
    icon: "bank",
    color: "#3b82f6",
    currencyId: CURRENCY.id,
    initialAmount: "1000.0000",
    balance: "1000.0000",
    createdAt: new Date(),
  };
  const calls: { insert?: unknown } = {};
  const accountRepository: AccountRepository = {
    insert: (params) => {
      calls.insert = params;
      return Promise.resolve(inserted);
    },
    listByUser: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
  };
  const currencyRepository: CurrencyRepository = {
    findById: () =>
      Promise.resolve(
        overrides.currency === undefined ? CURRENCY : overrides.currency,
      ),
    list: () => Promise.resolve([]),
    insert: () => Promise.resolve(CURRENCY),
  };
  return { deps: { accountRepository, currencyRepository }, calls, inserted };
}

describe("CreateAccount", () => {
  let deps: ReturnType<typeof makeDeps>["deps"];
  let calls: ReturnType<typeof makeDeps>["calls"];

  beforeEach(() => {
    ({ deps, calls } = makeDeps());
  });

  test("crea la cuenta con el nombre trimado y los campos del input", async () => {
    const useCase = new CreateAccount(deps);
    const row = await useCase.execute({
      userId: "user-1",
      name: "  Banco Nación  ",
      icon: "bank",
      color: "#3b82f6",
      currencyId: CURRENCY.id,
      initialAmount: "250.50",
    });
    expect(calls.insert).toEqual({
      userId: "user-1",
      name: "Banco Nación",
      icon: "bank",
      color: "#3b82f6",
      currencyId: CURRENCY.id,
      initialAmount: "250.50",
    });
    expect(row.id).toBe("acco-1");
    // El balance de una cuenta nueva es el saldo inicial.
    expect(row.balance).toBe("1000.0000");
  });

  test("rechaza el nombre vacío con InvalidAccountInput", async () => {
    const useCase = new CreateAccount(deps);
    await expect(
      useCase.execute({
        userId: "user-1",
        name: "   ",
        icon: null,
        color: null,
        currencyId: CURRENCY.id,
        initialAmount: "0",
      }),
    ).rejects.toBeInstanceOf(InvalidAccountInput);
  });

  test("rechaza un saldo inicial negativo", async () => {
    const useCase = new CreateAccount(deps);
    await expect(
      useCase.execute({
        userId: "user-1",
        name: "Banco",
        icon: null,
        color: null,
        currencyId: CURRENCY.id,
        initialAmount: "-10",
      }),
    ).rejects.toBeInstanceOf(InvalidAccountInput);
  });

  test("rechaza un saldo inicial con formato inválido", async () => {
    const useCase = new CreateAccount(deps);
    await expect(
      useCase.execute({
        userId: "user-1",
        name: "Banco",
        icon: null,
        color: null,
        currencyId: CURRENCY.id,
        initialAmount: "abc",
      }),
    ).rejects.toBeInstanceOf(InvalidAccountInput);
  });

  test("rechaza una moneda que no existe", async () => {
    const { deps: depsMissing } = makeDeps({ currency: null });
    const useCase = new CreateAccount(depsMissing);
    await expect(
      useCase.execute({
        userId: "user-1",
        name: "Banco",
        icon: null,
        color: null,
        currencyId: "curr-que-no-existe",
        initialAmount: "0",
      }),
    ).rejects.toBeInstanceOf(InvalidAccountInput);
  });
});
