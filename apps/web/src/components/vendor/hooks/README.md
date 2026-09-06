# vendor/hooks — wrapper de `@octanejs/usehooks-ts` (D-SA5)

Frontera vendor (regla §9): es el **único** módulo del repo autorizado a
importar `@octanejs/usehooks-ts` (el grep de confinamiento lo audita).

## Cohorte host-safe re-exportada

Estado puro: `useBoolean`, `useCounter`, `useToggle`, `useMap`, `useStep`.
Timing/lifecycle: `useDebounceCallback`, `useDebounceValue`, `useInterval`,
`useTimeout`, `useIsMounted`, `useUnmount`.

Es exactamente la cohorte que el binding publica (11 hooks) y la que el host
Octane soporta sin variantes (sin storage, sin media queries, sin observers).

## Hooks AUSENTES (decisión explícita, no descuido)

Las familias **storage** (`useLocalStorage`, `useSessionStorage`),
**media** (`useMediaQuery`) y **DOM-observer** (`useIntersectionObserver`,
`useResizeObserver`, `useMutationObserver`) NO se re-exportan: nadie puede
importarlas desde este wrapper.

**Regla:** cuando un change consumidor necesite un hook ausente, ESE change
decide su variante (binding si existe y es host-safe, implementación propia
confinada, o alternativa de diseño) y actualiza este wrapper + README.

## Reglas

- **Sin consumidor en este change** (`stack-alignment`).
- **Sin tests propios**: re-exports puros sin lógica (cada hook está cubierto
  por la suite CI del binding upstream).
