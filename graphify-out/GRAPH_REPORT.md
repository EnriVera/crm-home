# Graph Report - apps  (2026-10-27)

## Corpus Check
- 431 files · ~108,027 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 85 file(s) not represented in the graph (top: .tsrx 81, .css 2, (none) 1)

## Summary
- 2663 nodes · 6041 edges · 134 communities (116 shown, 18 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 58 edges (avg confidence: 0.84)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Client Use Cases
- Vue Router Routes
- web-v2 Dependencies
- Type Use Cases
- Kysely Repositories Core
- Task Domain Logic
- Database Tables
- Income Use Cases
- Task Form Listers
- OTP Request & Rate Limit
- Email Sending Pipeline
- RPC Handlers & Mappers
- API Dependencies
- web-v2 PRD & Design Docs
- Verify OTP & Test Fakes
- Kanban Drag & Drop
- Task Repository IO
- Contract Input Schemas
- nuqs URL Query State
- Shared TSConfig
- Expense Use Cases
- Schedule Use Cases
- Transfer Use Cases
- Zag Dialog & Styling Utils
- web-v2 Vendor Deps
- Expense HTTP Handlers
- Task & Config List Use Cases
- web-v2 Tooling Deps
- Type Lookup Repository
- GetSession Use Case
- Logout Use Case
- Task State Repositories
- Vitest Test Harness
- web-v2 Structure Aliases
- Telemetry & OTel
- i18n Navigation
- Kanban Ordering
- Auth Router Guards
- Auth RPC Factories
- Task Form State Machine
- Task Vue Composables
- Session Config & TTL
- UI Button Component
- Resizable Panels Layout
- Config & Health Routes
- OTP Form State
- Auth Route Handlers
- Vendor Import Gates
- OTP XState Machine
- RPC Client Stubs
- Theme Resolution & Store
- Composition Root Wiring
- Schedule HTTP Handlers
- Transfer HTTP Handlers
- Attachment Repository
- Vendor Wrapper Contracts
- i18n Core
- web-v2 Dev Dependencies
- Task Mutation Hooks
- Email Drain Loop
- Theme Preference Sources
- Client Route Handlers
- Category Lookup Repository
- H3 Event Bridge
- Type Form State
- Octane Core & Sidebar
- OTP Input Focus Handling
- Nav Tree & Icons
- dnd-kit Vendor Wrapper
- Pinia Theme Stores
- CSS Module Class Names
- Client Router Core
- Login Use Case
- Income HTTP Handlers
- Form Lister Composables
- Client Form State
- Task State Form
- Login Form View
- Transaction Manager
- Apps Repository
- Currency Repository
- Health Check Route
- oRPC Client & Hooks
- Popover & Dropdown
- Expense Form State
- Income Form State
- login-form.logic.ts
- API Dev Dependencies
- Clock Abstraction
- mapTaskStateRow()
- Web TSConfig
- Theme Contrast Tokens
- BaseView Persistence
- App Bootstrap
- Foreign Keys Migration
- Expense Kysely Repo
- Schedule Kysely Repo
- Transfer Kysely Repo
- Hooks & Toast Wrappers
- Task Delete Confirmation
- Vue Vite Plugin
- ref_tanstack_history
- useOctaneQuery Fetcher
- Collapsible Vendor Wrapper
- ref_zag_js_pin_input
- web-v2 Package Scripts
- Favicon Logo Mark
- Sonner Toast Wrapper
- RPC Client Factory
- API Package Scripts
- CapturedSpan
- BaseView Component
- Icon System
- web Package Scripts
- Sidebar Collapse Storage
- Sidebar Layout Constants
- OtelSpanHandle
- Server TSConfig
- Lexical Rich Text
- vee-validate Deps
- Nav Active State
- FakeOtpVerifier
- OtpMachine
- Kanban Row Sorting
- 007_types_multi_module.ts
- KyselyUserSeedService
- @octanejs/usehooks-ts
- env.d.ts

## God Nodes (most connected - your core abstractions)
1. `Transaction` - 143 edges
2. `domainError` - 80 edges
3. `createCompositionRoot()` - 79 edges
4. `Database` - 59 edges
5. `createRpcHandler()` - 58 edges
6. `readUserId()` - 51 edges
7. `ClientRow` - 48 edges
8. `Result` - 42 edges
9. `mapTaskErrorToStatus()` - 39 edges
10. `TaskRow` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Domain Layer Purity Rule (PRD §10)` --semantically_similar_to--> `Pure Domain Layer (no Vue / Pinia / orpc / TanStack Query / vee-validate)`  [INFERRED] [semantically similar]
  api/src/domain/README.md → web-v2/README.md
- `Vendor UI Library Boundary (regla §9)` --semantically_similar_to--> `shared/vendor Single Import Boundary`  [INFERRED] [semantically similar]
  web/src/components/vendor/README.md → web-v2/README.md
- `Theme Bootstrap Script (PRD-v3 §8.3)` --semantically_similar_to--> `Anti-FOUC Theme Script (blocking, pre-paint)`  [INFERRED] [semantically similar]
  web-v2/index.html → web/index.html
- `CompositionRootOverrides` --references--> `OtpGenerator`  [EXTRACTED]
  api/src/http/composition-root.ts → api/src/domain/ports/otp-generator.ts
- `useThemeStore` --indirect_call--> `setPreference()`  [INFERRED]
  web-v2/src/stores/theme.ts → web-v2/src/shared/composables/use-theme.ts

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Vendor Wrapper Confinement Pattern (regla §9)** — apps_web_src_components_vendor_readme_vendor_boundary, apps_web_src_components_vendor_disclosure_readme_disclosure_wrapper, apps_web_src_components_vendor_dnd_kit_readme_dnd_wrapper, apps_web_src_components_vendor_hooks_readme_hooks_wrapper, apps_web_src_components_vendor_i18n_readme_i18n_wrapper, apps_web_src_components_vendor_icons_readme_icon_wrapper, apps_web_src_components_vendor_lexical_readme_lexical_wrapper, apps_web_src_components_vendor_otp_input_readme_otp_wrapper, apps_web_src_components_vendor_toast_readme_toast_wrapper [EXTRACTED 1.00]
- **Zag State Machine Vendorization for Octane** — apps_web_src_components_vendor_disclosure_readme_zag_collapsible, apps_web_src_components_vendor_disclosure_readme_octanejs_zag, apps_web_src_components_vendor_disclosure_readme_disclosure_props_mapper, apps_web_src_components_vendor_otp_input_readme_zag_pin_input, apps_web_src_components_vendor_otp_input_readme_octanejs_zag, apps_web_src_components_vendor_otp_input_readme_to_pin_input_props [EXTRACTED 1.00]
- **Pre-Paint Theme Bootstrap (flash-of-wrong-theme avoidance)** — apps_web_v2_index_html_theme_bootstrap, apps_web_v2_index_html_crm_theme_preference, apps_web_v2_index_html_prefers_color_scheme, apps_web_index_html_anti_fouc_script, apps_web_index_html_public_paths, apps_web_index_html_crm_theme [INFERRED 0.85]

## Communities (134 total, 18 thin omitted)

### Community 0 - "Client Use Cases"
Cohesion: 0.07
Nodes (24): CreateClient, CreateClientDependencies, CreateClientInput, InMemoryClientRepository, DeleteClientDependencies, DeleteClientInput, InMemoryClientRepository, ClientDomainError (+16 more)

### Community 1 - "Vue Router Routes"
Cohesion: 0.05
Nodes (46): @tanstack/vue-router, @tanstack/vue-router@1.170.37, Route, Route, Route, Route, Route, Route (+38 more)

### Community 2 - "web-v2 Dependencies"
Cohesion: 0.04
Nodes (65): class-variance-authority, @fontsource/roboto, @orpc/tanstack-query, @phosphor-icons/vue, tailwindcss-animate, @tanstack/match-sorter-utils, @tanstack/router-plugin, @tanstack/vue-query (+57 more)

### Community 3 - "Type Use Cases"
Cohesion: 0.07
Nodes (22): CreateType, CreateTypeDependencies, CreateTypeInput, InvalidTypeInput, TypeNotFound, ListTypes, ListTypesDependencies, ListTypesInput (+14 more)

### Community 4 - "Kysely Repositories Core"
Cohesion: 0.06
Nodes (6): InMemoryTaskRepository, EmailSendingRepository, Transaction, KyselyLoginRepository, KyselySessionRepository, KyselyUserRepository

### Community 5 - "Task Domain Logic"
Cohesion: 0.08
Nodes (21): NOW, InvalidKanbanOrder, InvalidStateTransition, TaskDomainError, TaskNotFound, TaskStateNotFound, Unauthorized, GetTask (+13 more)

### Community 6 - "Database Tables"
Cohesion: 0.07
Nodes (30): fixedOtpGenerator, createAppFetch(), KyselyClientLookupRepository, AccountsTable, AppsTable, AttachmentTable, CategoriesTable, ClientTable (+22 more)

### Community 7 - "Income Use Cases"
Cohesion: 0.08
Nodes (20): CreateIncome, CreateIncomeDependencies, CreateIncomeInput, IncomeDomainError, IncomeNotFound, InvalidIncomeInput, ListIncomes, ListIncomesDependencies (+12 more)

### Community 8 - "Task Form Listers"
Cohesion: 0.09
Nodes (9): makeListTypesForForm(), makeSearchClients(), ClientRepository, ConfigRepository, ScheduleRepository, domainError, Result, TaskFormListersRepository (+1 more)

### Community 9 - "OTP Request & Rate Limit"
Cohesion: 0.08
Nodes (19): OTP_TTL_MS, RATE_LIMIT_MAX_ATTEMPTS, RATE_LIMIT_WINDOW_MS, RateLimitedError, RequestOtp, RequestOtpDependencies, RequestOtpInput, RequestOtpOutput (+11 more)

### Community 10 - "Email Sending Pipeline"
Cohesion: 0.09
Nodes (18): EmailMessage, EmailSender, createConsoleEmailSender(), createEmailSender(), EmailSenderEnv, TaggedEmailSender, drainEmailSending(), DrainEmailSendingDeps (+10 more)

### Community 11 - "RPC Handlers & Mappers"
Cohesion: 0.11
Nodes (26): deleteClientHandler(), removeExpenseHandler(), removeIncomeHandler(), createRpcHandler(), removeScheduleHandler(), asCategoryForForm(), asClientListItem(), asTask() (+18 more)

### Community 12 - "API Dependencies"
Cohesion: 0.07
Nodes (39): dependencies, @crm/contract@workspace:*, @crm/email@workspace:*, effect@3.22.1, h3@2.0.1-rc.31, kysely@0.29.5, nitro@3.0.0, nodemailer@6.10.1 (+31 more)

### Community 13 - "web-v2 PRD & Design Docs"
Cohesion: 0.05
Nodes (31): Dependency Confinement Audit (grep gate for kysely/h3/nitro/opentelemetry), Domain Ports (domain/ports implemented by infrastructure adapters), CRM-Home PRD §10, Anti-FOUC Theme Script (blocking, pre-paint), crm-theme localStorage Key, Public Paths Regex (PRD §6.8), SSR Head/Body Placeholders (<!--ssr-head-->, <!--ssr-body-->), src/lib/theme/core.ts (resolveTheme / isPublicPath / PUBLIC_PATHS) (+23 more)

### Community 14 - "Verify OTP & Test Fakes"
Cohesion: 0.10
Nodes (16): createUseCase(), FakeIdGenerator, FakeSecureComparator, FakeTokenHasher, FixedClock, NoopTransactionManager, VerifyOtp, VerifyOtpDependencies (+8 more)

### Community 15 - "Kanban Drag & Drop"
Cohesion: 0.06
Nodes (20): emit, setMode(), ViewMode, draggingId, dragOverColumnId, emit, KanbanMovePayload, onDrop() (+12 more)

### Community 16 - "Task Repository IO"
Cohesion: 0.11
Nodes (13): DeleteTaskDependencies, DeleteTaskInput, GetTaskDependencies, ListTasksDependencies, ListTasksInput, UpdateTaskDependencies, UpdateTaskInput, TaskRepository (+5 more)

### Community 17 - "Contract Input Schemas"
Cohesion: 0.08
Nodes (13): listCategoriesByTypeInputSchema, listTasksQuerySchema, listTypesForFormInputSchema, makeGetTask(), makeUpdateTaskState(), ReorderTaskInput, reorderTaskInputSchema, searchClientsInputSchema (+5 more)

### Community 18 - "nuqs URL Query State"
Cohesion: 0.06
Nodes (28): toast, categoriesParams, categoriesQuery, [categoryId, categoryIdAttrs], [clientId, clientIdAttrs], clientLimit, clientQuery, clientsQuery (+20 more)

### Community 19 - "Shared TSConfig"
Cohesion: 0.05
Nodes (36): @crm/tsconfig/base.json, compilerOptions, allowSyntheticDefaultImports, baseUrl, esModuleInterop, exactOptionalPropertyTypes, isolatedModules, jsx (+28 more)

### Community 20 - "Expense Use Cases"
Cohesion: 0.11
Nodes (16): CreateExpense, CreateExpenseDependencies, CreateExpenseInput, ExpenseDomainError, ExpenseNotFound, InvalidExpenseInput, ListExpenses, ListExpensesDependencies (+8 more)

### Community 21 - "Schedule Use Cases"
Cohesion: 0.11
Nodes (16): CreateSchedule, CreateScheduleDependencies, CreateScheduleInput, InvalidScheduleInput, ScheduleDomainError, ScheduleNotFound, ListSchedules, ListSchedulesDependencies (+8 more)

### Community 22 - "Transfer Use Cases"
Cohesion: 0.11
Nodes (16): CreateTransfer, CreateTransferDependencies, CreateTransferInput, InvalidTransferInput, TransferDomainError, TransferNotFound, ListTransfers, ListTransfersDependencies (+8 more)

### Community 23 - "Zag Dialog & Styling Utils"
Cohesion: 0.08
Nodes (27): clsx, tailwind-merge, @zag-js/dialog, @zag-js/vue, clsx@2.1.1, tailwind-merge@3.0.2, @zag-js/dialog@1.44.0, @zag-js/vue@1.44.0 (+19 more)

### Community 24 - "web-v2 Vendor Deps"
Cohesion: 0.09
Nodes (31): @fontsource/poppins, i18next, @octanejs/dnd-kit, @octanejs/nuqs, @octanejs/phosphor-icons, @octanejs/resizable-panels, @octanejs/zag, dependencies (+23 more)

### Community 25 - "Expense HTTP Handlers"
Cohesion: 0.10
Nodes (27): UpdateExpense, RemoveType, amountSchema, createExpenseHandler(), createExpenseInputSchema, createGetExpenseHandler(), createListExpensesHandler(), dateSchema (+19 more)

### Community 26 - "Task & Config List Use Cases"
Cohesion: 0.08
Nodes (12): CreateTask, CreateTaskState, DeleteTask, DeleteTaskState, ListCategoriesByType, ListClientsForSelector, ListTaskStates, ListTasks (+4 more)

### Community 27 - "web-v2 Tooling Deps"
Cohesion: 0.07
Nodes (30): eslint, eslint-plugin-import, eslint-plugin-vue, happy-dom, @testing-library/vue, @types/node, @typescript-eslint/parser, vue-eslint-parser (+22 more)

### Community 28 - "Type Lookup Repository"
Cohesion: 0.13
Nodes (16): ListTypesForForm, ListTypesForFormDependencies, ListTypesForFormInput, InMemoryTypeLookupRepository, TypeLookupRepository, IncomeRow, ScheduleFrequency, TypeCategoriesClientRow (+8 more)

### Community 29 - "GetSession Use Case"
Cohesion: 0.10
Nodes (8): GetSession, createUseCase(), FakeTokenHasher, FixedClock, InMemoryUserRepository, FakeUserSeedService, InMemoryUserRepository, User

### Community 30 - "Logout Use Case"
Cohesion: 0.10
Nodes (8): InMemorySessionRepository, Logout, createUseCase(), FakeTokenHasher, FixedClock, InMemorySessionRepository, InMemorySessionRepository, Session

### Community 31 - "Task State Repositories"
Cohesion: 0.11
Nodes (11): DeleteTaskStateDependencies, DeleteTaskStateInput, ListTaskStatesDependencies, ListTaskStatesInput, MoveTaskDependencies, InMemoryTaskStateRepository, UpdateTaskStateDependencies, UpdateTaskStateInput (+3 more)

### Community 32 - "Vitest Test Harness"
Cohesion: 0.16
Nodes (17): vitest, vitest@5.0.3, makeCreateTask(), newOtpRequest(), DomainErrorCode, err(), ok(), validateCategoryRequiresType() (+9 more)

### Community 33 - "web-v2 Structure Aliases"
Cohesion: 0.07
Nodes (26): aliases, components, composables, lib, ui, charts, color, fonts (+18 more)

### Community 34 - "Telemetry & OTel"
Cohesion: 0.15
Nodes (8): Attributes, SpanHandle, Telemetry, CompositionRoot, createTelemetry(), NoopSpanHandle, NoopTelemetry, OtelTelemetry

### Community 35 - "i18n Navigation"
Cohesion: 0.11
Nodes (13): useT(), t, t, { profile }, t, t, t, navItems (+5 more)

### Community 36 - "Kanban Ordering"
Cohesion: 0.17
Nodes (14): KANBAN_DEFAULT_STEP, KANBAN_GAP_REBALANCE_THRESHOLD, TASK_DESCRIPTION_MAX, TASK_TITLE_MAX, CreateTaskInput, NOW, appendOrder(), computeInsertOrder() (+6 more)

### Community 37 - "Auth Router Guards"
Cohesion: 0.14
Nodes (13): @octanejs/vite-plugin, authRedirect, redirectIfAuthenticated, requireSession, @octanejs/vite-plugin@0.1.60, createAuthRedirect(), createRedirectIfAuthenticated(), hasSessionCookie() (+5 more)

### Community 38 - "Auth RPC Factories"
Cohesion: 0.18
Nodes (11): makeGetSession(), makeRequestOtp(), makeSignOut(), makeVerifyOtp(), OtpRequest, parseOtp(), AuthRepository, AuthSessionBundle (+3 more)

### Community 39 - "Task Form State Machine"
Cohesion: 0.16
Nodes (18): applyTaskFormAction(), ATTACHMENTS_DISABLED, AvailableCategoriesLookup, firstValidationError(), initialTaskFormState(), isCategoryDisabled(), TaskFormAction, TaskFormState (+10 more)

### Community 40 - "Task Vue Composables"
Cohesion: 0.12
Nodes (13): makeListTasks(), makeListTaskStates(), makeReorderTaskInColumn(), taskRepository, taskStateRepository, DomainErrorToError, useListTaskStates(), DomainErrorToError (+5 more)

### Community 41 - "Session Config & TTL"
Cohesion: 0.15
Nodes (16): SESSION_RENEWAL_THRESHOLD_MS, SESSION_TTL_MS, GetSessionDependencies, GetSessionInput, GetSessionOutput, LogoutDependencies, LogoutInput, LogoutOutput (+8 more)

### Community 42 - "UI Button Component"
Cohesion: 0.11
Nodes (19): vue, emit, isDisabled, onClick(), props, Size, sizeClass, Variant (+11 more)

### Community 43 - "Resizable Panels Layout"
Cohesion: 0.10
Nodes (12): DivProps, DivStyle, GroupProps, Layout, LayoutChangedMeta, LayoutStorage, @octanejs/resizable-panels, PanelImperativeHandle (+4 more)

### Community 44 - "Config & Health Routes"
Cohesion: 0.14
Nodes (15): ListApps, ListCurrencies, GetHealth, createListClientsHandler(), ConfigRouteDependencies, createListAppsHandler(), createListCurrenciesHandler(), IncomesRouteDependencies (+7 more)

### Community 45 - "OTP Form State"
Cohesion: 0.11
Nodes (18): auth, canResend, code, email, errorKeyByCode, errorMessage, isResending, isSubmitting (+10 more)

### Community 46 - "Auth Route Handlers"
Cohesion: 0.15
Nodes (13): InvalidThemeError, UpdateTheme, AuthRouteDependencies, createLogoutHandler(), createRequestOtpHandler(), createSessionHandler(), createUpdateThemeHandler(), createVerifyOtpHandler() (+5 more)

### Community 47 - "Vendor Import Gates"
Cohesion: 0.14
Nodes (9): COMPOSITION_ROOT, FORBIDDEN_IMPORTS, ImportViolation, PORTS_DIR, WRAPPER_PATH, WRAPPER_PATH, WRAPPER_PATH, HOOK_PATH (+1 more)

### Community 48 - "OTP XState Machine"
Cohesion: 0.15
Nodes (13): createOtpMachine(), createOtpMachineDef(), OTP_CODE_LENGTH, OTP_EXPIRES_MINUTES, OTP_MAX_ATTEMPTS, OtpContext, OtpEvent, OtpMachineOptions (+5 more)

### Community 49 - "RPC Client Stubs"
Cohesion: 0.11
Nodes (9): AuthRpcClient, ClientsRpcClient, ConfigRpcClient, ExpenseRpcClient, IncomeRpcClient, ScheduleRpcClient, TasksRpcClient, TransferRpcClient (+1 more)

### Community 50 - "Theme Resolution & Store"
Cohesion: 0.20
Nodes (10): isPublicPath(), PUBLIC_PATHS, resolveTheme(), Theme, createThemeStore(), ThemeStore, shellThemeStore, systemThemeStore (+2 more)

### Community 51 - "Composition Root Wiring"
Cohesion: 0.18
Nodes (8): AppEnv, CompositionRootOverrides, fetchHandler, createIdGenerator(), createOtpGenerator(), createSecureComparator(), createTokenHasher(), TelemetryEnv

### Community 52 - "Schedule HTTP Handlers"
Cohesion: 0.15
Nodes (15): UpdateSchedule, amountSchema, createGetScheduleHandler(), createListSchedulesHandler(), createScheduleHandler(), createScheduleInputSchema, dateSchema, frequencySchema (+7 more)

### Community 53 - "Transfer HTTP Handlers"
Cohesion: 0.15
Nodes (15): UpdateTransfer, amountSchema, createGetTransferHandler(), createListTransfersHandler(), createTransferHandler(), createTransferInputSchema, dateSchema, getTransferInputSchema (+7 more)

### Community 54 - "Attachment Repository"
Cohesion: 0.23
Nodes (5): AttachmentRepository, AttachmentRow, KyselyAttachmentRepository, AttachmentDbRow, mapAttachmentRow()

### Community 55 - "Vendor Wrapper Contracts"
Cohesion: 0.13
Nodes (11): DisclosureProps Public Contract, disclosure-props.ts Pure Mapper, Disclosure Wrapper (WAI-ARIA Disclosure pattern), @octanejs/zag@0.0.22 Adapter, @zag-js/collapsible, @octanejs/zag@0.0.18 Adapter, OtpInputProps Public Contract, OtpInput Wrapper (+3 more)

### Community 56 - "i18n Core"
Cohesion: 0.21
Nodes (6): createI18n(), getI18n(), subscribeLanguageChange(), t(), i18n, SRC_DIR

### Community 57 - "web-v2 Dev Dependencies"
Cohesion: 0.12
Nodes (17): @orpc/contract, @tsrx/typescript-plugin, @types/lodash.debounce, devDependencies, @crm/tsconfig@workspace:*, @orpc/contract@1.15.4, tailwindcss@4.3.3, @tailwindcss/vite@4.3.3 (+9 more)

### Community 58 - "Task Mutation Hooks"
Cohesion: 0.18
Nodes (8): makeDeleteTask(), makeUpdateTask(), DomainErrorToError, useCreateTask(), DomainErrorToError, useDeleteTask(), DomainErrorToError, useUpdateTask()

### Community 59 - "Email Drain Loop"
Cohesion: 0.21
Nodes (4): InMemoryEmailSendingRepository, EmailSending, startEmailDrainLoop(), KyselyEmailSendingRepository

### Community 60 - "Theme Preference Sources"
Cohesion: 0.20
Nodes (6): STORAGE_KEY, ThemeSetting, isThemeSetting(), LocalStorageThemeSource, SystemThemeSource, ThemePreferenceSource

### Community 61 - "Client Route Handlers"
Cohesion: 0.17
Nodes (11): DeleteClient, ClientsRouteDependencies, createClientHandler(), createClientInputSchema, createGetClientHandler(), getClientInputSchema, listClientsInputSchema, mapClientRowToContract() (+3 more)

### Community 62 - "Category Lookup Repository"
Cohesion: 0.23
Nodes (8): ListCategoriesByTypeDependencies, ListCategoriesByTypeInput, InMemoryCategoryLookupRepository, CategoryLookupRepository, CategoryRow, KyselyCategoryLookupRepository, CategoryDbRow, mapCategoryRow()

### Community 63 - "H3 Event Bridge"
Cohesion: 0.24
Nodes (10): BridgeHttpError, bridgeHttpErrorFromResponse(), buildH3Event(), buildH3EventFromBase(), BuildH3EventOptions, extractCookiesFromH3Event(), extractHeadersFromH3Event(), invokeH3HandlerAndParse() (+2 more)

### Community 64 - "Type Form State"
Cohesion: 0.14
Nodes (7): firstTypeFormError(), isTypeFormReadyToSubmit(), TYPE_FORM_MODULES, TypeFormAction, TypeFormError, TypeFormPayload, TypeFormState

### Community 65 - "Octane Core & Sidebar"
Cohesion: 0.13
Nodes (6): octane, octane@0.5.0, UseFetchResult, UsePersistedQueryStateOptions, SidebarCollapseContext, SidebarCollapseValue

### Community 66 - "OTP Input Focus Handling"
Cohesion: 0.21
Nodes (12): cells, emit, firstEmptyIndex(), focusIndex(), handleFocus(), handleInput(), handleKeydown(), handlePaste() (+4 more)

### Community 67 - "Nav Tree & Icons"
Cohesion: 0.20
Nodes (8): ICON_COMPONENTS, IconName, EXPECTED_NAMES, NAV_TREE, NavGroupNode, NavLeaf, NavNode, NavSection

### Community 68 - "dnd-kit Vendor Wrapper"
Cohesion: 0.15
Nodes (12): DndContext Provider, dnd-kit Vendor Wrapper, DragOverlay, §9 Grep Gate for @octanejs/dnd-kit, @octanejs/dnd-kit@0.1.47, useDraggable() Hook, useDroppable() Hook, §9 Grep Gate for @octanejs/lexical (+4 more)

### Community 69 - "Pinia Theme Stores"
Cohesion: 0.24
Nodes (7): pinia, useTheme(), setPreference(), readStoredPreference(), readSystemPrefersDark(), useThemeStore, useUiStore

### Community 70 - "CSS Module Class Names"
Cohesion: 0.15
Nodes (11): BUTTON, classAfter(), classFrom(), HERE, LOGIN_VERIFICATION, NAV_GROUP, NAV_ITEM, OTP_INPUT (+3 more)

### Community 71 - "Client Router Core"
Cohesion: 0.26
Nodes (12): currentPath, getCurrentPath(), handleDocumentClick(), handlePopState(), installClientRouter(), listeners, navigate(), notify() (+4 more)

### Community 72 - "Login Use Case"
Cohesion: 0.21
Nodes (3): InMemoryLoginRepository, InMemoryLoginRepository, Login

### Community 73 - "Income HTTP Handlers"
Cohesion: 0.21
Nodes (12): amountSchema, createGetIncomeHandler(), createIncomeHandler(), createIncomeInputSchema, createListIncomesHandler(), dateSchema, getIncomeInputSchema, listIncomesInputSchema (+4 more)

### Community 74 - "Form Lister Composables"
Cohesion: 0.22
Nodes (10): makeListCategoriesByType(), taskFormListersRepository, CategoriesByTypeParams, DomainErrorToError, refDebounced(), SearchClientsParams, TypesForFormParams, useCategoriesByType() (+2 more)

### Community 75 - "Client Form State"
Cohesion: 0.26
Nodes (11): applyClientFormAction(), ClientFormAction, ClientFormMode, ClientFormState, clientFormToApiPayload(), ClientValidationCode, ClientValidationError, firstClientFormError() (+3 more)

### Community 76 - "Task State Form"
Cohesion: 0.28
Nodes (11): buildStateSubmitParams(), initialTaskStateFormState(), TASK_STATE_NAME_MAX, TASK_STATE_NAME_MIN, TASK_STATE_ORDER_MIN, TaskStateFormInput, TaskStateFormMode, TaskStateFormState (+3 more)

### Community 77 - "Login Form View"
Cohesion: 0.17
Nodes (9): Route, auth, email, errorKeyByCode, errorMessage, isSubmitting, onSubmit(), router (+1 more)

### Community 78 - "Transaction Manager"
Cohesion: 0.23
Nodes (5): FailingTransactionManager, ReorderTaskStatesDependencies, ReorderTaskStatesInput, TransactionManager, KyselyTransactionManager

### Community 79 - "Apps Repository"
Cohesion: 0.29
Nodes (4): ListAppsDependencies, App, AppRepository, KyselyAppRepository

### Community 80 - "Currency Repository"
Cohesion: 0.29
Nodes (4): ListCurrenciesDependencies, Currency, CurrencyRepository, KyselyCurrencyRepository

### Community 81 - "Health Check Route"
Cohesion: 0.24
Nodes (5): HealthPayload, HealthRepository, HealthStatus, createHealthRoute(), StaticHealthRepository

### Community 82 - "oRPC Client & Hooks"
Cohesion: 0.27
Nodes (8): AppOrpcClient, baseURL, link, orpcClient, AnyProcedure, Procedure, useOrpcMutation(), useOrpcQuery()

### Community 83 - "Popover & Dropdown"
Cohesion: 0.17
Nodes (11): @zag-js/popover, @zag-js/popover@1.44.0, api, contentClass, DropdownPlacement, emit, id, placement (+3 more)

### Community 84 - "Expense Form State"
Cohesion: 0.29
Nodes (10): applyExpenseFormAction(), ExpenseFormAction, ExpenseFormState, expenseFormToApiPayload(), ExpenseValidationCode, ExpenseValidationError, firstExpenseFormError(), initialExpenseFormState() (+2 more)

### Community 85 - "Income Form State"
Cohesion: 0.29
Nodes (10): applyIncomeFormAction(), firstIncomeFormError(), IncomeFormAction, IncomeFormState, incomeFormToApiPayload(), IncomeValidationCode, IncomeValidationError, initialIncomeFormState() (+2 more)

### Community 87 - "API Dev Dependencies"
Cohesion: 0.18
Nodes (11): devDependencies, @crm/tsconfig@workspace:*, @types/bun@1.4.1, @types/nodemailer@6.4.17, @types/pg@8.23.1, typescript@5.9.3, @crm/tsconfig, typescript (+3 more)

### Community 88 - "Clock Abstraction"
Cohesion: 0.31
Nodes (5): CreateTaskStateDependencies, CreateTaskStateInput, Clock, createFixedClock(), createSystemClock()

### Community 90 - "Web TSConfig"
Cohesion: 0.18
Nodes (10): @crm/tsconfig/web, compilerOptions, allowImportingTsExtensions, jsxImportSource, paths, plugins, extends, include (+2 more)

### Community 91 - "Theme Contrast Tokens"
Cohesion: 0.22
Nodes (8): contrastRatio(), DARK, HERE, ratio(), relativeLuminance(), ROOT, TOKENS, TOKENS_PATH

### Community 92 - "BaseView Persistence"
Cohesion: 0.38
Nodes (8): buildBaseViewStorageKey(), buildViewStorageKey(), isValidViewKind(), parsePersistedFilters(), parsePersistedView(), serializeFilters(), VALID_VIEW_KINDS, ViewKind

### Community 93 - "App Bootstrap"
Cohesion: 0.24
Nodes (6): bootAuth(), getSession, bootstrap(), queryClient, authRepository, i18n

### Community 94 - "Foreign Keys Migration"
Cohesion: 0.24
Nodes (4): ForeignKey, ForeignKeyRow, down(), up()

### Community 95 - "Expense Kysely Repo"
Cohesion: 0.31
Nodes (3): KyselyExpenseRepository, ExpenseDbRow, mapExpenseRow()

### Community 96 - "Schedule Kysely Repo"
Cohesion: 0.31
Nodes (3): mapScheduleRow(), ScheduleDbRow, KyselyScheduleRepository

### Community 97 - "Transfer Kysely Repo"
Cohesion: 0.31
Nodes (3): mapTransferRow(), TransferDbRow, KyselyTransferRepository

### Community 98 - "Hooks & Toast Wrappers"
Cohesion: 0.20
Nodes (7): usehooks-ts Vendor Wrapper, Host-Safe Hook Cohort (state + timing/lifecycle), @octanejs/usehooks-ts, @octanejs/sonner (sonner 2.0.7), toast() API with Closed Semantic Variants, Toast Wrapper (@octanejs/sonner), Toaster Container Component

### Community 100 - "Task Delete Confirmation"
Cohesion: 0.33
Nodes (8): buildRemoveParams(), closeDeleteConfirmation(), DeleteConfirmationState, DeleteTaskParams, editUrl(), initialDeleteConfirmationState(), openDeleteConfirmation(), TASKS_LIST_PATH

### Community 102 - "Vue Vite Plugin"
Cohesion: 0.25
Nodes (4): @tanstack/router-vite-plugin, @vitejs/plugin-vue, @tanstack/router-vite-plugin@1.167.42, @vitejs/plugin-vue@6.0.9

### Community 104 - "useOctaneQuery Fetcher"
Cohesion: 0.33
Nodes (7): errorMessage(), Fetcher, getQueryClient(), OctaneQueryResult, shallowChanged(), toContract(), useOctaneQuery()

### Community 105 - "Collapsible Vendor Wrapper"
Cohesion: 0.33
Nodes (3): @zag-js/collapsible, @zag-js/collapsible@1.42.0, toDisclosureProps()

### Community 107 - "web-v2 Package Scripts"
Cohesion: 0.22
Nodes (9): scripts, build, dev, lint, prebuild, preview, test, test:watch (+1 more)

### Community 108 - "Favicon Logo Mark"
Cohesion: 0.54
Nodes (8): Accessible Label 'CRM Home' (role=img, aria-label), CRM Home Brand Identity (radar/home-orbit target mark), Center Filled Dot (r=5, fill #475569), Concentric Circles Composition, CRM Home Favicon Logo Mark, Outer Circle Outline (r=13, stroke #475569, stroke-width 2), Slate Gray Color Palette (#475569), 32x32 ViewBox Canvas (centered cx=16 cy=16)

### Community 109 - "Sonner Toast Wrapper"
Cohesion: 0.25
Nodes (4): @octanejs/sonner, @octanejs/sonner@0.1.51, ToastOptions, ToastVariant

### Community 110 - "RPC Client Factory"
Cohesion: 0.39
Nodes (4): createRpcClient(), RpcClient, createRpcOtpVerifier(), RpcOtpVerifierOptions

### Community 111 - "API Package Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, db:migrate, dev, lint, test, typecheck

### Community 113 - "BaseView Component"
Cohesion: 0.33
Nodes (6): BaseView Component, BaseViewFilters Generic Filter Shape, localStorage Namespace base-view:<moduleId>:<id>, SearchInput (W11), SSR-Safe Pure Helpers (base-view.helpers.ts), ViewSwitcher (list / grid / kanban)

### Community 114 - "Icon System"
Cohesion: 0.33
Nodes (7): IconName Closed Union, Initial 12-Icon Set (D4 design decision), Icon Wrapper (design system icons), @octanejs/phosphor-icons@0.0.32, paths.ts ICON_COMPONENTS Map, phosphor-icons (@phosphor-icons/core v2.1.1, MIT), Tree-shaking Verification (12 icons in bundle)

### Community 115 - "web Package Scripts"
Cohesion: 0.29
Nodes (7): scripts, build, dev, lint, preview, test, typecheck

### Community 116 - "Sidebar Collapse Storage"
Cohesion: 0.48
Nodes (5): loadFinanceCollapsed(), parseFinanceCollapsed(), readStorage(), saveFinanceCollapsed(), writeStorage()

### Community 117 - "Sidebar Layout Constants"
Cohesion: 0.67
Nodes (4): clampSidebarSize(), isCollapsedSize(), SIDEBAR_LAYOUT, SIDEBAR_LAYOUT_ID

### Community 119 - "Server TSConfig"
Cohesion: 0.40
Nodes (4): extends, include, $schema, @crm/tsconfig/server.json

### Community 120 - "Lexical Rich Text"
Cohesion: 0.40
Nodes (3): @octanejs/lexical, @octanejs/lexical@0.1.56, RichTextEditorProps

### Community 121 - "vee-validate Deps"
Cohesion: 0.40
Nodes (4): vee-validate, @vee-validate/zod, vee-validate@4.15.1, @vee-validate/zod@4.15.1

### Community 122 - "Nav Active State"
Cohesion: 0.80
Nodes (3): isGroupActive(), isItemActive(), pathnameOf()

### Community 125 - "Kanban Row Sorting"
Cohesion: 0.60
Nodes (3): KanbanRow, moveItem(), sortByOrder()

## Knowledge Gaps
- **39 isolated node(s):** `RFC-4122`, `@crm/tsconfig/server.json`, `@crm/tsconfig/base.json`, `@crm/tsconfig/web`, `CRM-Home PRD §10` (+34 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 896 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **18 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `vue` connect `UI Button Component` to `Vue Router Routes`, `web-v2 Dependencies`, `OTP Input Focus Handling`, `i18n Navigation`, `Pinia Theme Stores`, `Task Vue Composables`, `Form Lister Composables`, `Login Form View`, `OTP Form State`, `Kanban Drag & Drop`, `oRPC Client & Hooks`, `Popover & Dropdown`, `nuqs URL Query State`, `Zag Dialog & Styling Utils`, `App Bootstrap`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **What connects `RFC-4122`, `@crm/tsconfig/server.json`, `@crm/tsconfig/base.json` to the rest of the system?**
  _39 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Client Use Cases` be split into smaller, more focused modules?**
  _Cohesion score 0.06540825285338016 - nodes in this community are weakly interconnected._
- **Why does `Transaction` connect `Kysely Repositories Core` to `Type Use Cases`, `Task Domain Logic`, `Database Tables`, `OTP Request & Rate Limit`, `Session Config & TTL`, `KyselyUserSeedService`, `Transaction Manager`, `Apps Repository`, `Verify OTP & Test Fakes`, `Currency Repository`, `Task Repository IO`, `Attachment Repository`, `mapTaskStateRow()`, `Email Drain Loop`, `Type Lookup Repository`, `Task State Repositories`?**
  _High betweenness centrality (0.043) - this node is a cross-community bridge._
- **Should `Vue Router Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.05487269534679543 - nodes in this community are weakly interconnected._
- **Why does `@octanejs/vite-plugin` connect `Auth Router Guards` to `web-v2 Vendor Deps`, `Vue Vite Plugin`?**
  _High betweenness centrality (0.041) - this node is a cross-community bridge._
- **Should `web-v2 Dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04382284382284382 - nodes in this community are weakly interconnected._