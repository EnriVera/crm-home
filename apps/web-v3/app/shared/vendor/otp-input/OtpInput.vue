<script setup lang="ts">
/**
 * OtpInput: 6-digit OTP input, native Vue (no Zag).
 *
 * Ported from apps/web-v2/src/shared/vendor/zag/pin-input/OtpInput.vue, which
 * was rewritten without @zag-js/pin-input because the machine integration had
 * race conditions between the paste handler, the internal paste support and the
 * watch on `api`: paste and typing were unreliable.
 *
 * Behavior:
 *   - modelValue: the digits typed so far ("" when empty).
 *   - Typing a digit fills the focused cell and auto-advances.
 *   - Backspace clears the focused cell; if it was empty, it jumps back and
 *     clears the previous cell.
 *   - ArrowLeft / ArrowRight move between cells.
 *   - Paste strips non-digits, fills the cells left to right and focuses the
 *     cell after the last filled one.
 *   - "complete" fires when the joined value parses as @crm/contract/auth
 *     OtpDigits, which keeps the leading zeros (PRD-v2 §8.1).
 */
import { computed, nextTick, onMounted, ref, shallowRef, watch } from "vue";
import { OtpDigits } from "@crm/contract/auth";

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

const cells = ref<string[]>(Array.from({ length: props.length }, () => ""));
// shallowRef, not ref: a DOM node must not be deep-reactive, and `ref` would
// unwrap HTMLInputElement into a mapped type that no longer accepts the
// element under exactOptionalPropertyTypes.
const inputRefs = shallowRef<HTMLInputElement[]>([]);

const joined = computed(() => cells.value.join(""));

const cellClasses = computed(() => [
  "h-12 w-10 rounded-sm border border-border bg-surface text-center text-lg font-semibold tabular-nums text-text transition-colors",
  "focus:border-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
  props.invalid ? "border-error" : "",
  props.disabled ? "opacity-50" : "",
]);

watch(joined, (next) => {
  if (next === props.modelValue) return;
  emit("update:modelValue", next);
  const parsed = OtpDigits.safeParse(next);
  if (parsed.success) emit("complete", parsed.data);
});

watch(
  () => props.modelValue,
  (next) => {
    const nextCells = next.padEnd(props.length, "").split("").slice(0, props.length);
    if (nextCells.join("") === cells.value.join("")) return;
    cells.value = nextCells;
  },
  { immediate: true },
);

function setRef(el: unknown, index: number) {
  if (el instanceof HTMLInputElement) {
    inputRefs.value[index] = el;
  }
}

function focusIndex(index: number) {
  inputRefs.value[index]?.focus();
}

function firstEmptyIndex(): number {
  return cells.value.findIndex((cell) => cell === "");
}

function updateAt(index: number, value: string) {
  const next = [...cells.value];
  next[index] = value;
  cells.value = next;
}

function handleInput(index: number, event: Event) {
  const input = event.target as HTMLInputElement;
  const digits = input.value.replace(/\D/g, "");
  if (digits.length === 0) {
    updateAt(index, "");
    return;
  }
  if (digits.length === 1) {
    updateAt(index, digits);
    void nextTick(() => {
      const next = firstEmptyIndex();
      if (next !== -1) focusIndex(next);
    });
    return;
  }
  // The browser dropped a whole code into this cell: the one-time-code
  // autofill ignores maxlength, so the digits are spread over the cells that
  // follow instead of keeping only the last one.
  const next = [...cells.value];
  let cursor = index;
  for (const digit of digits) {
    if (cursor >= props.length) break;
    next[cursor] = digit;
    cursor += 1;
  }
  cells.value = next;
  void nextTick(() => focusIndex(Math.min(cursor, props.length - 1)));
}

function handleKeydown(index: number, event: KeyboardEvent) {
  if (event.key === "Backspace") {
    if (cells.value[index] !== "") {
      updateAt(index, "");
      event.preventDefault();
      return;
    }
    if (index > 0) {
      updateAt(index - 1, "");
      void nextTick(() => focusIndex(index - 1));
      event.preventDefault();
    }
    return;
  }
  if (event.key === "ArrowLeft" && index > 0) {
    void nextTick(() => focusIndex(index - 1));
    event.preventDefault();
    return;
  }
  if (event.key === "ArrowRight" && index < props.length - 1) {
    void nextTick(() => focusIndex(index + 1));
    event.preventDefault();
  }
}

function handlePaste(event: ClipboardEvent) {
  const pasted = event.clipboardData?.getData("text") ?? "";
  const digits = pasted.replace(/\D/g, "").slice(0, props.length);
  if (digits.length === 0) return;
  event.preventDefault();
  const next = [...cells.value];
  for (let index = 0; index < props.length; index += 1) {
    next[index] = digits[index] ?? "";
  }
  cells.value = next;
  void nextTick(() => {
    focusIndex(Math.min(digits.length, props.length - 1));
  });
}

function handleFocus(index: number, event: FocusEvent) {
  const input = event.target as HTMLInputElement;
  // Selecting the content lets a typed digit replace the cell instead of
  // appending to it.
  input.select();
  const empty = firstEmptyIndex();
  if (cells.value[index] !== "" && empty !== -1 && empty < index) {
    void nextTick(() => focusIndex(empty));
  }
}

onMounted(() => {
  if (!props.autoFocus) return;
  const empty = firstEmptyIndex();
  void nextTick(() => focusIndex(empty === -1 ? 0 : empty));
});
</script>

<template>
  <div class="flex items-center gap-2" role="group" aria-label="Código de un solo uso">
    <input
      v-for="index in props.length"
      :key="index - 1"
      :ref="(el) => setRef(el as Element | null, index - 1)"
      v-model="cells[index - 1]"
      type="text"
      inputmode="numeric"
      autocomplete="one-time-code"
      maxlength="1"
      :disabled="props.disabled"
      :aria-invalid="props.invalid"
      :data-testid="`otp-cell-${index - 1}`"
      :class="cellClasses"
      @input="(event) => handleInput(index - 1, event)"
      @keydown="(event) => handleKeydown(index - 1, event)"
      @paste="(event) => handlePaste(event)"
      @focus="(event) => handleFocus(index - 1, event)"
    />
  </div>
</template>
