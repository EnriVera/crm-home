import { fromWebHandler, H3 } from "h3";
import { GetHealth } from "../application/health/get-health";
import { GetSession } from "../application/auth/get-session";
import { Logout } from "../application/auth/logout";
import { RequestOtp } from "../application/auth/request-otp";
import { VerifyOtp } from "../application/auth/verify-otp";
import { CreateTask } from "../application/tasks/create-task";
import { CreateTaskState } from "../application/tasks/create-task-state";
import { DeleteTask } from "../application/tasks/delete-task";
import { DeleteTaskState } from "../application/tasks/delete-task-state";
import { GetTask } from "../application/tasks/get-task";
import { ListCategoriesByType } from "../application/tasks/list-categories-by-type";
import { ListClientsForSelector } from "../application/tasks/list-clients-for-selector";
import { ListTaskStates } from "../application/tasks/list-task-states";
import { ListTasks } from "../application/tasks/list-tasks";
import { ListTypesForForm } from "../application/tasks/list-types-for-form";
import { MoveTask } from "../application/tasks/move-task";
import { ReorderTaskStates } from "../application/tasks/reorder-task-states";
import { UpdateTask } from "../application/tasks/update-task";
import { UpdateTaskState } from "../application/tasks/update-task-state";
import type { OtpGenerator } from "../domain/ports/otp-generator";
import type { Telemetry } from "../domain/ports/telemetry";
import { StaticHealthRepository } from "../infrastructure/health/static-health-repository";
import {
  createTelemetry,
  type TelemetryEnv,
} from "../infrastructure/otel/create-telemetry";
import { createDatabase } from "../infrastructure/kysely/database";
import { KyselyCategoryLookupRepository } from "../infrastructure/kysely/category-lookup-repository";
import { KyselyClientLookupRepository } from "../infrastructure/kysely/client-lookup-repository";
import { KyselyEmailSendingRepository } from "../infrastructure/kysely/email-sending-repository";
import { KyselyLoginRepository } from "../infrastructure/kysely/login-repository";
import { KyselySessionRepository } from "../infrastructure/kysely/session-repository";
import { KyselyTaskRepository } from "../infrastructure/kysely/task-repository";
import { KyselyTaskStateRepository } from "../infrastructure/kysely/task-state-repository";
import { KyselyTransactionManager } from "../infrastructure/kysely/transaction-manager";
import { KyselyTypeLookupRepository } from "../infrastructure/kysely/type-lookup-repository";
import { KyselyUserRepository } from "../infrastructure/kysely/user-repository";
import { KyselyUserSeedService } from "../infrastructure/kysely/user-seed-service";
import { createOtpGenerator } from "../infrastructure/crypto/otp-generator";
import { createSecureComparator } from "../infrastructure/crypto/secure-comparator";
import { createTokenHasher } from "../infrastructure/crypto/token-hasher";
import { createIdGenerator } from "../infrastructure/crypto/id-generator";
import { createSystemClock } from "../infrastructure/time/system-clock";
import { OctaneEmailTemplateRenderer } from "../infrastructure/email/octane-email-template-renderer";
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
  SMTP_URL?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_USER?: string;
  SMTP_PASS?: string;
  SMTP_SECURE?: string;
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

    // Tasks module repos (PR-C).
    // KyselyAttachmentRepository NO se instancia acá: stub de Fase 2.
    // El gate `__attachment-not-in-composition.test.ts` rompe si lo cableamos.
    const taskRepository = new KyselyTaskRepository(db);
    const taskStateRepository = new KyselyTaskStateRepository(db);
    const clientLookupRepository = new KyselyClientLookupRepository(db);
    const typeLookupRepository = new KyselyTypeLookupRepository(db);
    const categoryLookupRepository = new KyselyCategoryLookupRepository(db);

    const emailTemplateRenderer = new OctaneEmailTemplateRenderer();

    const requestOtp = new RequestOtp({
      clock,
      idGenerator,
      otpGenerator,
      loginRepository,
      emailSendingRepository,
      emailTemplateRenderer,
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

    // Tasks use cases (PR-C)
    const listTasks = new ListTasks({ taskRepository });
    const getTask = new GetTask({ taskRepository });
    const createTask = new CreateTask({
      taskRepository,
      taskStateRepository,
      idGenerator,
      clock,
    });
    const updateTask = new UpdateTask({ taskRepository });
    const moveTask = new MoveTask({
      taskRepository,
      taskStateRepository,
      transactionManager,
      telemetry,
    });
    const deleteTask = new DeleteTask({ taskRepository });
    const listTaskStates = new ListTaskStates({ taskStateRepository });
    const createTaskState = new CreateTaskState({
      taskStateRepository,
      idGenerator,
      clock,
    });
    const updateTaskState = new UpdateTaskState({ taskStateRepository });
    const deleteTaskState = new DeleteTaskState({ taskStateRepository });
    const reorderTaskStates = new ReorderTaskStates({
      taskStateRepository,
      transactionManager,
    });
    const listClientsForSelector = new ListClientsForSelector({
      clientLookupRepository,
    });
    const listTypesForForm = new ListTypesForForm({
      typeLookupRepository,
    });
    const listCategoriesByType = new ListCategoriesByType({
      categoryLookupRepository,
    });

    const rpcHandler = createRpcHandler({
      getHealth,
      requestOtp,
      verifyOtp,
      getSession,
      logout,
      listTasks,
      getTask,
      createTask,
      updateTask,
      moveTask,
      deleteTask,
      listTaskStates,
      createTaskState,
      updateTaskState,
      deleteTaskState,
      reorderTaskStates,
      listClientsForSelector,
      listTypesForForm,
      listCategoriesByType,
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
