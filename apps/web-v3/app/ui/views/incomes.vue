<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhPencilSimple, PhPlus } from "~/shared/vendor/icons";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import { useIncomes } from "~/shared/composables/use-incomes";
import {
  accountColor,
  formatDateShort,
  formatMoney,
  type Account,
  type Income,
} from "~/domain/finance/entities";
import BaseView from "~/ui/organisms/base-view.vue";
import AccountIcon from "~/ui/molecules/account-icon.vue";
import ConfigDeleteAction from "~/ui/molecules/config-delete-action.vue";
import AccountDrawer from "~/ui/organisms/finance-drawers/account-drawer.vue";
import IncomeDrawer from "~/ui/organisms/finance-drawers/income-drawer.vue";

/**
 * /incomes — los ingresos del estudio (PRD-v4 §8.7).
 *
 * La tabla del catálogo muestra FECHA · CONCEPTO · CLIENTE · CUENTA · MONTO ·
 * ESTADO; el wire no tiene columna de cliente ni de estado (la tabla
 * `income` sólo tiene cuenta, monto, moneda, concepto, categoría y fecha),
 * así que la pantalla muestra lo que la API trae.
 */
const { t } = useI18n();
const { params, set } = useRouteSearch("incomes");
const {
  incomes,
  accounts,
  currencies,
  search,
  visibleIncomes,
  monthTotal,
  monthCount,
  ticketAverage,
  isLoading,
  error,
  accountName,
  accountIconOf,
  accountColorOf,
  load,
  loadCatalogs,
  add,
  edit,
  deleteIncome,
  addAccount,
} = useIncomes();

const saving = ref(false);
const drawerError = ref<string | null>(null);
const accountDrawerOpen = ref(false);

const drawerOpen = computed(
  () => params.value.drawer === "new" || params.value.edit !== undefined,
);
const editingIncome = computed(
  () => incomes.value.find((income) => income.id === params.value.edit) ?? null,
);

/** El último ingreso (el más reciente por fecha). */
const lastIncome = computed<Income | null>(() => {
  if (incomes.value.length === 0) return null;
  return [...incomes.value].sort((a, b) => b.date.localeCompare(a.date))[0]!;
});

/** El símbolo de una moneda (cada movimiento tiene la suya). */
function symbolOf(currencyId: string): string {
  return (
    currencies.value.find((currency) => currency.id === currencyId)?.symbol ?? ""
  );
}

/**
 * El símbolo de los totales: el del primer ingreso (o el de la primera
 * cuenta cuando todavía no hay ingresos). Mezclar monedas en un total
 * sería mentir, así que el total se muestra en una sola.
 */
