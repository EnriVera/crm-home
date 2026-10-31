<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useClients } from "~/shared/composables/use-clients";
import { useRouteSearch } from "~/shared/composables/use-route-search";
import BaseView from "~/ui/organisms/base-view.vue";
import ClientDrawer from "~/ui/organisms/client-drawer.vue";
import ClientCard from "~/ui/molecules/client-card.vue";
import { PhPencilSimple, PhPlus, PhTrash } from "~/shared/vendor/icons";

const { t } = useI18n();
const { params, set } = useRouteSearch("clients");
const {
  clients,
  search,
  visibleClients,
  isLoading,
  error,
  load,
  add,
  edit,
  deleteClient,
  dependencies,
} = useClients();

const saving = ref(false);
const drawerError = ref<string | null>(null);

const drawerOpen = computed(
  () => params.value.drawer === "new" || params.value.edit !== undefined,
);

const editingClient = computed(
  () => clients.value.find((client) => client.id === params.value.edit) ?? null,
);

onMounted(() => {
  void load();
});

function openCreate() {
  drawerError.value = null;
  void set({ drawer: "new", edit: "", delete: "" });
}

function openEdit(id: string) {
  drawerError.value = null;
  void set({ edit: id, drawer: "", delete: "" });
}

/** The card's trash opens the drawer straight into the delete confirmation. */
function openDelete(id: string) {
  drawerError.value = null;
  void set({ edit: id, drawer: "", delete: "1" });
}

function closeDrawer() {
  return set({ drawer: "", edit: "", delete: "" });
}

async function submitClient(values: {
  name: string;
  email: string | null;
  phone: string | null;
}) {
  drawerError.value = null;
  saving.value = true;
  try {
    if (editingClient.value) {
      await edit({ id: editingClient.value.id, ...values });
    } else {
      await add(values);
    }
    await closeDrawer();
  } catch {
    drawerError.value = "clients.drawer.saveError";
  } finally {
    saving.value = false;
  }
}

async function removeClient(id: string) {
  saving.value = true;
  try {
    await deleteClient(id);
    await closeDrawer();
  } catch {
    drawerError.value = "clients.deleteError";
  } finally {
    saving.value = false;
  }
}
</script>

<template>
  <section class="mx-auto w-full max-w-5xl">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-text">
          {{ t("clients.title") }}
        </h1>
        <p class="mt-1 text-sm text-text-2">
          {{ t("clients.subtitle", { count: clients.length }) }}
        </p>
      </div>
      <button
        type="button"
        class="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
        data-testid="clients-new"
        @click="openCreate"
      >
        <PhPlus :size="16" weight="bold" />
        {{ t("clients.new") }}
      </button>
    </header>

    <p v-if="error" class="mt-4 text-sm text-error" data-testid="clients-error">
      {{ t(error) }}
    </p>

    <BaseView
      id="clients-list"
      v-model:search="search"
      class="mt-5"
      :loading="isLoading"
      :search-placeholder="t('clients.search')"
    >
      <template #grid>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ClientCard
            v-for="client in visibleClients"
            :key="client.id"
            :client="client"
            :edit-label="t('clients.drawer.editTitle')"
            :delete-label="t('clients.drawer.delete')"
            @edit="openEdit(client.id)"
            @remove="openDelete(client.id)"
          />
          <button
            type="button"
            class="flex min-h-24 flex-col items-center justify-center gap-1 rounded-[var(--radius)] border border-dashed border-border p-5 text-text-2 transition-colors hover:border-primary-300 hover:text-text"
            data-testid="clients-add"
            @click="openCreate"
          >
            <PhPlus :size="20" weight="regular" />
            <span class="text-sm">{{ t("clients.add") }}</span>
          </button>
        </div>
      </template>

      <template #list>
        <ul
          class="divide-y divide-border rounded-[var(--radius)] border border-border bg-surface"
        >
          <li
            v-for="client in visibleClients"
            :key="client.id"
            class="flex items-center justify-between gap-3 px-4 py-3"
          >
            <div class="flex min-w-0 items-center gap-3">
              <span
                class="grid size-8 shrink-0 place-items-center rounded-full bg-primary-50 text-xs font-semibold text-primary-700"
                aria-hidden="true"
              >
                {{ client.name.slice(0, 2).toUpperCase() }}
              </span>
              <div class="min-w-0">
                <p class="truncate text-sm font-medium text-text">
                  {{ client.name }}
                </p>
                <p
                  v-if="client.email ?? client.phone"
                  class="truncate text-xs text-text-2"
                >
                  {{ client.email ?? client.phone }}
                </p>
              </div>
            </div>
            <div class="flex shrink-0 gap-1">
              <button
                type="button"
                class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-text"
                :aria-label="t('clients.drawer.editTitle')"
                @click="openEdit(client.id)"
              >
                <PhPencilSimple :size="15" weight="regular" />
              </button>
              <button
                type="button"
                class="rounded p-1 text-text-2 transition-colors hover:bg-surface-2 hover:text-error"
                :aria-label="t('clients.drawer.delete')"
                @click="openDelete(client.id)"
              >
                <PhTrash :size="15" weight="regular" />
              </button>
            </div>
          </li>
        </ul>
      </template>

      <template #empty>
        <p
          v-if="visibleClients.length === 0"
          class="rounded-[var(--radius)] border border-dashed border-border px-4 py-10 text-center text-sm text-text-2"
          data-testid="clients-empty"
        >
          {{ t("clients.empty") }}
        </p>
      </template>
    </BaseView>

    <ClientDrawer
      :open="drawerOpen"
      :initial="editingClient"
      :submitting="saving"
      :error="drawerError"
      :load-dependencies="dependencies"
      :start-in-delete-confirm="params.delete === '1'"
      @close="closeDrawer"
      @submit="submitClient"
      @remove="removeClient"
    />
  </section>
</template>
