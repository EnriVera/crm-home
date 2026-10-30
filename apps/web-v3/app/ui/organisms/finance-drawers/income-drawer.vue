<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Account, Income } from "~/domain/finance/entities";
import { todayWireDate } from "~/domain/finance/entities";
import type { Currency } from "~/domain/config/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nuevo ingreso" / "Editar ingreso" (PRD-v4 §9.2 lateral-derecho-ingreso,
 * adaptado al wire real: sin cliente ni estado de cobro, que no tienen
 * columna en la DB).
 *
 * La moneda del hero se DERIVA de la cuenta elegida (el wire exige
 * inco_currency_id y el catálogo la muestra como label, no como control).
 */
const props = defineProps<{
  open: boolean;
  /** El ingreso en edición; null = alta. */
  initial: Income | null;
  /** Las cuentas del usuario (select "Cuenta destino"). */
  accounts: Account[];
  /** Las monedas (para el código del hero: ARS, USD…). */
  currencies: Currency[];
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
const date = ref(todayWireDate());

watch(
  [() => props.open, () => props.initial, () => props.accounts],
  () => {
    if (!props.open) return;
    accountId.value = props.initial?.accountId ?? props.accounts[0]?.id ?? "";
    amount.value = props.initial ? String(props.initial.amount) : "";
    description.value = props.initial?.description ?? "";
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
const currencyCode = computed(() => {
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
  const trimmed = description.value.trim();
  emit("submit", {
    accountId: accountId.value,
    amount: normalizedAmount.value,
    currencyId: selectedAccount.value.currencyId,
    description: trimmed || null,
    date: date.value,
  });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('incomes.drawer.editTitle') : t('incomes.drawer.newTitle')"
    :submitting="submitting"
    :save-disabled="!canSubmit"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <!-- Monto: hero card con tinte verde (catálogo lateral-derecho-ingreso). -->
      <div class="rounded-[var(--radius)] bg-primary-50 px-4 py-3">
        <label for="income-amount" class="block text-xs font-medium text-primary-700">
          {{ t("incomes.drawer.amount") }}
        </label>
        <div class="flex items-baseline gap-2">
          <input
            id="income-amount"
            v-model="amount"
            type="text"
            inputmode="decimal"
            :placeholder="'0'"
            class="w-full bg-transparent text-2xl font-semibold tabular-nums text-text outline-none placeholder:text-text-2"
            data-testid="income-amount"
          />
          <span class="text-sm text-text-2">{{ currencyCode }}</span>
        </div>
      </div>

      <div>
        <label for="income-description" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("incomes.drawer.description") }}
        </label>
        <input
          id="income-description"
          v-model="description"
          type="text"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('incomes.drawer.descriptionPlaceholder')"
          data-testid="income-description"
        />
      </div>

      <div>
        <label for="income-account" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("incomes.drawer.account") }}
        </label>
        <select
          v-if="accounts.length > 0"
          id="income-account"
          v-model="accountId"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="income-account"
        >
          <option v-for="account in accounts" :key="account.id" :value="account.id">
            {{ account.name }}
          </option>
        </select>
        <div
          v-else
          class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-border px-3 py-2.5"
        >
          <p class="text-sm text-text-2">{{ t("incomes.drawer.noAccounts") }}</p>
          <button
            type="button"
            class="rounded-[var(--radius)] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
            data-testid="income-create-account"
            @click="emit('create-account')"
          >
            {{ t("incomes.drawer.createAccount") }}
          </button>
        </div>
      </div>

      <div>
        <label for="income-date" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("incomes.drawer.date") }}
        </label>
        <input
          id="income-date"
          v-model="date"
          type="date"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="income-date"
        />
      </div>
    </div>
  </EditDrawer>
</template>
