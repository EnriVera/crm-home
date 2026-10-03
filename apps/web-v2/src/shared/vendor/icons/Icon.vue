<script setup lang="ts">
/**
 * Icon — the only place in the app that renders a Phosphor icon.
 * Consumers use the wrapper from @/shared/vendor/icons/Icon.vue; nothing
 * else imports @phosphor-icons/vue directly.
 */
import { computed } from "vue";
import { getIcon, type PhosphorName, type PhosphorWeight } from "./index";

const props = withDefaults(
  defineProps<{
    name: PhosphorName;
    weight?: PhosphorWeight;
    size?: number | string;
  }>(),
  {
    weight: "regular",
    size: 20,
  },
);

const icon = computed(() => getIcon(props.name));
const sizeValue = computed(() =>
  typeof props.size === "number" ? `${props.size}` : props.size,
);
</script>

<template>
  <component
    :is="icon"
    v-if="icon"
    :weight="weight"
    :size="sizeValue"
    class="inline-block shrink-0"
  />
</template>
