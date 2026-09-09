import { fromWebHandler, H3 } from "h3";
import { GetHealth } from "../application/health/get-health";
import { GetSession } from "../application/auth/get-session";
import { Logout } from "../application/auth/logout";
import { RequestOtp } from "../application/auth/request-otp";
import { VerifyOtp } from "../application/auth/verify-otp";
import type { OtpGenerator } from "../domain/ports/otp-generator";
import type { Telemetry } from "../domain/ports/telemetry";
import { StaticHealthRepository } from "../infrastructure/health/static-health-repository";
import {
  createTelemetry,
  type TelemetryEnv,
} from "../infrastructure/otel/create-telemetry";
import { createDatabase } from "../infrastructure/kysely/database";
import { KyselyEmailSendingRepository } from "../infrastructure/kysely/email-sending-repository";
import { KyselyLoginRepository } from "../infrastructure/kysely/login-repository";
import { KyselySessionRepository } from "../infrastructure/kysely/session-repository";
import { KyselyTransactionManager } from "../infrastructure/kysely/transaction-manager";
import { KyselyUserRepository } from "../infrastructure/kysely/user-repository";
import { KyselyUserSeedService } from "../infrastructure/kysely/user-seed-service";
import { createOtpGenerator } from "../infrastructure/crypto/otp-generator";
import { createSecureComparator } from "../infrastructure/crypto/secure-comparator";
import { createTokenHasher } from "../infrastructure/crypto/token-hasher";
import { createIdGenerator } from "../infrastructure/crypto/id-generator";
import { createSystemClock } from "../infrastructure/time/system-clock";
import { createHealthRoute } from "./routes";
import { createRpcHandler } from "./router";

export interface CompositionRoot {
  telemetry: Telemetry;
  getHealth: GetHealth;
  app: H3;
}

export interface AppEnv extends TelemetryEnv {
  DATABASE_URL?: string;
  TEST_DATABASE_URL?: string;
  SESSION_COOKIE_SECURE?: string;
}

export interface CompositionRootOverrides {
  otpGenerator?: OtpGenerator;
}

// Composition root (D4): wiring único. Construye telemetría, repositorios,
// casos de uso y monta GET /health junto con /rpc/** (health + auth).
export function createCompositionRoot(
  env: AppEnv = process.env as AppEnv,
  overrides: CompositionRootOverrides = {},
): CompositionRoot {
  const telemetry = createTelemetry(env);
  const healthRepository = new StaticHealthRepository();
  const getHealth = new GetHealth(healthRepository, telemetry);

  const app = new H3();
  app.get("/health", createHealthRoute(getHealth));

  const databaseUrl = env.DATABASE_URL ?? env.TEST_DATABASE_URL ?? "";
  if (databaseUrl) {
    const db = createDatabase(databaseUrl);
    const clock = createSystemClock();
    const idGenerator = createIdGenerator();
    const otpGenerator = overrides.otpGenerator ?? createOtpGenerator();
    const tokenHasher = createTokenHasher();
    const comparator = createSecureComparator();
    const transactionManager = new KyselyTransactionManager(db);

    const userRepository = new KyselyUserRepository(db);
    const loginRepository = new KyselyLoginRepository(db);
    const sessionRepository = new KyselySessionRepository(db);
    const emailSendingRepository = new KyselyEmailSendingRepository(db);
    const userSeedService = new KyselyUserSeedService({ db, idGenerator });

    const requestOtp = new RequestOtp({
      clock,
      idGenerator,
      otpGenerator,
      loginRepository,
      emailSendingRepository,
    });
    const verifyOtp = new VerifyOtp({
      clock,
      idGenerator,
      loginRepository,
      sessionRepository,
      userRepository,
      userSeedService,
      comparator,
      tokenHasher,
      transactionManager,
    });
    const getSession = new GetSession({
      clock,
      sessionRepository,
      userRepository,
      tokenHasher,
    });
    const logout = new Logout({ clock, sessionRepository, tokenHasher });

    const rpcHandler = createRpcHandler({
      getHealth,
      requestOtp,
      verifyOtp,
      getSession,
      logout,
    });
    app.all("/rpc/**", (event) => rpcHandler(event));
  } else {
    // Sin base de datos solo /health está disponible; /rpc responde 503.
    app.all("/rpc/**", () =>
      new Response(
        JSON.stringify({ error: "Database not configured" }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      ),
    );
  }

  return { telemetry, getHealth, app };
}

// Handler fetch de la app completa (usado por el smoke test y por nitro).
export function createAppFetch(
  env: AppEnv = process.env as AppEnv,
  overrides: CompositionRootOverrides = {},
): (request: Request) => Promise<Response> {
  const { app } = createCompositionRoot(env, overrides);
  return (request: Request) =>
    Promise.resolve(app.fetch(request as never)) as Promise<Response>;
}

// Entry para nitro (nitro.config.ts apunta aquí con route "/**").
export default fromWebHandler(createAppFetch());
