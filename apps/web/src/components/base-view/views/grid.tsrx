/**
 * Vista grid del `BaseView`. Distribuye `records` en `columns` columnas
 * (default 3) y aplica `gridStructure.card(record)` a cada uno. El render
 * concreto del card es responsabilidad del padre.
 */

export interface GridViewProps<R> {
  records: R[];
  columns?: number;
  card: (record: R) => unknown;
}

export function GridView<R>(props: GridViewProps<R>) @{
  const columns = props.columns ?? 3;

  <div
    data-view="grid"
    style={{
      display: "grid",
      gridTemplateColumns: `repeat(${columns}, 1fr)`,
      gap: "1rem",
    }}
  >
    {props.records.map((record, i) => (
      <div key={i}>{props.card(record)}</div>
    ))}
  </div>
}
