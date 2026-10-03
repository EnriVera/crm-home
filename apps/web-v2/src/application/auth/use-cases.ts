import type { AuthRepository, AuthSessionBundle } from "@/domain/auth/ports";
import { parseOtp, type OtpRequest } from "@/domain/auth/entities";
import { emailSchema } from "@/shared/vendor/validation";
import type { Result } from "@/domain/shared/result";
import { domainError, type DomainError } from "@/domain/shared/errors";
import { err } from "@/domain/shared/result";
import type { Session } from "@crm/contract/auth";

/**
 * Use cases for the auth bounded context. Pure functions over the
 * AuthRepository port — no Vue, no orpc, no TanStack.
 *
 * `getSession` returns a bundle of session + profile (one round-trip
 * to `auth.session` on the backend). The standalone `getProfile` use
 * case was removed when the port signature changed: the backend
 * never exposed `auth.me`, and the day-of-judgment fix folded
 * profile hydration into the session call.
 */
export const makeRequestOtp =
  (repo: AuthRepository) =>
  async (rawEmail: string): Promise<Result<OtpRequest, DomainError>> => {
    const parsedEmail = emailSchema.safeParse(rawEmail);
    if (!parsedEmail.success) {
      return err(domainError("validation", "Enter a valid email address."));
    }
    return repo.requestOtp(parsedEmail.data);
  };

export const makeVerifyOtp =
  (repo: AuthRepository) =>
  async (params: {
    email: string;
    code: string;
  }): Promise<Result<Session, DomainError>> => {
    const parsedEmail = emailSchema.safeParse(params.email);
    if (!parsedEmail.success) {
      return err(domainError("validation", "Enter a valid email address."));
    }
    const parsedCode = parseOtp(params.code);
    if (!parsedCode.ok) return parsedCode;
    return repo.verifyOtp({ email: parsedEmail.data, code: parsedCode.value });
  };

export const makeGetSession =
  (repo: AuthRepository) =>
  (): Promise<Result<AuthSessionBundle | null, DomainError>> =>
    repo.getSession();

export const makeSignOut =
  (repo: AuthRepository) => (): Promise<Result<null, DomainError>> =>
    repo.signOut();
