<script setup lang="ts">
/**
 * EditTaskDrawer — right-side Sheet that creates or edits a Task.
 *
 * Modes:
 *   - `task === null | undefined` → create
 *   - `task !== null`              → edit (Delete button shown)
 *
 * Form fields and the validation schema come from `TaskInput`
 * (camelCase) via vee-validate + zod (the toTypedSchema wrapper).
 * Cascade dependencies (type → category, client search-as-you-type)
 * are driven by the form listers composables — the form layer never
 * talks to the wire protocol directly.
 *
 * Mutations are wired through `useCreateTask`, `useUpdateTask`, and
 * `useDeleteTask`. The composables throw `DomainErrorToError` on
 * failure; the onError handlers toast and log the DomainError so
 * the optimistic UI can roll back.
 */
import { computed, ref, watch } from "vue";
import { useForm } from "@/shared/vendor/forms";
import { toTypedSchema } from "@/shared/vendor/forms";
import { Sheet, Modal } from "@/shared/vendor/zag";
import { Icon } from "@/shared/vendor/icons";
import type { Task, TaskInput as TaskInputEntity } from "@crm/contract/task";
import { TaskInput } from "@crm/contract/task";
import { useCreateTask } from "@/shared/composables/use-create-task";
import { useUpdateTask } from "@/shared/composables/use-update-task";
import { useDeleteTask } from "@/shared/composables/use-delete-task";
import { useListTaskStates } from "@/shared/composables/use-list-task-states";
import {
  useTypesForForm,
  useCategoriesByType,
  useSearchClients,
} from "@/shared/composables/use-task-form-listers";
import { toast } from "@/shared/vendor/toast";

const props = defineProps<{
  open: boolean;
  task?: Task | null;
}>();

const emit = defineEmits<{
  "update:open": [open: boolean];
}>();

const isEdit = computed(() => props.task != null);
const taskId = computed(() => props.task?.id ?? null);

/* -------------------------------------------------------------- */
/*  Form (vee-validate + zod via the TaskInput entity schema)     */
/* -------------------------------------------------------------- */

type DrawerFormValues = {
  title: string;
  description: string | null;
  clientId: string | null;
  typeId: string;
  categoryId: string | null;
  taskStateId: string;
};

const emptyValues = (): DrawerFormValues => ({
  title: "",
  description: null,
  clientId: null,
  typeId: "",
  categoryId: null,
  taskStateId: "",
});

const editValues = (task: Task): DrawerFormValues => ({
  title: task.title,
  description: task.description ?? null,
  clientId: task.clientId ?? null,
  typeId: task.typeId,
  categoryId: task.categoryId ?? null,
  taskStateId: task.taskStateId,
});

const form = useForm<DrawerFormValues>({
  validationSchema: toTypedSchema(TaskInput),
  initialValues: emptyValues(),
});

const { defineField, handleSubmit, resetForm, errors } = form;
const [title, titleAttrs] = defineField("title");
const [description, descriptionAttrs] = defineField("description");
const [typeId, typeIdAttrs] = defineField("typeId");
const [categoryId, categoryIdAttrs] = defineField("categoryId");
const [clientId, clientIdAttrs] = defineField("clientId");
const [taskStateId, taskStateIdAttrs] = defineField("taskStateId");

/* -------------------------------------------------------------- */
/*  Form listers (type → category → client cascade)               */
/* -------------------------------------------------------------- */

const typesParams = computed(() => ({ module: "tasks" }));
const categoriesParams = computed(() =>
  typeId.value ? { type_id: typeId.value } : null,
);
const clientQuery = ref("");
const clientLimit = ref(20);

const typesQuery = useTypesForForm(typesParams);
const categoriesQuery = useCategoriesByType(categoriesParams);
const clientsQuery = useSearchClients(clientQuery, clientLimit);
const statesQuery = useListTaskStates();

/* -------------------------------------------------------------- */
/*  Reset form when the drawer opens / the target task changes    */
/* -------------------------------------------------------------- */

watch(
  () => [props.open, props.task?.id ?? null] as const,
  ([isOpen]) => {
    if (!isOpen) return;
    resetForm({ values: props.task ? editValues(props.task) : emptyValues() });
    clientQuery.value = "";
  },
  { immediate: true },
);

// Reset category whenever the type changes; the old id is no longer
// valid for the new type's category set.
watch(typeId, () => {
  categoryId.value = null;
});

/* -------------------------------------------------------------- */
/*  Mutations + delete confirm                                     */
/* -------------------------------------------------------------- */

const createTask = useCreateTask();
const updateTask = useUpdateTask();
const deleteTask = useDeleteTask();

const showConfirm = ref(false);
const isBusy = computed(
  () =>
    createTask.isPending.value ||
    updateTask.isPending.value ||
    deleteTask.isPending.value,
);

const errorFor = (key: keyof DrawerFormValues): string | undefined => {
  const value = errors.value[key];
  if (Array.isArray(value)) return value[0];
  return value;
};

const submit = handleSubmit((values) => {
  // Form values use plain strings for branded ids; cast to the entity
  // shape so the mutations accept the payload. The brands are
  // type-level only — runtime values are uuid strings.
  const input = {
    title: values.title,
    description: values.description ?? null,
    clientId: values.clientId ?? null,
    typeId: values.typeId,
    categoryId: values.categoryId ?? null,
    taskStateId: values.taskStateId,
  } as unknown as TaskInputEntity;
  if (isEdit.value && taskId.value) {
    updateTask.mutate(
      { id: taskId.value, patch: input },
      {
        onSuccess: () => {
          toast.success("Task updated.");
          emit("update:open", false);
        },
        onError: () => {
          toast.error("Could not update task.");
        },
      },
    );
  } else {
    createTask.mutate(input, {
      onSuccess: () => {
        toast.success("Task created.");
        emit("update:open", false);
      },
      onError: () => {
        toast.error("Could not create task.");
      },
    });
  }
});

