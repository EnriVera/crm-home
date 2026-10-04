<script setup lang="ts">
/**
 * Button — the single source of truth for button styling across web-v2.
 *
 * Design rule (PRD-v3 §8.2 + user clarification):
 *   POSITIVE ACTIONS (anything that progresses the user toward a
 *   goal — submit, save, confirm, resend, create, send) use
 *   variant="primary": accent green background, dark grey text.
 *
 *   NEGATIVE / NAVIGATIONAL ACTIONS (cancel, go back, close,
 *   discard, "use a different email") use variant="dark" or
 *   variant="secondary" — never green. Green is reserved for
 *   "this advances your work".
 *
 * Variants:
 *  - primary:   accent green bg + zinc-800 text. Positive actions.
 *  - secondary: zinc-100 bg + text-2 color. Paired / cooldown actions.
 *  - dark:      zinc-800 bg + white text. High-emphasis neutral
 *               (cancel, navigation back).
 *  - ghost:     transparent bg + accent text. Low-emphasis links.
 *
 * Sizes:
 *  - sm: h-8 px-3 text-sm. Inline row actions.
 *  - md: h-10 px-4 text-sm. Form submit.
 *
 * All variants use rounded-sm. Loading shows a spinner; disabled
 * short-circuits clicks.
 */
import { computed } from "vue";
import { cn } from "@/shared/ui/cn";
import { Icon } from "@/shared/vendor/icons";

type Variant = "primary" | "secondary" | "dark" | "ghost";
type Size = "sm" | "md";

const props = withDefaults(
 defineProps<{
 variant?: Variant;
 size?: Size;
 disabled?: boolean;
 loading?: boolean;
 type?: "button" | "submit" | "reset";
 }>(),
 {
  variant: "primary",
  size: "md",
  disabled: false,
  loading: false,
  type: "button",
 },
);

const emit = defineEmits<{
 click: [event: MouseEvent];
}>();

const isDisabled = computed(() => props.disabled || props.loading);

const baseClass =
 "inline-flex items-center justify-center gap-2 rounded-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60";

const variantClass = computed<string>(() => {
 switch (props.variant) {
  case "primary":
   return "bg-accent text-zinc-800 hover:bg-accent/90";
  case "secondary":
   return "border border-zinc-200 bg-zinc-100 text-text-2 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-800 dark:hover:bg-zinc-700";
  case "dark":
   return "bg-zinc-800 text-white hover:bg-zinc-700 dark:bg-zinc-700 dark:hover:bg-zinc-600";
  case "ghost":
   return "text-accent hover:bg-zinc-100 dark:hover:bg-zinc-800";
 }
});

const sizeClass = computed<string>(() => {
 switch (props.size) {
  case "sm":
   return "h-8 px-3 text-sm";
  case "md":
   return "h-10 px-4 text-sm";
 }
});

function onClick(event: MouseEvent) {
 if (isDisabled.value) {
  event.preventDefault();
  return;
 }
 emit("click", event);
}
</script>

<template>
 <button
  :type="type"
  :disabled="isDisabled"
  :aria-busy="loading || undefined"
  :class="cn(baseClass, variantClass, sizeClass)"
  @click="onClick"
 >
  <Icon
   v-if="loading"
   name="PhCircleNotch"
   :size="size === 'sm' ? 14 : 16"
   class="animate-spin"
  />
  <slot />
 </button>
</template>
