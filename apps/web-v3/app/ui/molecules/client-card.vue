<script setup lang="ts">
import { computed } from "vue";
import { clientInitials, type Client } from "~/domain/client/entities";
import { PhEnvelope, PhPencilSimple, PhTrash } from "~/shared/vendor/icons";

/**
 * Client card of the /clients grid (PRD-v4 §8.6): avatar with initials,
 * name, email and phone.
 *
 * The catalogue also shows "Rubro · Ciudad" and a status pill (Activo /
 * Pendiente / Inactivo); neither exists in the data model (the client
 * table has no rubro, no city and no status column), so the card shows
 * what the API carries.
 */
const props = defineProps<{
  client: Client;
  editLabel: string;
  deleteLabel: string;
}>();

const emit = defineEmits<{
  edit: [];
  remove: [];
}>();

const initials = computed(() => clientInitials(props.client.name));
</script>

<template>
  <article
    class="flex flex-col rounded-[var(--radius)] border border-border bg-surface p-5 transition-[border-color,transform] duration-150 ease-out hover:-translate-y-px hover:border-primary-300"
    data-testid="client-card"
  >
    <div class="flex items-start justify-between gap-2">
      <div class="flex min-w-0 items-center gap-3">
        <span
          class="grid size-10 shrink-0 place-items-center rounded-full bg-primary-50 text-sm font-semibold text-primary-700"
          aria-hidden="true"
          data-testid="client-avatar"
        >
          {{ initials }}
        </span>
        <div class="min-w-0">
          <p class="truncate text-sm font-medium text-text">{{ client.name }}</p>
          <p
            v-if="client.phone"
            class="mt-0.5 truncate text-xs text-text-2"
            data-testid="client-phone"
          >
            {{ client.phone }}
          </p>
        </div>
      </div>
      <div class="flex shrink-0 gap-1">
        <button
          type="button"
          class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
          :aria-label="editLabel"
          data-testid="client-card-edit"
          @click="emit('edit')"
        >
          <PhPencilSimple :size="15" weight="regular" />
        </button>
        <button
          type="button"
          class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-error"
          :aria-label="deleteLabel"
          data-testid="client-card-delete"
          @click="emit('remove')"
        >
          <PhTrash :size="15" weight="regular" />
        </button>
      </div>
    </div>

    <p
      v-if="client.email"
      class="mt-3 flex items-center gap-1.5 truncate text-xs text-text-2"
      data-testid="client-email"
    >
      <PhEnvelope :size="13" weight="regular" class="shrink-0" />
      <span class="truncate">{{ client.email }}</span>
    </p>
  </article>
</template>
