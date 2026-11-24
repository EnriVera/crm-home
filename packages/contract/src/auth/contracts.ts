/**
 * Auth bounded context — request/response zod schemas.
 *
 * Day-of-judgment fix A-001: these schemas were previously only in
 * `@crm/types` (apps/api only). They now live in `@crm/contract` so
 * the API and the frontends share one source of truth. The other 7
 * bounded contexts (clients, config, expenses, incomes, schedules,
 * tasks, transfers, types) follow this same pattern in subsequent
 * turns.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/*  Value objects (shared with entities.ts)                            */
/* ------------------------------------------------------------------ */

export const emailSchema = z.string().email();

export const otpCodeSchema = z
  .string()
  .length(6)
  .regex(/^\d{6}$/);

export const themeSettingSchema = z.enum(["light", "dark", "system"]);
export type ThemeSetting = z.infer<typeof themeSettingSchema>;

export const verdictSchema = z.enum(["valid", "invalid", "expired"]);
export type Verdict = z.infer<typeof verdictSchema>;

/* ------------------------------------------------------------------ */
/*  Request schemas (per procedure)                                    */
/* ------------------------------------------------------------------ */

export const requestOtpInputSchema = z.object({ email: emailSchema });
export type RequestOtpInput = z.infer<typeof requestOtpInputSchema>;

export const verifyOtpInputSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});
export type VerifyOtpInput = z.infer<typeof verifyOtpInputSchema>;

export const updateThemeInputSchema = z.object({
  setting: themeSettingSchema,
});
export type UpdateThemeInput = z.infer<typeof updateThemeInputSchema>;

/**
 * Perfil editable del usuario. `email` NO se edita: la identidad del
 * usuario es el email (constraint UNIQUE en la DB).
 */
export const updateProfileInputSchema = z.object({
  name: z.string().trim().min(1).max(120),
  studio: z.string().trim().max(120).nullable().default(null),
});
export type UpdateProfileInput = z.infer<typeof updateProfileInputSchema>;

/* ------------------------------------------------------------------ */
/*  Response schemas (per procedure)                                   */
/* ------------------------------------------------------------------ */

export const requestOtpOutputSchema = z.object({
  ok: z.literal(true),
  // Optional: backend may return these once the contract grows
  expiresAt: z.string().datetime().optional(),
  alreadyExists: z.boolean().optional(),
});
export type RequestOtpOutput = z.infer<typeof requestOtpOutputSchema>;

export const verifyOtpOutputSchema = z.object({
  verdict: verdictSchema,
  // The session is delivered as an httpOnly cookie; the token never
  // appears in the response body. The contract keeps the slot so
  // future versions can opt into a bearer flow.
  sessionToken: z.string().optional(),
});
export type VerifyOtpOutput = z.infer<typeof verifyOtpOutputSchema>;

export const logoutOutputSchema = z.object({ ok: z.literal(true) });
export type LogoutOutput = z.infer<typeof logoutOutputSchema>;

export const sessionUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  userTheme: themeSettingSchema,
  /**
   * Estudio del usuario (perfil editable, PRD-v4 línea 231). `null` = sin
   * definir. El `email` NO se edita: la identidad del usuario es el email.
   */
  studio: z.string().nullable().optional(),
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionOutputSchema = z.object({
  user: sessionUserSchema,
});
export type SessionOutput = z.infer<typeof sessionOutputSchema>;

/**
 * Salida de `auth.updateProfile`. Lleva `studio` —el perfil editable—
 * y NO envuelve al usuario en `user` a diferencia de `session`, para que
 * el frontend pueda differentiate sin ambiguidad.
 */
export const updateProfileOutputSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  name: z.string(),
  studio: z.string().nullable(),
  userTheme: themeSettingSchema,
});
export type UpdateProfileOutput = z.infer<typeof updateProfileOutputSchema>;

/* ------------------------------------------------------------------ */
/*  Flat router contract (mirrors @crm/types/contracts/auth.ts)         */
/* ------------------------------------------------------------------ */

import { oc } from "@orpc/contract";

export const authContract = oc.router({
  requestOtp: oc.input(requestOtpInputSchema).output(requestOtpOutputSchema),
  verifyOtp: oc.input(verifyOtpInputSchema).output(verifyOtpOutputSchema),
  logout: oc.output(logoutOutputSchema),
  session: oc.output(sessionOutputSchema),
  updateTheme: oc.input(updateThemeInputSchema).output(sessionOutputSchema),
  updateProfile: oc
    .input(updateProfileInputSchema)
    .output(updateProfileOutputSchema),
});

export type AuthContract = typeof authContract;
