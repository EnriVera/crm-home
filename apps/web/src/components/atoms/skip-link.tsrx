export interface SkipLinkProps {
  /** Texto del enlace (i18n, provisto por el consumidor). */
  label: string;
  /** Destino ancla; default `#content` (el <main> del shell). */
  href?: string;
}

/**
 * Atom skip-link (WCAG 2.2 AA — 2.4.1): primer elemento focalizable de la
 * página; invisible hasta recibir foco por teclado.
 */
export function SkipLink(props: SkipLinkProps) @{
    <a
        href={props.href ?? "#content"}
        /* El verde que el usuario ve al tabular es el outline (canónico de
           foco, lista cerrada). El fill pasa a neutral alto contraste para
           preservar WCAG 2.4.1 sin quemar el acento en un fill. */
        class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-text-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      >
    {props.label}
  </a>
}
