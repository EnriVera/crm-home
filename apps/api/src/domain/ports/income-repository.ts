/**
 * Puerto CRUD del módulo /incomes (registros de plata que entra a una cuenta).
 *
 * Multi-tenant isolation: TODAS las operaciones filtran por `userId`. Las que
 * reciben `incomeId` además validan ownership en el use case, no acá.
 *
 * El repo SIEMPRE filtra `inco_deleted_at IS NULL` para no exponer soft-deleted.
 */
export interface IncomeRepository {
  /** Lista incomes del user, opcionalmente filtrados por search + rango de fechas. */
  list(params: {
    userId: string;
    search: string;
    dateFrom: string | null;
    dateTo: string | null;
    limit: number;
  }): Promise<IncomeRow[]>;

  /** Busca un income por id. Retorna `null` si no existe o está borrado. */
  findById(params: {
    userId: string;
    incomeId: string;
  }): Promise<IncomeRow | null>;

  /** Inserta un income nuevo. Retorna la fila creada. */
  insert(params: {
    userId: string;
    accountId: string;
    amount: string; // NUMERIC(19,4) como string (decimal-safe)
    currencyId: string;
    description: string | null;
    category: string | null;
    date: string; // YYYY-MM-DD
  }): Promise<IncomeRow>;

  /** Actualiza un income. Solo se actualizan los campos provistos. */
  update(params: {
    userId: string;
    incomeId: string;
    accountId?: string;
    amount?: string;
    currencyId?: string;
    description?: string | null;
    category?: string | null;
    date?: string;
  }): Promise<IncomeRow>;

  /** Soft-delete: setea `inco_deleted_at = NOW()`. Idempotente. */
  softDelete(params: { userId: string; incomeId: string }): Promise<IncomeRow>;
}

/**
 * Fila de dominio. Mantiene el shape camelCase (el repo convierte desde
 * `inco_*` snake_case de la DB).
 */
export interface IncomeRow {
  id: string;
  userId: string;
  accountId: string;
  amount: string; // string decimal-safe (BigInt-ish)
  currencyId: string;
  description: string | null;
  category: string | null;
  /** YYYY-MM-DD (string de Postgres DATE). */
  date: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}
