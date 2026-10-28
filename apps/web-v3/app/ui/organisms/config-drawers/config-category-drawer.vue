<script setup lang="ts">
import { ref, watch } from "vue";
import type { Category, TaskType } from "~/domain/config/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nueva categoría" / "Editar categoría" (PRD-v4 §9.2 lateral-derecho-categoria).
 *
 * A category always belongs to a type (`cate_type_id NOT NULL`), so the
 * type select is required. The catalogue draws Color + Description; the
 * DB stores neither for categories, so the form edits what persists.
 */
const props = defineProps<{
  open: boolean;
  /** The category being edited; null = create. */
  initial: Category | null;
  /** The types the category can belong to. */
  types: TaskType[];
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [values: { name: string; typeId: string }];
}>();

const { t } = useI18n();

const name = ref("");
const typeId = ref("");

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    name.value = props.initial?.name ?? "";
    typeId.value = props.initial?.typeId ?? props.types[0]?.id ?? "";
  },
  // `immediate` so a deep-link that mounts the drawer already open
  // initializes the fields too.
  { immediate: true },
);

function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed || !typeId.value) return;
  emit("submit", { name: trimmed, typeId: typeId.value });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="
      initial ? t('config.drawer.editCategory') : t('config.drawer.newCategory')
    "
    :submitting="submitting"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <div>
        <label
          for="category-name"
          class="mb-1.5 block text-sm font-medium text-text"
        >
          {{ t("config.drawer.name") }}
        </label>
        <input
          id="category-name"
          v-model="name"
          type="text"
          required
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('config.drawer.nameCategoryPlaceholder')"
        />
      </div>

      <div>
        <label for="category-type" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("config.drawer.type") }}
        </label>
        <select
          id="category-type"
          v-model="typeId"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors focus:border-accent"
          data-testid="category-type"
        >
          <option v-for="type in types" :key="type.id" :value="type.id">
            {{ type.name }}
          </option>
        </select>
        <p v-if="types.length === 0" class="mt-1.5 text-xs text-text-2">
          {{ t("config.drawer.noTypes") }}
        </p>
      </div>
    </div>
  </EditDrawer>
</template>
