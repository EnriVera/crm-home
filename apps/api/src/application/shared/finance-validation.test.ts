import { describe, expect, test } from "bun:test";
import type {
  AccountRepository,
  AccountRow,
} from "../../domain/ports/account-repository";
import type {
  Currency,
  CurrencyRepository,
} from "../../domain/ports/currency-repository";
import {
  validateAccountAndCurrency,
  validateMovementCurrencyChange,
  validateTransferAccountAndCurrency,
  validateTransferCurrencyChange,
} from "./finance-validation";

const USD: Currency = {
  id: "curr-usd",
  name: "Dólar",
  symbol: "$",
  decimals: 2,
};

const EUR: Currency = {
  id: "curr-eur",
  name: "Euro",
  symbol: "€",
  decimals: 2,
};

const ACCOUNT_USD: AccountRow = {
  id: "acco-usd",
  userId: "user-1",
  name: "Dólares",
  icon: "bank",
  color: null,
  currencyId: USD.id,
  initialAmount: "0",
  balance: "0",
  createdAt: new Date(),
};

const ACCOUNT_EUR: AccountRow = {
  ...ACCOUNT_USD,
  id: "acco-eur",
  name: "Euros",
  currencyId: EUR.id,
};

function makeDeps(accounts: AccountRow[] = [ACCOUNT_USD, ACCOUNT_EUR]) {
  const accountRepository: AccountRepository = {
    listByUser: () => Promise.resolve(accounts),
    findById: (params) =>
      Promise.resolve(
        accounts.find(
          (account) =>
            account.id === params.accountId && account.userId === params.userId,
        ) ?? null,
      ),
    insert: () => {
      throw new Error("no se inserta en este test");
    },
  };
  const currencyRepository: CurrencyRepository = {
    list: () => Promise.resolve([USD, EUR]),
    findById: (id) =>
      Promise.resolve([USD, EUR].find((currency) => currency.id === id) ?? null),
    insert: () => {
      throw new Error("no se inserta en este test");
    },
  };
  return { accountRepository, currencyRepository };
}

/** El error de dominio que arma el caller: acá, uno simple con el mensaje. */
const invalid = (message: string) => new Error(message);

describe("validateAccountAndCurrency", () => {
  test("acepta un movimiento en la moneda de su cuenta", async () => {
    const deps = makeDeps();

    const account = await validateAccountAndCurrency(
      deps,
      { userId: "user-1", accountId: ACCOUNT_USD.id, currencyId: USD.id },
      invalid,
    );

    expect(account.id).toBe(ACCOUNT_USD.id);
  });

  test("rechaza un movimiento en una moneda que no es la de su cuenta", async () => {
    const deps = makeDeps();

    await expect(
      validateAccountAndCurrency(
        deps,
        { userId: "user-1", accountId: ACCOUNT_USD.id, currencyId: EUR.id },
        invalid,
      ),
    ).rejects.toThrow(
      "the movement currency must match the account currency",
    );
  });

  test("rechaza una cuenta que no es del usuario", async () => {
    const deps = makeDeps();

    await expect(
      validateAccountAndCurrency(
        deps,
        { userId: "user-2", accountId: ACCOUNT_USD.id, currencyId: USD.id },
        invalid,
      ),
    ).rejects.toThrow("account does not belong to the user");
  });
});

describe("validateTransferAccountAndCurrency", () => {
  test("acepta una transferencia en la moneda de sus dos cuentas", async () => {
    const deps = makeDeps();

    await validateTransferAccountAndCurrency(
      deps,
      {
        userId: "user-1",
        fromAccountId: ACCOUNT_USD.id,
        toAccountId: ACCOUNT_USD.id,
        currencyId: USD.id,
      },
      invalid,
    );
  });

  test("rechaza una transferencia cuya moneda no es la de la cuenta de origen", async () => {
    const deps = makeDeps();

    await expect(
      validateTransferAccountAndCurrency(
        deps,
        {
          userId: "user-1",
          fromAccountId: ACCOUNT_USD.id,
          toAccountId: ACCOUNT_EUR.id,
          currencyId: EUR.id,
        },
        invalid,
      ),
    ).rejects.toThrow(
      "the transfer currency must match the currency of both accounts",
    );
  });

  test("rechaza una transferencia cuya moneda no es la de la cuenta de destino", async () => {
    const deps = makeDeps();

    await expect(
      validateTransferAccountAndCurrency(
        deps,
        {
          userId: "user-1",
          fromAccountId: ACCOUNT_EUR.id,
          toAccountId: ACCOUNT_USD.id,
          currencyId: EUR.id,
        },
        invalid,
      ),
    ).rejects.toThrow(
      "the transfer currency must match the currency of both accounts",
    );
  });
});

describe("validateMovementCurrencyChange", () => {
  test("rechaza cambiar la moneda de un movimiento a otra que no es la de su cuenta", async () => {
    const deps = makeDeps();

    await expect(
      validateMovementCurrencyChange(
        deps,
        {
          userId: "user-1",
          currentAccountId: ACCOUNT_USD.id,
          currentCurrencyId: USD.id,
          currencyId: EUR.id,
        },
        invalid,
      ),
    ).rejects.toThrow(
      "the movement currency must match the account currency",
    );
  });

  test("no valida un update que no toca la cuenta ni la moneda", async () => {
    const deps = makeDeps();

    await validateMovementCurrencyChange(
      deps,
      {
        userId: "user-1",
        currentAccountId: ACCOUNT_USD.id,
        currentCurrencyId: USD.id,
      },
      invalid,
    );
  });
});

describe("validateTransferCurrencyChange", () => {
  test("rechaza cambiar la moneda de una transferencia a otra que no es la de sus cuentas", async () => {
    const deps = makeDeps();

    await expect(
      validateTransferCurrencyChange(
        deps,
        {
          userId: "user-1",
          currentFromAccountId: ACCOUNT_USD.id,
          currentToAccountId: ACCOUNT_USD.id,
          currentCurrencyId: USD.id,
          currencyId: EUR.id,
        },
        invalid,
      ),
    ).rejects.toThrow(
      "the transfer currency must match the currency of both accounts",
    );
  });
});
