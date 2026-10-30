<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { PhArrowsLeftRight, PhInfo } from "~/shared/vendor/icons";
import type { Account, Transfer } from "~/domain/finance/entities";
import { formatMoney, todayWireDate } from "~/domain/finance/entities";
import type { Currency } from "~/domain/config/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";
import AccountIcon from "~/ui/molecules/account-icon.vue";

/**
 * "Nueva transferencia" / "Editar transferencia" (PRD-v4 §9.2
 * lateral-derecho-trasferencia).
 *
 * La moneda se DERIVA de la cuenta de ORIGEN (la API no tiene motor de
 * conversión: el monto viaja en la moneda de origen tal cual), así que el
 * hero muestra el símbolo de esa cuenta y no un control aparte.
 *
 * Los saldos que se muestran (el "Disponible" del origen y el "Saldo
 * actual" del destino) son los que calcula la API; la previsualización es
 * ese saldo ± el monto.
 */
const props = defineProps<{
  open: boolean;
  /** La transferencia en edición; null = alta. */
  initial: Transfer | null;
  /** Las cuentas del usuario (con su balance calculado por la API). */
  accounts: Account[];
  /** Las monedas (para el símbolo del hero y el aviso de conversión). */
  currencies: Currency[];
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    values: {
      fromAccountId: string;
      toAccountId: string;
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

const fromAccountId = ref("");
const toAccountId = ref("");
const amount = ref("");
const description = ref("");
const date = ref(todayWireDate());

watch(
  [() => props.open, () => props.initial, () => props.accounts],
  () => {
    if (!props.open) return;
    fromAccountId.value = props.initial?.fromAccountId ?? props.accounts[0]?.id ?? "";
    toAccountId.value =
      props.initial?.toAccountId ??
      props.accounts.find((account) => account.id !== fromAccountId.value)?.id ??
      "";
    amount.value = props.initial ? String(props.initial.amount) : "";
    description.value = props.initial?.description ?? "";
    date.value = props.initial?.date ?? todayWireDate();
  },
  // Re-runs when the record or the accounts arrive: a deep link can open
  // the drawer before either is loaded.
  { immediate: true },
);

const fromAccount = computed(
  () => props.accounts.find((account) => account.id === fromAccountId.value) ?? null,
);
const toAccount = computed(
  () => props.accounts.find((account) => account.id === toAccountId.value) ?? null,
);

/** El símbolo de una moneda del catálogo. */
function symbolOf(currencyId: string): string {
  return props.currencies.find((currency) => currency.id === currencyId)?.symbol ?? "";
}

/** El nombre de una moneda (para decir WHICH moneda, no cuánto). */
function currencyName(currencyId: string): string {
  return props.currencies.find((currency) => currency.id === currencyId)?.name ?? "";
}

const fromSymbol = computed(() =>
  fromAccount.value ? symbolOf(fromAccount.value.currencyId) : "",
);
const toSymbol = computed(() =>
  toAccount.value ? symbolOf(toAccount.value.currencyId) : "",
);
const fromCurrencyName = computed(() =>
  fromAccount.value ? currencyName(fromAccount.value.currencyId) : "",
);
const toCurrencyName = computed(() =>
  toAccount.value ? currencyName(toAccount.value.currencyId) : "",
);

/** Las dos cuentas usan la misma moneda (o no, si alguna falta). */
const sameCurrency = computed(
  () =>
    fromAccount.value !== null &&
    toAccount.value !== null &&
    fromAccount.value.currencyId === toAccount.value.currencyId,
);
const differentCurrency = computed(
  () =>
    fromAccount.value !== null &&
    toAccount.value !== null &&
    fromAccount.value.currencyId !== toAccount.value.currencyId,
);

/** Origen y destino no pueden ser la misma cuenta. */
const sameAccount = computed(
  () =>
    fromAccountId.value !== "" &&
    toAccountId.value !== "" &&
    fromAccountId.value === toAccountId.value,
);

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
  () =>
    amountValid.value &&
    !sameAccount.value &&
    fromAccountId.value !== "" &&
    toAccountId.value !== "" &&
    date.value !== "",
);

/** El monto como número (para la previsualización de saldos). */
const amountNumber = computed(() => {
  const value = Number(normalizedAmount.value);
  return Number.isFinite(value) ? value : 0;
});

const fromAfter = computed(
  () => (fromAccount.value?.balance ?? 0) - amountNumber.value,
);
const toAfter = computed(
  () => (toAccount.value?.balance ?? 0) + amountNumber.value,
);

/** El botón del medio invierte origen y destino. */
function swap() {
  const previous = fromAccountId.value;
  fromAccountId.value = toAccountId.value;
  toAccountId.value = previous;
}

function onSubmit() {
  if (!canSubmit.value || !fromAccount.value) return;
  const trimmed = description.value.trim();
  emit("submit", {
    fromAccountId: fromAccountId.value,
    toAccountId: toAccountId.value,
    amount: normalizedAmount.value,
    currencyId: fromAccount.value.currencyId,
    description: trimmed || null,
    date: date.value,
  });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('transfers.drawer.editTitle') : t('transfers.drawer.newTitle')"
    :submitting="submitting"
    :save-disabled="!canSubmit"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <!-- Monto: hero card con tinte verde (catálogo lateral-derecho-trasferencia). -->
      <div class="rounded-[var(--radius)] bg-primary-50 px-4 py-3">
        <label
          for="transfer-amount"
          class="block text-xs font-medium uppercase tracking-wide text-primary-700"
        >
          {{ t("transfers.drawer.amount") }}
        </label>
        <div class="flex items-baseline gap-2">
          <input
            id="transfer-amount"
            v-model="amount"
            type="text"
            inputmode="decimal"
            placeholder="0"
            class="w-full bg-transparent text-2xl font-semibold tabular-nums text-text outline-none placeholder:text-text-2"
            data-testid="transfer-amount"
          />
          <span class="text-sm text-text-2">{{ fromSymbol }}</span>
        </div>
      </div>

      <div
        v-if="accounts.length === 0"
        class="flex items-center justify-between gap-2 rounded-[var(--radius-sm)] border border-dashed border-border px-3 py-2.5"
      >
        <p class="text-sm text-text-2">{{ t("accounts.drawer.newTitle") }}</p>
        <button
          type="button"
          class="rounded-[var(--radius)] bg-accent px-3 py-1.5 text-xs font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
          data-testid="transfer-create-account"
          @click="emit('create-account')"
        >
          {{ t("expenses.drawer.createAccount") }}
        </button>
      </div>

      <template v-else>
        <!-- Origen: la cuenta de la que sale la plata. -->
        <div class="rounded-[var(--radius)] border border-border px-4 py-3">
          <label
            for="transfer-from"
            class="block text-xs font-medium uppercase tracking-wide text-text-2"
          >
            {{ t("transfers.drawer.from") }}
          </label>
          <select
            id="transfer-from"
            v-model="fromAccountId"
            class="mt-2 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="transfer-from"
          >
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }} · {{ symbolOf(account.currencyId) }}
            </option>
          </select>
          <div class="mt-3 flex items-center gap-2">
            <AccountIcon
              :icon="fromAccount?.icon ?? null"
              :color="fromAccount?.color ?? null"
              size="sm"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text">
                {{ fromAccount?.name ?? "" }}
              </p>
              <p class="text-xs text-text-2">
                {{
                  t("transfers.drawer.available", {
                    amount: formatMoney(fromAccount?.balance ?? 0, fromSymbol),
                  })
                }}
              </p>
            </div>
          </div>
        </div>

        <!-- El swap invierte origen y destino. -->
        <div class="flex justify-center">
          <button
            type="button"
            class="flex size-8 items-center justify-center rounded-full border border-border bg-surface text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
            :aria-label="t('transfers.columns.route')"
            data-testid="transfer-swap"
            @click="swap"
          >
            <PhArrowsLeftRight
              :size="14"
              weight="bold"
              class="rotate-90"
              aria-hidden="true"
            />
          </button>
        </div>

        <!-- Destino: la cuenta que recibe la plata. -->
        <div class="rounded-[var(--radius)] border border-border px-4 py-3">
          <label
            for="transfer-to"
            class="block text-xs font-medium uppercase tracking-wide text-text-2"
          >
            {{ t("transfers.drawer.to") }}
          </label>
          <select
            id="transfer-to"
            v-model="toAccountId"
            class="mt-2 h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="transfer-to"
          >
            <option v-for="account in accounts" :key="account.id" :value="account.id">
              {{ account.name }} · {{ symbolOf(account.currencyId) }}
            </option>
          </select>
          <div class="mt-3 flex items-center gap-2">
            <AccountIcon
              :icon="toAccount?.icon ?? null"
              :color="toAccount?.color ?? null"
              size="sm"
            />
            <div class="min-w-0">
              <p class="truncate text-sm font-medium text-text">
                {{ toAccount?.name ?? "" }}
              </p>
              <p class="text-xs text-text-2">
                {{
                  t("transfers.drawer.balance", {
                    amount: formatMoney(toAccount?.balance ?? 0, toSymbol),
                  })
                }}
              </p>
            </div>
          </div>
        </div>

        <p
          v-if="sameAccount"
          class="text-sm text-error"
          data-testid="transfer-same-account"
        >
          {{ t("transfers.drawer.sameAccount") }}
        </p>

        <!-- Aviso de moneda: la API no convierte (PRD-v2 §8.6). -->
        <div
          v-if="sameCurrency"
          class="flex items-start gap-2 rounded-[var(--radius-sm)] border border-warning/40 bg-warning/10 px-3 py-2.5 text-xs text-warning"
          data-testid="transfer-same-currency"
        >
          <PhInfo :size="14" weight="bold" aria-hidden="true" class="mt-0.5" />
          <p>
            {{
              t("transfers.drawer.sameCurrency", {
                from: fromCurrencyName,
                to: toCurrencyName,
              })
            }}
          </p>
        </div>
        <div
          v-else-if="differentCurrency"
          class="flex items-start gap-2 rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2.5 text-xs text-text-2"
          data-testid="transfer-different-currency"
        >
          <PhInfo :size="14" weight="bold" aria-hidden="true" class="mt-0.5" />
          <p>
            {{
              t("transfers.drawer.differentCurrency", {
                from: fromCurrencyName,
                to: toCurrencyName,
              })
            }}
          </p>
        </div>

        <!-- Previsualización: el saldo de cada cuenta después del movimiento. -->
        <div
          class="rounded-[var(--radius-sm)] bg-surface-2 px-3 py-2.5 text-xs text-text-2"
          data-testid="transfer-preview"
        >
          {{
            t("transfers.drawer.preview", {
              from: formatMoney(fromAfter, fromSymbol),
              to: formatMoney(toAfter, toSymbol),
            })
          }}
        </div>

        <div>
          <label
            for="transfer-date"
            class="mb-1.5 block text-sm font-medium text-text"
          >
            {{ t("transfers.drawer.date") }}
          </label>
          <input
            id="transfer-date"
            v-model="date"
            type="date"
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="transfer-date"
          />
        </div>

        <div>
          <label
            for="transfer-note"
            class="mb-1.5 block text-sm font-medium text-text"
          >
            {{ t("transfers.drawer.note") }}
          </label>
          <textarea
            id="transfer-note"
            v-model="description"
            rows="3"
            class="w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 py-2 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
            :placeholder="t('transfers.drawer.notePlaceholder')"
            data-testid="transfer-note"
          ></textarea>
        </div>
      </template>
    </div>
  </EditDrawer>
</template>
