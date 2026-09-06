# vendor/toast — wrapper de `@octanejs/sonner` (D-SA5)

Frontera vendor (regla §9): es el **único** módulo del repo autorizado a
importar `@octanejs/sonner` (el grep de confinamiento lo audita).

## Superficie

- `Toaster` (`toaster.tsrx`): contenedor declarativo con los defaults de la
  app (`position="bottom-right"`, `theme="system"`, `richColors`). El binding
  importa sus propios estilos (`styles.css`).
- `toast(message, { variant?: "info" | "success" | "error" })`: API mínima con
  variantes semánticas cerradas; default `info`.

## Reglas

- **Sin consumidor en este change** (`stack-alignment`): el primer change que
  necesite notificaciones monta `<Toaster />` una vez (shell) y dispara
  `toast(...)`.
- **Sin tests propios**: mapeo declarativo sin lógica propia (la máquina de
  estados del toast la cubre la suite CI del binding upstream, sonner 2.0.7).
- Ampliar la superficie (p.ej. `description`, `action`, `promise`) es una
  decisión del change consumidor, materializada editando `index.ts`.
