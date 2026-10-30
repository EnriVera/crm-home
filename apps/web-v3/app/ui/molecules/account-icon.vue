<script setup lang="ts">
import { computed } from "vue";
import { PhBank, PhCashRegister, PhCoins, PhWallet } from "~/shared/vendor/icons";
import {
  ACCOUNT_FALLBACK_COLOR,
  type AccountIcon,
} from "~/domain/finance/entities";

/**
 * The account icon of the finance screens (PRD-v4 §8.7): a phosphor icon
 * inside a circle tinted with the account color, like the catalogue.
 */
const props = defineProps<{
  icon: AccountIcon | string | null;
  color: string | null;
  size?: "sm" | "md" | undefined;
}>();

const ICONS: Record<AccountIcon, typeof PhBank> = {
  bank: PhBank,
  wallet: PhWallet,
  cash: PhCashRegister,
};

const iconComponent = computed(() => {
  const value = props.icon as AccountIcon | null;
  return value && value in ICONS ? ICONS[value] : PhCoins;
});

const tint = computed(() => props.color ?? ACCOUNT_FALLBACK_COLOR);
const box = computed(() => (props.size === "sm" ? "size-7" : "size-9"));
const glyph = computed(() => (props.size === "sm" ? 14 : 18));
</script>

<template>
  <span
    class="grid shrink-0 place-items-center rounded-full"
    :class="box"
    :style="{ backgroundColor: `${tint}1a`, color: tint }"
    aria-hidden="true"
  >
    <component :is="iconComponent" :size="glyph" weight="regular" />
  </span>
</template>
