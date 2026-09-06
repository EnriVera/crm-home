/**
 * Fachada de TIPOS del binding `@octanejs/resizable-panels` (D-SA6).
 *
 * Por qué existe: el paquete publica sus fuentes `.ts/.tsrx` como entry y ese
 * código (port literal de react-resizable-panels 4.12.2) NO compila con
 * `noUncheckedIndexedAccess` (flag estricto de `@crm/tsconfig/base`). Las
 * opciones eran relajar el flag para TODO el repo o confinar el compromiso a
 * la frontera vendor: se elige la fachada. `tsconfig.json` mapea el especificador
 * a este archivo SOLO para typecheck (vite/bun resuelven el paquete real en
 * runtime — no hay plugin de tsconfig-paths en el build).
 *
 * La superficie declarada es EXACTAMENTE la que re-exporta `./index.ts`
 * (subconjunto mínimo usado por el shell), derivada de los tipos reales del
 * paquete. Si el binding actualiza y cambia esta superficie, el typecheck de
 * `index.ts`/`__app-shell.tsrx` lo delata.
 */
declare module "@octanejs/resizable-panels" {
  import type { OctaneNode } from "octane";
  import type { Octane } from "octane/jsx-runtime";

  export type PanelSize = { asPercentage: number; inPixels: number };
  export type Layout = Record<string, number>;
  export type LayoutChangedMeta = { isUserInteraction: boolean };
  export type LayoutStorage = Pick<Storage, "getItem" | "setItem">;

  /** Handle imperativo del panel (expuesto por el wrapper como `PanelHandle`). */
  export interface PanelImperativeHandle {
    collapse(): void;
    expand(): void;
    getSize(): PanelSize;
    isCollapsed(): boolean;
    resize(size: number | string): void;
  }

  type DivStyle = Exclude<
    Octane.JSX.IntrinsicElements["div"]["style"],
    string | undefined
  >;
  type DivProps = Omit<
    Octane.JSX.IntrinsicElements["div"],
    "children" | "id" | "ref" | "onResize" | "style"
  >;

  export interface PanelProps extends DivProps {
    children?: OctaneNode;
    /** Handle imperativo vía ref (`panelRef.collapse()/expand()/isCollapsed()`). */
    panelRef?: Octane.Ref<PanelImperativeHandle | null>;
    collapsible?: boolean;
    collapsedSize?: number | string;
    defaultSize?: number | string;
    disabled?: boolean;
    id?: string | number;
    maxSize?: number | string;
    minSize?: number | string;
    onResize?: (
      size: PanelSize,
      id: string | number | undefined,
      previousSize: PanelSize | undefined,
    ) => void;
    style?: DivStyle;
  }

  export interface GroupProps extends DivProps {
    children?: OctaneNode;
    defaultLayout?: Layout;
    disabled?: boolean;
    id?: string | number;
    onLayoutChange?: (layout: Layout) => void;
    onLayoutChanged?: (layout: Layout, meta: LayoutChangedMeta) => void;
    orientation?: "horizontal" | "vertical";
    style?: DivStyle;
  }

  export interface SeparatorProps extends DivProps {
    style?: DivStyle;
  }

  export function Group(props: GroupProps): Octane.JSX.Element;
  export function Panel(props: PanelProps): Octane.JSX.Element;
  export function Separator(props: SeparatorProps): Octane.JSX.Element;

  export interface UseDefaultLayoutOptions {
    /** Id del grupo (clave de persistencia del auto-save). */
    id?: string;
    groupId?: string;
    debounceSaveMs?: number;
    onlySaveAfterUserInteractions?: boolean;
    panelIds?: string[];
    storage?: LayoutStorage;
  }

  /**
   * Auto-save del layout (reemplazo del `autoSaveId` que el diseño preliminar
   * asumió): lee el layout persistido (localStorage implícito; `undefined` en
   * SSR → snapshot estable sin mismatch) y devuelve los handlers para `Group`.
   */
  export function useDefaultLayout(options: UseDefaultLayoutOptions): {
    defaultLayout: Layout | undefined;
    onLayoutChange: (layout: Layout) => void;
    onLayoutChanged: (layout: Layout, meta: LayoutChangedMeta) => void;
  };
}
