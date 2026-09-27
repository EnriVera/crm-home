import { useEffect, useRef, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { DataList } from "../molecules/data-list.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { ClientListItem } from "../molecules/client-list-item.tsrx";
import { ClientForm } from "../organisms/client-form/client-form.tsrx";
import { useFetch } from "../../hooks/use-fetch";
import type { Client } from "@crm/types";

/**
 * Página `/clients` (MVP extendido con create / delete).
 *
 * Render plan:
 * - Header con title + count + "+ Nuevo cliente" button (abre drawer
 *   con `ClientForm mode="create"`).
 * - Search input (filters clients.list por prefijo de nombre).
 * - DataList con `<ClientListItem>` — cada item es un `<a>` que navega
 *   a `/clients/:id` vía el interceptor SPA (`lib/nav/client-router.ts`).
 *
 * Nota: la `edit` action vive en `ClientDetailPage`, no acá — la lista
 * es para browse + delete rápido + create. Los detalles van a su
 * página dedicada.
 */

interface ClientRow {
  client_id: string;
  client_name: string;
  client_email: string | null;
  client_phone: string | null;
}

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export function ClientsPage() @{
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Carga de clientes vía useFetch (centraliza cancelled+finally).
  const clientsFetch = useFetch<ClientRow[]>(
    async () => {
      const result = ((await (RPC as RpcClient).clients.list({
        search,
        limit: 50,
      })) as Client[]).map((c) => ({
        client_id: c.client_id,
        client_name: c.client_name,
        client_email: c.client_email,
        client_phone: c.client_phone,
      }));
      return result;
    },
    [search],
  );
  const clients = clientsFetch.data ?? [];
  const loading = clientsFetch.loading;
  const loadError = clientsFetch.error;

  const handleCreate = async (payload: {
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
  }) => {
    setCreateOpen(false);
    await (RPC as RpcClient).clients.create(payload);
    clientsFetch.refetch();
  };

  const handleDelete = async (clientId: string) => {
    setDeletingId(clientId);
    setDeleteError(null);
    try {
      await (RPC as RpcClient).clients.remove({ client_id: clientId });
      setDeletingId(null);
      clientsFetch.refetch();
    } catch {
      setDeletingId(null);
      setDeleteError(t("clients.loadError"));
    }
  };

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
      <Button
        variant="primary"
        onClick={() => setCreateOpen(true)}
      >
        {t("clients.page.add")}
      </Button>
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

    {deleteError !== null && (
      <div
        role="alert"
        class="mb-4 rounded-md border border-error bg-surface px-4 py-2 text-sm text-error"
      >
        {deleteError}
      </div>
    )}

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
        <EmptyState
          icon={<Icon name="users" size={48} />}
          title={
            search
              ? t("clients.listEmpty.noResults")
              : t("clients.listEmpty.noClients")
          }
          description={
            search
              ? t("clients.listEmpty.noResultsBody")
              : t("clients.listEmpty.noClientsBody")
          }
          action={
            search === "" ? (
              <Button
                variant="primary"
                onClick={() => setCreateOpen(true)}
              >
                {t("clients.page.add")}
              </Button>
            ) : undefined
          }
        />
      }
    >
      <ul class="flex flex-col gap-3">
        {clients.map((client) => (
          <li
            key={client.client_id}
            data-component="client-row"
            class="flex items-stretch gap-3 rounded-md border border-border bg-surface transition-colors hover:bg-background"
          >
            <div class="min-w-0 flex-1">
              <ClientListItem
                client_id={client.client_id}
                client_name={client.client_name}
                client_email={client.client_email}
                client_phone={client.client_phone}
              />
            </div>
            <Button
              variant="ghost"
              type="button"
              disabled={deletingId === client.client_id}
              onClick={(event: Event) => {
                event.preventDefault();
                event.stopPropagation();
                void handleDelete(client.client_id);
              }}
              aria-label={t("clients.detail.delete")}
              title={t("clients.detail.delete")}
              class="m-2 shrink-0 px-3 py-1 text-sm text-error hover:bg-error/10"
            >
              {deletingId === client.client_id
                ? t("clients.form.submitting")
                : t("clients.detail.delete")}
            </Button>
          </li>
        ))}
      </ul>
    </DataList>

    {createOpen ? (
      <ClientForm
        mode="create"
        onSubmit={handleCreate}
        onClose={() => setCreateOpen(false)}
      />
    ) : null}
  </section>
}
