# /expenses y /transfers — los otros dos módulos de finanzas (web-v3)

Compañero de `odd/tasks/web-v3-incomes.md`: mismo patrón, misma capa
compartida (`useFinanceCatalogs`, dominio de finanzas, adapter de finanzas).

## Lo que hay hoy

| Módulo | Piezas |
| --- | --- |
| /expenses | `ui/views/expenses.vue`, `ui/organisms/finance-drawers/expense-drawer.vue` |
| /transfers | `ui/views/transfers.vue`, `ui/organisms/finance-drawers/transfer-drawer.vue` |
| Compartido | `app/domain/finance/entities.ts`, `app/shared/composables/use-finance-catalogs.ts`, `app/infrastructure/finance/orpc-finance.ts` |
| API | `expenses/*` y `transfers/*` (ya existían), más la validación de propiedad de las cuentas |

## Decisiones

### 1. Las pantallas muestran lo que la API tiene

Igual que en ingresos: el catálogo muestra la columna **ESTADO**
(Pagado/Pendiente) y el drawer un "Estado de pago", y la tabla `expense`
no tiene esa columna. No se dibuja.

Los **tipos** del catálogo (`expe_type_id` con punto de color) tampoco
existen en la base: la categoría del gasto es texto libre.

### 2. La categoría es texto libre (con datalist)

`expe_category` es TEXT. El catálogo la dibuja como un chip con color
(que viene de una categoría real), así que:

- El drawer la pide como texto con un `<datalist>` de las categorías que
  ya usa el usuario (mismo criterio que el buscador).
- La tabla la muestra como chip con el color de la paleta de datos, y el
  color se deriva del texto de la categoría (hash estable) para que el
  mismo texto sea siempre el mismo color.

### 3. La transferencia no convierte

El drawer muestra el aviso ámbar "Las monedas coinciden (ARS → ARS). Sin
conversión aplicada" (catálogo) y, si difieren, que el monto se guarda en
la moneda del origen sin conversión. La API no tiene motor de conversión
(PRD-v2 §8.6: la conversión de monedas está fuera del MVP).

El saldo que se muestra (el "Disponible" del origen y el "Saldo actual"
del destino) sale del balance que calcula la API; la previsualización
("Origen quedará en $ X · Destino en $ Y") es ese balance ± el monto.

### 4. Las dos cuentas de una transferencia tienen que ser del usuario

La FK sólo garantiza que la cuenta exista: sin validación, una
transferencia podía mover plata entre cuentas de otro usuario. La API
valida la propiedad de las cuentas (y de la moneda) en el alta y en la
edición de ingresos, gastos y transferencias
(`application/shared/finance-validation.ts`).

## Verificación

- web-v3: typecheck, lint y la suite de tests en verde.
- API: 301 tests en verde (incluye el caso de una cuenta ajena).
- Runtime (navegador + Postgres real): alta, edición y borrado con
  confirmación de las dos pantallas; el balance de las cuentas se actualiza
  después de cada movimiento.
