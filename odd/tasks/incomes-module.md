# /incomes module (MVP completo)

Implementa desde cero el módulo `/incomes` (placeholder route existe).
Sigue el patrón de `/tasks` y `/clients`.

## Contexto

- `apps/web/src/routes/incomes.tsrx` existe (placeholder, 222 bytes).
- Backend no existe — hay que crear todo.
- DB: tabla `incomes` NO existe. Necesita migration 003_incomes.ts.

## Schema (tabla `income`)

```sql
CREATE TABLE income (
  inco_id UUID PRIMARY KEY,
  inco_user_id UUID NOT NULL REFERENCES "user"(user_id),
  inco_acco_id UUID NOT NULL REFERENCES accounts(acco_id), -- cuenta destino
  inco_amount NUMERIC(19, 4) NOT NULL CHECK (inco_amount > 0),
  inco_currency_id UUID NOT NULL REFERENCES currency(curr_id),
  inco_description TEXT,
  inco_category TEXT, -- libre por ahora (no FK a tabla categories)
  inco_date DATE NOT NULL,
  inco_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inco_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  inco_deleted_at TIMESTAMPTZ
)
```

## Tasks (un commit por task)

1. **migration 003_incomes.ts**: crea la tabla + índices
   (`idx_income_user`, `idx_income_date`).

2. **contract `packages/types/src/contracts/incomes.ts`**:
   - Schemas: `incoAmountSchema`, `incoDateSchema`, `incoDescriptionSchema`,
     `incoCategorySchema`, `incomeSchema`.
   - Operations: `list` (search + limit + date range), `get`, `create`,
     `update`, `remove`.

3. **i18n keys (es.json)**: incomes.page.title, listEmpty, loadError,
   search.placeholder, fields.amount/date/description/category/account,
   create.title, edit.title, delete.confirm.

4. **domain port** `apps/api/src/domain/ports/income-repository.ts`.

5. **repository impl** `apps/api/src/infrastructure/kysely/income-repository.ts`:
   listByUser, findById, insert, update, softDelete (set inco_deleted_at).

6. **use case ListIncomes + tests**: filter by userId + search + date range.

7. **use case GetIncome + tests**.

8. **use case CreateIncome + tests**:
   - Validation: amount > 0, account exists + belongs to user, currency
     exists, date not too far in future (≤ today).

9. **use case UpdateIncome + tests**: same validations + ownership check.

10. **use case DeleteIncome + tests**: soft-delete.

11. **HTTP handlers**: `apps/api/src/http/incomes/incomes-routes.ts` +
    wire en router + composition-root. Mismo patrón wrap que
    `clients-routes.ts`.

12. **frontend IncomeListItem molecule**:
    - Amount (formateado con currency symbol).
    - Date (locale es).
    - Description + category (muted si null).
    - Account name (lookup vía `accounts` module — o string por ahora).

13. **frontend IncomeForm molecule**:
    - Inputs: amount (number), currency (select, default user primary),
      account (select, requiered — list via `rpc.accounts.list` o similar),
      date (date input, default today), description (textarea), category
      (text input optional).
    - Drawer right-side, optimistic, rollback.

14. **frontend IncomesPage**:
    - List + search + filter by date range.
    - "+ Nuevo" button.
    - Empty state.

15. **frontend IncomeDetailPage + route**:
    - `/incomes/:id.tsrx`.
    - Display full income + Edit + Delete.

16. **Routes wired**: actualiza `apps/web/src/routes/incomes.tsrx` para
    usar `<IncomesPage />`.

17. **rpc.ts**: agrega `incomes` namespace al factory.

## Tests

- 4+ tests por use case
- Frontend: 3+ tests por molecule

## Verificación

- `bun test` verde
- playwright-cli: crear income → ver en lista → edit → save → ver cambios
