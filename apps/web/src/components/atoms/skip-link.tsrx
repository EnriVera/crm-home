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
    class="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  >
    {props.label}
  </a>
}
