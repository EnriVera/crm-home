<script setup lang="ts">
import { ref, watch } from "vue";
import type { TaskType, TypeModule } from "~/domain/config/entities";
import { TYPE_MODULES } from "~/domain/config/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nuevo tipo" / "Editar tipo" (PRD-v4 §9.2 lateral-derecho-tipo).
 *
 * The catalogue draws Color swatches and a Description field; the API
 * stores neither for types (`type_name` + `type_modules` only), so the
 * form edits exactly what persists. The modules chips double as the
 * type's scope: empty = applies to every module.
 */
const props = defineProps<{
  open: boolean;
  /** The type being edited; null = create. */
  initial: TaskType | null;
  submitting?: boolean;
  error?: string | null;
}>();

const emit = defineEmits<{
  close: [];
  submit: [values: { name: string; modules: TypeModule[] }];
}>();

const { t } = useI18n();

const name = ref("");
const modules = ref<TypeModule[]>([]);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    name.value = props.initial?.name ?? "";
    // Edit keeps the stored modules; create defaults to the tasks module.
    modules.value = props.initial
      ? [...props.initial.modules]
      : (["tasks"] as TypeModule[]);
  },
  // `immediate` so a deep-link that mounts the drawer already open
  // (/?tab=tipos&drawer=new) initializes the fields too.
  { immediate: true },
);

function toggleModule(module: TypeModule) {
  modules.value = modules.value.includes(module)
    ? modules.value.filter((entry) => entry !== module)
    : [...modules.value, module];
}

function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  emit("submit", { name: trimmed, modules: modules.value });
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('config.drawer.editType') : t('config.drawer.newType')"
    :submitting="submitting"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <div class="space-y-5">
      <div>
        <label for="type-name" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("config.drawer.name") }}
        </label>
        <input
          id="type-name"
          v-model="name"
          type="text"
          required
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('config.drawer.nameTypePlaceholder')"
        />
      </div>

      <fieldset>
        <legend class="mb-1.5 block text-sm font-medium text-text">
          {{ t("config.drawer.modules") }}
        </legend>
        <div class="flex flex-wrap gap-2">
          <button
            v-for="module in TYPE_MODULES"
            :key="module"
            type="button"
            class="rounded-full border px-3 py-1 text-xs transition-colors"
            :class="
              modules.includes(module)
                ? 'border-accent bg-primary-50 text-primary-700'
                : 'border-border text-text-2 hover:text-text'
            "
            :aria-pressed="modules.includes(module)"
            :data-testid="`type-module-${module}`"
            @click="toggleModule(module)"
          >
            {{ t(`config.modules.${module}`) }}
          </button>
        </div>
        <p v-if="modules.length === 0" class="mt-1.5 text-xs text-text-2">
          {{ t("config.drawer.modulesEmpty") }}
        </p>
      </fieldset>
    </div>
  </EditDrawer>
</template>
