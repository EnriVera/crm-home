/**
 * Wrapper mínimo de hooks (D-SA5, regla §9) sobre `@octanejs/usehooks-ts`.
 * Es el ÚNICO módulo del repo autorizado a importar el binding.
 *
 * Se re-exporta EXPLÍCITAMENTE solo la cohorte host-safe (estado puro y
 * timing/lifecycle sin storage, media queries ni DOM-observers): es la que el
 * binding publica y la que el host Octane soporta sin variantes.
 *
 * Hooks AUSENTES (storage/media/DOM-observer, p.ej. useLocalStorage,
 * useMediaQuery, useIntersectionObserver): nadie puede importarlos desde aquí.
 * Regla (ver README): cuando un change los necesite, se decide su variante en
 * ESE change consumidor.
 */
export {
  useBoolean,
  useCounter,
  useDebounceCallback,
  useDebounceValue,
  useInterval,
  useIsMounted,
  useMap,
  useStep,
  useTimeout,
  useToggle,
  useUnmount,
} from "@octanejs/usehooks-ts";
