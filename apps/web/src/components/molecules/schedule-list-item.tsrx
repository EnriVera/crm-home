/**
 * Molecule: una fila de la lista de schedules (`/schedules` view=list).
 *
 * Muestra el nombre de la regla, el monto + currency, la frecuencia y
 * la próxima fecha de ejecución. Badge "Activo/Pausado" para distinguir.
 */
export interface ScheduleListItemProps {
  sche_id: string;
  sche_name: string;
  sche_amount: string;
  sche_currency_symbol: string;
  sche_frequency: string;
  sche_next_run_date: string;
  sche_is_active: boolean;
  sche_description: string | null;
}

const dateFormatter = new Intl.DateTimeFormat("es", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const frequencyLabel = (f: string) => {
  switch (f) {
    case "daily":
      return "Diario";
    case "weekly":
      return "Semanal";
    case "monthly":
      return "Mensual";
    case "yearly":
      return "Anual";
    default:
      return f;
  }
};

export function ScheduleListItem(props: ScheduleListItemProps) @{
  const amountNum = Number(props.sche_amount);
  const formattedAmount = amountNum.toLocaleString("es", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  });
  const dateFormatted = (() => {
    try {
      const [y, m, d] = props.sche_next_run_date.split("-").map(Number);
      if (y === undefined || m === undefined || d === undefined) return props.sche_next_run_date;
      return dateFormatter.format(new Date(y, m - 1, d));
    } catch {
      return props.sche_next_run_date;
    }
  })();

  <div data-component="schedule-list-item" class="flex items-start gap-4 px-4 py-3">
    <div class="min-w-0 flex-1">
      <div class="flex items-baseline gap-2">
        <span class="text-sm font-semibold text-text-primary">
          {props.sche_name}
        </span>
        <span class={`text-xs rounded-md px-2 py-0.5 ${props.sche_is_active ? "bg-success/15 text-success" : "bg-surface text-text-secondary"}`}>
          {props.sche_is_active ? "Activo" : "Pausado"}
        </span>
      </div>
      <p class="mt-1 text-sm text-text-secondary">
        {props.sche_currency_symbol}{formattedAmount}
        <span class="ml-2 text-xs">· {frequencyLabel(props.sche_frequency)}</span>
      </p>
      {props.sche_description !== null ? (
        <p class="mt-1 text-xs text-text-secondary/70">{props.sche_description}</p>
      ) : null}
    </div>
    <time dateTime={props.sche_next_run_date} class="shrink-0 text-xs text-text-secondary">
      Próx: {dateFormatted}
    </time>
  </div>
}
