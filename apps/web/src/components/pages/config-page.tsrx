import { useEffect, useState } from "octane";
import { t } from "../vendor/i18n/core";
import { createRpcClient, type RpcClient } from "../../lib/api/rpc";
import { Button } from "../atoms/button.tsrx";
import { Icon } from "../vendor/icons";
import { Tabs, type TabItem } from "../molecules/tabs.tsrx";
import { ThemeSelect } from "../molecules/theme-select.tsrx";
import { useOctaneQuery } from "../../hooks/use-octane-query";
import { TypesTab } from "./types-tab.tsrx";
import {
  useQueryState,
  parseAsStringLiteral,
} from "@octanejs/nuqs";

/**
 * Página `/config` — Settings del user (PRD-v2.md §8.7).
 *
 * Tabs requeridos por el PRD:
 *   - usuario      → info del user + logout
 *   - apariencia   → selector 3-way de tema (claro/oscuro/sistema)
 *   - tipos        → CRUD completo (PR-F2)
 *   - categorías   → CRUD completo (PR-F2)
 *   - cuentas      → CRUD completo (PR-F2)
 *   - apps         → listado read-only (seed global)
 *   - monedas      → listado read-only (seed global)
 *   - adjuntos     → listado read-only + delete (PR-F2)
 *
 * Estado actual (este change):
 *   - usuario: implementado (info + logout trigger via sidebar)
 *   - apariencia: implementado (ThemeSelect + persistencia en user_theme)
 *   - apps + monedas: read-only, listas simples (seed chico, no necesita
 *     BaseView). Backend ya listo en commit 9d92a51 / Phase 1a-1b.
 *   - tipos / categorías / cuentas / adjuntos: placeholders "Próximamente".
 *     Cada uno es una feature doc + change aparte.
 *
 * Detalle de la interación local ↔ servidor del theme:
 *   - `currentSetting` arranca en "system" (default DB) y se sincroniza
 *     desde `user.userTheme` cuando la session query resuelve.
 *   - En error de red durante updateTheme, revertimos al último valor
 *     conocido del servidor (o al previo local si no hay sesión).
 */
const RPC = createRpcClient(import.meta.env.VITE_API_URL ?? "/rpc");

interface UserInfo {
  id: string;
  email: string;
  name: string;
  userTheme: "light" | "dark" | "system";
}

type ThemeOption = "light" | "dark" | "system";

const TAB_IDS = [
  "user",
  "appearance",
  "types",
  "categories",
  "accounts",
  "apps",
  "currencies",
  "attachments",
] as const;

type ConfigTabId = (typeof TAB_IDS)[number];

const TAB_PARSER = parseAsStringLiteral(TAB_IDS).withDefault("user");

