import { oc } from "@orpc/contract";
import { z } from "zod";

export const emailSchema = z.string().email();
export const otpCodeSchema = z.string().length(6).regex(/^\d{6}$/);

export const requestOtpInputSchema = z.object({ email: emailSchema });
export const requestOtpOutputSchema = z.object({ ok: z.literal(true) });

export const verifyOtpInputSchema = z.object({
  email: emailSchema,
  code: otpCodeSchema,
});
export const verifyOtpOutputSchema = z.object({
  verdict: z.enum(["valid", "invalid", "expired"]),
});

export const sessionOutputSchema = z.object({
  user: z.object({
    id: z.string().uuid(),
    email: z.string().email(),
    name: z.string(),
  }),
});

export const logoutOutputSchema = z.object({ ok: z.literal(true) });

export const authContract = oc.prefix("/auth").router({
  requestOtp: oc
    .route({ method: "POST", path: "/request-otp" })
    .input(requestOtpInputSchema)
    .output(requestOtpOutputSchema),
  verifyOtp: oc
    .route({ method: "POST", path: "/verify-otp" })
    .input(verifyOtpInputSchema)
    .output(verifyOtpOutputSchema),
  logout: oc
    .route({ method: "POST", path: "/logout" })
    .output(logoutOutputSchema),
  session: oc
    .route({ method: "GET", path: "/session" })
    .output(sessionOutputSchema),
});
