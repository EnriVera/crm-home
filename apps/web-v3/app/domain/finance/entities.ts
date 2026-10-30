/**
 * Finance domain: incomes, accounts and the money helpers.
 *
 * Pure TypeScript, no Vue, Nuxt, orpc or TanStack imports (PRD-v4 §11.4).
 * Los montos viajan como number en el dominio (el wire los manda como
 * string decimal-safe y el adapter los convierte en el borde).
 */

/** Un ingreso: plata que entró a una cuenta del usuario. */
export interface Income {
  id: string;
  accountId: string;
  amount: number;
  currencyId: string;
  description: string | null;
  /** Categoría libre (texto); la DB no la liga a la tabla de categorías. */
  category: string | null;
  /** "2026-06-28" */
  date: string;
  createdAt: Date;
}

/** Un egreso: plata que salió de una cuenta del usuario. */
export interface Expense {
  id: string;
  accountId: string;
  amount: number;
  currencyId: string;
  description: string | null;
  /** Categoría libre (texto); la DB no la liga a la tabla de categorías. */
  category: string | null;
  /** Comprobante (URL) opcional. */
  receiptUrl: string | null;
  /** "2026-06-28" */
  date: string;
  createdAt: Date;
}

/** Una transferencia entre dos cuentas del usuario. */
export interface Transfer {
  id: string;
  fromAccountId: string;
  toAccountId: string;
  amount: number;
  currencyId: string;
  description: string | null;
  /** "2026-06-28" */
  date: string;
  createdAt: Date;
}

/** Lo que las tarjetas del mes necesitan de cualquier movimiento. */
export interface MoneyMovement {
  amount: number;
  /** "2026-06-28" */
  date: string;
}

/** Un movimiento de dinero con lo que muestra el dashboard. */
export interface MoneyRecord extends MoneyMovement {
  id: string;
  currencyId: string;
  description: string | null;
  category: string | null;
}

/** Una cuenta de dinero del usuario, con su balance calculado. */
export interface Account {
  id: string;
  name: string;
  /** Icono libre: "bank" | "wallet" | "cash" (convención del seed/drawer). */
  icon: string | null;
  /** Color de la paleta de datos (hex). */
  color: string | null;
  currencyId: string;
  initialAmount: number;
  balance: number;
  createdAt: Date;
}

/** El color de fallback de una cuenta sin color (gris de la paleta). */
export const ACCOUNT_FALLBACK_COLOR = "#64748b";

/**
 * La paleta de 8 colores de dato (PRD-v4 §8.2: color de dato, nunca
 * decoración). Se usa para las categorías de los gastos.
 */
export const DATA_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#64748b",
] as const;

/**
 * El color estable de una categoría.
 *
 * La categoría es texto libre (la DB no la liga a la tabla de categorías),
 * así que el color sale de un hash del texto: la misma categoría es
 * siempre del mismo color y cada una tiene uno distinto.
 */
export function categoryColor(category: string | null): string {
  if (!category) return ACCOUNT_FALLBACK_COLOR;
  let hash = 0;
  for (const char of category) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  }
  return DATA_COLORS[hash % DATA_COLORS.length] ?? ACCOUNT_FALLBACK_COLOR;
}

/** Los tipos de cuenta del drawer (valores del `acco_icon` libre). */
export const ACCOUNT_ICONS = ["bank", "wallet", "cash"] as const;
export type AccountIcon = (typeof ACCOUNT_ICONS)[number];

/**
 * La paleta de 8 swatches del drawer de cuenta (PRD-v4 §8.2: color de
 * dato, nunca decoración). Los valores viajan en `acco_color`.
 */
export const ACCOUNT_COLORS = [
  "#3b82f6",
  "#22c55e",
  "#ec4899",
  "#06b6d4",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#64748b",
] as const;

/** El color de la cuenta para dibujarla (punto / chip). */
export function accountColor(account: Account): string {
  return account.color ?? ACCOUNT_FALLBACK_COLOR;
}

/** "1.840.000" — el formato de monto del catálogo (es-AR, sin decimales). */
export function formatAmount(amount: number): string {
  return new Intl.NumberFormat("es-AR", {
    maximumFractionDigits: 0,
  }).format(amount);
}

/** "$ 1.840.000" — el monto con su símbolo. */
export function formatMoney(amount: number, symbol: string): string {
  return `${symbol} ${formatAmount(amount)}`;
}

/**
 * "24 jun" — la fecha corta de las tablas del catálogo.
 *
 * Acepta el "YYYY-MM-DD" del wire y también un ISO completo (si el dato
 * llega de otra capa). Un valor inválido devuelve "" en vez de tirar: la
 * fecha viene de la API y una pantalla no se cae por un dato raro.
 */
export function formatDateShort(date: string): string {
  if (!date) return "";
  const parsed = date.includes("T")
    ? new Date(date)
    : (() => {
        const [year, month, day] = date.split("-").map(Number);
        return new Date(year!, month! - 1, day!);
      })();
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("es-AR", {
    day: "numeric",
    month: "short",
  }).format(parsed);
}

/** "2026-06-28" de hoy (valor default del campo Fecha). */
export function todayWireDate(): string {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** Las categorías distintas de un conjunto de movimientos (para el datalist). */
export function distinctCategories(
  movements: { category: string | null }[],
): string[] {
  const set = new Set<string>();
  for (const movement of movements) {
    if (movement.category) set.add(movement.category);
  }
  return [...set].sort();
}

/** Suma de los montos del mes corriente. */
export function totalOfMonth(movements: MoneyMovement[]): number {
  const prefix = todayWireDate().slice(0, 7);
  return movements
    .filter((movement) => movement.date.startsWith(prefix))
    .reduce((total, movement) => total + movement.amount, 0);
}

/** Cuántos movimientos hay en el mes corriente. */
export function countOfMonth(movements: MoneyMovement[]): number {
  const prefix = todayWireDate().slice(0, 7);
  return movements.filter((movement) => movement.date.startsWith(prefix)).length;
}

/** Promedio de los montos; 0 si no hay movimientos. */
export function averageAmount(movements: MoneyMovement[]): number {
  if (movements.length === 0) return 0;
  return (
    movements.reduce((total, movement) => total + movement.amount, 0) /
    movements.length
  );
}

/**
 * La categoría que más plata concentra (la card "Mayor categoría").
 *
 * Null si no hay movimientos con categoría: la card muestra "Sin
 * categorías" en vez de un porcentaje sin contexto.
 */
export function largestCategory(
  movements: { amount: number; category: string | null }[],
): { name: string; amount: number; share: number } | null {
  const totals = new Map<string, number>();
  let sum = 0;
  for (const movement of movements) {
    if (!movement.category) continue;
    totals.set(
      movement.category,
      (totals.get(movement.category) ?? 0) + movement.amount,
    );
    sum += movement.amount;
  }
  let best: { name: string; amount: number; share: number } | null = null;
  for (const [name, amount] of totals) {
    if (!best || amount > best.amount) {
      best = { name, amount, share: sum > 0 ? amount / sum : 0 };
    }
  }
  return best;
}
