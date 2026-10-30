<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { PhPencilSimple, PhPlus } from "~/shared/vendor/icons";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import { useExpenses } from "~/shared/composables/use-expenses";
import {
  categoryColor,
  formatDateShort,
  formatMoney,
} from "~/domain/finance/entities";
import BaseView from "~/ui/organisms/base-view.vue";
import AccountIcon from "~/ui/molecules/account-icon.vue";
import ConfigDeleteAction from "~/ui/molecules/config-delete-action.vue";
import AccountDrawer from "~/ui/organisms/finance-drawers/account-drawer.vue";
import ExpenseDrawer from "~/ui/organisms/finance-drawers/expense-drawer.vue";

/**
 * /expenses — los gastos del estudio (PRD-v4 §8.7).
 *
 * El catálogo muestra FECHA · CONCEPTO · CATEGORÍA · CUENTA · MONTO ·
 * ESTADO; el wire no tiene columna de estado (la tabla `expense` sólo
 * tiene cuenta, monto, moneda, concepto, categoría, comprobante y
 * fecha), así que la pantalla muestra lo que la API trae.
 */
const { t } = useI18n();
const { params, set } = useRouteSearch("expenses");
const {
  expenses,
  accounts,
  currencies,
  search,
  visibleExpenses,
  monthTotal,
  monthCount,
  topCategory,
  categories,
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
  deleteExpense,
  addAccount,
} = useExpenses();

const saving = ref(false);
const drawerError = ref<string | null>(null);
const accountDrawerOpen = ref(false);

const drawerOpen = computed(
  () => params.value.drawer === "new" || params.value.edit !== undefined,
);
const editingExpense = computed(
  () => expenses.value.find((expense) => expense.id === params.value.edit) ?? null,
);

/**
 * El símbolo de los totales: el del primer gasto (o el de la primera
 * cuenta cuando todavía no hay gastos). Mezclar monedas en un total
 * sería mentir, así que el total se muestra en una sola.
 */
const currencySymbol = computed(() => {
  const currencyId =
    expenses.value[0]?.currencyId ?? accounts.value[0]?.currencyId ?? "";
  return symbolOf(currencyId);
});

