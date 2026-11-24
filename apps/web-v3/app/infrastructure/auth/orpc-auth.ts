/**
 * Auth adapter: the only place that talks to the backend for auth.
 *
 * The UI never sees orpc: views talk to the composable, the composable talks
 * to this module, and this module talks to the vendor wrapper (PRD-v4 §11.4).
 * Transport failures are translated into a small closed set of codes so the
 * views can pick a message without knowing orpc (mirrors the error mapping of
 * apps/web-v2/src/infrastructure/api/errors.ts).
 */
import { ORPCError, callAuth } from "~/shared/vendor/orpc";
import type { SessionUser, Verdict } from "@crm/contract/auth";

export type AuthErrorCode =
  | "validation"
  | "unauthenticated"
  | "rate_limited"
  | "unknown";

export class AuthCallError extends Error {
  readonly code: AuthErrorCode;

  constructor(code: AuthErrorCode, message: string) {
    super(message);
    this.name = "AuthCallError";
    this.code = code;
  }
}

const ORPC_CODE_TO_AUTH_ERROR: Record<string, AuthErrorCode> = {
  BAD_REQUEST: "validation",
  CONFLICT: "validation",
  PAYLOAD_TOO_LARGE: "validation",
  UNAUTHORIZED: "unauthenticated",
  FORBIDDEN: "unauthenticated",
  RATE_LIMITED: "rate_limited",
};

const STATUS_TO_AUTH_ERROR: Record<number, AuthErrorCode> = {
  400: "validation",
  401: "unauthenticated",
  403: "unauthenticated",
  409: "validation",
  413: "validation",
  422: "validation",
  429: "rate_limited",
};

function toAuthCallError(error: unknown): AuthCallError {
  if (error instanceof ORPCError) {
    const code =
      ORPC_CODE_TO_AUTH_ERROR[error.code] ??
      STATUS_TO_AUTH_ERROR[error.status] ??
      "unknown";
    return new AuthCallError(code, error.message);
  }
  if (error instanceof Error) {
    return new AuthCallError("unknown", error.message);
  }
  return new AuthCallError("unknown", "Unexpected auth error");
}

/** Asks the API for a one-time code. The code travels by email, not in the response. */
export async function requestOtp(email: string): Promise<void> {
  try {
    await callAuth("requestOtp", { email });
  } catch (error) {
    throw toAuthCallError(error);
  }
}

/**
 * Checks the code. A wrong or expired code is a successful call with a
 * negative verdict, not a transport failure.
 */
export async function verifyOtp(input: {
  email: string;
  code: string;
}): Promise<Verdict> {
  let response: { verdict?: unknown };
  try {
    response = await callAuth("verifyOtp", {
      email: input.email,
      code: input.code,
    });
  } catch (error) {
    throw toAuthCallError(error);
  }

  const verdict = response.verdict;
  if (verdict === "valid" || verdict === "invalid" || verdict === "expired") {
    return verdict;
  }
  throw new AuthCallError("unknown", "The API returned an unknown OTP verdict");
}

/**
 * Reads the session carried by the httpOnly cookie. A visitor without a
 * session is the normal case, not an error, so it resolves to null.
 */
export async function fetchSession(): Promise<SessionUser | null> {
  let response: { user?: SessionUser };
  try {
    response = await callAuth("session", undefined);
  } catch (error) {
    const authError = toAuthCallError(error);
    if (authError.code === "unauthenticated") return null;
    throw authError;
  }

  return response.user ?? null;
}

/**
 * Saves the editable profile: name and studio.
 *
 * The email is NOT editable: it is the identity of the account (the OTP
 * and the UNIQUE constraint live on it).
 */
export async function updateProfile(input: {
  name: string;
  studio: string | null;
}): Promise<{
  id: string;
  email: string;
  name: string;
  studio: string | null;
  userTheme: "light" | "dark" | "system";
}> {
  try {
    return await callAuth("updateProfile", {
      name: input.name,
      studio: input.studio,
    });
  } catch (error) {
    throw toAuthCallError(error);
  }
}

/**
 * Saves the theme preference in the user's account (PRD-v2 §8.7).
 *
 * The account is the source of truth for the theme: the local copy in the
 * theme store is only a cache for the moment before the session is known.
 */
export async function updateUserTheme(
  setting: "light" | "dark" | "system",
): Promise<SessionUser> {
  try {
    const response = await callAuth("updateTheme", { setting });
    return response.user;
  } catch (error) {
    throw toAuthCallError(error);
  }
}

/**
 * Ends the session.
 *
 * The API invalidates the session server-side (soft delete) and clears the
 * cookie, so the token cannot be reused afterwards (PRD-v2 §8.1).
 */
export async function logout(): Promise<void> {
  try {
    await callAuth("logout", undefined);
  } catch (error) {
    throw toAuthCallError(error);
  }
}
