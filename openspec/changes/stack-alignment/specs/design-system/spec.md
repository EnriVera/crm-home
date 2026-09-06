# Delta for Design System

> Change: `stack-alignment` · Delta sobre la spec `design-system`.
> NOTA DE BASELINE: `openspec/specs/design-system/spec.md` aún no existe porque
> ni `monorepo-scaffold` ni `frontend-foundation` fueron archivados; este delta
> se escribe contra
> `openspec/changes/frontend-foundation/specs/design-system/spec.md` como
> baseline de facto (verificado). Orden de archivo obligatorio:
> `monorepo-scaffold` → `frontend-foundation` → `stack-alignment`.

## ADDED Requirements

### Requirement: Verificación de bundle y SSR de bindings visuales

Todo binding visual adoptado bajo `components/vendor/` DEBE cumplir las mismas
garantías que exige el design system a los componentes base: render SSR sin
regresión y sin mismatch de hidratación, y respeto de los tokens del sistema
(ningún binding PUEDE introducir valores visuales hardcodeados que compitan con
`tokens.css`). En particular, la adopción de `@octanejs/phosphor-icons` tras
`vendor/icons` DEBE verificar en implementación que:

1. El tree-shaking excluye del bundle los íconos no usados (el set completo de
   1.512 íconos NO PUEDE inflar el bundle; la union cerrada `IconName` acota el
   conjunto importado).
2. El render SSR del SVG funciona sin regresión en las pantallas que usan
   `Icon`.

La evidencia de ambas verificaciones (medición de bundle o inspección del build,
y comprobación SSR) DEBE quedar registrada en el change.

#### Scenario: Bundle no inflado por el set completo

- GIVEN el build de `apps/web` tras el swap de íconos
- WHEN se inspecciona el bundle generado
- THEN solo los íconos referenciados por `IconName` están incluidos y la evidencia queda registrada

#### Scenario: Icon renderiza en SSR sin regresión

- GIVEN una pantalla del shell que usa `Icon`
- WHEN se compara el HTML SSR con el hidratado
- THEN los SVG de íconos son idénticos en ambas fases, sin mismatch
