# /clients CRUD completo

Extiende el módulo `/clients` (actualmente read-only) con create / update /
delete + detail page. Sigue el patrón de `/tasks` que ya tiene las 5
operaciones.

## Contexto

- `packages/types/src/contracts/clients.ts` ya tiene `list`. Faltan:
  `create`, `update`, `remove`.
- `apps/api/src/application/clients/list-clients.ts` ya tiene el read path.
- `apps/web/src/components/pages/clients-page.tsrx` ya tiene list + search.
- DB: tabla `client` ya existe (migration 001_initial.ts).

## Tasks (un commit por task)

1. **contract**: extender `clientsContract` con `create`, `update`, `remove`.
   - Schemas nuevos: `createClientInputSchema`, `updateClientInputSchema`,
     `removeClientInputSchema`. Re-usan `clientNameSchema`,
     `clientEmailSchema`, `clientPhoneSchema`.
   - Output: `clientSchema` para create/update, `z.object({ ok: true })` para
     remove.

2. **repository**: extender el repo (o crear uno) con
   `insertClient`, `updateClient`, `deleteClient` (soft-delete via
   `client_deleted_at`). Mirror al ListClientsRepository actual.

3. **use case CreateClient + tests**:
   - Validation: name required, email formato válido si presente, phone
     max 40 chars si presente.
   - Error: NotFoundError si falla el insert (no debería).
   - Test: happy path, missing name, invalid email, name too long.

4. **use case UpdateClient + tests**:
   - Error: NotFoundError si el client no existe o no es del user.
   - Test: happy path, not found, empty body (no-op?).

5. **use case DeleteClient + tests**:
   - Soft-delete (set `client_deleted_at = NOW()`).
   - Error: NotFoundError si no existe o ya está borrado.

6. **handlers + routing + composition-root**:
   - `createClientHandler`, `updateClientHandler`, `deleteClientHandler`.
   - Wire en `apps/api/src/http/router.ts` (POST `/clients/create`, etc.).
   - Wire deps en `composition-root.ts`.

7. **ClientForm molecule** (`apps/web/src/components/organisms/client-form/`):
   - Inputs: name (required), email (optional), phone (optional).
   - Mismo patrón que `task-form.tsrx`: drawer right-side, optimistic via
     `crypto.randomUUID()`, rollback on error.
   - Validation client-side antes de submit.

8. **ClientDetailPage** (`apps/web/src/components/pages/client-detail-page.tsrx`):
   - Lee `useParams` → `clientId`.
   - Fetch del cliente via `rpc.clients.get` (necesita una nueva operation,
     o usar `list` + filter).
   - Display: name, email, phone, created_at, "Editar" + "Eliminar" buttons.
   - Edit abre ClientForm en mode edit.
   - Delete abre confirmation modal.

9. **ClientsPage extended**:
   - Botón "+ Nuevo cliente" arriba a la derecha.
   - Cards/rows con hover → click navega a `/clients/:id`.
   - Drawer para crear nuevo.
   - Empty state con CTA al drawer.

10. **Routes**: `apps/web/src/routes/clients/$id.tsrx` con
    `<ClientDetailRoute>` export.

11. **i18n keys** (es.json):
    - `clients.detail.title`, `clients.detail.created`, `clients.detail.edit`,
      `clients.detail.delete`, `clients.detail.confirmDelete`,
      `clients.create.title`, `clients.create.submit`,
      `clients.edit.title`, `clients.edit.submit`,
      `clients.form.errors.nameRequired`, `clients.form.errors.emailInvalid`,
      `clients.form.errors.phoneTooLong`,
      `clients.deleted`.

## Tests

- 5+ tests por use case (Create/Update/Delete)
- Smoke test de los handlers
- Frontend: 3+ tests para el form molecule

## Verificación

- `bun test` verde en apps/api + apps/web
- E2E con playwright-cli: login → /clients → click card → detail →
  edit → save → back → /clients → ver cambios
