<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Account, Expense } from "~/domain/finance/entities";
import { todayWireDate } from "~/domain/finance/entities";
import type { Currency } from "~/domain/config/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nuevo gasto" / "Editar gasto" (PRD-v4 §9.2 lateral-derecho-egreso).
 *
 * La categoría es texto libre (la columna `expe_category` es TEXT), así que
 * el campo es un input con `<datalist>` con las categorías que ya usa el
 * usuario; el catálogo la dibuja como chip, pero en la base no hay tabla de
 * categorías.
 *
 * La moneda del hero se DERIVA de la cuenta elegida (el wire exige
 * expe_currency_id y el catálogo la muestra como label, no como control).
 */
const props = defineProps<{
  open: boolean;
  /** El gasto en edición; null = alta. */
  initial: Expense | null;
  /** Las cuentas del usuario (select "Cuenta origen"). */
  accounts: Account[];
  /** Las monedas (para el símbolo del hero: $, USD…). */
  currencies: Currency[];
  /** Las categorías ya usadas (para el datalist). */
  categories: string[];
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    values: {
      accountId: string;
      amount: string;
      currencyId: string;
      description: string | null;
      category: string | null;
      receiptUrl: string | null;
      date: string;
    },
  ];
  /** Sin cuentas: el caller abre el drawer de alta de cuenta. */
  "create-account": [];
}>();

const { t } = useI18n();

const accountId = ref("");
const amount = ref("");
const description = ref("");
const category = ref("");
const receiptUrl = ref("");
const date = ref(todayWireDate());

watch(
  [() => props.open, () => props.initial, () => props.accounts],
  () => {
    if (!props.open) return;
    accountId.value = props.initial?.accountId ?? props.accounts[0]?.id ?? "";
    amount.value = props.initial ? String(props.initial.amount) : "";
    description.value = props.initial?.description ?? "";
    category.value = props.initial?.category ?? "";
    receiptUrl.value = props.initial?.receiptUrl ?? "";
    date.value = props.initial?.date ?? todayWireDate();
  },
  // Re-runs when the record or the accounts arrive: a deep link can open
  // the drawer before either is loaded.
  { immediate: true },
);

/** La moneda sale de la cuenta elegida. */
const selectedAccount = computed(() =>
  props.accounts.find((account) => account.id === accountId.value),
);
const currencySymbol = computed(() => {
  const account = selectedAccount.value;
  if (!account) return "";
  const currency = props.currencies.find(
    (item) => item.id === account.currencyId,
  );
  return currency?.symbol ?? "";
});

/**
 * El monto normalizado: en es-AR la coma es el separador decimal, así que
 * "1250,50" es un monto válido. El contrato lo quiere con punto.
 */
const normalizedAmount = computed(() => amount.value.trim().replace(",", "."));

const amountValid = computed(
  () =>
    /^\d+(\.\d{1,4})?$/.test(normalizedAmount.value) &&
    Number(normalizedAmount.value) > 0,
);
const canSubmit = computed(
  () => accountId.value !== "" && amountValid.value && date.value !== "",
);

function onSubmit() {
  if (!canSubmit.value || !selectedAccount.value) return;
  emit("submit", {
    accountId: accountId.value,
    amount: normalizedAmount.value,
    currencyId: selectedAccount.value.currencyId,
    description: description.value.trim() || null,
    category: category.value.trim() || null,
    receiptUrl: receiptUrl.value.trim() || null,
    date: date.value,
  });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('expenses.drawer.editTitle') : t('expenses.drawer.newTitle')"
    :submitting="submitting"
    :save-disabled="!canSubmit"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <!-- Monto: hero card con tinte rojo (catálogo lateral-derecho-egreso). -->
      <div class="rounded-[var(--radius)] bg-error/10 px-4 py-3">
        <label for="expense-amount" class="block text-xs font-medium text-error">
          {{ t("expenses.drawer.amount") }}
        </label>
        <div class="flex items-baseline gap-2">
          <input
            id="expense-amount"
            v-model="amount"
            type="text"
            inputmode="decimal"
            :placeholder="'0'"
            class="w-full bg-transparent text-2xl font-semibold tabular-nums text-text outline-none placeholder:text-text-2"
            data-testid="expense-amount"
          />
          <span class="text-sm text-text-2">{{ currencySymbol }}</span>
        </div>
      </div>

      <div>
        <label for="expense-description" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("expenses.drawer.description") }}
        </label>
        <input
          id="expense-description"
          v-model="description"
          type="text"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('expenses.drawer.descriptionPlaceholder')"
          data-testid="expense-description"
        />
      </div>

      <div>
        <label for="expense-category" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("expenses.drawer.category") }}
        </label>
        <input
          id="expense-category"
          v-model="category"
          type="text"
          list="expense-categories"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('expenses.drawer.categoryPlaceholder')"
          data-testid="expense-category"
        />
        <datalist id="expense-categories">
          <option v-for="item in categories" :key="item" :value="item" />
        </datalist>
      </div>

      <div>
        <label for="expense-account" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("expenses.drawer.account") }}
        </label>
        <select
          v-if="accounts.length > 0"
          id="expense-account"
          v-model="accountId"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="expense-account"
        >
          <option v-for="account in accounts" :key="account.id" :value="account.id">
            {{ account.name }}
          </option>
        </select>
        <div
          v-else
          class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-border px-3 py-2.5"
        >
          <p class="text-sm text-text-2">{{ t("expenses.drawer.noAccounts") }}</p>
          <button
            type="button"
            class="rounded-[var(--radius)] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
            data-testid="expense-create-account"
            @click="emit('create-account')"
          >
            {{ t("expenses.drawer.createAccount") }}
          </button>
        </div>
      </div>

      <div>
        <label for="expense-date" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("expenses.drawer.date") }}
        </label>
        <input
          id="expense-date"
          v-model="date"
          type="date"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="expense-date"
        />
      </div>

      <div>
        <label for="expense-receipt" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("expenses.drawer.receipt") }}
        </label>
        <input
          id="expense-receipt"
          v-model="receiptUrl"
          type="url"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('expenses.drawer.receiptPlaceholder')"
          data-testid="expense-receipt"
        />
      </div>
    </div>
  </EditDrawer>
</template>
