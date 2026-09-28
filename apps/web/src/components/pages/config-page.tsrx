import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { ThemeToggle } from "../molecules/theme-toggle.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";

/**
 * Página `/config` — Settings del user.
 *
 * MVP: muestra info del user (nombre, email) desde `rpc.auth.session()`,
 * permite cambiar el tema (ThemeToggle ya existente), y expone el botón
 * de logout. No hay todavía endpoint público para update de perfil —
 * ese vendría en una Fase 2.
 */
const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

interface UserInfo {
  id: string;
  email: string;
  name: string;
}

export function ConfigPage() @{
  // Carga vía useOctaneQuery (loading se resuelve a false vía QueryObserver
  // aunque el hook original era propenso al bug del missing-finally; el
  // query core garantiza la invariante por diseño).
  const sessionQuery = useOctaneQuery<{ user: UserInfo } | null>(
    () =>
      (RPC as RpcClient).auth.session() as Promise<
        { user: UserInfo } | null
      >,
    [],
  );
  const loading = sessionQuery.loading;
  const error = sessionQuery.error;
  const user = sessionQuery.data?.user ?? null;

  <section data-page="config" class="mx-auto w-full max-w-2xl px-6 py-8 sm:py-10">
    <header class="mb-8">
      <h1 class="text-2xl font-bold text-text-primary tracking-tight sm:text-3xl">
        {t("config.title")}
      </h1>
      <p class="mt-1 text-sm text-text-secondary">
        {t("config.subtitle")}
      </p>
    </header>

    {loading && (
      <div class="rounded-md border border-border bg-surface p-4 text-sm text-text-secondary">
        {t("config.loading")}
      </div>
    )}

    {error !== null && (
      <div role="alert" class="mb-4 rounded-md border border-error bg-surface px-4 py-2 text-sm text-error">
        {error}
      </div>
    )}

    {user !== null && (
      <>
        <div class="mb-6 rounded-md border border-border bg-surface p-5">
          <h2 class="mb-4 text-sm font-medium text-text-secondary">
            {t("config.profile.title")}
          </h2>
          <dl class="grid grid-cols-3 gap-4">
            <dt class="text-xs text-text-secondary">{t("config.profile.name")}</dt>
            <dd class="col-span-2 text-sm text-text-primary">{user.name}</dd>
            <dt class="text-xs text-text-secondary">{t("config.profile.email")}</dt>
            <dd class="col-span-2 text-sm text-text-primary">{user.email}</dd>
          </dl>
        </div>

        <div class="rounded-md border border-border bg-surface p-5">
          <h2 class="mb-4 text-sm font-medium text-text-secondary">
            {t("config.appearance.title")}
          </h2>
          <ThemeToggle
            labelLight={t("theme.toLight")}
            labelDark={t("theme.toDark")}
          />
        </div>
      </>
    )}

    {!loading && user === null && error === null && (
      <div class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
        <div class="mb-3 text-text-secondary">
          <Icon name="gear" size={40} />
        </div>
        <p class="text-sm text-text-secondary">
          {t("config.emptySession")}
        </p>
        <Button variant="primary" class="mt-4" onClick={() => globalThis.location.assign("/login")}>
          {t("shell.redirectFallback")}
        </Button>
      </div>
    )}
  </section>
}
