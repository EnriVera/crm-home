<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhPencilSimple, PhPlus } from "~/shared/vendor/icons";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import { useTransfers } from "~/shared/composables/use-transfers";
import { formatDateShort, formatMoney } from "~/domain/finance/entities";
import BaseView from "~/ui/organisms/base-view.vue";
import AccountIcon from "~/ui/molecules/account-icon.vue";
import ConfigDeleteAction from "~/ui/molecules/config-delete-action.vue";
import AccountDrawer from "~/ui/organisms/finance-drawers/account-drawer.vue";
import TransferDrawer from "~/ui/organisms/finance-drawers/transfer-drawer.vue";

/**
 * /transfers — las transferencias entre cuentas del estudio (PRD-v4 §8.7).
 *
 * La tabla del catálogo muestra FECHA · ORIGEN → DESTINO · NOTA · MONTO ·
 * ESTADO; el wire no tiene columna de estado (la tabla `transfer` sólo
 * tiene cuentas, monto, moneda, descripción y fecha), así que la pantalla
 * muestra lo que la API trae.
 */
const { t } = useI18n();
const { params, set } = useRouteSearch("transfers");
const {
  transfers,
  accounts,
  currencies,
  search,
  visibleTransfers,
  monthTotal,
  monthCount,
  lastTransfer,
  isLoading,
  error,
  accountName,
  accountIconOf,
  accountColorOf,
  symbolOf,
  load,
  loadCatalogs,
  add,
  edit,
  deleteTransfer,
  addAccount,
} = useTransfers();

const saving = ref(false);
const drawerError = ref<string | null>(null);
const accountDrawerOpen = ref(false);

const drawerOpen = computed(
  () => params.value.drawer === "new" || params.value.edit !== undefined,
);
const editingTransfer = computed(
  () => transfers.value.find((transfer) => transfer.id === params.value.edit) ?? null,
);

/**
 * El símbolo de los totales: el de la primera transferencia (o el de la
 * primera cuenta cuando todavía no hay transferencias). Mezclar monedas en
 * un total sería mentir, así que el total se muestra en una sola.
 */
const currencySymbol = computed(() => {
  const currencyId =
    transfers.value[0]?.currencyId ?? accounts.value[0]?.currencyId ?? "";
  return symbolOf(currencyId);
});

function openCreate() {
  drawerError.value = null;
  void set({ drawer: "new", edit: "" });
}

function openEdit(id: string) {
  drawerError.value = null;
  void set({ edit: id, drawer: "" });
}

function closeDrawer() {
  return set({ drawer: "", edit: "" });
}

async function submitTransfer(values: {
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  date: string;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingTransfer.value) {
      await edit({ id: editingTransfer.value.id, ...values });
    } else {
      await add(values);
    }
    await closeDrawer();
  } catch {
    drawerError.value = "transfers.saveError";
  } finally {
    saving.value = false;
  }
}

async function submitAccount(values: {
  name: string;
  icon: string;
  color: string;
  currencyId: string;
  initialAmount: string;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    await addAccount({
      name: values.name,
      icon: values.icon,
      color: values.color,
      currencyId: values.currencyId,
      initialAmount: values.initialAmount,
    });
    accountDrawerOpen.value = false;
  } catch {
    drawerError.value = "accounts.saveError";
  } finally {
    saving.value = false;
  }
}

async function remove(id: string) {
  drawerError.value = null;
  try {
    await deleteTransfer(id);
  } catch {
    drawerError.value = "transfers.deleteError";
  }
}

