/**
 * Vista list del `BaseView`. Itera `records` y aplica `listStructure.row(record)`
 * a cada uno. El render concreto del row es responsabilidad del padre
 * (típicamente un organism por módulo: `task-row`, `client-row`, etc.).
 */

export interface ListViewProps<R> {
  records: R[];
  row: (record: R) => unknown;
}

export function ListView<R>(props: ListViewProps<R>) @{
  <ul data-view="list">
    {props.records.map((record, i) => (
      <li key={i}>{props.row(record)}</li>
    ))}
  </ul>
}
