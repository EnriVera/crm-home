# /expenses module (MVP completo)

Mismo patrón que `/incomes` pero para gastos. Sigue el patrón de `/tasks`
y `/clients`.

## Contexto

- `apps/web/src/routes/expenses.tsrx` existe (placeholder, 224 bytes).
- Backend no existe.
- DB: tabla `expense` NO existe. Necesita migration 004_expenses.ts.

## Schema (tabla `expense`)

```sql
CREATE TABLE expense (
  expe_id UUID PRIMARY KEY,
  expe_user_id UUID NOT NULL REFERENCES "user"(user_id),
  expe_acco_id UUID NOT NULL REFERENCES accounts(acco_id), -- cuenta origen
  expe_amount NUMERIC(19, 4) NOT NULL CHECK (expe_amount > 0),
  expe_currency_id UUID NOT NULL REFERENCES currency(curr_id),
  expe_description TEXT,
  expe_category TEXT,
  expe_date DATE NOT NULL,
  expe_receipt_url TEXT, -- opcional, link al comprobante
  expe_created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expe_updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expe_deleted_at TIMESTAMPTZ
)
```

Diferencias vs `income`:

- `expe_receipt_url` (campo opcional para el comprobante).
- `account` es la cuenta **origen** (sale plata) vs income que es destino.

## Tasks (un commit por task)

1. **migration 004_expenses.ts**: crea la tabla + índices.

2. **contract `packages/types/src/contracts/expenses.ts`**:
   - Schemas + operations (list, get, create, update, remove) mismo
     patrón que incomes.

3. **i18n keys**: expenses.page.title, listEmpty, loadError, search,
   fields.amount/date/description/category/account/receiptUrl, etc.

4. **domain port** `apps/api/src/domain/ports/expense-repository.ts`.

5. **repository impl** `apps/api/src/infrastructure/kysely/expense-repository.ts`.

6. **use case ListExpenses + tests**.

7. **use case GetExpense + tests**.

8. **use case CreateExpense + tests**:
   - Validation: amount > 0, account belongs to user + has balance, etc.

9. **use case UpdateExpense + tests**.

10. **use case DeleteExpense + tests**: soft-delete.

11. **HTTP handlers**: `apps/api/src/http/expenses/expenses-routes.ts` +
    wire en router + composition-root.

12. **frontend ExpenseListItem molecule**: amount (red, con signo `-` o
    estilo diferenciado de income), date, description, category, receipt
    icon si tiene receipt_url.

13. **frontend ExpenseForm molecule**: amount, currency, account (origen),
    date, description, category, receiptUrl.

14. **frontend ExpensesPage**: list + search + filter + "+ Nuevo" + empty
    state.

15. **frontend ExpenseDetailPage + route** `/expenses/:id.tsrx`.

16. **Routes wired**: actualiza `apps/web/src/routes/expenses.tsrx`.

17. **rpc.ts**: agrega `expenses` namespace al factory.

## Tests

- 4+ tests por use case
- Frontend: 3+ tests por molecule

## Verificación

- `bun test` verde
- playwright-cli: crear expense → ver en lista → edit → save → ver cambios

## Reuso desde /incomes

Idealmente extraemos los atoms compartidos:

- `apps/web/src/components/atoms/amount-input.tsrx` (con currency prefix).
- `apps/web/src/components/atoms/date-input.tsrx`.
- `apps/web/src/components/molecules/transaction-list-item.tsrx` parametrizable.

Si no, duplicamos los componentes entre incomes/expenses con los ajustes
de estilo (ingreso verde vs gasto rojo). El refactor de DRY lo hacemos en
una 4ta task file después si hay tiempo.
