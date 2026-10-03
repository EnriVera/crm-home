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
});
export type SessionUser = z.infer<typeof sessionUserSchema>;

export const sessionOutputSchema = z.object({
 user: sessionUserSchema,
});
export type SessionOutput = z.infer<typeof sessionOutputSchema>;

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
});

export type AuthContract = typeof authContract;
