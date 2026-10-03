import type { AuthRepository } from "@/domain/auth/ports";
import { newOtpRequest, type OtpRequest } from "@/domain/auth/entities";
import { err, ok, type Result } from "@/domain/shared/result";
import { type DomainError } from "@/domain/shared/errors";
import { mapOrpcError } from "../errors";
import { orpcClient } from "@/shared/vendor/orpc";

/**
 * OrpcAuthRepository — the only place that knows how the auth bounded
 * context talks to the backend. Maps orpc responses to domain entities
 * and orpc errors to DomainError.
 *
 * Procedure names are arrays of segments so they match the NestedClient
 * shape of @orpc/client v1.x. The backend router at apps/api/src/http
 * exposes these paths:
 *   - auth.requestOtp   (input: { email }, output: { ok: true })
 *   - auth.verifyOtp    (input: { email, code }, output: { verdict: 'valid' | 'invalid' | 'expired' })
 *   - auth.session      (input: undefined, output: { user: { id, email, name, userTheme } })
 *   - auth.logout       (input: undefined, output: { ok: true })
 *
 * The session is delivered as an httpOnly cookie by the backend, not in
 * the response body. We construct a synthetic Session in the
 * `verifyOtp` and `getSession` mappings as a placeholder; replace
 * with the real shape once the backend returns it.
 */
const AUTH_PROCEDURES = {
  requestOtp: ["auth", "requestOtp"] as const,
  verifyOtp: ["auth", "verifyOtp"] as const,
  getSession: ["auth", "session"] as const,
  signOut: ["auth", "logout"] as const,
} as const;

export const createOrpcAuthRepository = (): AuthRepository => {
  // SAFETY: orpcClient is typed as a NestedClient (recursive). The bridge
  // will replace this with `NestedClient<AppRouter>` once published; for
  // now the reduce() walk gives us the same runtime shape.
  const callPath = async (
    parts: readonly string[],
    input: unknown,
  ): Promise<unknown> => {
    const map = orpcClient as unknown as Record<string, unknown>;
    const fn = parts.reduce<unknown>(
      (acc, p) => (acc as Record<string, unknown>)[p],
      map,
    );
    if (typeof fn !== "function") {
      throw new Error(
        `orpc procedure ${parts.join(".")} not registered in client`,
      );
    }
    return (fn as (i: unknown) => Promise<unknown>)(input);
  };

  return {
    async requestOtp(email): Promise<Result<OtpRequest, DomainError>> {
      try {
        await callPath(AUTH_PROCEDURES.requestOtp, { email });
        return ok(
          newOtpRequest({
            email,
            // Backend does not yet return these; placeholder until
            // @crm/contract/auth/OtpRequest grows the fields.
            expiresAt: new Date(Date.now() + 10 * 60_000),
            alreadyExists: false,
          }),
        );
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async verifyOtp({ email, code }): Promise<Result<never, DomainError>> {
      try {
        const res = (await callPath(AUTH_PROCEDURES.verifyOtp, {
          email,
          code,
        })) as { verdict?: "valid" | "invalid" | "expired" };
        if (res.verdict === "valid") {
          // Placeholder Session: the backend sets the httpOnly cookie
          // and does not return the session in the body. Once the
          // contract is updated, return the real shape here.
          return ok({
            id: "cookie",
            userId: "cookie",
            expiresAt: new Date(
              Date.now() + 30 * 24 * 60 * 60_000,
            ).toISOString(),
            createdAt: new Date().toISOString(),
          } as never);
        }
        return err({
          code: "validation",
          message: res.verdict ?? "invalid",
        });
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async getSession() {
      try {
        const res = (await callPath(AUTH_PROCEDURES.getSession, undefined)) as
          | {
              user: {
                id: string;
                email: string;
                name: string;
                userTheme: "light" | "dark" | "system";
              };
            }
          | null
          | undefined;
        if (!res || !res.user) {
          return ok(null);
        }
        const session = {
          id: "cookie",
          userId: res.user.id,
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60_000).toISOString(),
          createdAt: new Date().toISOString(),
        };
        const profile = {
          id: res.user.id,
          name: res.user.name,
          email: res.user.email,
          theme: res.user.userTheme,
          acceptedTermsAt: null,
          termsVersion: null,
        };
        // The port signature is widened in ports.ts to return both
        // pieces from the same call; the auth store hydrates both.
        return ok({ session, profile } as never);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
    async signOut() {
      try {
        await callPath(AUTH_PROCEDURES.signOut, undefined);
        return ok(null);
      } catch (e) {
        return err(mapOrpcError(e));
      }
    },
  };
};
