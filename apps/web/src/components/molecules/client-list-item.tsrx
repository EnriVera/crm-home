import { t } from "../vendor/i18n/core";

/**
 * Molecule: una fila de la lista de clientes (`/clients` view=list).
 *
 * Render plan (Operate / PRD §6.2 — paralelo a TaskListItem):
 * - `<a>` semántico (futuro: hacia `/clients/:id`).
 * - Card-like sin shadow: surface + border 1px + rounded-md.
 * - Layout: horizontal flex, left cluster (name + email/phone),
 *   right cluster (badge placeholder).
 * - Hover: surface.
 *
 * Empty fields (sin email, sin phone) muestran "—" muted para que el
 * usuario entienda el campo, no que "no hay nada".
 */

export interface ClientListItemProps {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

export function ClientListItem(props: ClientListItemProps) @{
  const emailText = props.client_email ?? "—";
  const phoneText = props.client_phone ?? "—";
  const isEmailPlaceholder = !props.client_email;
  const isPhonePlaceholder = !props.client_phone;

  <a
    href={`/clients/${props.client_id}`}
    data-component="client-list-item"
    class="flex items-start gap-4 rounded-md border border-border bg-surface px-4 py-3 transition-colors hover:bg-background focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
  >
    <div class="min-w-0 flex-1">
      <h3 class="truncate text-sm font-semibold text-text-primary">
        {props.client_name}
      </h3>
      <p
        class={`mt-1 text-sm ${
          isEmailPlaceholder ? "italic text-text-secondary/70" : "text-text-secondary"
        }`}
      >
        <span class="text-text-secondary/60">{t("clients.fields.email")}:</span>{" "}
        {emailText}
      </p>
      <p
        class={`mt-0.5 text-sm ${
          isPhonePlaceholder ? "italic text-text-secondary/70" : "text-text-secondary"
        }`}
      >
        <span class="text-text-secondary/60">{t("clients.fields.phone")}:</span>{" "}
        {phoneText}
      </p>
    </div>
  </a>
}
