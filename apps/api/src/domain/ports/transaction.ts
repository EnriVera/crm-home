/**
 * Token opaco para transacciones. Los adapters de infraestructura lo concretan
 * (p. ej. como instancia kysely o su Transaction), pero dominio/aplicación solo
 * lo pasan entre repositorios que participan en una misma unidad de trabajo.
 */
declare const TransactionBrand: unique symbol;
export type Transaction = { readonly [TransactionBrand]: true };
