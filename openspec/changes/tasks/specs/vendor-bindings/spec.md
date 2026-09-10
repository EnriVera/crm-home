# Vendor Bindings Specification (delta — change `tasks`)

> Delta sobre el spec canónico en `openspec/specs/vendor-bindings/spec.md`.
> La baseline (wrappers vendor confinados, no upstream fuera de
> `components/vendor/`, `infrastructure/`, `http/`) NO se relaja; este
> delta MODIFICA el requisito "Diferidos registrados con su change
> consumidor" (porque el change `tasks` consume dos de los diferidos:
> `@octanejs/lexical` y `@octanejs/dnd-kit`) y AÑADE un escenario que
> refuerza el patrón bind-and-wrap para cualquier consumidor que adopte
> un binding diferido.

## MODIFIED Requirements

### Requirement: Diferidos registrados con su change consumidor

`apps/web` y `apps/api` DEBEN mantener la lista de bindings declarados
en PRD §10 que NO se instalan, cada uno con su change consumidor y
limitaciones conocidas. El change `tasks` (2026-09-10) CONSUME dos de los
diferidos registrados y los retira de la lista: `@octanejs/lexical`
(consumido como `vendor/lexical/` para el editor rich text de
descripciones de tarea) y `@octanejs/dnd-kit` (consumido como
`vendor/dnd-kit/` para el kanban de `BaseView`). Tras este delta, la
lista de diferidos vigente queda como sigue; ambos bindings
anteriormente listados (`@octanejs/lexical`, `@octanejs/dnd-kit`) ya no
figuran porque su change consumidor fue entregado.

| Paquete | Change consumidor | Nota |
| --- | --- | --- |
| `@octanejs/day-picker` | schedule | — |
| `@octanejs/recharts` | schedule | **SSR no testeado** (text measurement 0×0); Brush/Treemap no soportados — anotar en la spec de schedule |
| `@octanejs/colorful` | colores de categorías (config) | — |
| `@octanejs/tanstack-{store,db,query,form,table,virtual}` | data layer de módulos | — |
| `@octanejs/spring` | primera animación real | — |
| `@octanejs/testing-library` | primer test con DOM | hoy todo TS puro |
| `shiki` (api) | sin consumidor claro en §10 backend | — |

(Previously: la lista incluía `@octanejs/lexical` (consumidor: descripciones
de tareas) y `@octanejs/dnd-kit` (consumidor: kanban de BaseView). El
change `tasks` materializa ambos wrappers, los pine a versiones exactas
tras la verificación npm bloqueante del spec `workspace`, y los retira
del registro de diferidos.)

`openspec/config.yaml` DEBE reflejar este cambio en su sección
`stack.frontend.diferidos` (las dos entradas eliminadas; las demás
intactas).

#### Scenario: Diferidos actualizados sin lexical ni dnd-kit

- GIVEN `openspec/config.yaml` y la tabla canónica de diferidos del spec `vendor-bindings` tras el change
- WHEN se inspecciona la lista
- THEN `@octanejs/lexical` y `@octanejs/dnd-kit` ya NO figuran como diferidos (sus consumers fueron entregados); el resto de los diferidos permanece intacto

#### Scenario: Wrappers lexical y dnd-kit materializados

- GIVEN el árbol `apps/web/src/components/vendor/` tras el change `tasks`
- WHEN se inspecciona
- THEN existen los directorios `vendor/lexical/` y `vendor/dnd-kit/`, cada uno con su README documentando la regla §9 y la verificación npm, su `index.ts` exportando la API pública, y los únicos puntos de import de `@octanejs/lexical` y `@octanejs/dnd-kit` (verificable por `grep -RE "from ['\"]@octanejs/(dnd-kit|lexical)['\"]" apps/web/src/`)

#### Scenario: config.yaml stack.frontend.diferidos consistente

- GIVEN el spec `vendor-bindings` (tabla de diferidos) y `openspec/config.yaml` (`stack.frontend.diferidos`)
- WHEN se comparan ambas listas
- THEN son idénticas (ninguna entrada queda en un archivo sin aparecer en el otro)

## ADDED Requirements

### Requirement: Patrón bind-and-wrap seguro para consumir un binding diferido

Cuando un change consumidor adopta un binding previamente diferido (lista
gestionadas por este spec), DEBE materializar el patrón **bind-and-wrap**:
crear el wrapper en `apps/web/src/components/vendor/<binding>/` (o, en
api, en `apps/api/src/infrastructure/`) como único punto de import del
binding y de sus paquetes upstream, exportar una API pública mínima
tipada hacia los consumidores, documentar la regla §9 en el README del
wrapper (qué encapsula, API pública, regla §9, patrón SSR si aplica),
pinear la versión exacta tras la verificación npm bloqueante del spec
`workspace`, y actualizar la lista de diferidos de este spec +
`openspec/config.yaml` retirando el binding ahora consumido. El wrapper
DEBE poder ser auditado por `grep`: cero imports del binding o su
upstream fuera del wrapper correspondiente. Si la verificación npm
falla, el work DEBE detenerse y escalar (prohibida la sustitución del
binding por decisión propia). El árbol de tests del nuevo consumidor
DEBE seguir strict TDD siguiendo el patrón del precedent
`backend-auth`/`frontend-foundation`: tests unitarios primero en TS
puro, integración opt-in.

#### Scenario: Bind-and-wrap verificable por grep

- GIVEN un wrapper `vendor/<binding>/` recién creado para consumir un binding antes diferido
- WHEN se ejecuta `grep -RE "from ['\"]@octanejs/<binding>['\"]|<upstream>" apps/web/src/` (o el scope equivalente de api)
- THEN las coincidencias aparecen únicamente bajo el wrapper correspondiente; cero hits en el resto del árbol

#### Scenario: README documenta las cuatro secciones obligatorias

- GIVEN el README del wrapper recién creado
- WHEN se inspecciona
- THEN contiene explícitamente: (1) qué binding encapsula, (2) su API pública (con tipos o props), (3) la regla §9 (único módulo autorizado a importar el binding), (4) el patrón SSR si aplica (p. ej. "el editor monta en cliente tras hidratación; el SSR renderiza un placeholder con `value` parseado a texto plano")

#### Scenario: Lista de diferidos actualizada al consumir

- GIVEN un change que entrega un wrapper para un binding antes diferido
- WHEN se commitea el change
- THEN el spec `vendor-bindings` (este requisito) Y `openspec/config.yaml` (`stack.frontend.diferidos` o equivalente de api) reflejan la retirada del binding de la lista de diferidos en el mismo PR (o en un PR de follow-up inmediato referenciado)

#### Scenario: Sustitución del binding prohibida en failure path

- GIVEN una verificación npm que falla para un binding antes diferido
- WHEN se evalúa el failure
- THEN NO se sustituye el binding por una librería alternativa por decisión propia (prohibido fallback); el work se detiene, se documenta el hallazgo y se escala al product owner, alineado con el spec `workspace`
