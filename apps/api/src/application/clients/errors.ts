/**
 * Base común para errores del módulo clients. El handler HTTP mapea
 * `code` → status HTTP; nunca se filtra la instancia al cliente — solo el
 * `code` y un mensaje genérico cuando aplique.
 *
 * Re-usa `TaskNotFound` para errores compartidos? No — son módulos con
 * superficies distintas. Los codes son específicos del dominio.
 */
export abstract class ClientDomainError extends Error {
 abstract readonly code: string;
}

export class ClientNotFound extends ClientDomainError {
 readonly code = "CLIENT_NOT_FOUND";

 constructor(message = "Client not found") {
  super(message);
  this.name = "ClientNotFound";
 }
}

export class InvalidClientInput extends ClientDomainError {
 readonly code = "INVALID_CLIENT_INPUT";

 constructor(message = "Invalid client input") {
  super(message);
  this.name = "InvalidClientInput";
 }
}
