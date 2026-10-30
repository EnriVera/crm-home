# /incomes — módulo de ingresos (web-v3)

Pantalla de ingresos del estudio (PRD-v4 §8.7 + §9.2). Es la primera de
las tres de finanzas: **ingresos** está entregado; **gastos** y
**transferencias** quedan como "en construcción" hasta que se armen con el
mismo patrón.

> El doc anterior (`odd/tasks/incomes-module.md`) era del stack viejo
> (`apps/web`, tabla `incomes`, backend inexistente). Este describe lo que
> está construido hoy sobre `apps/web-v3` + la API de `apps/api`.

## Lo que hay hoy

| Capa | Pieza |
| --- | --- |
| API | `incomes/list|get|create|update|remove` (ya existían), `accounts/list|create` (nuevo) |
| Contrato | `packages/contract/src/finance` (`incomesContract`, `accountsContract`) |
| Web (dominio) | `app/domain/finance/entities.ts` — `Income`, `Account`, formateo de dinero y fechas |
| Web (infra) | `app/infrastructure/finance/orpc-finance.ts` — el único lugar que habla con la API de dinero |
| Web (estado) | `app/shared/composables/use-incomes.ts` |
| Web (UI) | `ui/views/incomes.vue`, `ui/organisms/finance-drawers/income-drawer.vue`, `ui/organisms/finance-drawers/account-drawer.vue`, `ui/molecules/account-icon.vue` |

## Decisiones

### 1. La pantalla muestra lo que la API tiene

El catálogo (`ingresos.png`) muestra columnas **CLIENTE** y **ESTADO**, y el
drawer muestra **Cliente (opcional)** y **Estado de cobro**. La tabla
`income` no tiene columna de cliente ni de estado (el PRD-v2 §8.6 lo
reconoce: el estado semars en §17 pero la migración nunca lo agregó).

Regla que se sigue (la del audit de la app): *si no hay dato, no se dibuja*.

- La tabla muestra FECHA · CONCEPTO · CUENTA · MONTO.
- El drawer tiene Monto, Concepto, Cuenta destino y Fecha.
- El **estado de cobro** y el **cliente** quedan fuera hasta que la base
  los tenga (serían una columna + un link, no un ajuste de UI).

### 2. La moneda se deriva de la cuenta

El wire exige `inco_currency_id` y el catálogo muestra la moneda como un
label ("ARS") al lado del monto, no como un control. El drawer lo deriva
de la cuenta elegida: la plata que entra a una cuenta es de la moneda de
esa cuenta.

Cada fila muestra el símbolo de **su** moneda (un ingreso puede estar en
una moneda distinta de otro). Los totales de las tarjetas se muestran en
la moneda del primer ingreso: mezclar monedas en un total sería mentir.

### 3. La categoría no se muestra en ingresos

`inco_category` es texto libre y el catálogo no la tiene en la tabla de
ingresos (sí en gastos, como chip). Queda disponible en la API sin
usar en esta pantalla.

### 4. Un solo campo de texto (Concepto)

El catálogo tiene "Concepto" y "Nota" en el drawer, pero el wire tiene un
solo campo de texto (`inco_description`). Se dibuja **Concepto** (que es lo
que muestra la tabla) y la Nota queda fuera: no hay dónde guardarla.

### 5. Las cuentas: módulo mínimo nuevo

La API no tenía nada de cuentas (tabla `accounts` vacía, sin endpoints) y
el ingreso **exige** `inco_account_id`. Se agregó la superficie mínima:

- `GET /rpc/accounts/list` → las cuentas con su **balance calculado**.
- `POST /rpc/accounts/create` → nombre, tipo (ícono), moneda, saldo
  inicial y color.

El balance se calcula en la query del list (PRD-v2 §8.6 "Saldos
calculados, no mutados"):

```
balance = saldo inicial + Σ ingresos − Σ gastos + Σ transferencias entrantes − Σ transferencias salientes
```

Un usuario nuevo recibe la cuenta "Efectivo" del seed, así que el drawer
de ingreso siempre tiene una cuenta disponible; si no hay ninguna, el
drawer ofrece crear una (abre el drawer de cuenta encima).

### 6. Las fechas viajan como "YYYY-MM-DD"

`pg` devuelve las columnas DATE como `Date` y el JSON salía como timestamp
ISO ("2026-10-30T03:00:00.000Z"), que no entra en un `input type="date"`
y además corría el día en las zonas horarias negativas. Ahora el mapper
normaliza con `toDateString` (hora local) y las escrituras mandan el
literal con `::date` (un `Date` de medianoche UTC se correría un día).

### 7. El monto acepta coma o punto

En es-AR la coma es el separador decimal: "1250,50" es un monto válido y
el botón de guardar se habilita. El valor se normaliza a punto antes de
mandarlo (el contrato lo quiere con punto).

## Pantalla

- Header: "Ingresos" + "Cobros y facturación del estudio" + acción
  primaria "+ Nuevo ingreso".
- Tres tarjetas: **Ingresos del mes** (con la cantidad de movimientos),
  **Ticket promedio** y **Último ingreso** (fecha + concepto).
- BaseView con grilla (cards) y lista (la tabla del catálogo), buscador por
  concepto.
- El borrado pide confirmación inline (mismo patrón que el drawer de
  clientes): la papelera abre "¿Eliminar {concepto}?" y sólo el "Sí,
  eliminar" borra.

## Verificación

- `bun run test` (web-v3): 176 tests en verde.
- `bun run typecheck` + `bun run lint`: limpios.
- API: 297 tests en verde.
- Runtime (navegador + Postgres real): alta de ingreso con el drawer
  (monto con coma incluido), lista con la fila y la tarjeta, borrado con
  confirmación, y el balance de la cuenta actualizado por la API
  (250 + 1250,50 = 1500,50).

## Lo que falta (para gastos y transferencias)

El patrón está armado; falta replicarlo:

- **Gastos**: mismo dominio + `expe_*`, con la categoría como texto libre
  (el catálogo la muestra como chip con color) y el comprobante
  (`expe_receipt_url`).
- **Transferencias**: `tran_from_acco_id` / `tran_to_acco_id`, con el
  selector de origen/destino, el aviso ámbar de "sin conversión aplicada"
  cuando las monedas coinciden y la previsualización de saldos (el balance
  ya está calculado en la API).
