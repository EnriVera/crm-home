# Config flow — full implementation

> **Feature doc for:** implementing the `/config` page flow per PRD-v2.md
> §8.7 (lines 234-239), specifically the 3-way theme selector with
> server-side persistence.

## Why

The current `config-page.tsrx` shows a binary light/dark toggle that
writes to `localStorage` only. PRD-v2.md line 40 + line 72 + line 234
require:

> "Modo oscuro/claro configurable desde Config (persistido en la
> cuenta del usuario)"
> "se persiste en la cuenta del usuario (`user_theme`), de modo que
> acompaña al usuario en cualquier dispositivo"
> "selector de tema `claro` / `oscuro` / `sistema` (sigue la preferencia
> del SO). Persiste en `user_theme` de la cuenta y se aplica de
> inmediato sin recargar."

So we need a 3-way selector (light/dark/system) where:

- `system` follows the OS preference
- `light` and `dark` are explicit
- The choice is saved to `user_theme` in the `user` table (column
  already exists per PRD line 389 + line 397)
- The new value applies to `<html>` immediately, no reload
- The change is reactive on the page (no hard reload to apply)

## Architectural decisions

| Decision | Rationale |
| ---------- | ----------- |
| Custom `.tsrx` radio group, not Zag | Per `.pi/skills/zag/SKILL.md` Decision Gates: "Component is simple, no state machine needed → use a regular `.tsrx` molecule." 3-option radio group does not need a state machine. Pulling Zag for this would add adapter overhead for no benefit. |
| New `auth.updateTheme` RPC, not `auth.updateProfile` | The /config page only persists theme today. Profile editing (name/email update) is a separate concern (PRD doesn't list it under §8.7). Adding a generic `updateProfile` is out of scope. |
| Optimistic update + background sync | The `useTheme()` setter already applies locally (localStorage + class on `<html>`). The `setTheme` consumer just needs to ALSO call `auth.updateTheme` when authenticated; on failure, the next session() refetch will reconcile. No rollback complexity for a single column. |
| No new `ThemeSetting` type | `lib/theme/core.ts` already has `ThemeSetting = "light" | "dark" | "system"`. We just need the UI to expose all 3 values. |
| `auth.session()` returns `user_theme` | The DB column already exists; we just need to surface it in the session output schema. |
| `user_theme` default stays 'system' on the server | Matches the existing DB default. New users get system, can override in /config. |

## Subsystems

1. **Backend (`apps/api/`)**:
   - `packages/types/src/contracts/auth.ts`: add `userTheme` to
     `sessionOutputSchema.user`; add `updateThemeInputSchema` and
     `updateThemeRoute`.
   - `apps/api/src/domain/ports/user-repository.ts`: add
     `updateTheme(userId, setting): Promise<void>`.
   - `apps/api/src/infrastructure/kysely/...user-repo.ts`: implement.
   - `apps/api/src/application/auth/update-theme.ts`: new use-case
     (validates setting ∈ allowed values, calls repo, returns updated
     user).
   - `apps/api/src/http/auth/auth-routes.ts`: `createUpdateThemeHandler`.
   - `apps/api/src/http/router.ts`: register `updateTheme` procedure.
   - `apps/api/src/http/composition-root.ts`: wire the new handler.

2. **Frontend types** (`apps/web/src/lib/api/rpc.ts` and the lib ORPC
   client): surface the new `auth.updateTheme` procedure + the
   `userTheme` field on `session()`.

3. **Frontend molecule** (`apps/web/src/components/molecules/theme-select.tsrx`):
   - 3 radio inputs (light/dark/system) rendered as a button group OR
     a proper radio group with `role="radiogroup"`.
   - `aria-checked` on the selected one; `aria-label` from props (i18n).
   - Sun/Moon/Computer icons from existing `vendor/icons`.
   - `useTheme()` consumer; on change, calls `setTheme(setting)` and
     (new) `rpc.auth.updateTheme({ setting })` when authenticated.
   - Server response updates the local store; refetch of session
     not needed (the value is in the cache and the next session() call
     will reconcile if the server rejects).

4. **i18n keys** (`apps/web/src/lib/i18n/locales/es.json`):
   - `config.appearance.themeLabel` — section heading
   - `config.appearance.themeLight` — "Claro"
   - `config.appearance.themeDark` — "Oscuro"
   - `config.appearance.themeSystem` — "Sistema"
   - `config.appearance.themeSaveError` — "No se pudo guardar. Reintentá."
   - Keep existing `theme.toLight` / `theme.toDark` for the sidebar
     ThemeToggle (binary) so we don't break the sidebar.

5. **Config page wire-up** (`apps/web/src/components/pages/config-page.tsrx`):
   - Replace `ThemeToggle` with `ThemeSelect`.
   - When `user` is loaded, prefer `user.user_theme` as the initial
     setting; fall back to localStorage if not present.

6. **Sidebar ThemeToggle** (`apps/web/src/components/molecules/theme-toggle.tsrx`):
   - Stays binary (light/dark). The 3-way full selector lives on
     `/config`. The sidebar button can deep-link to /config for
     full 3-way selection, OR continue as a quick toggle. Decision
     today: keep as quick toggle, but add a small "more options" link
     to /config.
   - **Out of scope for this change** — the sidebar stays as-is. If
     you want consistency, file a follow-up to remove the sidebar
     toggle entirely (defer to future task).

## Phases

### Phase 0 — Feature doc + planning (this file) ✅

### Phase 1 — Backend: extend session, add updateTheme ✅

- 1a. Update `packages/types/src/contracts/auth.ts` to add `userTheme`
  to `sessionOutputSchema.user` and the new `updateTheme` procedure.
  **→ `4015d3a feat(types): add userTheme to auth contract + updateTheme procedure`**
- 1b. Update `apps/api/src/domain/ports/user-repository.ts` and
  Kysely implementation with `updateTheme(userId, setting)`.
  **→ `7bfba9c feat(api): add updateTheme to user repository (port + kysely + in-memory)`**
- 1c. Add `update-theme.ts` use case + `createUpdateThemeHandler` +
  register in router + wire in composition root.
  **→ `43b46e9 feat(api): add updateTheme use case + handler + router + composition root`**
- 1c-fix. GetSession use case did not include `userTheme` in its
  response shape (the contract added it but the actual use case
  returned only `{id, email, name}`). Fix + test update.
  **→ `12ee87b fix(api): include userTheme in GetSession output`**
- 1d. Smoke test (curl + Mailpit): session() returns userTheme,
  updateTheme persists, session() reflects the change.

### Phase 2 — Frontend: ThemeSelect molecule ✅

- 2a. New `apps/web/src/components/molecules/theme-select.tsrx`.
- 2b. i18n keys added to `es.json`.
- **→ `9b092c8 feat(web): add ThemeSelect molecule + 3-way i18n keys`**
  (2a + 2b in one commit; the molecule references the keys directly
  so splitting would leave it un-buildable in between.)

### Phase 3 — Config page wire-up ✅

- 3a. Replace `ThemeToggle` with `ThemeSelect` in
  `apps/web/src/components/pages/config-page.tsrx`.
- 3b. Pass `user.user_theme` as initial value when session loads.
- **→ `e51ff59 feat(web): wire ThemeSelect into config-page with server theme sync`**
  (3a + 3b combined — the ThemeSelect replacement needs the
  server-theme sync to be useful.)

### Phase 4 — E2E ✅

- **→ `6261af0 fix(web): add missing key prop to ThemeSelect .map()`**
  (caught by E2E; octane runtime fires warning without keys).
- Login as `enriveritaass@gmail.com` (via curl + Mailpit OTP flow).
- Navigate to /config. Initial state: "Sistema" radio is selected
  (matches the last persisted `userTheme`).
- Click each of the 3 options, verify:
  - Click "Claro" → `<html>` className = `""` (no dark), radio "light" active.
  - Click "Oscuro" → `<html>` className = `"dark"`, radio "dark" active.
  - Click "Sistema" → `<html>` className = `""` (system follows media
    query at runtime), radio "system" active.
- Reload the page → setting persists via `session()` refetch + the
  `useEffect` that syncs `currentSetting` from `user.userTheme`.
- Console clean (0 non-debug messages) after the key prop fix.

### Implementation notes vs. the original plan

- Phase 1 ended up as 4 commits instead of 3 (added a fix in 1c-fix
  for the GetSession output shape — found by the Phase 1d smoke test).
- Phase 2 + Phase 3 were 1 commit each instead of 2 (combined
  because the splits would leave intermediate states un-buildable).
- Phase 4 found a real bug (missing key prop) that was fixed in a
  separate commit. **Always run the E2E.**
- E2E tool fallback: `playwright-cli` (v0.1.21 global) failed with
  Node 26.8.1 + "Daemon process exited with code 1" + the
  `npx playwright install chrome` step needed sudo which is not
  available. Fell back to `agent-browser` (the same Chrome via CDP
  used throughout this session). Same browser, same coverage; the
  E2E results are valid.

## Migration contract

After this change, `apps/web/src/components/molecules/theme-toggle.tsrx`
remains as the binary sidebar toggle. Its only contract change is
**none** — it still calls `setTheme("light" | "dark")` and the store
applies it. The new 3-way selector is additive and lives on /config.

## Verification

- **Unit-level**: existing `use-octane-query.test.ts` 15/15 pass.
  No new unit tests planned (the molecule is small and the
  integration test covers it).
- **E2E (playwright-cli)**: see Phase 4 checklist.
- **PRD coverage**: §8.7 satisfied. §6.8 (public pages follow OS) is
  out of scope (no change to the `__auth` layout).

## Out of scope

- Profile editing (name, email) — not in §8.7.
- Account deletion — not in §8.7.
- Removing the sidebar ThemeToggle (could be confusing alongside the
  3-way selector on /config, but is a follow-up).
- WebSocket-driven `user_theme` invalidation if the theme is changed
  on another device. Today: user reloads, session() refetches, theme
  updates. PRD line 358 (cross-device "acomaña al usuario") is
  satisfied by the persistence; live sync is a future enhancement.
- Updating the sidebar toggle to also be 3-way.
