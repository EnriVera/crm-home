<script setup lang="ts">
import { ref, watch } from "vue";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nueva moneda".
 *
 * Currencies are global (what one user creates, every user sees), so
 * there is no edit drawer: the table is seeded and creation is the only
 * write the API exposes.
 */
const props = defineProps<{
  open: boolean;
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [values: { name: string; symbol: string; decimals: number }];
}>();

const { t } = useI18n();

const name = ref("");
const symbol = ref("");
const decimals = ref(2);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    name.value = "";
    symbol.value = "";
    decimals.value = 2;
  },
  // `immediate` so a deep-link that mounts the drawer already open
  // initializes the fields too.
  { immediate: true },
);

function onSubmit() {
  const trimmedName = name.value.trim();
  const trimmedSymbol = symbol.value.trim();
  if (!trimmedName || !trimmedSymbol) return;
  emit("submit", {
    name: trimmedName,
    symbol: trimmedSymbol,
    decimals: decimals.value,
  });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="t('config.drawer.newCurrency')"
    :submitting="submitting"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <div>
        <label
          for="currency-name"
          class="mb-1.5 block text-sm font-medium text-text"
        >
          {{ t("config.drawer.name") }}
        </label>
        <input
          id="currency-name"
          v-model="name"
          type="text"
          required
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('config.drawer.nameCurrencyPlaceholder')"
        />
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label
            for="currency-symbol"
            class="mb-1.5 block text-sm font-medium text-text"
          >
            {{ t("config.drawer.symbol") }}
          </label>
          <input
            id="currency-symbol"
            v-model="symbol"
            type="text"
            required
            maxlength="4"
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
            :placeholder="t('config.drawer.symbolPlaceholder')"
          />
        </div>
        <div>
          <label
            for="currency-decimals"
            class="mb-1.5 block text-sm font-medium text-text"
          >
            {{ t("config.drawer.decimals") }}
          </label>
          <input
            id="currency-decimals"
            v-model.number="decimals"
            type="number"
            min="0"
            max="6"
            required
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="currency-decimals"
          />
        </div>
      </div>
    </div>
  </EditDrawer>
</template>
