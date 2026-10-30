/**
 * Puerto del módulo `accounts` (las cuentas de dinero del usuario).
 *
 * Multi-tenant isolation: TODAS las operaciones filtran por `userId`.
 *
 * El `balance` de una fila NUNCA se guarda: se calcula como
 * `acco_initial_amount + ingresos − gastos + transferencias entrantes −
 * transferencias salientes` (PRD-v2 §8.6 "Saldos calculados, no mutados").
 * El adapter lo computa en la misma query del list.
 */
export interface AccountRow {
  id: string;
  userId: string;
  name: string;
  /** Icono libre (e.g. "bank", "wallet", "cash"); el catálogo lo dibuja. */
  icon: string | null;
  /** Color de la paleta de datos (e.g. "#3b82f6"). */
  color: string | null;
  currencyId: string;
  /** NUMERIC(19,4) como string (decimal-safe). */
  initialAmount: string;
  /** Balance calculado (mismo formato decimal-safe). */
  balance: string;
  createdAt: Date;
}

export interface AccountRepository {
  /** Las cuentas del user con su balance calculado. */
  listByUser(userId: string): Promise<AccountRow[]>;

  /** Inserta una cuenta nueva. Retorna la fila creada. */
  insert(params: {
    userId: string;
    name: string;
    icon: string | null;
    color: string | null;
    currencyId: string;
    initialAmount: string;
  }): Promise<AccountRow>;

  /** Busca una cuenta por id (del user). `null` si no existe o está borrada. */
  findById(params: {
    userId: string;
    accountId: string;
  }): Promise<AccountRow | null>;
}
