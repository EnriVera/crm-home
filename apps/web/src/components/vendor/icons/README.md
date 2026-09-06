# vendor/icons

Wrapper de íconos del design system (D4 → **D-SA8**). ÚNICO módulo del codebase
que importa íconos (regla §9); los consumidores usan `<Icon name="…" />`
con la union cerrada `IconName` — usar un ícono fuera del set no compila.

## Provenance

- **Origen:** [phosphor-icons](https://phosphoricons.com), generado desde
  `@phosphor-icons/core` **v2.1.1**, peso `regular` en uso
  (viewBox `0 0 256 256`, `fill="currentColor"`).
- **Licencia:** MIT — © phosphor-icons (ver LICENSE del paquete de origen).
- **Forma (D-SA8, supersede D4):** dependencia de runtime
  `@octanejs/phosphor-icons@0.0.32` (pin exacto). `paths.ts` es el mapa
  `IconName` → componente del binding (`ICON_COMPONENTS`); el path data
  inline vendored (`ICON_PATHS`) fue eliminado. `icon.tsrx` delega en el
  componente phosphor con `size`, `weight="regular"`, `color="currentColor"`
  y el mismo manejo de `role`/`aria-hidden`. Tree-shaking verificado por
  build: solo los 12 íconos del set llegan al bundle.

## Set inicial (decisión de design D4)

`house` (Dashboard), `check-square` (Tareas), `calendar` (Schedule),
`users` (Clients), `wallet` (Finance), `arrow-down-circle` (Income),
`arrow-up-circle` (Expenses), `arrows-left-right` (Transfers),
`gear` (Config), `sun`/`moon` (toggle de tema), `sidebar` (colapsar).

Ampliar el set = decisión de design del change que lo necesite, editando
`paths.ts` (agregar el nombre a la union y al mapa `ICON_COMPONENTS`).
