/**
 * orpc client: the only place in web-v3 that imports @orpc/client.
 *
 * PRD-v4 §10.3 makes app/shared/vendor/ the single door to third-party
 * libraries, so the transport lives here and every consumer goes through the
 * narrow `callAuth` surface instead of the raw client.
 */
import { createORPCClient, type NestedClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { SessionUser } from "@crm/contract/auth";

/** The auth procedures this app talks to (PRD-v4 §11.1). */
export type AuthProcedure = "requestOtp" | "verifyOtp" | "session" | "logout";

export interface AuthProcedureMap {
  requestOtp: {
    input: { email: string };
    output: { ok: true };
  };
  verifyOtp: {
    input: { email: string; code: string };
    output: { verdict: "valid" | "invalid" | "expired" };
  };
  session: {
    input: undefined;
    output: { user: SessionUser };
  };
  logout: {
    input: undefined;
    output: { ok: true };
  };
}

const envApiUrl = import.meta.env.VITE_API_URL as string | undefined;
const baseURL = (envApiUrl ?? "http://localhost:3000").replace(/\/$/, "");

const link = new RPCLink({
  url: `${baseURL}/rpc`,
  headers: () => ({
    "Content-Type": "application/json",
  }),
  // The session lives in an httpOnly cookie the API sets on verifyOtp, and the
  // browser only sends it back when the request opts into credentials
  // (PRD-v2 §6.5). Without this every authenticated call reads as anonymous.
  fetch: (input, init) =>
    fetch(input, {
      ...init,
      credentials: "include",
    }),
});

const client = createORPCClient(link) as unknown as NestedClient<
  Record<string, unknown>
>;

/**
 * Calls one auth procedure. The backend exposes the auth context under the
 * `auth` segment of the orpc router, so the walk is fixed to that prefix
 * instead of accepting an arbitrary path.
 */
export async function callAuth<P extends AuthProcedure>(
  procedure: P,
  input: AuthProcedureMap[P]["input"],
): Promise<AuthProcedureMap[P]["output"]> {
  const fn = (["auth", procedure] as const).reduce<unknown>(
    (acc, segment) => (acc as Record<string, unknown>)[segment],
    client as unknown as Record<string, unknown>,
  );

  if (typeof fn !== "function") {
    throw new Error(
      `orpc procedure auth.${procedure} is not registered in the client`,
    );
  }

  return (fn as (value: unknown) => Promise<AuthProcedureMap[P]["output"]>)(
    input,
  );
}
