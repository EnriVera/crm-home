/**
 * Molecule: una fila de la lista de expenses (`/expenses` view=list).
 *
 * Igual a IncomeListItem pero con color de "gasto" (rojo) en lugar de
 * "ingreso" (verde), y muestra el link al receipt (comprobante) si está.
 */
export interface ExpenseListItemProps {
  expe_id: string;
  expe_amount: string;
  expe_currency_symbol: string;
  expe_date: string;
  expe_description: string | null;
  expe_category: string | null;
  expe_account_name: string | null;
  expe_receipt_url: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function ExpenseListItem(props: ExpenseListItemProps) @{
  const amountNum = Number(props.expe_amount);
  const formattedAmount = amountNum.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const dateFormatted = (() => {
    try {
      const [y, m, d] = props.expe_date.split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined) return props.expe_date;
      return dateFormatter.format(new Date(y, m - 1, d));
    } catch {
      return props.expe_date;
    }
  })();
  const description = props.expe_description ?? "—";
  const isDescriptionPlaceholder = !props.expe_description;

  <div data-component="expense-list-item" class="flex items-start gap-4 px-4 py-3">
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <span class="text-base font-semibold text-error">
          -{props.expe_currency_symbol}{formattedAmount}
        </span>
        {props.expe_account_name !== null ? (
          <span class="text-xs text-text-secondary">
            · {props.expe_account_name}
          </span>
        ) : null}
      </div>
      <p class={`mt-1 text-sm ${isDescriptionPlaceholder ? "italic text-text-secondary/70" : "text-text-secondary"}`}>
        {description}
      </p>
      <div class="mt-1 flex items-center gap-2">
        {props.expe_category !== null ? (
          <span class="inline-block rounded-md bg-surface px-2 py-0.5 text-xs text-text-secondary">
            {props.expe_category}
          </span>
        ) : null}
        {props.expe_receipt_url !== null ? (
          <a
            href={props.expe_receipt_url}
            target="_blank"
            rel="noopener noreferrer"
            class="text-xs text-primary-700 underline-offset-2 hover:underline dark:text-primary-400"
            onClick={(e: Event) => e.stopPropagation()}
          >
            Comprobante
          </a>
        ) : null}
      </div>
    </div>
    <time dateTime={props.expe_date} class="shrink-0 text-xs text-text-secondary">
      {dateFormatted}
    </time>
  </div>
}
