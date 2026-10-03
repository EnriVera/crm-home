/**
 * Validation helpers — pure zod + branding utilities.
 * No third-party imports; lives in shared/vendor so consumers can
 * import from a stable path.
 */
import { z } from "zod";

/** Email value object — used by the auth use cases. */
export const emailSchema = z.string().email().toLowerCase().trim();
export type Email = z.infer<typeof emailSchema>;
