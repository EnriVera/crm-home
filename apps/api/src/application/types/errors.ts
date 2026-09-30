/**
 * Errores de dominio del módulo /config → tipos.
 *
 * Misma forma que `expenses/errors.ts` y `clients/errors.ts`:
 * clases con nombre + mensaje + discriminated `code` para mapear a HTTP
 * status en `types-routes.ts`.
 */

export class InvalidTypeInput extends Error {
 readonly code = "INVALID_TYPE_INPUT" as const;

 constructor(message: string) {
  super(message);
  this.name = "InvalidTypeInput";
 }
}

export class TypeNotFound extends Error {
 readonly code = "TYPE_NOT_FOUND" as const;

 constructor(message = "Type not found") {
  super(message);
  this.name = "TypeNotFound";
 }
}
