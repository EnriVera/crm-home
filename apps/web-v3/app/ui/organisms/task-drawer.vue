<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Task } from "~/domain/task/entities";
import {
  listCategoriesForType,
  type CategoryOption,
  type ClientOption,
  type TypeOption,
} from "~/infrastructure/task/orpc-task";
import RichTextEditor from "~/shared/vendor/richtext/RichTextEditor.vue";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nueva tarea" / "Editar tarea" (PRD-v4 §9.2 lateral-derecho-tareas,
 * I-05 decision).
 *
 * The drawer edits exactly what the create/update API persists:
 * title (required), description (rich text), client (optional),
 * type (required) and the category cascade — Categoría stays disabled
 * until a type is picked (PRD-v2 §8.3 acceptance), loaded per type via
 * the legacy categories-by-type endpoint.
 *
 * NOT in this drawer, per I-05: "Estado inicial" (tasks are always born
 * Pendiente — the kanban column "+" places them via task_tast_id), "Fecha
 * limit" (the wire has no due date field) and Attachments (Phase 2).
 */
const props = defineProps<{
  open: boolean;
  /** The task being edited; null = create. */
  initial: Task | null;
  clients: ClientOption[];
  types: TypeOption[];
  submitting?: boolean | undefined;
  error?: string | null | undefined;
}>();

const emit = defineEmits<{
  close: [];
  submit: [
    values: {
      title: string;
      description: string | null;
      clientId: string | null;
      typeId: string | null;
      categoryId: string | null;
    },
  ];
  remove: [id: string];
}>();

const { t } = useI18n();

const title = ref("");
const description = ref<string | null>(null);
const clientId = ref<string | null>(null);
const typeId = ref<string | null>(null);
const categoryId = ref<string | null>(null);
const categories = ref<CategoryOption[]>([]);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    title.value = props.initial?.title ?? "";
    description.value = props.initial?.description ?? null;
    clientId.value = props.initial?.clientId ?? null;
    // The type is REQUIRED (PRD-v2 §8.3): the API rejects a task without
    // `task_type_id`. On create the first available type is preselected.
    typeId.value = props.initial?.typeId ?? props.types[0]?.id ?? null;
    categoryId.value = props.initial?.categoryId ?? null;
    categories.value = [];
    if (typeId.value) void loadCategories(typeId.value);
  },
  { immediate: true },
);

/** The form is saveable with a title and a type (both required). */
const canSubmit = computed(
  () => title.value.trim().length > 0 && Boolean(typeId.value),
);

watch(
  () => props.types,
  (types) => {
    // The types arrive with the async load: if the drawer is already open
    // without a type chosen, the first one is preselected.
    if (!props.open || typeId.value !== null || types.length === 0) return;
    typeId.value = types[0]!.id;
    void loadCategories(typeId.value);
  },
);

async function loadCategories(id: string) {
  try {
    categories.value = await listCategoriesForType(id);
  } catch {
    categories.value = [];
  }
}

function onTypeChange() {
  categoryId.value = null;
  if (typeId.value) void loadCategories(typeId.value);
}

function onSubmit() {
  const trimmed = title.value.trim();
  if (!trimmed) return;
  emit("submit", {
    title: trimmed,
    description: description.value,
    clientId: clientId.value || null,
    typeId: typeId.value || null,
    categoryId: categoryId.value || null,
  });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('tasks.drawer.editTitle') : t('tasks.drawer.newTitle')"
    :submitting="submitting"
    :save-disabled="!canSubmit"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <div>
        <label for="task-title" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("tasks.drawer.title") }}
        </label>
        <input
          id="task-title"
          v-model="title"
          type="text"
          required
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('tasks.drawer.titlePlaceholder')"
        />
      </div>

      <div>
        <span class="mb-1.5 block text-sm font-medium text-text">
          {{ t("tasks.drawer.description") }}
        </span>
        <RichTextEditor v-model="description" />
      </div>

      <div>
        <label for="task-client" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("tasks.drawer.client") }}
        </label>
        <select
          id="task-client"
          v-model="clientId"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="task-client"
        >
          <option :value="null">{{ t("tasks.drawer.noClient") }}</option>
          <option v-for="client in clients" :key="client.id" :value="client.id">
            {{ client.name }}
          </option>
        </select>
      </div>

      <div class="grid grid-cols-2 gap-4">
        <div>
          <label for="task-type" class="mb-1.5 block text-sm font-medium text-text">
            {{ t("tasks.drawer.type") }}
          </label>
          <select
            id="task-type"
            v-model="typeId"
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
            data-testid="task-type"
            @change="onTypeChange"
          >
            <option :value="null">{{ t("tasks.drawer.noType") }}</option>
            <option v-for="type in types" :key="type.id" :value="type.id">
              {{ type.name }}
            </option>
          </select>
          <p v-if="types.length === 0" class="mt-1.5 text-xs text-text-2">
            {{ t("tasks.drawer.noTypes") }}
          </p>
        </div>
        <div>
          <label for="task-category" class="mb-1.5 block text-sm font-medium text-text">
            {{ t("tasks.drawer.category") }}
          </label>
          <select
            id="task-category"
            v-model="categoryId"
            class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="!typeId"
            :title="!typeId ? t('tasks.drawer.categoryNeedsType') : undefined"
            data-testid="task-category"
          >
            <option :value="null">{{ t("tasks.drawer.noCategory") }}</option>
            <option
              v-for="category in categories"
              :key="category.id"
              :value="category.id"
            >
              {{ category.name }}
            </option>
          </select>
        </div>
      </div>
    </div>

    <template v-if="initial" #footer="{ submitting: saving }">
      <button
        type="button"
        class="mr-auto rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-surface-2"
        data-testid="task-delete"
        @click="emit('remove', initial.id)"
      >
        {{ t("tasks.drawer.delete") }}
      </button>
      <button
        type="button"
        class="rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
        @click="emit('close')"
      >
        {{ t("config.drawer.cancel") }}
      </button>
      <button
        type="submit"
        :disabled="saving || !canSubmit"
        class="rounded-[var(--radius)] bg-accent px-4 py-2 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
        data-testid="drawer-save"
      >
        {{ saving ? t("config.drawer.saving") : t("config.drawer.save") }}
      </button>
    </template>
  </EditDrawer>
</template>
