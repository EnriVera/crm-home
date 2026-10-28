<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { TaskState } from "~/domain/config/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nuevo estado" / "Editar estado" (PRD-v4 §9.2 lateral-derecho-estado).
 *
 * Position is a "Después de …" select over the existing columns → the
 * index where the new state lands in the board sequence. The catalogue
 * draws Color swatches; `task_state` has no color column, so the form
 * edits what persists (name + position).
 */
const props = defineProps<{
  open: boolean;
  /** The state being edited; null = create. */
  initial: TaskState | null;
  /** The existing states in board order (drives the position select). */
  states: TaskState[];
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  // `position` is the index in the final sequence (0 = first column).
  submit: [values: { name: string; position: number }];
}>();

const { t } = useI18n();

const name = ref("");
/** 0 = "Al principio"; i+1 = after the i-th existing state. */
const position = ref(0);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    name.value = props.initial?.name ?? "";
    if (props.initial) {
      const ordered = props.states.filter((s) => s.id !== props.initial!.id);
      const index = ordered.findIndex((s) => s.order > props.initial!.order);
      position.value = index === -1 ? ordered.length : index;
    } else {
      position.value = props.states.length;
    }
  },
  // `immediate` so a deep-link that mounts the drawer already open
  // initializes the fields too.
  { immediate: true },
);

const positionOptions = computed(() => {
  const others = props.initial
    ? props.states.filter((s) => s.id !== props.initial!.id)
    : props.states;
  return [
    { value: 0, label: t("config.drawer.positionStart") },
    ...others.map((state, index) => ({
      value: index + 1,
      label: t("config.drawer.positionAfter", { name: state.name }),
    })),
  ];
});

function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  emit("submit", { name: trimmed, position: position.value });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('config.drawer.editState') : t('config.drawer.newState')"
    :submitting="submitting"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <div>
        <label for="state-name" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("config.drawer.name") }}
        </label>
        <input
          id="state-name"
          v-model="name"
          type="text"
          required
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('config.drawer.nameStatePlaceholder')"
        />
      </div>

      <div>
        <label for="state-position" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("config.drawer.position") }}
        </label>
        <select
          id="state-position"
          v-model.number="position"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="state-position"
        >
          <option
            v-for="option in positionOptions"
            :key="option.value"
            :value="option.value"
          >
            {{ option.label }}
          </option>
        </select>
      </div>
    </div>
  </EditDrawer>
</template>
