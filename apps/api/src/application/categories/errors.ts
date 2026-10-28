/**
 * Errores de dominio del módulo /config → categorías.
 *
 * Misma forma que `types/errors.ts`: clases con nombre + mensaje +
 * discriminated `code` para mapear a HTTP status en
 * `categories-routes.ts`.
 */

export class InvalidCategoryInput extends Error {
  readonly code = "INVALID_CATEGORY_INPUT" as const;

  constructor(message: string) {
    super(message);
    this.name = "InvalidCategoryInput";
  }
}

export class CategoryNotFound extends Error {
  readonly code = "CATEGORY_NOT_FOUND" as const;

  constructor(message = "Category not found") {
    super(message);
    this.name = "CategoryNotFound";
  }
}
