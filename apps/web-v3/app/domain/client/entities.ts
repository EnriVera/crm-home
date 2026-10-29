/**
 * Client read/write model — pure TypeScript (PRD-v4 §11.4).
 *
 * The wire format is snake_case (`client_*`); the domain speaks
 * camelCase. The mapping lives in the infrastructure adapter.
 */

/** A client (PRD-v2 §8.5). */
export interface Client {
  id: string;
  name: string;
  email: string | null;
  /** One field, free-form: "+54 9 11 0000-1111" round-trips exactly. */
  phone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * The initials of a client, for the avatar circle.
 *
 * The catalogue shows a tinted circle with the initials; there is no
 * avatar file in the MVP (the attachment is Fase 2), so the initials
 * are derived from the name.
 */
export function clientInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "");
  return letters.join("") || "?";
}

/** The clients that match a search term (name, email or phone). */
export function filterClients(clients: Client[], search: string): Client[] {
  const needle = search.trim().toLowerCase();
  if (!needle) return clients;
  return clients.filter(
    (client) =>
      client.name.toLowerCase().includes(needle) ||
      (client.email ?? "").toLowerCase().includes(needle) ||
      (client.phone ?? "").toLowerCase().includes(needle),
  );
}

/**
 * What a client has attached (PRD-v2 §8.5): the delete confirmation
 * lists these before removing the client.
 */
export interface ClientDependencies {
  dependencies: { taskId: string; taskTitle: string }[];
  total: number;
}