export function ConfigPage() @{
  const sessionQuery = useOctaneQuery<{ user: UserInfo } | null>(
    () =>
      (RPC as RpcClient).auth.session() as Promise<
        { user: UserInfo } | null
      >,
    [],
  );
  const appsQuery = useOctaneQuery<Array<{ id: string; name: string }>>(
    () =>
      (RPC as RpcClient).config.listApps() as Promise<
        Array<{ id: string; name: string }>
      >,
    [],
  );
  const currenciesQuery = useOctaneQuery<
    Array<{ id: string; name: string; symbol: string; decimals: number }>
  >(
    () =>
      (RPC as RpcClient).config.listCurrencies() as Promise<
        Array<{ id: string; name: string; symbol: string; decimals: number }>
      >,
    [],
  );

  const loading = sessionQuery.loading;
  const error = sessionQuery.error;
  const user = sessionQuery.data?.user ?? null;
  const serverTheme = user?.userTheme;

  const [activeTab, setActiveTab] = useQueryState("tab", TAB_PARSER);
  const [currentSetting, setCurrentSetting] = useState<ThemeOption>("system");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (serverTheme !== undefined) {
      setCurrentSetting(serverTheme);
    }
  }, [serverTheme]);

  const handleThemeChange = async (next: ThemeOption): Promise<void> => {
    const previous = currentSetting;
    setCurrentSetting(next);
    if (user === null) return;
    setSaving(true);
    setSaveError(null);
    try {
      await (RPC as RpcClient).auth.updateTheme({ setting: next });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
      if (serverTheme !== undefined) {
        setCurrentSetting(serverTheme);
      } else {
        setCurrentSetting(previous);
      }
    } finally {
      setSaving(false);
    }
  };

  const tabs: TabItem[] = TAB_IDS.map((id) => ({
    id,
    label: t(`config.tab.${id}`),
  }));

  <section data-page="config" class="mx-auto w-full max-w-3xl px-6 py-8 sm:py-10">
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
      <div
        role="alert"
        class="mb-4 rounded-md border border-error bg-surface px-4 py-2 text-sm text-error"
      >
        {error}
      </div>
    )}

    {user !== null && (
      <Tabs
        items={tabs}
        activeId={activeTab}
        onChange={(id) => {
          // El setter de nuqs devuelve una Promise (URL write pasa por la
          // cola throttled); al Tabs molecule sólo le importa el side-effect.
          void setActiveTab(id as ConfigTabId);
        }}
      >
        {activeTab === "user" && (
          <div class="rounded-md border border-border bg-surface p-5">
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
        )}

        {activeTab === "appearance" && (
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
        )}

        {activeTab === "apps" && (
          <div class="rounded-md border border-border bg-surface p-5">
            <h2 class="mb-4 text-sm font-medium text-text-secondary">
              {t("config.tab.apps")}
            </h2>
            {appsQuery.loading && (
              <p class="text-sm text-text-secondary">{t("config.loading")}</p>
            )}
            {appsQuery.error !== null && (
              <p role="alert" class="text-sm text-error">
                {appsQuery.error}
              </p>
            )}
            {appsQuery.data !== null && (
              <ul class="divide-y divide-border">
                {appsQuery.data.length === 0 ? (
                  <li class="py-3 text-sm text-text-secondary">
                    {t("apps.empty")}
                  </li>
                ) : (
                  appsQuery.data.map((app) => (
                    <li
                      key={app.id}
                      class="flex items-center justify-between py-3 text-sm"
                    >
                      <span class="text-text-primary">{app.name}</span>
                      <span class="font-mono text-xs text-text-secondary">
                        {app.id.slice(0, 8)}…
                      </span>
                    </li>
                  ))
                )}
              </ul>
            )}
          </div>
        )}

        {activeTab === "currencies" && (
          <div class="rounded-md border border-border bg-surface p-5">
            <h2 class="mb-4 text-sm font-medium text-text-secondary">
              {t("config.tab.currencies")}
            </h2>
            {currenciesQuery.loading && (
              <p class="text-sm text-text-secondary">{t("config.loading")}</p>
            )}
            {currenciesQuery.error !== null && (
              <p role="alert" class="text-sm text-error">
                {currenciesQuery.error}
              </p>
            )}
            {currenciesQuery.data !== null && (
              <table class="w-full text-sm">
                <thead>
                  <tr class="border-b border-border text-left text-xs text-text-secondary">
                    <th class="py-2 font-medium">{t("config.tab.currencies")}</th>
                    <th class="py-2 font-medium">Símbolo</th>
                    <th class="py-2 text-right font-medium">Decimales</th>
                  </tr>
                </thead>
                <tbody>
                  {currenciesQuery.data.map((c) => (
                    <tr key={c.id} class="border-b border-border last:border-b-0">
                      <td class="py-2 text-text-primary">{c.name}</td>
                      <td class="py-2 text-text-primary">{c.symbol}</td>
                      <td class="py-2 text-right text-text-primary">{c.decimals}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {activeTab === "types" && <TypesTab />}

        {(activeTab === "categories" ||
          activeTab === "accounts" ||
          activeTab === "attachments") && (
          <div class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
            <div class="mb-3 text-text-secondary">
              <Icon name="gear" size={40} />
            </div>
            <p class="text-sm text-text-secondary">{t("config.comingSoon")}</p>
          </div>
        )}
      </Tabs>
    )}

    {!loading && user === null && error === null && (
      <div class="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface px-6 py-12 text-center">
        <div class="mb-3 text-text-secondary">
          <Icon name="gear" size={40} />
        </div>
        <p class="text-sm text-text-secondary">{t("config.emptySession")}</p>
        <Button
          variant="primary"
          class="mt-4"
          onClick={() => globalThis.location.assign("/login")}
        >
          {t("shell.redirectFallback")}
        </Button>
      </div>
    )}
  </section>
}
