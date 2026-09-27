import { ClientDetailPage } from "../../components/pages/client-detail-page.tsrx";

/**
 * Route `/clients/:id`.
 *
 * El parámetro dinámico se lee del shell de octane (no del `window.location`)
 * para mantener consistencia SSR/hidratación (D3).
 */
export function ClientDetailRoute(props: {
  params: { id: string };
  url: string;
}) @{
  <ClientDetailPage clientId={props.params.id} />
}
