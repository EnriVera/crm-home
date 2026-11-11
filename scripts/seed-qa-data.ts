// Seed de datos ficticios para inspección visual con moli.
// Uso: bun run scripts/seed-qa-data.ts <session-cookie-file>
interface Wire {
  id?: string;
  [key: string]: unknown;
}
interface AccountWire extends Wire {
  id: string;
}
interface StateWire extends Wire {
  id: string;
}
interface TypeWire extends Wire {
  id: string;
}
interface CategoryWire extends Wire {
  id: string;
}
interface TimerStartWire extends Wire {
  timr_id?: string;
  id?: string;
}

const argv = import.meta.argv as unknown;
const cookieFile =
  (Array.isArray(argv) && (argv as string[])[2]) || "/tmp/moli-cookies.txt";
const cookie = (await Bun.file(cookieFile).text())
  .split("\n")
  .find((l) => l.includes("crm_session"))
  ?.split("\t")
  .pop()
  ?.trim();
if (!cookie) throw new Error("no hay cookie crm_session en " + cookieFile);

const API = "http://localhost:3000";
let ok = 0,
  fail = 0;
const errors: string[] = [];

async function rpc(path: string, body: unknown): Promise<Wire | null> {
  const res = await fetch(`${API}/rpc${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Cookie: `crm_session=${cookie}`,
    },
    body: JSON.stringify({ json: body }),
  });
  const data: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    fail++;
    errors.push(
      `${path} -> HTTP ${res.status} ${JSON.stringify(data).slice(0, 200)}`,
    );
    return null;
  }
  ok++;
  if (data && typeof data === "object" && "json" in data) {
    return (data as { json: Wire }).json;
  }
  return data as Wire;
}

function pick<T extends Wire>(list: T[] | null, pred: (w: T) => boolean): T {
  const found = list?.find(pred);
  if (!found) throw new Error("lookup falló en seed");
  return found;
}

// ---------- lookups ----------
const currencies = (await rpc("/config/listCurrencies", {})) as unknown;
if (!Array.isArray(currencies)) throw new Error("currencies/list no devolvió array");
const ars = pick(currencies as Wire[], (c) => c.name === "Peso argentino");

// ---------- cuentas ----------
const accounts: AccountWire[] = [];
for (const [name, initial] of [
  ["Banco Nación", "450000.00"],
  ["Mercado Pago", "85000.50"],
  ["Efectivo USD", "1200.00"],
] as const) {
  const a = (await rpc("/accounts/create", {
    acco_name: name,
    acco_icon: null,
    acco_color: null,
    acco_currency_id: ars.id,
    acco_initial_amount: initial,
  })) as AccountWire | null;
  if (a) accounts.push(a);
}
const banco = accounts[0];
const mp = accounts[1];
if (!banco || !mp) throw new Error("faltan cuentas");

// ---------- estados de tarea (los defaults del registro) ----------
const stateList = (await rpc("/tasks/states/list", {})) as unknown;
if (!Array.isArray(stateList)) throw new Error("states/list no devolvió array");
const byStateName = (n: string): StateWire =>
  pick(stateList as StateWire[], (s) => s.tast_name === n);
const stPendiente = byStateName("Pendiente");
const stProgreso = byStateName("En progreso");
const stCompletado = byStateName("Completado");

// ---------- tipos ----------
const types: TypeWire[] = [];
for (const name of ["Desarrollo", "Diseño", "Administración", "Soporte"]) {
  const t = (await rpc("/types/create", {
    type_name: name,
    type_modules: [],
  })) as TypeWire | null;
  if (t) types.push(t);
}
const tipoDev = types[0];
const tipoDis = types[1];
if (!tipoDev || !tipoDis) throw new Error("faltan tipos");

// ---------- categorías ----------
const categories: CategoryWire[] = [];
for (const [name, typeId] of [
  ["Backend", tipoDev.type_id],
  ["Frontend", tipoDev.type_id],
  ["Logo", tipoDis.type_id],
  ["Web", tipoDis.type_id],
] as const) {
  const c = (await rpc("/categories/create", {
    cate_name: name,
    cate_type_id: typeId,
  })) as CategoryWire | null;
  if (c) categories.push(c);
}

// ---------- clientes ----------
const clients: Wire[] = [];
for (const [name, email, phone] of [
  ["Estudio Norte", "contacto@estudionorte.com.ar", "+54 9 11 5555 0101"],
  ["Panadería La Miga", "pedidos@lamiga.com", "+54 9 11 5555 0202"],
  ["Consultora Andamio", "hola@andamio.dev", "+54 9 341 555 0303"],
  ["Farmacia Central", null, "+54 9 11 5555 0404"],
  ["Taller Rueda", "taller@rueda.com", null],
] as const) {
  const c = await rpc("/clients/create", {
    client_name: name,
    client_email: email,
    client_phone: phone,
  });
  if (c) clients.push(c);
}
const clNorte = clients[0];
const clMiga = clients[1];
const clAndamio = clients[2];

// ---------- movimientos ----------
const pad = (n: number) => String(n).padStart(2, "0");
function dateIn(monthsAgo: number, day: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(Math.min(day, 28))}`;
}
const incomesSpec = [
  [banco, "350000.00", dateIn(0, 3), "Factura A-1042 Estudio Norte"],
  [banco, "280000.00", dateIn(0, 10), "Factura A-1043 Panadería La Miga"],
  [mp, "95000.00", dateIn(0, 15), "Honorarios consultoría Andamio"],
  [banco, "420000.00", dateIn(1, 5), "Factura A-1038 Estudio Norte"],
  [banco, "310000.00", dateIn(1, 18), "Factura A-1039 La Miga"],
  [mp, "120000.00", dateIn(2, 7), "Soporte mensual Andamio"],
  [banco, "500000.00", dateIn(2, 22), "Proyecto web La Miga"],
  [mp, "60000.00", dateIn(0, 20), "Clases particulares"],
  [banco, "275000.00", dateIn(3, 9), "Factura A-1030 Norte"],
  [mp, "88000.50", dateIn(3, 25), "Mantenimiento mensual"],
] as const;
const expensesSpec = [
  [banco, "45000.00", dateIn(0, 2), "Alquiler oficina"],
  [mp, "12500.00", dateIn(0, 4), "Internet fibra"],
  [mp, "8930.25", dateIn(0, 8), "Supermercado"],
  [banco, "32000.00", dateIn(0, 11), "Monotributo"],
  [mp, "15600.00", dateIn(0, 16), "Combustible"],
  [banco, "7800.00", dateIn(0, 21), "Suscripciones software"],
  [mp, "22000.00", dateIn(1, 6), "Alquiler oficina"],
  [banco, "54000.00", dateIn(1, 14), "Equipamiento"],
  [mp, "11200.00", dateIn(1, 24), "Librería"],
  [banco, "45000.00", dateIn(2, 3), "Alquiler oficina"],
  [mp, "19800.00", dateIn(2, 12), "Seguro notebook"],
  [mp, "6740.00", dateIn(2, 26), "Almuerzos"],
  [banco, "43000.00", dateIn(3, 8), "Alquiler oficina"],
  [mp, "23100.00", dateIn(3, 19), "Impuesto municipal"],
] as const;
for (const [acc, amount, date, desc] of incomesSpec) {
  await rpc("/incomes/create", {
    inco_account_id: acc.acco_id,
    inco_amount: amount,
    inco_currency_id: ars.id,
    inco_description: desc,
    inco_category: null,
    inco_date: date,
  });
}
for (const [acc, amount, date, desc] of expensesSpec) {
  await rpc("/expenses/create", {
    expe_account_id: acc.acco_id,
    expe_amount: amount,
    expe_currency_id: ars.id,
    expe_description: desc,
    expe_category: null,
    expe_date: date,
  });
}
for (const [amount, date, desc] of [
  ["200000.00", dateIn(0, 5), "Reserva mensual"],
  ["150000.00", dateIn(1, 8), "Reserva mensual"],
  ["100000.00", dateIn(0, 18), "Ahorro USD"],
] as const) {
  await rpc("/transfers/create", {
    tran_from_account_id: banco.acco_id,
    tran_to_account_id: mp.acco_id,
    tran_amount: amount,
    tran_currency_id: ars.id,
    tran_description: desc,
    tran_date: date,
  });
}

// ---------- tareas ----------
const catBackend = categories[0];
const tasksSpec = [
  ["Migrar API a orpc v2", "Actualizar todos los contratos y adapters.", stPendiente, tipoDev, catBackend],
  ["Diseñar landing Estudio Norte", "Hero + catálogo de servicios.", stProgreso, tipoDis, categories[3]],
  ["Facturación agosto", "Emitir y enviar las 3 facturas pendientes.", stPendiente, tipoDev, null],
  ["Fix timer en móvil", "El botón de stop se sale del viewport.", stPendiente, tipoDev, catBackend],
  ["Reporte mensual La Miga", "KPIs de ventas + gastos.", stCompletado, tipoDis, null],
  ["Onboarding Farmacia Central", "Cargar catálogo inicial de 200 ítems.", stProgreso, tipoDev, categories[1]],
  ["Backup y DR", "Documentar procedimiento de restore.", stCompletado, tipoDev, catBackend],
  ["Presupuesto Taller Rueda", "Web one-page con turnos online.", stPendiente, tipoDis, categories[3]],
] as const;
for (const [title, desc, state, type, cat] of tasksSpec) {
  await rpc("/tasks/create", {
    task_title: title,
    task_description: desc,
    task_tast_id: state.tast_id,
    task_type_id: type.type_id,
    task_cate_id: cat?.cate_id ?? null,
    task_clie_id: null,
  });
}

// ---------- historial de timer ----------
// El reloj es del servidor (PRD-v4 §8.5): el seed no puede sembrar
// corridas en el pasado, así que el historial queda con las corridas de
// hoy.
for (const title of ["Desarrollo landing", "Soporte Andamio", "Facturación"]) {
  const start = (await rpc("/timers/start", { timer_title: title })) as TimerStartWire | null;
  if (!start) continue;
  const runId = start.timer_id ?? start.timr_id ?? start.id;
  if (!runId) continue;
  await rpc("/timers/heartbeat", { timer_id: runId });
  await rpc("/timers/stop", { timer_id: runId });
}

console.log(`OK=${ok} FAIL=${fail}`);
if (errors.length) {
  console.log("ERRORES:");
  for (const e of errors) console.log(" -", e);
}
