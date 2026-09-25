import { useEffect, useRef, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { BaseView, type ViewKind } from "../base-view/base-view.tsrx";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { ClientListItem } from "../molecules/client-list-item.tsrx";
import type { Client } from "@crm/types";

/**
 * Página `/clients` (MVP read-only).
 *
 * Render plan:
 * - Header con title + count + gear (config) placeholder
 * - Search input (filters tasks.client.list by name prefix)
 * - DataList con BaseView (list/grid/kanban — grid/kanban stubs por ahora)
 *
 * El shell del cliente + DataList es el mismo patrón que `tasks-page`,
 * asegurando consistencia visual entre módulos.
 */

interface ClientRow {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function ClientsPage() @{
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [search, setSearch] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Carga de clientes.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const result = (await (RPC as RpcClient).clients.list({
          search,
          limit: 50,
        })) as Client[];
        if (!cancelled) {
          setClients(
            result.map((c) => ({
              client_id: c.client_id,
              client_name: c.client_name,
              client_email: c.client_email,
              client_phone: c.client_phone,
            })),
          );
          setLoading(false);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t("clients.loadError"));
          setLoading(false);
        }
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, [search, refreshKey]);

  void searchInputRef;

  <section
    data-page="clients"
    class="mx-auto w-full max-w-4xl px-6 py-8 sm:py-10"
  >
    <header class="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div class="min-w-0">
        <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
          {t("clients.page.title")}
        </h1>
        {clients.length > 0 && (
          <p class="mt-1 text-sm text-text-secondary">
            {clients.length === 1
              ? "1 cliente"
              : `${clients.length} clientes`}
          </p>
        )}
      </div>
    </header>

    <div class="mb-6">
      <input
        ref={searchInputRef}
        type="search"
        value={search}
        onInput={(e: Event) => {
          const target = e.currentTarget as HTMLInputElement;
          setSearch(target.value);
        }}
        placeholder={t("clients.search.placeholder")}
        aria-label={t("clients.search.label")}
        class="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
      />
    </div>

    <DataList
      loading={loading}
      error={loadError}
      isEmpty={clients.length === 0}
      className="flex flex-col gap-3"
      skeleton={
        <>
          <div aria-hidden="true" class="rounded-md border border-border bg-surface px-4 py-3">
            <div class="h-4 w-1/3 animate-pulse rounded bg-background" />
            <div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-background" />
          </div>
          <div aria-hidden="true" class="rounded-md border border-border bg-surface px-4 py-3">
            <div class="h-4 w-1/3 animate-pulse rounded bg-background" />
            <div class="mt-2 h-3 w-1/2 animate-pulse rounded bg-background" />
          </div>
        </>
      }
      emptyState={
        <div
          data-component="clients-list-empty"
          class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-16 text-center"
        >
          <div class="mb-4 text-text-secondary">
            <Icon name="users" size={48} />
          </div>
          <h2 class="text-lg font-semibold text-text-primary">
            {search
              ? t("clients.listEmpty.noResults")
              : t("clients.listEmpty.noClients")}
          </h2>
          <p class="mt-2 max-w-sm text-sm text-text-secondary">
            {search
              ? t("clients.listEmpty.noResultsBody")
              : t("clients.listEmpty.noClientsBody")}
          </p>
        </div>
      }
    >
      <ul class="flex flex-col gap-3">
        {clients.map((client) => (
          <li key={client.client_id}>
            <ClientListItem
              client_id={client.client_id}
              client_name={client.client_name}
              client_email={client.client_email}
              client_phone={client.client_phone}
            />
          </li>
        ))}
      </ul>
    </DataList>
  </section>
}
