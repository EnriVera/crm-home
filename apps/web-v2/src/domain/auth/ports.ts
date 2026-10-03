import type { Result } from "../shared/result";
import type { DomainError } from "../shared/errors";
import type { OtpRequest } from "./entities";
import type { Session, UserProfile } from "@crm/contract/auth";

/**
 * AuthRepository — the port that the application layer talks to.
 * The infrastructure layer implements it with the orpc client.
 *
 * After the day-of-judgment fix, the `getSession` call returns both
 * the session and the profile in one round-trip. The backend
 * (`apps/api/src/http/auth/auth-routes.ts:76`) responds with
 * `{ user: { id, email, name, userTheme } }` for `auth.session`,
 * and the adapter derives the synthetic `Session` and a proper
 * `UserProfile` from that single call. The standalone `getProfile`
 * procedure (`auth.me`) does not exist on the backend, so the
 * port no longer exposes it.
 */
export interface AuthSessionBundle {
 session: Session;
 profile: UserProfile;
}

export interface AuthRepository {
 requestOtp(email: string): Promise<Result<OtpRequest, DomainError>>;
 verifyOtp(params: {
  email: string;
  code: string;
 }): Promise<Result<Session, DomainError>>;
 getSession(): Promise<Result<AuthSessionBundle | null, DomainError>>;
 signOut(): Promise<Result<null, DomainError>>;
}
