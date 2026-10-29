import { computed, ref } from "vue";
import { filterClients, type Client } from "~/domain/client/entities";
import {
  createClient,
  listClientDependencies,
  listClients,
  removeClient,
  updateClient,
} from "~/infrastructure/client/orpc-client";

/**
 * useClients: the /clients screen state (PRD-v4 §8.6).
 *
 * The list is loaded once and filtered locally: the API caps the page at
 * 50 and the screen is small, so the search box stays instant.
 */
export function useClients() {
  const clients = ref<Client[]>([]);
  const search = ref("");
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  const visibleClients = computed(() =>
    filterClients(clients.value, search.value),
  );

  async function load() {
    isLoading.value = true;
    error.value = null;
    try {
      clients.value = await listClients();
    } catch {
      error.value = "clients.loadError";
    } finally {
      isLoading.value = false;
    }
  }

  async function add(input: {
    name: string;
    email: string | null;
    phone: string | null;
  }): Promise<Client> {
    const created = await createClient(input);
    clients.value = [...clients.value, created];
    return created;
  }

  async function edit(input: {
    id: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<Client> {
    const updated = await updateClient(input);
    clients.value = clients.value.map((client) =>
      client.id === updated.id ? updated : client,
    );
    return updated;
  }

  async function deleteClient(id: string): Promise<void> {
    await removeClient(id);
    clients.value = clients.value.filter((client) => client.id !== id);
  }

  /**
   * What the client has attached, so the delete can confirm with the
   * dependencies listed (PRD-v2 §8.5).
   */
  async function dependencies(id: string): Promise<{
    dependencies: { taskId: string; taskTitle: string }[];
    total: number;
  }> {
    return listClientDependencies(id);
  }

  return {
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
  };
}
