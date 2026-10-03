# vendor/disclosure

Wrapper del patrón WAI-ARIA **Disclosure** (un trigger que controla la
visibilidad de un panel) sobre la máquina `collapsible` de zag. Único módulo
del codebase autorizado a importar `@zag-js/collapsible` (regla §9 de
wrappers); los consumidores solo conocen `Disclosure` y su contrato
`DisclosureProps`, estable.

## Provenance

- **Base:** `@zag-js/collapsible` (la única máquina de zag que implementa el
  disclosure pattern — `https://zagjs.com/components/collapsible`).
- **Adapter:** `@octanejs/zag@0.0.22` (sustituye a `@zag-js/react`; el adapter
  de React trae un scheduler que rompe el runtime de Octane).
- **Pin exacto:** `@zag-js/collapsible@1.42.0` iguala
  `@zag-js/core@1.42.0` (regla §9 del skill zag). Una versión distinta
  arrastra una segunda copia de core con tipos incompatibles.

## Estructura

- `disclosure.tsrx` — componente; capa DOM delgada sobre la máquina.
- `disclosure-props.ts` — única lógica propia: mapeo puro
  `DisclosureProps` → props de zag.
- `disclosure-props.test.ts` — cobertura del mapper (pure, sin DOM).
- `index.ts` — re-exports estables.

## Contrato público

```ts
interface DisclosureProps {
  defaultOpen?: boolean;
  open?: boolean;            // controlled
  onOpenChange?: (d: { open: boolean }) => void;
  disabled?: boolean;
  trigger: OctaneNode;        // contenido del botón trigger
  children: OctaneNode;       // panel revelado
  class?: string;
}
```

## Notas de uso

- La máquina emite `data-state="open|closed"` en `root`, `trigger` y
  `content`; el consumidor estiliza desde CSS
  (`[data-part="content"][data-state="open"]`) o Tailwind variant
  (`data-[state=open]:rotate-180`) — NUNCA duplicando el estado en
  `useState`.
- `aria-expanded`/`aria-controls` los emite zag — no setear manualmente.
- `id` estable interno (`"disclosure"`); si una pantalla necesita varios
  disclosures simultáneos, abrir el wrapper y aceptar `id` por prop.
