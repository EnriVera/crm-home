import { z } from "zod";

/**
 * Schemas de montos y fechas compartidos por los bounded contexts de
 * finanzas y schedule.
 *
 * Montos: hasta 4 decimales y como máximo 15 dígitos enteros, que es lo
 * que entra en una columna NUMERIC(19,4) de Postgres. La comparación es
 * textual: el valor que valida el schema es exactamente el string que la
 * API guarda (un double no representa 4 decimales ni 15 dígitos enteros
 * con exactitud).
 *
 * Fechas: `YYYY-MM-DD` y fecha real del calendario. El cálculo es
 * aritmético sobre el string, sin `Date` ni timezone de por medio.
 */

/** Dígitos enteros que entran en un NUMERIC(19,4): 19 de precisión menos 4 de escala. */
export const AMOUNT_MAX_INTEGER_DIGITS = 15;

const amountRegex = /^\d+(\.\d{1,4})?$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

interface DecimalParts {
  /** Dígitos enteros significativos, sin ceros a la izquierda. */
  integerDigits: number;
  /** El string decimal representa un valor distinto de cero. */
  isNonZero: boolean;
}

/**
 * Analiza el string decimal sin convertirlo a número. Los ceros a la
 * izquierda no cuentan para la precisión, igual que en Postgres.
 */
function parseDecimalParts(value: string): DecimalParts {
  const dotIndex = value.indexOf(".");
  const integerPart = dotIndex === -1 ? value : value.slice(0, dotIndex);
  const fractionPart = dotIndex === -1 ? "" : value.slice(dotIndex + 1);
  return {
    integerDigits: integerPart.replace(/^0+/, "").length,
    isNonZero: /[1-9]/.test(integerPart + fractionPart),
  };
}

/**
 * Schema de monto decimal: hasta 4 decimales, como máximo 15 dígitos
 * enteros (NUMERIC(19,4)) y, salvo que se admita el cero, mayor que 0.
 */
export function decimalAmountSchema(label: string, allowZero: boolean) {
  return z.string().superRefine((value, ctx) => {
    if (!amountRegex.test(value)) {
      ctx.addIssue({
        code: "custom",
        message: `${label} must be a decimal string with up to 4 fraction digits`,
      });
      return;
    }
    const parts = parseDecimalParts(value);
    if (parts.integerDigits > AMOUNT_MAX_INTEGER_DIGITS) {
      ctx.addIssue({
        code: "custom",
        message: `${label} must have at most ${AMOUNT_MAX_INTEGER_DIGITS} integer digits`,
      });
      return;
    }
    if (!allowZero && !parts.isNonZero) {
      ctx.addIssue({ code: "custom", message: `${label} must be > 0` });
    }
  });
}

/** Una fecha `YYYY-MM-DD` que además descarta fechas imposibles (mes 13, 31 de febrero). */
export function isValidCalendarDate(value: string): boolean {
  const year = Number(value.slice(0, 4));
  const month = Number(value.slice(5, 7));
  const day = Number(value.slice(8, 10));
  if (year < 1 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  const leapYear = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  const maxDay = month === 2 && leapYear ? 29 : (DAYS_IN_MONTH[month - 1] ?? 0);
  return day >= 1 && day <= maxDay;
}

/** Schema de fecha `YYYY-MM-DD` que exige una fecha real del calendario. */
export function calendarDateSchema(label = "date") {
  return z
    .string()
    .regex(dateRegex, { message: `${label} must be YYYY-MM-DD` })
    .refine((v) => !dateRegex.test(v) || isValidCalendarDate(v), {
      message: `${label} must be a valid calendar date`,
    });
}
