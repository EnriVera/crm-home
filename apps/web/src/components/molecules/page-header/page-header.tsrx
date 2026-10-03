import type { OctaneNode } from "octane";
import { useT } from "../../vendor/i18n";
import { Icon, type IconName } from "../../vendor/icons";

export interface PageHeaderAction {
  /** Etiqueta visible del botón (i18n). */
  label: string;
  /** Icono izquierdo opcional del botón. */
  icon?: IconName;
  /** `href` para navegación (cuando la acción navega en vez de ejecutar JS). */
  href?: string;
  /** Click handler (cuando la acción ejecuta lógica, no navega). */
  onClick?: () => void;
  /** Tooltiparia "submit" alternativo al `label` visible. */
  ariaLabel?: string;
  /** Deshabilitado (ej. form en loading). */
  disabled?: boolean;
  /** `data-*` extra para testing. */
  "data-action"?: string;
}

export interface PageHeaderProps {
  /**
   * Slot del breadcrumb: una lista de `{href?, label}` que se renderiza
   * inline con separadores `/`. El último elemento se pinta con
   * `text-text-primary` y NO lleva link (página actual).
   */
  breadcrumb?: ReadonlyArray<{ href?: string; label: string }>;
  /** Título de la página (`<h1>`). */
  title: string;
  /** Subtítulo opcional debajo del título (texto secundario, 14px). */
  subtitle?: string;
  /** Acción primaria única (relleno verde). Solo una por pantalla. */
  action?: PageHeaderAction;
  /** Slots alternativos para cuando se necesita más que un botón. */
  trailing?: OctaneNode;
}

/**
 * Header de página autenticada (lenguaje minimalist + verde-acento del
 * rediseño 2026-Q4, siguiendo el mockup Orbit UI "Acme Inc. inbox").
 *
 * Composición:
 * 1. **Breadcrumb** — `font-mono text-[10px] uppercase tracking-[0.25em]`
 *    text-text-secondary, separadores `/`. Solo el último segmento en
 *    `text-text-primary` y sin link (página actual).
 * 2. **Fila principal** — `<h1>` semibold 2xl + action button a la derecha.
 *    Si hay subtitle, va debajo del `<h1>` con `mt-1`.
 *
 * Reglas:
 * - **Una sola acción primaria por pantalla** (regla §6 de DESIGN.md).
 *   El botón verde solo aparece cuando `action` está provisto; si no, la
 *   página no tiene CTA principal.
 * - **Sin eyebrow extra** en secciones internas (cap 1 cada 3 secciones,
 *   skill design-taste-frontend §4.7). Este header es de nivelación, no
 *   decoración.
 * - **Tokens semánticos** exclusivamente — sin hex ni sombras decorativas
 *   (DESIGN.md §4).
 */
export function PageHeader(props: PageHeaderProps) @{
  const t = useT();

  const crumbs = props.breadcrumb ?? [];

  <header class="flex flex-col gap-2">
    {crumbs.length > 0 ? (
      <nav
        aria-label={t("pageHeader.breadcrumbAriaLabel")}
        class="font-mono text-[10px] text-text-secondary uppercase tracking-[0.25em]"
      >
        {crumbs.flatMap((crumb, idx) => {
          const isLast = idx === crumbs.length - 1;
          // flatMap sin `null` en el array: el walker de hidratación
          // de octane choca con `findMatchingClose` cuando un array
          // tiene elementos null (SSR produce `<!--[--><!--]-->` para
          // cada null, y el walker no los cuenta bien al reconciliar).
          // Devolvemos 1 elemento para el último item, 2 para el resto.
          const labelNode = crumb.href !== undefined && !isLast
            ? (
              <a
                key={`crumb-${idx}`}
                href={crumb.href}
                class="transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              >
                {crumb.label}
              </a>
            )
            : (
              <span
                key={`crumb-${idx}`}
                class={isLast ? "text-text-primary" : ""}
              >
                {crumb.label}
              </span>
            );
          if (isLast) return [labelNode];
          return [
            labelNode,
            <span
              key={`sep-${idx}`}
              aria-hidden="true"
              class="mx-1.5 opacity-60"
            >
              /
            </span>,
          ];
        })}
      </nav>
    ) : null}

    <div class="flex items-center justify-between gap-4">
      <div class="min-w-0">
        <h1 class="font-semibold text-2xl text-text-primary tracking-tight">
          {props.title}
        </h1>
        {props.subtitle !== undefined ? (
          <p class="mt-1 text-sm text-text-secondary">{props.subtitle}</p>
        ) : null}
      </div>

      {props.action !== undefined && props.trailing === undefined ? (
        props.action.href !== undefined
          ? (
            <a
              href={props.action.href}
              aria-label={props.action.ariaLabel ?? props.action.label}
              class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
              data-action={props.action["data-action"]}
            >
              {props.action.icon !== undefined ? (
                <Icon name={props.action.icon} size={16} />
              ) : null}
              <span>{props.action.label}</span>
            </a>
          )
          : (
            <button
              type="button"
              onClick={props.action.onClick}
              disabled={props.action.disabled === true}
              aria-label={props.action.ariaLabel ?? props.action.label}
              class="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 font-medium text-sm text-white transition-colors hover:bg-primary-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus disabled:cursor-not-allowed disabled:opacity-60"
              data-action={props.action["data-action"]}
            >
              {props.action.icon !== undefined ? (
                <Icon name={props.action.icon} size={16} />
              ) : null}
              <span>{props.action.label}</span>
            </button>
          )
      ) : null}

      {props.trailing !== undefined ? props.trailing : null}
    </div>
  </header>
}