function onDeleteClick() {
  showConfirm.value = true;
}

function onConfirmDelete() {
  if (!taskId.value) return;
  deleteTask.mutate(taskId.value, {
    onSuccess: () => {
      toast.success("Task deleted.");
      showConfirm.value = false;
      emit("update:open", false);
    },
    onError: () => {
      toast.error("Could not delete task.");
    },
  });
}
</script>

<template>
  <Sheet
    :open="open"
    :title="isEdit ? 'Edit task' : 'New task'"
    @update:open="emit('update:open', $event)"
  >
    <form class="flex flex-col gap-4" @submit.prevent="submit">
      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Title</span>
        <input
          v-model="title"
          v-bind="titleAttrs"
          type="text"
          required
          maxlength="255"
          class="h-10 rounded-md border border-zinc-200 bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        />
        <span v-if="errorFor('title')" class="text-xs text-red-600">
          {{ errorFor("title") }}
        </span>
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Description</span>
        <textarea
          v-model="description"
          v-bind="descriptionAttrs"
          rows="4"
          placeholder="Optional notes"
          class="resize-y rounded-md border border-zinc-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        />
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Type</span>
        <select
          v-model="typeId"
          v-bind="typeIdAttrs"
          required
          class="h-10 rounded-md border border-zinc-200 bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        >
          <option value="" disabled>Select a type…</option>
          <option
            v-for="t in typesQuery.data.value ?? []"
            :key="t.type_id"
            :value="t.type_id"
          >
            {{ t.type_name }}
          </option>
        </select>
        <span v-if="errorFor('typeId')" class="text-xs text-red-600">
          {{ errorFor("typeId") }}
        </span>
      </label>

      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Category</span>
        <select
          v-model="categoryId"
          v-bind="categoryIdAttrs"
          :disabled="!typeId"
          class="h-10 rounded-md border border-zinc-200 bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-800"
        >
          <option :value="null">None</option>
          <option
            v-for="c in categoriesQuery.data.value ?? []"
            :key="c.cate_id"
            :value="c.cate_id"
          >
            {{ c.cate_name }}
          </option>
        </select>
      </label>

      <div class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">Client</span>
        <input
          v-model="clientQuery"
          type="text"
          placeholder="Search clients…"
          class="h-10 rounded-md border border-zinc-200 bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        />
        <select
          v-model="clientId"
          v-bind="clientIdAttrs"
          size="4"
          class="rounded-md border border-zinc-200 bg-surface px-3 py-2 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        >
          <option :value="null">None</option>
          <option
            v-for="c in clientsQuery.data.value ?? []"
            :key="c.clie_id"
            :value="c.clie_id"
          >
            {{ c.clie_name }}
          </option>
        </select>
      </div>

      <label class="flex flex-col gap-1.5">
        <span class="text-sm font-medium">State</span>
        <select
          v-model="taskStateId"
          v-bind="taskStateIdAttrs"
          required
          class="h-10 rounded-md border border-zinc-200 bg-surface px-3 text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/30 dark:border-zinc-800"
        >
          <option value="" disabled>Select a state…</option>
          <option
            v-for="s in statesQuery.data.value ?? []"
            :key="s.id"
            :value="s.id"
          >
            {{ s.title }}
          </option>
        </select>
        <span v-if="errorFor('taskStateId')" class="text-xs text-red-600">
          {{ errorFor("taskStateId") }}
        </span>
      </label>

      <div class="flex items-center justify-between gap-2 pt-2">
        <button
          v-if="isEdit"
          type="button"
          :disabled="isBusy"
          class="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:hover:bg-red-950"
          @click="onDeleteClick"
        >
          Delete
        </button>
        <div class="ml-auto flex gap-2">
          <button
            type="button"
            :disabled="isBusy"
            class="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
            @click="emit('update:open', false)"
          >
            Cancel
          </button>
          <button
            type="submit"
            :disabled="isBusy"
            class="flex items-center gap-2 rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg transition disabled:opacity-50"
          >
            <Icon
              v-if="isBusy"
              name="PhCircleNotch"
              :size="14"
              class="animate-spin"
            />
            <span>{{ isEdit ? "Save" : "Create" }}</span>
          </button>
        </div>
      </div>
    </form>
  </Sheet>

  <Modal v-model:open="showConfirm" title="Delete task?">
    <p class="text-sm text-text-2">
      This action cannot be undone. The task will be removed from the list.
    </p>
    <div class="mt-4 flex justify-end gap-2">
      <button
        type="button"
        :disabled="deleteTask.isPending.value"
        class="rounded-md border border-zinc-200 px-3 py-1.5 text-sm font-medium transition hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-800 dark:hover:bg-zinc-800"
        @click="showConfirm = false"
      >
        Cancel
      </button>
      <button
        type="button"
        :disabled="deleteTask.isPending.value"
        class="flex items-center gap-2 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-50"
        @click="onConfirmDelete"
      >
        <Icon
          v-if="deleteTask.isPending.value"
          name="PhCircleNotch"
          :size="14"
          class="animate-spin"
        />
        <span>Delete</span>
      </button>
    </div>
  </Modal>
</template>