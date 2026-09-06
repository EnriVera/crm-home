/**
 * Wrapper mínimo de toast (D-SA5, regla §9) sobre `@octanejs/sonner`. Es el
 * ÚNICO módulo del repo autorizado a importar el binding (grep de
 * confinamiento). Mapeo declarativo sin lógica propia → sin tests propios.
 * Sin consumidor en este change: el primer consumidor monta `<Toaster />` una
 * vez en el shell y dispara `toast(...)` donde lo necesite.
 */

import { toast as sonnerToast } from "@octanejs/sonner";

export { Toaster } from "./toaster.tsrx";

/** Variantes semánticas expuestas a la app (subconjunto cerrado). */
export type ToastVariant = "info" | "success" | "error";

export interface ToastOptions {
  variant?: ToastVariant;
}

/** Dispara un toast; la variante default es `info`. */
export function toast(message: string, options?: ToastOptions): void {
  const variant = options?.variant ?? "info";
  sonnerToast[variant](message);
}
