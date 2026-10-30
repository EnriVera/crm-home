import { fromWebHandler, H3, defineEventHandler, handleCors } from "h3";
import { GetHealth } from "../application/health/get-health";
import { GetSession } from "../application/auth/get-session";
import { Logout } from "../application/auth/logout";
import { RequestOtp } from "../application/auth/request-otp";
import { UpdateTheme } from "../application/auth/update-theme";
import { VerifyOtp } from "../application/auth/verify-otp";
import { CreateTask } from "../application/tasks/create-task";
import { CreateTaskState } from "../application/tasks/create-task-state";
import { DeleteTask } from "../application/tasks/delete-task";
import { DeleteTaskState } from "../application/tasks/delete-task-state";
import { GetTask } from "../application/tasks/get-task";
import { ListCategoriesByType } from "../application/tasks/list-categories-by-type";
import { ListClientsForSelector } from "../application/tasks/list-clients-for-selector";
import { ListClients } from "../application/clients/list-clients";
import { GetClient } from "../application/clients/get-client";
import { CreateClient } from "../application/clients/create-client";
import { UpdateClient } from "../application/clients/update-client";
import { DeleteClient } from "../application/clients/delete-client";
import { ListClientDependencies } from "../application/clients/list-client-dependencies";
import { StartTimer } from "../application/timers/start-timer";
import { StopTimer } from "../application/timers/stop-timer";
import { HeartbeatTimer } from "../application/timers/heartbeat-timer";
import { GetCurrentTimer } from "../application/timers/get-current-timer";
import { ListTimerRuns } from "../application/timers/list-timer-runs";
import { ListIncomes } from "../application/incomes/list-incomes";
import { CreateIncome } from "../application/incomes/create-income";
import { UpdateIncome } from "../application/incomes/update-income";
import { RemoveIncome } from "../application/incomes/remove-income";
import { ListExpenses } from "../application/expenses/list-expenses";
import { CreateExpense } from "../application/expenses/create-expense";
import { UpdateExpense } from "../application/expenses/update-expense";
import { RemoveExpense } from "../application/expenses/remove-expense";
import { ListTransfers } from "../application/transfers/list-transfers";
import { CreateTransfer } from "../application/transfers/create-transfer";
import { UpdateTransfer } from "../application/transfers/update-transfer";
import { RemoveTransfer } from "../application/transfers/remove-transfer";
import { ListApps } from "../application/config/list-apps";
import { ListCurrencies } from "../application/config/list-currencies";
import { CreateCurrency } from "../application/config/create-currency";
import { ListTypes } from "../application/types/list-types";
import { CreateType } from "../application/types/create-type";
import { UpdateType } from "../application/types/update-type";
import { RemoveType } from "../application/types/remove-type";
import { ListCategories } from "../application/categories/list-categories";
import { CreateCategory } from "../application/categories/create-category";
import { UpdateCategory } from "../application/categories/update-category";
import { RemoveCategory } from "../application/categories/remove-category";
import { ListSchedules } from "../application/schedules/list-schedules";
import { CreateSchedule } from "../application/schedules/create-schedule";
import { UpdateSchedule } from "../application/schedules/update-schedule";
import { RemoveSchedule } from "../application/schedules/remove-schedule";
import { createListClientsHandler } from "./clients/clients-routes";
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
import { KyselyClientRepository } from "../infrastructure/kysely/client-repository";
import { KyselyIncomeRepository } from "../infrastructure/kysely/income-repository";
import { KyselyExpenseRepository } from "../infrastructure/kysely/expense-repository";
import { KyselyTransferRepository } from "../infrastructure/kysely/transfer-repository";
import { KyselyAppRepository } from "../infrastructure/kysely/app-repository";
import { KyselyCurrencyRepository } from "../infrastructure/kysely/currency-repository";
import { KyselyAccountRepository } from "../infrastructure/kysely/account-repository";
import { ListAccounts } from "../application/accounts/list-accounts";
import { CreateAccount } from "../application/accounts/create-account";
import { KyselyTypeRepository } from "../infrastructure/kysely/type-repository";
import { KyselyCategoryRepository } from "../infrastructure/kysely/category-repository";
import { KyselyTimerRunRepository } from "../infrastructure/kysely/timer-run-repository";
import { KyselyScheduleRepository } from "../infrastructure/kysely/schedule-repository";
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
import { createEmailSender } from "../infrastructure/email/create-email-sender";
import { drainEmailSending } from "../infrastructure/email/drain-email-sending";
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
  WEB_ORIGINS?: string;
  /** Desactiva el loop de drenaje de la cola de emails. */
  EMAIL_DRAIN_LOOP_ENABLED?: string;
  /** Cada cuánto corre el drenaje (ms). Default: 60000. */
  EMAIL_DRAIN_INTERVAL_MS?: string;
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

  // CORS de dev: el cliente orpc manda credentials: 'include' (las cookies
  // de la sesión), así que Access-Control-Allow-Origin tiene que ser el
  // origin explícito (no '*') y Access-Control-Allow-Credentials true.
  // Se permiten los tres frontends de dev (se overridea con WEB_ORIGINS,
  // separado por comas, p. ej. para 127.0.0.1 o CI):
  //   - apps/web    (octane) en http://localhost:5173
  //   - apps/web-v2 (Vue)    en http://localhost:5174
  //   - apps/web-v3 (Nuxt)   en http://localhost:5175
  // El handler orpc está montado en /rpc/** y usa POST para las procedures,
  // así que el preflight (OPTIONS) tiene que aceptar POST + los headers
  // estándar. En producción, reemplazar los origins por una allowlist
  // revisada.
  const devCors = {
    origin: (
      env.WEB_ORIGINS ??
      "http://localhost:5173,http://localhost:5174,http://localhost:5175"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean),
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
  };
  app.use(
    defineEventHandler(async (event) => {
      const corsResponse = await handleCors(event, devCors);
      if (corsResponse) return corsResponse;
    }),
  );

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
    const clientRepository = new KyselyClientRepository(db);
    const incomeRepository = new KyselyIncomeRepository(db);
    const currencyRepository = new KyselyCurrencyRepository(db);
    const accountRepository = new KyselyAccountRepository(db);
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
    const updateTheme = new UpdateTheme({
      clock,
      sessionRepository,
      userRepository,
      tokenHasher,
    });

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
    const listClients = new ListClients({ clientLookupRepository });
    const getClient = new GetClient({ clientRepository });
    const createClient = new CreateClient({ clientRepository });
    const updateClient = new UpdateClient({ clientRepository });
    const deleteClient = new DeleteClient({ clientRepository });
    const listClientDependencies = new ListClientDependencies({
      taskRepository,
    });
    const listIncomes = new ListIncomes({ incomeRepository });
    const createIncomeUseCase = new CreateIncome({ incomeRepository, accountRepository, currencyRepository });
    const updateIncomeUseCase = new UpdateIncome({ incomeRepository, accountRepository, currencyRepository });
    const removeIncomeUseCase = new RemoveIncome({ incomeRepository });
    const expenseRepository = new KyselyExpenseRepository(db);
    const transferRepository = new KyselyTransferRepository(db);
    const scheduleRepository = new KyselyScheduleRepository(db);
    const appRepository = new KyselyAppRepository(db);
    const typeRepository = new KyselyTypeRepository(db);
    const categoryRepository = new KyselyCategoryRepository(db);
    const timerRunRepository = new KyselyTimerRunRepository(db);
    const listExpenses = new ListExpenses({ expenseRepository });
    const createExpenseUseCase = new CreateExpense({ expenseRepository, accountRepository, currencyRepository });
    const updateExpenseUseCase = new UpdateExpense({ expenseRepository, accountRepository, currencyRepository });
    const removeExpenseUseCase = new RemoveExpense({ expenseRepository });
    const listTransfers = new ListTransfers({ transferRepository });
    const createTransferUseCase = new CreateTransfer({ transferRepository, accountRepository, currencyRepository });
    const updateTransferUseCase = new UpdateTransfer({ transferRepository, accountRepository, currencyRepository });
    const removeTransferUseCase = new RemoveTransfer({ transferRepository });
    const listSchedules = new ListSchedules({ scheduleRepository });
    const createScheduleUseCase = new CreateSchedule({ scheduleRepository });
    const updateScheduleUseCase = new UpdateSchedule({ scheduleRepository });
    const removeScheduleUseCase = new RemoveSchedule({ scheduleRepository });
    const listApps = new ListApps({ appRepository });
    const listCurrencies = new ListCurrencies({ currencyRepository });
    const createCurrency = new CreateCurrency({ currencyRepository });
    const listAccounts = new ListAccounts({ accountRepository });
    const createAccount = new CreateAccount({
      accountRepository,
      currencyRepository,
    });
    const listTypes = new ListTypes({ typeRepository });
    const createType = new CreateType({ typeRepository });
    const updateType = new UpdateType({ typeRepository });
    const removeType = new RemoveType({ typeRepository });
    const listCategories = new ListCategories({ categoryRepository });
    const createCategory = new CreateCategory({
      categoryRepository,
      typeRepository,
    });
    const updateCategory = new UpdateCategory({
      categoryRepository,
      typeRepository,
    });
    const removeCategory = new RemoveCategory({ categoryRepository });
    const startTimer = new StartTimer({
      timerRunRepository,
      transactionManager,
    });
    const stopTimer = new StopTimer({ timerRunRepository });
    const heartbeatTimer = new HeartbeatTimer({ timerRunRepository });
    const getCurrentTimer = new GetCurrentTimer({ timerRunRepository });
    const listTimerRuns = new ListTimerRuns({ timerRunRepository });
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
      listClients,
      getClient,
      createClient,
      updateClient,
      deleteClient,
      listClientDependencies,
      listIncomes,
      createIncome: createIncomeUseCase,
      updateIncome: updateIncomeUseCase,
      removeIncome: removeIncomeUseCase,
      listExpenses,
      createExpense: createExpenseUseCase,
      updateExpense: updateExpenseUseCase,
      removeExpense: removeExpenseUseCase,
      listTransfers,
      createTransfer: createTransferUseCase,
      updateTransfer: updateTransferUseCase,
      removeTransfer: removeTransferUseCase,
      listSchedules,
      createSchedule: createScheduleUseCase,
      updateSchedule: updateScheduleUseCase,
      removeSchedule: removeScheduleUseCase,
      getHealth,
      requestOtp,
      verifyOtp,
      getSession,
      logout,
      updateTheme,
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
      listApps,
      listCurrencies,
      createCurrency,
      listAccounts,
      createAccount,
      listTypes,
      createType,
      updateType,
      removeType,
      listCategories,
      createCategory,
      updateCategory,
      removeCategory,
      startTimer,
      stopTimer,
      heartbeatTimer,
      getCurrentTimer,
      listTimerRuns,
    });
    app.all("/rpc/**", (event) => rpcHandler(event));
  } else {
    // Sin base de datos solo /health está disponible; /rpc responde 503.
    app.all(
      "/rpc/**",
      () =>
        new Response(JSON.stringify({ error: "Database not configured" }), {
          status: 503,
          headers: { "Content-Type": "application/json" },
        }),
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
  return async (request: Request) => app.fetch(request);
}

// Entry para nitro (nitro.config.ts apunta aquí con route "/**").
const fetchHandler = createAppFetch();
export default fromWebHandler(fetchHandler);

// Descripción del transporte para logs: sin userinfo (la contraseña vive
// en SMTP_URL) y sin el valor crudo si no parece un host parseable.
export function describeSmtpTarget(target: string | undefined): string {
  if (!target) return "console-fallback";
  const withoutUserinfo = target.replace(/^[^@]*@/, "");
  try {
    const parsed = new URL(
      withoutUserinfo.includes("://")
        ? withoutUserinfo
        : `smtp://${withoutUserinfo}`,
    );
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    return "configurado (target no parseable)";
  }
}

/**
 * Loop de drenaje de la cola `email_sending`. Corre en dev y prod para
 * que los emails se envíen sin intervención manual (nitro no levanta
 * su task scheduler automáticamente en dev, y confiamos solo en
 * scheduledTasks para prod es frágil). Configurable vía:
 *  - `EMAIL_DRAIN_LOOP_ENABLED=false` para deshabilitar
 *  - `EMAIL_DRAIN_INTERVAL_MS` (default 60000 = 1 minuto)
 *
 * Solo se activa cuando `DATABASE_URL` está definida (no en tests que
 * mockean la DB).
 */
function startEmailDrainLoop(env: AppEnv): void {
  // SAFETY: el interval corre por la duración del proceso nitro. La función
  // tick recrea la DB y el EmailSender cada corrida para reflejar cambios
  // de env vars en runtime (DATABASE_URL, SMTP_HOST, etc. sin reinicio).
  //
  // Un valor no numérico cae al default: `setInterval` con NaN se vuelve
  // ~1ms y el loop golpearía la base en modo martillo.
  const parsedInterval = Number(env.EMAIL_DRAIN_INTERVAL_MS);
  const intervalMs =
    env.EMAIL_DRAIN_INTERVAL_MS && Number.isFinite(parsedInterval)
      ? parsedInterval
      : 60_000;
  console.log(
    `[email-drain] starting loop (interval=${intervalMs}ms, db=${env.DATABASE_URL ? "yes" : "no"}, smtp=${describeSmtpTarget(env.SMTP_HOST ?? env.SMTP_URL)})`,
  );

  const tick = async (): Promise<void> => {
    const databaseUrl = env.DATABASE_URL ?? "";
    if (!databaseUrl) return;
    const db = createDatabase(databaseUrl);
    try {
      const repository = new KyselyEmailSendingRepository(db);
      const sender = createEmailSender({
        SMTP_URL: env.SMTP_URL,
        SMTP_HOST: env.SMTP_HOST,
        SMTP_PORT: env.SMTP_PORT,
        SMTP_USER: env.SMTP_USER,
        SMTP_PASS: env.SMTP_PASS,
        SMTP_SECURE: env.SMTP_SECURE,
      });
      const result = await drainEmailSending({
        repository,
        sender,
        limit: 100,
      });
      if (result.processed > 0) {
        console.log(
          `[email-drain] drained processed=${result.processed} sent=${result.sent} failed=${result.failed} pending=${result.pending} sender=${sender.kind}`,
        );
      }
    } catch (err) {
      console.error("[email-drain] tick failed:", err);
    } finally {
      // El pool se cierra siempre: si el drain tiró, el handle queda
      // abierto y cada tick filtraría una conexión.
      await db.destroy();
    }
  };

  // Fire inmediato para no esperar 60s con la cola llena al boot.
  void tick();
  setInterval(() => {
    void tick();
  }, intervalMs);
}

if (
  process.env.DATABASE_URL &&
  process.env.EMAIL_DRAIN_LOOP_ENABLED !== "false" &&
  // En los tests el loop no corre: comparte la base con los tests de
  // integración y los dos escriben a la vez.
  process.env.NODE_ENV !== "test"
) {
  startEmailDrainLoop(process.env as AppEnv);
}
