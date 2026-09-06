import { Toaster as SonnerToaster } from "@octanejs/sonner";

/**
 * `Toaster` del wrapper vendor/toast (D-SA5): contenedor declarativo del
 * binding `@octanejs/sonner` con los defaults de la app fijados aquí
 * (posición, tema del sistema, colores semánticos por variante). Se monta una
 * única vez cuando el primer change consumidor lo necesite — este change NO
 * introduce consumidor.
 */
export function Toaster() @{
  <SonnerToaster position="bottom-right" theme="system" richColors />
}
