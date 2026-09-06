# vendor/icons

Wrapper de íconos del design system (D4). ÚNICO módulo del codebase que
contiene SVGs de íconos (regla §9); los consumidores usan `<Icon name="…" />`
con la union cerrada `IconName` — usar un ícono fuera del set no compila.

## Provenance

- **Origen:** [phosphor-icons](https://phosphoricons.com),
  paquete `@phosphor-icons/core` **v2.1.1**, peso `regular`
  (viewBox `0 0 256 256`, `fill="currentColor"`).
- **Licencia:** MIT — © phosphor-icons (ver LICENSE del paquete de origen).
- **Forma:** path data copiado inline en `paths.ts` (assets estáticos).
  NO es dependencia de runtime: cero paquetes nuevos en `package.json`.

## Set inicial (decisión de design D4)

`house` (Dashboard), `check-square` (Tareas), `calendar` (Schedule),
`users` (Clients), `wallet` (Finance), `arrow-down-circle` (Income),
`arrow-up-circle` (Expenses), `arrows-left-right` (Transfers),
`gear` (Config), `sun`/`moon` (toggle de tema), `sidebar` (colapsar).

Ampliar el set = decisión de design del change que lo necesite, editando
`paths.ts`. Si el set crece mucho, el upgrade path es `@phosphor-icons/core`
DENTRO de este wrapper, sin tocar consumidores.
