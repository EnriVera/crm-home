import { oc } from "@orpc/contract";
import { z } from "zod";

export const emailSchema = z.string().email();
export const otpCodeSchema = z
  .string()
  .length(6)
  .regex(/^\d{6}$/);

export const requestOtpInputSchema = z.object({ email: emailSchema });
export const requestOtpOutputSchema = z.object({ ok: z.literal(true) });

export const verifyOtpInputSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});
export const verdictSchema = z.enum(["valid", "invalid", "expired"]);
export type Verdict = z.infer<typeof verdictSchema>;

export const verifyOtpOutputSchema = z.object({
  verdict: verdictSchema,
});

export const sessionOutputSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export const logoutOutputSchema = z.object({ ok: z.literal(true) });

export const authContract = oc.router({
  requestOtp: oc
    .route({ method: "POST", path: "/auth/requestOtp" })
    .input(requestOtpInputSchema)
    .output(requestOtpOutputSchema),
  verifyOtp: oc
    .route({ method: "POST", path: "/auth/verifyOtp" })
    .input(verifyOtpInputSchema)
    .output(verifyOtpOutputSchema),
  logout: oc
    .route({ method: "POST", path: "/auth/logout" })
    .output(logoutOutputSchema),
  session: oc
    .route({ method: "GET", path: "/auth/session" })
    .output(sessionOutputSchema),
});
