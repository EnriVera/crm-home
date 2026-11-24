/**
 * Prefijo de los emails que crea el smoke e2e.
 *
 * Vive en un módulo aparte porque lo usan dos Worlds: el que genera los
 * emails (`helpers.ts`) y el que limpia lo que dejan (`cleanup.ts`). Si el
 * prefijo viviera en uno solo, un cambio sin el otro dejaría basura en la
 * base sin que nadie lo note.
 */
export const E2E_EMAIL_PREFIX = "e2e";
