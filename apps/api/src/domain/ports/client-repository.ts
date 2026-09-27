import type { ClientRow } from "../tasks/types";

/**
 * Puerto CRUD de la entidad `client`.
 *
 * Distinto de `ClientLookupRepository` (que es read-only y soporta búsqueda
 * por prefijo de nombre para los autocompletes del form de tasks). Acá
 * tenemos las 4 operaciones del CRUD de /clients: list paginado/filtrado
 * por user, get por id, insert, update, soft-delete (set
 * `client_deleted_at`).
 *
 * El repo SIEMPRE filtra por `userId` (multi-tenant isolation): los métodos
 * que reciben `clientId` además validan ownership en el use case, no acá,
 * para mantener el port libre de reglas de negocio.
 */
export interface ClientRepository {
  /** Lista los clients del user, opcionalmente filtrados por search. */
  list(params: {
    userId: string;
    search: string;
    limit: number;
  }): Promise<ClientRow[]>;

  /** Busca un client por id. Retorna `null` si no existe o está borrado. */
  findById(params: {
    userId: string;
    clientId: string;
  }): Promise<ClientRow | null>;

  /** Inserta un client nuevo. Retorna la fila creada (con id + timestamps). */
  insert(params: {
    userId: string;
    name: string;
    email: string | null;
    phone: string | null;
  }): Promise<ClientRow>;

  /** Actualiza un client. Solo se actualizan los campos provistos. */
  update(params: {
    userId: string;
    clientId: string;
    name?: string;
    email?: string | null;
    phone?: string | null;
  }): Promise<ClientRow>;

  /**
   * Soft-delete: setea `client_deleted_at = NOW()`. Idempotente: si el
   * client ya estaba borrado, retorna la fila sin error.
   */
  softDelete(params: { userId: string; clientId: string }): Promise<ClientRow>;
}