const currencySymbol = computed(() => {
  const currencyId =
    incomes.value[0]?.currencyId ?? accounts.value[0]?.currencyId ?? "";
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

async function submitIncome(values: {
  accountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  date: string;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingIncome.value) {
      await edit({ id: editingIncome.value.id, ...values });
    } else {
      await add(values);
    }
    await closeDrawer();
  } catch {
    drawerError.value = "incomes.saveError";
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
    await deleteIncome(id);
  } catch {
    drawerError.value = "incomes.deleteError";
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
          {{ t("incomes.title") }}
        </h1>
        <p class="mt-1 text-sm text-text-2">{{ t("incomes.subtitle") }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        data-testid="incomes-new"
        @click="openCreate"
      >
        <PhPlus :size="16" weight="bold" />
        {{ t("incomes.new") }}
      </button>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="incomes-error">
      {{ t(error) }}
    </p>

    <div class="mt-5 grid gap-4 sm:grid-cols-3">
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("incomes.cards.monthTotal") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatMoney(monthTotal, currencySymbol) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("incomes.cards.monthTotalHint", { count: monthCount }) }}
        </p>
      </article>
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("incomes.cards.ticketAverage") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatMoney(ticketAverage, currencySymbol) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("incomes.cards.ticketAverageHint") }}
        </p>
      </article>
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("incomes.cards.lastIncome") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ lastIncome ? formatDateShort(lastIncome.date) : "—" }}
        </p>
        <p class="mt-1 truncate text-xs text-text-2">
          {{ lastIncome?.description ?? t("incomes.cards.noLast") }}
        </p>
      </article>
    </div>

    <BaseView
      id="incomes-list"
      v-model:search="search"
      class="mt-5"
      :loading="isLoading"
      :search-placeholder="t('incomes.search')"
    >
      <template #grid>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="income in visibleIncomes"
            :key="income.id"
            class="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5"
            data-testid="income-card"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">
                  {{ income.description ?? t("incomes.noConcept") }}
                </p>
                <p class="mt-1 truncate text-xs text-text-2">
                  {{ formatDateShort(income.date) }}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold tabular-nums text-text">
                {{ formatMoney(income.amount, symbolOf(income.currencyId)) }}
              </p>
            </div>
            <div class="mt-3 flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-2 text-xs text-text-2">
                <AccountIcon
                  :icon="accountIconOf(income.accountId)"
                  :color="accountColorOf(income.accountId)"
                  size="sm"
                />
                <span class="truncate">{{ accountName(income.accountId) }}</span>
              </span>
              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('incomes.drawer.editTitle')"
                  @click="openEdit(income.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
                </button>
                <ConfigDeleteAction
                  :delete-label="t('incomes.delete')"
                  :delete-confirm="t('incomes.deleteConfirm', { name: income.description ?? t('incomes.noConcept') })"
                  :confirm-label="t('incomes.deleteConfirmYes')"
                  :cancel-label="t('config.drawer.cancel')"
                  @remove="remove(income.id)"
                />
              </div>
            </div>
          </article>
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
            data-testid="incomes-add"
            @click="openCreate"
          >
            <PhPlus :size="20" weight="regular" aria-hidden="true" />
            <span class="text-sm">{{ t("incomes.add") }}</span>
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
            <span>{{ t("incomes.columns.date") }}</span>
            <span>{{ t("incomes.columns.concept") }}</span>
            <span>{{ t("incomes.columns.account") }}</span>
            <span class="text-right">{{ t("incomes.columns.amount") }}</span>
            <span></span>
          </div>
          <ul class="divide-y divide-border">
            <li
              v-for="income in visibleIncomes"
              :key="income.id"
              class="grid grid-cols-[6rem_1fr_10rem_7rem_2rem] items-center gap-3 px-4 py-3"
              data-testid="income-row"
            >
              <span class="text-sm text-text-2">{{ formatDateShort(income.date) }}</span>
              <span class="truncate text-sm font-medium text-text">
                {{ income.description ?? t("incomes.noConcept") }}
              </span>
              <span class="flex min-w-0 items-center gap-2 text-sm text-text-2">
                <AccountIcon
                  :icon="accountIconOf(income.accountId)"
                  :color="accountColorOf(income.accountId)"
                  size="sm"
                />
                <span class="truncate">{{ accountName(income.accountId) }}</span>
              </span>
              <span class="text-right text-sm font-semibold tabular-nums text-text">
                {{ formatMoney(income.amount, symbolOf(income.currencyId)) }}
              </span>
              <span class="flex justify-end gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('incomes.drawer.editTitle')"
                  @click="openEdit(income.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
                </button>
                <ConfigDeleteAction
                  :delete-label="t('incomes.delete')"
                  :delete-confirm="t('incomes.deleteConfirm', { name: income.description ?? t('incomes.noConcept') })"
                  :confirm-label="t('incomes.deleteConfirmYes')"
                  :cancel-label="t('config.drawer.cancel')"
                  @remove="remove(income.id)"
                />
              </span>
            </li>
          </ul>
        </div>
      </template>

      <template #empty>
        <p
          class="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
          data-testid="incomes-empty"
        >
          {{ t("incomes.empty") }}
        </p>
      </template>
    </BaseView>

    <IncomeDrawer
      :open="drawerOpen"
      :initial="editingIncome"
      :accounts="accounts"
      :currencies="currencies"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitIncome"
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
