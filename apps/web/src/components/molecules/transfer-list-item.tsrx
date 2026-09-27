/**
 * Molecule: una fila de la lista de transfers (`/transfers` view=list).
 *
 * Muestra el monto con un indicador visual de dirección:
 * - De `from_account` a `to_account` (mostramos ambos nombres cuando hay)
 * - Color neutral (no verde/rojo) — un transfer no es ingreso ni gasto, es
 *   un movimiento entre cuentas.
 */
export interface TransferListItemProps {
  tran_id: string;
  tran_amount: string;
  tran_currency_symbol: string;
  tran_date: string;
  tran_description: string | null;
  tran_from_account_name: string | null;
  tran_to_account_name: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

export function TransferListItem(props: TransferListItemProps) @{
  const amountNum = Number(props.tran_amount);
  const formattedAmount = amountNum.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const dateFormatted = (() => {
    try {
      const [y, m, d] = props.tran_date.split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined) return props.tran_date;
      return dateFormatter.format(new Date(y, m - 1, d));
    } catch {
      return props.tran_date;
    }
  })();
  const description = props.tran_description ?? "—";

  <div data-component="transfer-list-item" class="flex items-start gap-4 px-4 py-3">
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <span class="text-base font-semibold text-text-primary">
          {props.tran_currency_symbol}{formattedAmount}
        </span>
        <span class="text-xs text-text-secondary">
          · {props.tran_from_account_name ?? "?"} → {props.tran_to_account_name ?? "?"}
        </span>
      </div>
      <p class={`mt-1 text-sm ${props.tran_description ? "text-text-secondary" : "italic text-text-secondary/70"}`}>
        {description}
      </p>
    </div>
    <time dateTime={props.tran_date} class="shrink-0 text-xs text-text-secondary">
      {dateFormatted}
    </time>
  </div>
}
