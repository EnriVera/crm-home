import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { ThemeSelect } from "../molecules/theme-select.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";

/**
 * Página `/config` — Settings del user (PRD-v2.md §8.7).
 *
 * Secciones:
 * - Perfil: nombre + email desde `rpc.auth.session()`.
 * - Apariencia: selector 3-way de tema (claro / oscuro / sistema) con
 *   persistencia en la cuenta del usuario. La selección se escribe
 *   inmediatamente a `user_theme` (sin recargar) vía
 *   `rpc.auth.updateTheme`. El ThemeSelect molecule se encarga del apply
 *   local (clase `dark` en `<html>` + localStorage) via su propio
 *   useTheme() — la página solo orquesta la persistencia remota.
 *
 * Notas de la interación local ↔ servidor:
 * - `currentSetting` arranca en `"system"` (default del DB) y se sincroniza
 *   desde `user.userTheme` cuando la session query resuelve. Breve flash
 *   en el primer load si localStorage dice otra cosa — aceptable, el
 *   session query resuelve en < 200 ms en dev.
 * - En error de red durante `updateTheme`, revertimos al último valor
 *   conocido del servidor (o al previo local si no hay sesión). El error
 *   se muestra inline debajo del selector.
 */
const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

interface UserInfo {
  id: string;
  email: string;
  name: string;
  userTheme: "light" | "dark" | "system";
}

type ThemeOption = "light" | "dark" | "system";

export function ConfigPage() @{
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
  const serverTheme = user?.userTheme;

  const [currentSetting, setCurrentSetting] = useState<ThemeOption>("system");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Sync: cuando la session query resuelve, la elección del servidor
  // es la fuente de verdad. localStorage es la cache para el apply
  // instantáneo entre page loads (y entre dispositivos, per PRD line 40).
  useEffect(() => {
    if (serverTheme !== undefined) {
      setCurrentSetting(serverTheme);
    }
  }, [serverTheme]);

  const handleThemeChange = async (next: ThemeOption): Promise<void> => {
    const previous = currentSetting;
    setCurrentSetting(next);
    if (user === null) return; // no autenticado, no hay server-side save
    setSaving(true);
    setSaveError(null);
    try {
      await (RPC as RpcClient).auth.updateTheme({ setting: next });
      // No invalidamos la session query: el next refetch (window focus
      // o re-mount) traerá el userTheme fresco. El state local
      // (currentSetting) es la fuente de verdad para la UI.
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      // Revert: preferir el server value si lo tenemos, si no el
      // previous local.
      if (serverTheme !== undefined) {
        setCurrentSetting(serverTheme);
      } else {
        setCurrentSetting(previous);
      }
    } finally {
      setSaving(false);
    }
  };

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
          <ThemeSelect
            value={currentSetting}
            labelLight={t("config.appearance.themeLight")}
            labelDark={t("config.appearance.themeDark")}
            labelSystem={t("config.appearance.themeSystem")}
            onChange={handleThemeChange}
            disabled={saving}
          />
          {saveError !== null && (
            <p
              role="alert"
              class="mt-3 text-xs text-error"
              data-error="theme-save"
            >
              {t("config.appearance.themeSaveError")}: {saveError}
            </p>
          )}
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
