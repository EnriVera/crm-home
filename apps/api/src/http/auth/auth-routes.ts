import { readValidatedBody } from "h3";
import type { H3Event } from "h3";
import {
  requestOtpInputSchema,
  verifyOtpInputSchema,
} from "@crm/types";
import type { GetSession } from "../../application/auth/get-session";
import type { Logout } from "../../application/auth/logout";
import type { RequestOtp } from "../../application/auth/request-otp";
import type { VerifyOtp } from "../../application/auth/verify-otp";
import { RateLimitedError } from "../../application/auth/errors";
import {
  deleteSessionCookie,
  getSessionToken,
  setSessionCookie,
} from "./cookie";

export interface AuthRouteDependencies {
  requestOtp: RequestOtp;
  verifyOtp: VerifyOtp;
  logout: Logout;
  getSession: GetSession;
}

export function createRequestOtpHandler(deps: AuthRouteDependencies) {
  return async (event: H3Event) => {
    const body = await readValidatedBody(event, requestOtpInputSchema.parse);
    try {
      const result = await deps.requestOtp.execute(body);
      return result;
    } catch (error) {
      if (error instanceof RateLimitedError) {
        return new Response(
          JSON.stringify({ code: error.code, message: error.message }),
          { status: 429, headers: { "Content-Type": "application/json" } },
        );
      }
      throw error;
    }
  };
}

export function createVerifyOtpHandler(deps: AuthRouteDependencies) {
  return async (event: H3Event) => {
    const body = await readValidatedBody(event, verifyOtpInputSchema.parse);
    const result = await deps.verifyOtp.execute(body);

    if (result.verdict === "valid" && result.sessionToken) {
      setSessionCookie(event, result.sessionToken);
    }

    return { verdict: result.verdict };
  };
}

export function createSessionHandler(deps: AuthRouteDependencies) {
  return async (event: H3Event) => {
    const token = getSessionToken(event);
    if (!token) {
      return new Response(null, { status: 401 });
    }

    const result = await deps.getSession.execute({ token });
    if (!result) {
      return new Response(null, { status: 401 });
    }

    if (result.renewed) {
      setSessionCookie(event, token);
    }

    return { user: result.user };
  };
}

export function createLogoutHandler(deps: AuthRouteDependencies) {
  return async (event: H3Event) => {
    const token = getSessionToken(event);
    if (token) {
      await deps.logout.execute({ token });
    }
    deleteSessionCookie(event);
    return { ok: true };
  };
}
