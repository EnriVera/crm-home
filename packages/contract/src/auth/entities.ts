/**
 * Auth bounded context — entity schemas.
 *
 * The User, Session, and OtpRequest/VerifyOtp result types the API
 * and frontends exchange. `OtpDigits` preserves leading zeros (PRD-v2
 * §8.1 acceptance); `Session` and `UserProfile` are what the
 * `auth.session` endpoint returns. The identifier types (SessionId,
 * UserId) live in `../shared/identifiers` and are composed into the
 * branded strings here.
 */
import { z } from "zod";
import { SessionId, UserId } from "../shared/identifiers";

/* ------------------------------------------------------------------ */
/*  OtpDigits — preserves leading zeros, length 6                      */
/* ------------------------------------------------------------------ */

export const OtpDigits = z
 .string()
 .regex(/^\d{6}$/, "OTP must be 6 digits")
 .refine((s) => s.length === 6, "OTP must be 6 digits");
export type OtpDigits = z.infer<typeof OtpDigits>;

/* ------------------------------------------------------------------ */
/*  Session — what the API sets as the httpOnly cookie                   */
/* ------------------------------------------------------------------ */

export const Session = z.object({
 id: SessionId,
 userId: UserId,
 expiresAt: z.string().datetime(),
 createdAt: z.string().datetime(),
});
export type Session = z.infer<typeof Session>;

/* ------------------------------------------------------------------ */
/*  UserTheme — light/dark/system                                       */
/* ------------------------------------------------------------------ */

export const UserTheme = z.enum(["light", "dark", "system"]);
export type UserTheme = z.infer<typeof UserTheme>;

/* ------------------------------------------------------------------ */
/*  UserProfile — the public projection of the user                      */
/* ------------------------------------------------------------------ */

export const UserProfile = z.object({
 id: UserId,
 name: z.string(),
 email: z.string().email(),
 theme: UserTheme,
 acceptedTermsAt: z.string().datetime().nullable(),
 termsVersion: z.string().nullable(),
});
export type UserProfile = z.infer<typeof UserProfile>;
