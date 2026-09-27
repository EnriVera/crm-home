/**
 * Molecule: una fila de la lista de incomes (`/incomes` view=list).
 *
 * Render plan (Operate / design.md — paralelo a `TaskListItem`):
 * - Fila horizontal con surface + border + rounded-md.
 * - Left cluster: amount (formateado con currency symbol) + category/description.
 * - Right cluster: date formateada en locale es.
 *
 * El parent (IncomesPage) es responsable del wrapper `<a>` para la navegación
 * a `/incomes/:id` (mismo patrón que ClientListItem).
 */
export interface IncomeListItemProps {
  inco_id: string;
  inco_amount: string; // string decimal-safe del backend
  inco_currency_symbol: string;
  inco_date: string; // YYYY-MM-DD
  inco_description: string | null;
  inco_category: string | null;
  inco_account_name: string | null; // resolved via JOIN (no acá)
}

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function IncomeListItem(props: IncomeListItemProps) @{
  // Format amount con currency prefix
  const amountNum = Number(props.inco_amount);
  const formattedAmount = amountNum.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const dateFormatted = (() => {
    try {
      const [y, m, d] = props.inco_date.split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined) return props.inco_date;
      return dateFormatter.format(new Date(y, m - 1, d));
    } catch {
      return props.inco_date;
    }
  })();
  const description = props.inco_description ?? "—";
  const isDescriptionPlaceholder = !props.inco_description;

  <div
    data-component="income-list-item"
    class="flex items-start gap-4 px-4 py-3"
  >
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <span class="text-base font-semibold text-success">
          +{props.inco_currency_symbol}{formattedAmount}
        </span>
        {props.inco_account_name !== null ? (
          <span class="text-xs text-text-secondary">
            · {props.inco_account_name}
          </span>
        ) : null}
      </div>
      <p class={`mt-1 text-sm ${isDescriptionPlaceholder ? "italic text-text-secondary/70" : "text-text-secondary"}`}>
        {description}
      </p>
      {props.inco_category !== null ? (
        <span class="mt-1 inline-block rounded-md bg-surface px-2 py-0.5 text-xs text-text-secondary">
          {props.inco_category}
        </span>
      ) : null}
    </div>
    <time
      dateTime={props.inco_date}
      class="shrink-0 text-xs text-text-secondary"
    >
      {dateFormatted}
    </time>
  </div>
}
