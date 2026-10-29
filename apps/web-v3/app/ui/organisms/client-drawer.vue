<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { Client, ClientDependencies } from "~/domain/client/entities";
import EditDrawer from "~/ui/organisms/edit-drawer.vue";

/**
 * "Nuevo cliente" / "Editar cliente" (PRD-v4 §9.2 lateral-derecho-clientes).
 *
 * The drawer edits what the API persists: name (required), email and
 * phone (one free-form field, so "+54 9 11 0000-1111" round-trips
 * exactly — PRD-v2 §8.5).
 *
 * NOT in this drawer: avatar/attachment (Fase 2), country, rubro and
 * notes (I-06: outside v1) and the linked account (no accounts API).
 *
 * Deleting a client with tasks attached asks for an explicit confirmation
 * that LISTS the dependencies (PRD-v2 §8.5) — inline, not a modal: the
 * drawer stays open and the footer switches to the confirmation.
 */
const props = defineProps<{
  open: boolean;
  /** The client being edited; null = create. */
  initial: Client | null;
  submitting?: boolean | undefined;
  error?: string | null | undefined;
  /**
   * Resolves the dependencies of a client. It is a prop FUNCTION (not an
   * emit) because the drawer has to await the answer before showing the
   * confirmation.
   */
  loadDependencies?: ((id: string) => Promise<ClientDependencies>) | undefined;
  /** Opens straight into the delete confirmation (from the card's trash). */
  startInDeleteConfirm?: boolean | undefined;
}>();

const emit = defineEmits<{
  close: [];
  submit: [values: { name: string; email: string | null; phone: string | null }];
  remove: [id: string];
}>();

const { t } = useI18n();

const name = ref("");
const email = ref("");
const phone = ref("");

/** "form" → the fields; "confirm" → the delete confirmation. */
const mode = ref<"form" | "confirm">("form");
const dependencyList = ref<{ taskId: string; taskTitle: string }[]>([]);
const dependencyTotal = ref(0);
const loadingDependencies = ref(false);
/** The dependencies could not be loaded: the delete stays blocked. */
const dependenciesError = ref(false);

watch(
  () => props.open,
  (isOpen) => {
    if (!isOpen) return;
    name.value = props.initial?.name ?? "";
    email.value = props.initial?.email ?? "";
    phone.value = props.initial?.phone ?? "";
    mode.value = "form";
    dependencyList.value = [];
    dependencyTotal.value = 0;
    // The card's trash button opens the drawer straight into the
    // confirmation (with the dependencies loaded).
    if (props.startInDeleteConfirm) void requestDelete();
  },
  { immediate: true },
);

const canSubmit = computed(() => name.value.trim().length > 0);

function onSubmit() {
  const trimmed = name.value.trim();
  if (!trimmed) return;
  emit("submit", {
    name: trimmed,
    email: email.value.trim() || null,
    phone: phone.value.trim() || null,
  });
}

/**
 * Deletes the client.
 *
 * The confirmation always opens: with dependencies attached it lists
 * them first, and without them it asks for the explicit confirmation.
 */
async function requestDelete() {
  if (!props.initial) return;
  loadingDependencies.value = true;
  dependenciesError.value = false;
  try {
    const result = props.loadDependencies
      ? await props.loadDependencies(props.initial.id)
      : { dependencies: [], total: 0 };
    dependencyList.value = result.dependencies;
    dependencyTotal.value = result.total;
  } catch {
    // The client cannot be claimed to have no dependencies: if the load
    // fails, the delete stays blocked instead of confirming a delete
    // without listing what breaks.
    dependencyList.value = [];
    dependencyTotal.value = 0;
    dependenciesError.value = true;
  } finally {
    loadingDependencies.value = false;
  }
  mode.value = "confirm";
}

function confirmDelete() {
  if (!props.initial) return;
  emit("remove", props.initial.id);
}
</script>

<template>
  <EditDrawer
    :open="open"
    :title="initial ? t('clients.drawer.editTitle') : t('clients.drawer.newTitle')"
    :submitting="submitting"
    :save-disabled="!canSubmit || mode === 'confirm'"
    :error="error"
    @close="emit('close')"
    @submit="onSubmit"
  >
    <!-- Delete confirmation: the dependencies are listed here. -->
    <div v-if="mode === 'confirm'" data-testid="client-delete-confirm">
      <p class="text-sm text-text">
        {{
          dependencyTotal > 0
            ? t("clients.drawer.deleteWithDependencies", {
                count: dependencyTotal,
              })
            : t("clients.drawer.deleteConfirm")
        }}
      </p>
      <ul
        v-if="dependencyList.length > 0"
        class="mt-3 space-y-1 rounded-[var(--radius-sm)] border border-border bg-surface-2 p-3"
        data-testid="client-dependencies"
      >
        <li
          v-for="dependency in dependencyList"
          :key="dependency.taskId"
          class="text-sm text-text-2"
        >
          {{ dependency.taskTitle }}
        </li>
      </ul>
      <p
        v-if="dependenciesError"
        class="mt-3 text-sm text-error"
        data-testid="client-dependencies-error"
      >
        {{ t("clients.drawer.dependenciesError") }}
      </p>
    </div>

    <!-- The fields. -->
    <div v-else class="space-y-5">
      <div>
        <label for="client-name" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("clients.drawer.name") }}
        </label>
        <input
          id="client-name"
          v-model="name"
          type="text"
          required
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('clients.drawer.namePlaceholder')"
        />
      </div>

      <div>
        <label for="client-email" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("clients.drawer.email") }}
        </label>
        <input
          id="client-email"
          v-model="email"
          type="email"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('clients.drawer.emailPlaceholder')"
        />
      </div>

      <div>
        <label for="client-phone" class="mb-1.5 block text-sm font-medium text-text">
          {{ t("clients.drawer.phone") }}
        </label>
        <input
          id="client-phone"
          v-model="phone"
          type="tel"
          class="h-10 w-full rounded-[var(--radius-sm)] border border-border bg-surface px-3 text-sm text-text outline-none transition-colors placeholder:text-text-2 focus:border-accent"
          :placeholder="t('clients.drawer.phonePlaceholder')"
        />
      </div>
    </div>

    <template v-if="initial" #footer="{ submitting: saving }">
      <!-- Delete confirmation footer. -->
      <template v-if="mode === 'confirm'">
        <button
          type="button"
          class="mr-auto rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-text transition-colors hover:bg-surface-2"
          data-testid="client-delete-cancel"
          @click="mode = 'form'"
        >
          {{ t("config.drawer.cancel") }}
        </button>
        <button
          type="button"
          :disabled="saving || loadingDependencies || dependenciesError"
          class="rounded-[var(--radius)] bg-error px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
          data-testid="client-delete-confirm-button"
          @click="confirmDelete"
        >
          {{ t("clients.drawer.deleteConfirmButton") }}
        </button>
      </template>

      <!-- Normal footer. -->
      <template v-else>
        <button
          type="button"
          class="mr-auto rounded-[var(--radius)] border border-border px-4 py-2 text-sm font-medium text-error transition-colors hover:bg-surface-2"
          data-testid="client-delete"
          @click="requestDelete"
        >
          {{ t("clients.drawer.delete") }}
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
    </template>
  </EditDrawer>
</template>