onMounted(async () => {
  await Promise.all([load(), loadCatalogs()]);
});
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text">
          {{ t("transfers.title") }}
        </h1>
        <p class="mt-1 text-sm text-text-2">{{ t("transfers.subtitle") }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        data-testid="transfers-new"
        @click="openCreate"
      >
        <PhPlus :size="16" weight="bold" />
        {{ t("transfers.new") }}
      </button>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="transfers-error">
      {{ t(error) }}
    </p>

    <div class="mt-5 grid gap-4 sm:grid-cols-3">
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("transfers.cards.monthTotal") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatMoney(monthTotal, currencySymbol) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("transfers.cards.monthTotalHint", { count: monthCount }) }}
        </p>
      </article>
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("transfers.cards.accounts") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ accounts.length }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("transfers.cards.accountsHint", { count: accounts.length }) }}
        </p>
      </article>
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("transfers.cards.lastTransfer") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ lastTransfer ? formatDateShort(lastTransfer.date) : "—" }}
        </p>
        <p class="mt-1 truncate text-xs text-text-2">
          <template v-if="lastTransfer">
            {{ accountName(lastTransfer.fromAccountId) ?? "—" }} →
            {{ accountName(lastTransfer.toAccountId) ?? "—" }}
          </template>
          <template v-else>{{ t("transfers.cards.noTransfers") }}</template>
        </p>
      </article>
    </div>

    <BaseView
      id="transfers-list"
      v-model:search="search"
      class="mt-5"
      :loading="isLoading"
      :search-placeholder="t('transfers.search')"
    >
      <template #grid>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="transfer in visibleTransfers"
            :key="transfer.id"
            class="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5"
            data-testid="transfer-card"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">
                  {{ transfer.description ?? t("transfers.noNote") }}
                </p>
                <p class="mt-1 truncate text-xs text-text-2">
                  {{ formatDateShort(transfer.date) }}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold tabular-nums text-text">
                {{ formatMoney(transfer.amount, symbolOf(transfer.currencyId)) }}
              </p>
            </div>
            <div class="mt-3 flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-1.5 text-xs text-text-2">
                <AccountIcon
                  :icon="accountIconOf(transfer.fromAccountId)"
                  :color="accountColorOf(transfer.fromAccountId)"
                  size="sm"
                />
                <span class="truncate">
                  {{ accountName(transfer.fromAccountId) ?? "—" }}
                </span>
                <span aria-hidden="true">→</span>
                <AccountIcon
                  :icon="accountIconOf(transfer.toAccountId)"
                  :color="accountColorOf(transfer.toAccountId)"
                  size="sm"
                />
                <span class="truncate">
                  {{ accountName(transfer.toAccountId) ?? "—" }}
                </span>
              </span>
              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('transfers.drawer.editTitle')"
                  @click="openEdit(transfer.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
                </button>
                <ConfigDeleteAction
                  :delete-label="t('transfers.delete')"
                  :delete-confirm="t('transfers.deleteConfirm')"
                  :confirm-label="t('transfers.deleteConfirmYes')"
                  :cancel-label="t('config.drawer.cancel')"
                  @remove="remove(transfer.id)"
                />
              </div>
            </div>
          </article>
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
            data-testid="transfers-add"
            @click="openCreate"
          >
            <PhPlus :size="20" weight="regular" aria-hidden="true" />
            <span class="text-sm">{{ t("transfers.add") }}</span>
          </button>
        </div>
      </template>

      <template #list>
        <div
          class="overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
        >
          <div
            class="grid grid-cols-[6rem_1fr_10rem_7rem_2rem] items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-2"
          >
            <span>{{ t("transfers.columns.date") }}</span>
            <span>{{ t("transfers.columns.route") }}</span>
            <span>{{ t("transfers.columns.note") }}</span>
            <span class="text-right">{{ t("transfers.columns.amount") }}</span>
            <span></span>
          </div>
          <ul class="divide-y divide-border">
            <li
              v-for="transfer in visibleTransfers"
              :key="transfer.id"
              class="grid grid-cols-[6rem_1fr_10rem_7rem_2rem] items-center gap-3 px-4 py-3"
              data-testid="transfer-row"
            >
              <span class="text-sm text-text-2">{{ formatDateShort(transfer.date) }}</span>
              <span class="flex min-w-0 items-center gap-1.5 text-sm text-text">
                <AccountIcon
                  :icon="accountIconOf(transfer.fromAccountId)"
                  :color="accountColorOf(transfer.fromAccountId)"
                  size="sm"
                />
                <span class="truncate">
                  {{ accountName(transfer.fromAccountId) ?? "—" }}
                </span>
                <span class="text-text-2" aria-hidden="true">→</span>
                <AccountIcon
                  :icon="accountIconOf(transfer.toAccountId)"
                  :color="accountColorOf(transfer.toAccountId)"
                  size="sm"
                />
                <span class="truncate">
                  {{ accountName(transfer.toAccountId) ?? "—" }}
                </span>
              </span>
              <span class="truncate text-sm text-text-2">
                {{ transfer.description ?? t("transfers.noNote") }}
              </span>
              <span class="text-right text-sm font-semibold tabular-nums text-text">
                {{ formatMoney(transfer.amount, symbolOf(transfer.currencyId)) }}
              </span>
              <span class="flex justify-end gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('transfers.drawer.editTitle')"
                  @click="openEdit(transfer.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
                </button>
                <ConfigDeleteAction
                  :delete-label="t('transfers.delete')"
                  :delete-confirm="t('transfers.deleteConfirm')"
                  :confirm-label="t('transfers.deleteConfirmYes')"
                  :cancel-label="t('config.drawer.cancel')"
                  @remove="remove(transfer.id)"
                />
              </span>
            </li>
          </ul>
        </div>
      </template>

      <template #empty>
        <p
          class="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
          data-testid="transfers-empty"
        >
          {{ t("transfers.empty") }}
        </p>
      </template>
    </BaseView>

    <TransferDrawer
      :open="drawerOpen"
      :initial="editingTransfer"
      :accounts="accounts"
      :currencies="currencies"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitTransfer"
      @create-account="accountDrawerOpen = true"
    />

    <AccountDrawer
      :open="accountDrawerOpen"
      :currencies="currencies"
      :submitting="saving"
      :error="drawerError"
      @close="accountDrawerOpen = false"
      @submit="submitAccount"
    />
  </section>
</template>
