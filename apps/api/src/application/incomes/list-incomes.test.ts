import { beforeEach, describe, expect, test } from "bun:test";
import type {
  IncomeRepository,
  IncomeRow,
} from "../../domain/ports/income-repository";
import { ListIncomes } from "./list-incomes";

/** In-memory: implementa solo los 1 método que `ListIncomes` usa. */
class InMemoryIncomeRepository implements Pick<IncomeRepository, "list"> {
  rows: IncomeRow[] = [];

  async list(params: {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
  }): Promise<IncomeRow[]> {
    return this.rows
      .filter((r) => r.userId === params.userId && r.deletedAt === null)
      .filter(
        (r) =>
          params.search.length === 0 ||
          (r.description ?? "")
            .toLowerCase()
            .includes(params.search.toLowerCase()) ||
          (r.category ?? "")
            .toLowerCase()
            .includes(params.search.toLowerCase()),
      )
      .filter((r) => params.dateFrom === null || r.date >= params.dateFrom)
      .filter((r) => params.dateTo === null || r.date <= params.dateTo)
      .slice(0, params.limit);
  }
}

const USER_ID = "11111111-1111-1111-1111-111111111111";
const OTHER_USER = "22222222-2222-2222-2222-222222222222";

describe("ListIncomes", () => {
  let repo: InMemoryIncomeRepository;
  let sut: ListIncomes;

  beforeEach(() => {
    repo = new InMemoryIncomeRepository();
    // Seed: 3 incomes del USER_ID (uno con description "Acme", otro "Globex", otro "Salario")
    repo.rows.push(
      {
        id: "inco-1",
        userId: USER_ID,
        accountId: "acco-1",
        amount: "1000.00",
        currencyId: "curr-1",
        description: "Pago de Acme",
        category: "Servicios",
        date: "2026-01-15",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "inco-2",
        userId: USER_ID,
        accountId: "acco-1",
        amount: "500.50",
        currencyId: "curr-1",
        description: "Cobro de Globex",
        category: null,
        date: "2026-02-20",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "inco-3",
        userId: USER_ID,
        accountId: "acco-2",
        amount: "2000.00",
        currencyId: "curr-1",
        description: "Salario mensual",
        category: "Nómina",
        date: "2026-03-05",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "inco-other",
        userId: OTHER_USER,
        accountId: "acco-1",
        amount: "999.00",
        currencyId: "curr-1",
        description: "Otro user",
        category: null,
        date: "2026-01-01",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
      },
      {
        id: "inco-deleted",
        userId: USER_ID,
        accountId: "acco-1",
        amount: "100.00",
        currencyId: "curr-1",
        description: "Soft-deleted",
        category: null,
        date: "2026-01-01",
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: new Date(),
      },
    );
    sut = new ListIncomes({
      incomeRepository: repo as unknown as IncomeRepository,
    });
  });

  test("returns only incomes of the user", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "",
      dateFrom: null,
      dateTo: null,
      limit: 50,
    });
    expect(result.length).toBe(3);
    expect(result.every((r) => r.userId === USER_ID)).toBe(true);
  });

  test("filters by search in description (case-insensitive)", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "acme",
      dateFrom: null,
      dateTo: null,
      limit: 50,
    });
    expect(result.length).toBe(1);
    expect(result[0]?.description).toBe("Pago de Acme");
  });

  test("filters by search in category", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "Nómina",
      dateFrom: null,
      dateTo: null,
      limit: 50,
    });
    expect(result.length).toBe(1);
    expect(result[0]?.category).toBe("Nómina");
  });

  test("filters by date range", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "",
      dateFrom: "2026-02-01",
      dateTo: "2026-02-28",
      limit: 50,
    });
    expect(result.length).toBe(1);
    expect(result[0]?.id).toBe("inco-2");
  });

  test("excludes soft-deleted incomes", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "",
      dateFrom: null,
      dateTo: null,
      limit: 50,
    });
    expect(result.find((r) => r.id === "inco-deleted")).toBeUndefined();
  });

  test("clamps limit to 1-100", async () => {
    await expect(
      sut.execute({
        userId: USER_ID,
        search: "",
        dateFrom: null,
        dateTo: null,
        limit: 0,
      }),
    ).resolves.toHaveLength(1); // limit clamped to 1

    await expect(
      sut.execute({
        userId: USER_ID,
        search: "",
        dateFrom: null,
        dateTo: null,
        limit: 999,
      }),
    ).resolves.toHaveLength(3); // limit clamped to 100 (still 3 items)
  });

  test("trims whitespace from search", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "  Acme  ",
      dateFrom: null,
      dateTo: null,
      limit: 50,
    });
    expect(result.length).toBe(1);
  });

  test("empty result when no matches", async () => {
    const result = await sut.execute({
      userId: USER_ID,
      search: "nonexistent",
      dateFrom: null,
      dateTo: null,
      limit: 50,
    });
    expect(result.length).toBe(0);
  });
});
