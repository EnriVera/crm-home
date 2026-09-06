/**
 * Wrapper mínimo de `@octanejs/resizable-panels` (D-SA6, regla §9): re-exports
 * tipados. Es el ÚNICO módulo del repo autorizado a importar el binding — el
 * grep de confinamiento se mantiene uniforme (`components/vendor/`).
 *
 * Divergencia documentada vs el diseño preliminar: el binding NO expone
 * `autoSaveId` como prop de `Group`; la persistencia se logra con el hook
 * `useDefaultLayout({ id })` (re-exportado aquí), cuyo retorno
 * `{ defaultLayout, onLayoutChange, onLayoutChanged }` se pasa a `Group`. En
 * SSR el storage implícito (localStorage) resuelve a `undefined` → snapshot
 * estable sin mismatch (el layout persistido se aplica post-mount, patrón D8).
 * El tipo de handle imperativo se expone como `PanelHandle`
 * (`PanelImperativeHandle` upstream: `collapse()/expand()/isCollapsed()`).
 */
export {
  Group,
  Panel,
  Separator,
  useDefaultLayout,
  type PanelImperativeHandle as PanelHandle,
} from "@octanejs/resizable-panels";
