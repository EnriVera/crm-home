import { OtpDigits, Session, UserProfile } from "@crm/contract/auth";
import { domainError, type DomainError } from "../shared/errors";
import { err, ok, type Result } from "../shared/result";

/**
 * OtpRequest — the request that initiated an OTP send. The OTP itself
 * never crosses the wire from the server; the client only sees that a
 * request was created.
 */
export interface OtpRequest {
 readonly email: string;
 readonly expiresAt: Date;
 readonly alreadyExists: boolean; // for UX: differentiate first-time vs returning user
}

export const newOtpRequest = (params: {
 email: string;
 expiresAt: Date;
 alreadyExists: boolean;
}): OtpRequest => Object.freeze({ ...params });

/** Parsed OTP value object that preserves leading zeros. */
export const parseOtp = (raw: string): Result<OtpDigits, DomainError> => {
 const parsed = OtpDigits.safeParse(raw);
 if (parsed.success) return ok(parsed.data);
 return err(domainError("validation", "OTP must be 6 digits", { raw }));
};

export type { Session, UserProfile };
