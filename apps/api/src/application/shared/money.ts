/**
 * Normalización de montos.
 *
 * El contrato valida el formato del monto (hasta 4 decimales, hasta 15
 * dígitos enteros, mayor que cero) contra el rango de la columna
 * NUMERIC(19,4). Normalizarlo con `Number(...).toFixed(4)` lo pasaría por
 * un double: un monto válido como "999999999999999.9999" se convierte a
 * "1000000000000000.0000" (fuera de rango) y "123456789012345.6789" pierde
 * dígitos. La normalización es textual: se completa la parte fraccionaria
 * y se deja el entero intacto.
 */
export function normalizeAmount(amount: string): string {
  const [integer, fraction = ""] = amount.split(".");
  return `${integer}.${fraction.padEnd(4, "0")}`;
}
