import { beforeEach, describe, expect, test } from "bun:test";
import type {
  AccountRepository,
  AccountRow,
} from "../../domain/ports/account-repository";
import type {
  Currency,
  CurrencyRepository,
} from "../../domain/ports/currency-repository";
import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import { CreateIncome } from "./create-income";
import { InvalidIncomeInput } from "./errors";

const ACCOUNT: AccountRow = {
  id: "acco-1",
  userId: "user-1",
  name: "Efectivo",
  icon: "wallet",
  color: "#64748b",
  currencyId: "curr-1",
  initialAmount: "0",
  balance: "0",
  createdAt: new Date(),
};

const CURRENCY: Currency = {
  id: "curr-1",
  name: "Peso argentino",
  symbol: "$",
  decimals: 2,
};

function makeDeps(options: {
  account?: AccountRow | null;
  currency?: Currency | null;
} = {}) {
  const inserted: IncomeRow[] = [];
  const accountRepository: AccountRepository = {
    listByUser: () => Promise.resolve([]),
    // Como el repo real: la cuenta se busca por user + id.
    findById: (params) => {
      const account =
        options.account === undefined ? ACCOUNT : options.account;
      if (!account || account.userId !== params.userId) {
        return Promise.resolve(null);
      }
      return Promise.resolve(account);
    },
    insert: () => {
      throw new Error("no se inserta en este test");
    },
  };
  const currencyRepository: CurrencyRepository = {
    list: () => Promise.resolve([]),
    findById: () =>
      Promise.resolve(
        options.currency === undefined ? CURRENCY : options.currency,
      ),
    insert: () => Promise.resolve(CURRENCY),
  };
  const incomeRepository: IncomeRepository = {
    list: () => Promise.resolve([]),
    findById: () => Promise.resolve(null),
    insert: (params) => {
      const row: IncomeRow = {
        id: "inc-1",
        userId: params.userId,
        amount: params.amount,
        currencyId: params.currencyId,
        accountId: params.accountId,
        description: params.description,
        category: params.category,
        date: params.date,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      };
      inserted.push(row);
      return Promise.resolve(row);
    },
    update: () => Promise.resolve(inserted[0]!),
    softDelete: () => Promise.resolve(inserted[0]!),
  };
  return {
    deps: { incomeRepository, accountRepository, currencyRepository },
    inserted,
  };
}

const INPUT = {
  userId: "user-1",
  accountId: "acco-1",
  amount: "250.0000",
  currencyId: "curr-1",
  description: "Factura #1",
  category: null,
  date: "2026-10-30",
};

describe("CreateIncome", () => {
  let deps: ReturnType<typeof makeDeps>["deps"];
  let inserted: ReturnType<typeof makeDeps>["inserted"];

  beforeEach(() => {
    ({ deps, inserted } = makeDeps());
  });

  test("crea el ingreso cuando la cuenta es del usuario", async () => {
    const useCase = new CreateIncome(deps);
    const row = await useCase.execute(INPUT);
    expect(row.id).toBe("inc-1");
    expect(inserted).toHaveLength(1);
  });

  test("rechaza una cuenta que no es del usuario", async () => {
    const { deps: depsSinCuenta } = makeDeps({ account: null });
    const useCase = new CreateIncome(depsSinCuenta);
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      InvalidIncomeInput,
    );
  });

  test("rechaza una cuenta de otro usuario", async () => {
    const cuentaAjena = { ...ACCOUNT, id: "acco-otro", userId: "user-2" };
    const { deps: depsAjena } = makeDeps({ account: cuentaAjena });
    const useCase = new CreateIncome(depsAjena);
    // El repo filtra por userId: la cuenta ajena no se encuentra.
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      InvalidIncomeInput,
    );
  });

  test("rechaza una moneda que no existe", async () => {
    const { deps: depsSinMoneda } = makeDeps({ currency: null });
    const useCase = new CreateIncome(depsSinMoneda);
    await expect(useCase.execute(INPUT)).rejects.toBeInstanceOf(
      InvalidIncomeInput,
    );
  });
});
