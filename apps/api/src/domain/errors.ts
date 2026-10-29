/**
 * Errores de dominio que no son de un módulo en particular.
 *
 * `Unauthorized` lo usan el caso de uso que reordena estados (una operación
 * que cambia el tablero) y la capa HTTP cuando el request no trae
 * identidad. Vive en `domain/` porque los dos lados lo necesitan y el
 * dominio no puede importar de `application/`.
 */
export class Unauthorized extends Error {
  readonly code = "UNAUTHORIZED";

  constructor(message = "Unauthorized") {
    super(message);
    this.name = "Unauthorized";
  }
}
