import type { ClientRow } from "../types";

/**
 * Puerto CRUD de la entidad `client`.
 *
 * Distinto de `ClientLookupRepository` (que es read-only y soporta búsqueda
 * por prefijo de nombre para los autocompletes del form de tasks). Acá
 * tenemos las 5 operaciones del CRUD de /clients: list paginado/filtrado
 * por user, get por id, insert, update, soft-delete (set
 * `clie_deleted_at`).
 *
 * El repo SIEMPRE filtra por `userId` (multi-tenant isolation): los métodos
 * que reciben `clientId` filtran por user en la query, así que una fila
 * de otro usuario no existe para el repo. El port queda libre de reglas
 * de negocio.
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

  /**
   * Actualiza un client. Solo se actualizan los campos provistos.
   *
   * El contrato de los campos opcionales: `undefined` = "no tocar el
   * campo" y `null` = "vaciar el campo". Los dos estados son distintos y
   * se distinguen con `!== undefined`, así que un `null` explícito borra
   * el email o el teléfono del cliente.
   */
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
