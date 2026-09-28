import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { EmptyState } from "../molecules/empty-state.tsrx";
import { ClientForm } from "../organisms/client-form/client-form.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";
import type { Client } from "@crm/types";

/**
 * Página `/clients/:id`.
 *
 * Render plan:
 * - Header con "Volver" + nombre del cliente + acciones (Editar / Eliminar).
 * - Card con datos (nombre, email, teléfono, creado en).
 * - Drawer de edit con `ClientForm mode="edit"` (optimistic via
 *   `setRefreshKey` del parent).
 *
 * El delete muestra confirmación inline (un click → muestra "Confirmar"
 * → un click más ejecuta). Sin modal: el patrón de doble-click es
 * suficiente para MVP y evita un atom extra (Modal/Dialog).
 */

const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

export interface ClientDetailPageProps {
  /** `params.id` del route file `/clients/$id.tsrx`. */
  clientId: string;
}

export function ClientDetailPage(props: ClientDetailPageProps) @{
  const [client, setClient] = useState<Client | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteArmed, setDeleteArmed] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Load client by id via useOctaneQuery (loading siempre resuelve a false
  // gracias al QueryObserver; misma contract surface que useFetch).
  const clientQuery = useOctaneQuery<Client>(
    async () => {
      try {
        const result = ((await (RPC as RpcClient).clients.get({
          client_id: props.clientId,
        })) as Client);
        setClient(result);
        setNotFound(false);
        return result;
      } catch (err) {
        const code = (err as { code?: unknown }).code;
        const status = (err as { status?: unknown }).status;
        if (
          code === "CLIENT_NOT_FOUND" ||
          (typeof status === "number" && status === 404)
        ) {
          setNotFound(true);
        }
        throw err;
      }
    },
    [props.clientId],
  );
  const loading = clientQuery.loading;
  const loadError = clientQuery.error;

  const handleEdit = async (payload: {
    client_name: string;
    client_email: string | null;
    client_phone: string | null;
  }) => {
    const result = (await (RPC as RpcClient).clients.update({
      client_id: props.clientId,
      ...payload,
    })) as Client;
    setClient(result);
    setEditOpen(false);
  };

  const handleDelete = async () => {
    if (!deleteArmed) {
      setDeleteArmed(true);
      return;
    }
    setDeleting(true);
    setDeleteError(null);
    try {
      await (RPC as RpcClient).clients.remove({
        client_id: props.clientId,
      });
      // Volver a la lista — el shell hace pushState para mantener SPA
      globalThis.history.pushState({}, "", "/clients");
      globalThis.location.assign("/clients");
    } catch {
      setDeleting(false);
      setDeleteError(t("clients.loadError"));
    }
  };

  <section
    data-page="client-detail"
    class="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10"
  >
    <div class="mb-6">
      <a
        href="/clients"
        class="text-sm text-text-secondary hover:text-text-primary"
      >
        ← {t("clients.detail.title")}
      </a>
    </div>

    {loading && (
      <div aria-hidden="true" class="animate-pulse">
        <div class="h-8 w-1/2 rounded bg-surface" />
        <div class="mt-4 h-4 w-1/3 rounded bg-surface" />
      </div>
    )}

    {notFound && !loading ? (
      <EmptyState
        kind="notFound"
        title={t("clients.detail.notFoundTitle")}
        description={t("clients.detail.notFoundBody")}
        action={
          <Button
            variant="primary"
            onClick={() => globalThis.location.assign("/clients")}
          >
            {t("clients.detail.notFoundBack")}
          </Button>
        }
      />
    ) : loadError !== null ? (
      <div
        role="alert"
        class="rounded-md border border-error bg-surface px-4 py-3 text-sm text-error"
      >
        {loadError}
      </div>
    ) : null}

    {client !== null && (
      <>
        <header class="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div class="min-w-0">
            <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
              {client.client_name}
            </h1>
          </div>
          <div class="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={() => setEditOpen(true)}
              disabled={deleting}
            >
              {t("clients.detail.edit")}
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                void handleDelete();
              }}
              disabled={deleting}
              class={
                deleteArmed
                  ? "!bg-error !text-white hover:!bg-error/90"
                  : "text-error hover:bg-error/10"
              }
            >
              {deleting
                ? t("clients.form.submitting")
                : deleteArmed
                  ? t("clients.detail.confirmDelete")
                  : t("clients.detail.delete")}
            </Button>
          </div>
        </header>

        {deleteError !== null && (
          <div
            role="alert"
            class="mb-4 rounded-md border border-error bg-surface px-4 py-2 text-sm text-error"
          >
            {deleteError}
          </div>
        )}

        <dl class="rounded-md border border-border bg-surface px-5 py-4">
          <div class="grid grid-cols-3 gap-4 py-2">
            <dt class="text-xs font-medium text-text-secondary">
              {t("clients.fields.name")}
            </dt>
            <dd class="col-span-2 text-sm text-text-primary">
              {client.client_name}
            </dd>
          </div>
          <div class="grid grid-cols-3 gap-4 py-2">
            <dt class="text-xs font-medium text-text-secondary">
              {t("clients.fields.email")}
            </dt>
            <dd class="col-span-2 text-sm text-text-primary">
              {client.client_email ?? "—"}
            </dd>
          </div>
          <div class="grid grid-cols-3 gap-4 py-2">
            <dt class="text-xs font-medium text-text-secondary">
              {t("clients.fields.phone")}
            </dt>
            <dd class="col-span-2 text-sm text-text-primary">
              {client.client_phone ?? "—"}
            </dd>
          </div>
          <div class="grid grid-cols-3 gap-4 py-2">
            <dt class="text-xs font-medium text-text-secondary">
              {t("clients.detail.created")}
            </dt>
            <dd class="col-span-2 text-sm text-text-primary">
              {new Date(client.client_created_at).toLocaleString()}
            </dd>
          </div>
        </dl>

        {editOpen ? (
          <ClientForm
            mode="edit"
            initial={{
              name: client.client_name,
              email: client.client_email,
              phone: client.client_phone,
            }}
            onSubmit={handleEdit}
            onClose={() => setEditOpen(false)}
          />
        ) : null}
      </>
    )}
  </section>
}
