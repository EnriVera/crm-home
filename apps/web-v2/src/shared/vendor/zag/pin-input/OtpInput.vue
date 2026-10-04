<script setup lang="ts">
/**
 * OtpInput — the reference implementation of a Zag-wrapped component
 * in web-v2. Replaces the placeholder that shipped in v1 with a real
 * @zag-js/pin-input + @zag-js/vue wiring. Preserves leading zeros
 * (PRD-v2 §8.1 acceptance) and emits `complete` only when the value
 * matches `@crm/contract/auth/OtpDigits`.
 */
import { computed, useId, watch } from "vue";
import { useMachine, normalizeProps, mergeProps } from "@zag-js/vue";
import * as pinInput from "@zag-js/pin-input";
import { OtpDigits } from "@crm/contract/auth";
import { cn } from "@/shared/ui/cn";

const props = withDefaults(
  defineProps<{
    modelValue?: string;
    length?: number;
    disabled?: boolean;
    autoFocus?: boolean;
    invalid?: boolean;
  }>(),
  {
    modelValue: "",
    length: 6,
    disabled: false,
    autoFocus: true,
    invalid: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
  complete: [value: string];
}>();

const id = useId();

const service = useMachine(
  pinInput.machine,
  computed(() => ({
    id,
    value: props.modelValue.split(""),
    placeholder: "○",
    blurOnComplete: true,
    otp: true,
    type: "numeric" as const,
    disabled: props.disabled,
  })),
);

const api = computed(() => pinInput.connect(service, normalizeProps));

watch(
    () => props.modelValue,
    (next) => {
    if (next === api.value.valueAsString) return;
    api.value.setValue(next.split(""));
    },
);
// Watch the ComputedRef (api), NOT api.value. api.value is a plain
// object returned by pinInput.connect() — Vue cannot track reactivity
// on a raw object, so `watch(api.value, ...)` throws "Invalid watch
// source" and triggers a downstream "Cannot read properties of
// undefined (reading 'startTime')" in the reactivity scheduler.
// Watching the computed ref re-fires when the underlying Zag service
// state changes, which is exactly when valueAsString updates.
watch(
    api,
    (next) => {
    const joined = next.valueAsString;
    emit("update:modelValue", joined);
    const parsed = OtpDigits.safeParse(joined);
    if (parsed.success) emit("complete", parsed.data);
    },
);

function onPaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData("text") ?? "";
  const digits = pasted.replace(/\D/g, "").slice(0, props.length);
  if (digits.length === 0) return;
  // Let the browser paste the text into the focused input first, then
  // override with the cleaned value via setValue. Calling
  // preventDefault + setTimeout raced with Zag's internal paste
  // handler and left the value empty; letting the native paste run
  // and then overwriting lets Zag's machine see a real value change.
  event.preventDefault();
  api.value.setValue(digits.split(""));
}
</script>

<template>
  <div
    v-bind="api.getRootProps()"
    :class="cn('flex items-center gap-2', invalid && 'text-red-600')"
  >
    <input
      v-for="(_, i) in Array.from({ length: props.length }, (_, k) => k)"
      :key="i"
      v-bind="mergeProps(api.getInputProps({ index: i }), $attrs)"
      :class="
        cn(
          'h-12 w-10 rounded-md border border-zinc-200 bg-surface text-center text-lg font-semibold',
          'focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
          'dark:border-zinc-800',
          invalid && 'border-red-500',
        )
      "
      @paste="onPaste"
    />
    <input v-bind="api.getHiddenInputProps()" />
  </div>
</template>
