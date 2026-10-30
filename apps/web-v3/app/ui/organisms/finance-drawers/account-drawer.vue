<script setup lang="ts">
import { computed, ref, watch } from "vue";
import {
  ACCOUNT_COLORS,
  ACCOUNT_ICONS,
  type AccountIcon as AccountIconKind,
} from "~/domain/finance/entities";
import type { Currency } from "~/domain/config/entities";
import AccountIconBadge from "~/ui/molecules/account-icon.vue";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nueva cuenta" (PRD-v4 §9.2 lateral-derecho-cuenta).
 *
 * Los valores del wire: `acco_icon` es libre con la convención
 * bank/wallet/cash del seed y `acco_color` un hex de la paleta de 8
 * swatches. Saldo inicial ≥ 0 con hasta 4 decimales.
 */
const props = defineProps<{
  open: boolean;
  currencies: Currency[];
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    values: {
      name: string;
      icon: AccountIconKind;
      color: string;
      currencyId: string;
      initialAmount: string;
    },
  ];
}>();

const { t } = useI18n();

const name = ref("");
const icon = ref<AccountIconKind>("bank");
const color = ref<string>(ACCOUNT_COLORS[0]!);
const currencyId = ref("");
const initialAmount = ref("0");

watch(
  [() => props.open, () => props.currencies],
  () => {
    if (!props.open) return;
    name.value = "";
    icon.value = "bank";
    color.value = ACCOUNT_COLORS[0]!;
    currencyId.value = props.currencies[0]?.id ?? "";
    initialAmount.value = "0";
  },
  { immediate: true },
);

/** El saldo inicial normalizado (en es-AR la coma es el decimal). */
const normalizedInitial = computed(() =>
  initialAmount.value.trim().replace(",", "."),
);

const amountValid = computed(
  () =>
    /^\d+(\.\d{1,4})?$/.test(normalizedInitial.value) &&
    Number(normalizedInitial.value) >= 0,
);
const canSubmit = computed(
  () => name.value.trim() !== "" && currencyId.value !== "" && amountValid.value,
);

function onSubmit() {
  if (!canSubmit.value) return;
  emit("submit", {
    name: name.value.trim(),
    icon: icon.value,
    color: color.value,
    currencyId: currencyId.value,
    initialAmount: normalizedInitial.value,
  });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="t('accounts.drawer.newTitle')"
    :submitting="submitting"
    :save-disabled="!canSubmit"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <div>
        <label for="account-name" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("accounts.drawer.name") }}
        </label>
        <input
          id="account-name"
          v-model="name"
          type="text"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('accounts.drawer.namePlaceholder')"
          data-testid="account-name"
        />
      </div>

      <div>
        <span class="mb-1.5 block text-sm font-medium text-text">
          {{ t("accounts.drawer.kind") }}
        </span>
        <div class="flex gap-2">
          <button
            v-for="kind in ACCOUNT_ICONS"
            :key="kind"
            type="button"
            class="flex flex-1 items-center justify-center gap-2 rounded-[var(--radius-sm)] border px-3 py-2.5 text-sm transition-colors"
            :class="
              icon === kind
                ? 'border-accent text-text'
                : 'border-border text-text-2 hover:bg-surface-2'
            "
            :data-testid="`account-kind-${kind}`"
            @click="icon = kind"
          >
            <AccountIconBadge :icon="kind" :color="null" size="sm" />
            {{ t(`accounts.kinds.${kind}`) }}
          </button>
        </div>
      </div>

      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="account-currency" class="mb-1.5 block text-sm font-medium text-text">
            {{ t("accounts.drawer.currency") }}
          </label>
          <select
            id="account-currency"
            v-model="currencyId"
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="account-currency"
          >
            <option v-for="currency in currencies" :key="currency.id" :value="currency.id">
              {{ currency.symbol }} · {{ currency.name }}
            </option>
          </select>
        </div>
        <div>
          <label for="account-initial" class="mb-1.5 block text-sm font-medium text-text">
            {{ t("accounts.drawer.initialAmount") }}
          </label>
          <input
            id="account-initial"
            v-model="initialAmount"
            type="text"
            inputmode="decimal"
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
            data-testid="account-initial"
          />
        </div>
      </div>

      <div>
        <span class="mb-1.5 block text-sm font-medium text-text">
          {{ t("accounts.drawer.color") }}
        </span>
        <div class="flex gap-2.5">
          <button
            v-for="swatch in ACCOUNT_COLORS"
            :key="swatch"
            type="button"
            class="size-7 rounded-full transition-transform"
            :class="color === swatch ? 'ring-2 ring-accent ring-offset-2' : ''"
            :style="{ backgroundColor: swatch }"
            :aria-label="t('accounts.drawer.color')"
            :data-testid="`account-color-${swatch}`"
            @click="color = swatch"
          ></button>
        </div>
      </div>
    </div>
  </EditDrawer>
</template>