/** El porcentaje que la mayor categoría concentra sobre el total. */
const topCategoryShare = computed(() => {
  const share = topCategory.value?.share ?? 0;
  return `${Math.round(share * 100)}%`;
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

async function submitExpense(values: {
  accountId: string;
  amount: string;
  currencyId: string;
  description: string | null;
  category: string | null;
  receiptUrl: string | null;
  date: string;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingExpense.value) {
      await edit({ id: editingExpense.value.id, ...values });
    } else {
      await add(values);
    }
    await closeDrawer();
  } catch {
    drawerError.value = "expenses.saveError";
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

async function removeExpense(id: string) {
  drawerError.value = null;
  try {
    await deleteExpense(id);
  } catch {
    drawerError.value = "expenses.deleteError";
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
          {{ t("expenses.title") }}
        </h1>
        <p class="mt-1 text-sm text-text-2">{{ t("expenses.subtitle") }}</p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        data-testid="expenses-new"
        @click="openCreate"
      >
        <PhPlus :size="16" weight="bold" />
        {{ t("expenses.new") }}
      </button>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="expenses-error">
      {{ t(error) }}
    </p>

    <div class="mt-5 grid gap-4 sm:grid-cols-3">
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("expenses.cards.monthTotal") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ formatMoney(monthTotal, currencySymbol) }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("expenses.cards.monthTotalHint", { count: monthCount }) }}
        </p>
      </article>
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("expenses.cards.topCategory") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ topCategory?.name ?? "—" }}
        </p>
        <p class="mt-1 truncate text-xs text-text-2">
          {{
            topCategory
              ? t("expenses.cards.topCategoryHint", { share: topCategoryShare })
              : t("expenses.cards.noCategories")
          }}
        </p>
      </article>
      <article class="rounded-[var(--radius)] border border-border bg-surface p-5">
        <p class="text-xs font-medium uppercase tracking-wide text-text-2">
          {{ t("dashboard.stats.expenseHint") }}
        </p>
        <p class="mt-2 text-2xl font-semibold tabular-nums text-text">
          {{ monthCount }}
        </p>
        <p class="mt-1 text-xs text-text-2">
          {{ t("expenses.cards.monthTotalHint", { count: monthCount }) }}
        </p>
      </article>
    </div>

    <BaseView
      id="expenses-list"
      v-model:search="search"
      class="mt-5"
      :loading="isLoading"
      :search-placeholder="t('expenses.search')"
    >
      <template #grid>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article
            v-for="expense in visibleExpenses"
            :key="expense.id"
            class="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5"
            data-testid="expense-card"
          >
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">
                  {{ expense.description ?? t("expenses.noConcept") }}
                </p>
                <p class="mt-1 truncate text-xs text-text-2">
                  {{ formatDateShort(expense.date) }}
                </p>
              </div>
              <p class="shrink-0 text-sm font-semibold tabular-nums text-text">
                {{ formatMoney(expense.amount, symbolOf(expense.currencyId)) }}
              </p>
            </div>
            <div class="mt-3 flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-2 text-xs text-text-2">
                <AccountIcon
                  :icon="accountIconOf(expense.accountId)"
                  :color="accountColorOf(expense.accountId)"
                  size="sm"
                />
                <span class="truncate">{{ accountName(expense.accountId) }}</span>
              </span>
              <span
                v-if="expense.category"
                class="inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-xs font-medium"
                :style="{
                  color: categoryColor(expense.category),
                  backgroundColor: `${categoryColor(expense.category)}1a`,
                }"
                data-testid="expense-card-category"
              >
                {{ expense.category }}
              </span>
              <div class="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('expenses.drawer.editTitle')"
                  @click="openEdit(expense.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
                </button>
                <ConfigDeleteAction
                  :delete-label="t('expenses.delete')"
                  :delete-confirm="t('expenses.deleteConfirm', { name: expense.description ?? t('expenses.noConcept') })"
                  :confirm-label="t('expenses.deleteConfirmYes')"
                  :cancel-label="t('config.drawer.cancel')"
                  @remove="removeExpense(expense.id)"
                />
              </div>
            </div>
          </article>
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
            data-testid="expenses-add"
            @click="openCreate"
          >
            <PhPlus :size="20" weight="regular" aria-hidden="true" />
            <span class="text-sm">{{ t("expenses.add") }}</span>
          </button>
        </div>
      </template>

      <template #list>
        <div
          class="overflow-hidden rounded-[var(--radius)] border border-border bg-surface"
        >
          <div
            class="grid grid-cols-[6rem_1fr_8rem_10rem_7rem_2rem] items-center gap-3 border-b border-border px-4 py-2 text-xs font-medium uppercase tracking-wide text-text-2"
          >
            <span>{{ t("expenses.columns.date") }}</span>
            <span>{{ t("expenses.columns.concept") }}</span>
            <span>{{ t("expenses.columns.category") }}</span>
            <span>{{ t("expenses.columns.account") }}</span>
            <span class="text-right">{{ t("expenses.columns.amount") }}</span>
            <span></span>
          </div>
          <ul class="divide-y divide-border">
            <li
              v-for="expense in visibleExpenses"
              :key="expense.id"
              class="grid grid-cols-[6rem_1fr_8rem_10rem_7rem_2rem] items-center gap-3 px-4 py-3"
              data-testid="expense-row"
            >
              <span class="text-sm text-text-2">{{ formatDateShort(expense.date) }}</span>
              <span class="truncate text-sm font-medium text-text">
                {{ expense.description ?? t("expenses.noConcept") }}
              </span>
              <span class="truncate">
                <span
                  v-if="expense.category"
                  class="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium"
                  :style="{
                    color: categoryColor(expense.category),
                    backgroundColor: `${categoryColor(expense.category)}1a`,
                  }"
                  data-testid="expense-category"
                >
                  <span
                    class="size-1.5 shrink-0 rounded-full"
                    :style="{ backgroundColor: categoryColor(expense.category) }"
                    aria-hidden="true"
                  ></span>
                  {{ expense.category }}
                </span>
                <span v-else class="text-sm text-text-2">
                  {{ t("expenses.noCategory") }}
                </span>
              </span>
              <span class="flex min-w-0 items-center gap-2 text-sm text-text-2">
                <AccountIcon
                  :icon="accountIconOf(expense.accountId)"
                  :color="accountColorOf(expense.accountId)"
                  size="sm"
                />
                <span class="truncate">{{ accountName(expense.accountId) }}</span>
              </span>
              <span class="text-right text-sm font-semibold tabular-nums text-text">
                {{ formatMoney(expense.amount, symbolOf(expense.currencyId)) }}
              </span>
              <span class="flex justify-end gap-1">
                <button
                  type="button"
                  class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                  :aria-label="t('expenses.drawer.editTitle')"
                  @click="openEdit(expense.id)"
                >
                  <PhPencilSimple :size="15" weight="regular" aria-hidden="true" />
                </button>
                <ConfigDeleteAction
                  :delete-label="t('expenses.delete')"
                  :delete-confirm="t('expenses.deleteConfirm', { name: expense.description ?? t('expenses.noConcept') })"
                  :confirm-label="t('expenses.deleteConfirmYes')"
                  :cancel-label="t('config.drawer.cancel')"
                  @remove="removeExpense(expense.id)"
                />
              </span>
            </li>
          </ul>
        </div>
      </template>

      <template #empty>
        <p
          class="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
          data-testid="expenses-empty"
        >
          {{ t("expenses.empty") }}
        </p>
      </template>
    </BaseView>

    <ExpenseDrawer
      :open="drawerOpen"
      :initial="editingExpense"
      :accounts="accounts"
      :currencies="currencies"
      :categories="categories"
      :submitting="saving"
      :error="drawerError"
      @close="closeDrawer"
      @submit="submitExpense"
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
