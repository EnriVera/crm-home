<script setup lang="ts">
/**
 * OtpInput — 6-digit OTP input, native Vue (no Zag).
 *
 * Rewritten without @zag-js/pin-input because the machine integration
 * had race conditions between the paste handler, the internal paste
 * support, and the watch on `api` — paste and typing were unreliable.
 *
 * Behavior:
 *   - modelValue: string of digits ("" when empty). v-model on the
 *     parent reads/writes the full string.
 *   - autoFocus: focuses the first empty cell on mount.
 *   - invalid: red border on all cells.
 *   - Emits update:modelValue on every change and "complete" when
 *     the value parses as @crm/contract/auth/OtpDigits (6 digits,
 *     preserves leading zeros).
 *   - Paste: strips non-digits, fills cells left-to-right, focuses
 *     the cell after the last filled.
 *   - Typing: a single digit fills the focused cell and auto-advances.
 *   - Backspace: clears the focused cell; if empty, jumps back and
 *     clears the previous cell.
 *   - ArrowLeft / ArrowRight: navigate between cells.
 */
import { ref, computed, watch, nextTick, onMounted } from "vue";
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

const cells = ref<string[]>(Array.from({ length: props.length }, () => ""));
const inputRefs = ref<HTMLInputElement[]>([]);

const joined = computed(() => cells.value.join(""));

watch(joined, (next) => {
 if (next === props.modelValue) return;
 emit("update:modelValue", next);
 const parsed = OtpDigits.safeParse(next);
 if (parsed.success) emit("complete", parsed.data);
});

watch(
 () => props.modelValue,
 (next) => {
  const nextArr = next.padEnd(props.length, "").split("").slice(0, props.length);
  if (nextArr.join("") === cells.value.join("")) return;
  cells.value = nextArr;
 },
);

function setRef(el: unknown, index: number) {
 if (el instanceof HTMLInputElement) {
  inputRefs.value[index] = el;
 }
}

function focusIndex(i: number) {
 const el = inputRefs.value[i];
 if (el) el.focus();
}

function firstEmptyIndex(): number {
 return cells.value.findIndex((c) => c === "");
}

function updateAt(index: number, value: string) {
 const next = [...cells.value];
 next[index] = value;
 cells.value = next;
}

function handleInput(index: number, event: Event) {
 const input = event.target as HTMLInputElement;
 const raw = input.value.replace(/\D/g, "");
 if (raw.length === 0) {
  updateAt(index, "");
  return;
 }
 // Take only the first digit (single-cell input).
 const digit = raw.slice(-1);
 updateAt(index, digit);
 // Auto-advance to the next empty cell.
 void nextTick(() => {
  const next = firstEmptyIndex();
  if (next !== -1) focusIndex(next);
 });
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
 } else if (event.key === "ArrowLeft" && index > 0) {
  void nextTick(() => focusIndex(index - 1));
  event.preventDefault();
 } else if (event.key === "ArrowRight" && index < props.length - 1) {
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
 for (let i = 0; i < props.length; i += 1) {
  next[i] = digits[i] ?? "";
 }
 cells.value = next;
 void nextTick(() => {
  const focusAt = Math.min(digits.length, props.length - 1);
  focusIndex(focusAt);
 });
}

function handleFocus(index: number, event: FocusEvent) {
 const input = event.target as HTMLInputElement;
 // Select the cell's content on focus so typing replaces it.
 input.select();
 // If a non-empty cell is focused, the user likely wants to overwrite.
 if (cells.value[index] !== "" && firstEmptyIndex() !== -1) {
  const empty = firstEmptyIndex();
  if (empty < index) {
  void nextTick(() => focusIndex(empty));
  }
 }
}

onMounted(() => {
 if (props.autoFocus) {
  const empty = firstEmptyIndex();
  const target = empty === -1 ? 0 : empty;
  void nextTick(() => focusIndex(target));
 }
});
</script>

<template>
 <div
 :class="cn('flex items-center gap-2', invalid && 'text-red-600')"
 role="group"
 :aria-label="'One-time password'"
 >
 <input
  v-for="(_, i) in Array.from({ length: props.length }, (_, k) => k)"
  :key="i"
  :ref="(el) => setRef(el as Element | null, i)"
  v-model="cells[i]"
  type="text"
  inputmode="numeric"
  autocomplete="one-time-code"
  maxlength="1"
  :disabled="props.disabled"
  :aria-invalid="invalid"
  :data-testid="`otp-cell-${i}`"
  :class="
  cn(
  'h-12 w-10 text-center text-lg font-semibold bg-surface rounded-lg',
  'border border-zinc-200 focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30',
  'dark:border-zinc-800',
  invalid && 'border-red-500',
  props.disabled && 'opacity-50',
  )
  "
  @input="(e) => handleInput(i, e)"
  @keydown="(e) => handleKeydown(i, e)"
  @paste="(e) => handlePaste(e)"
  @focus="(e) => handleFocus(i, e)"
 />
 </div>
</template>
