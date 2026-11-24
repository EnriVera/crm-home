import { Client } from "pg";
import { E2E_EMAIL_PREFIX } from "./constants";

/**
 * Limpia los datos que el smoke e2e deja en la base.
 *
 * El e2e necesita un usuario real para entrar al dashboard: la API lo
 * siembra al verificar el código (usuario, estados, cuenta, tipos y
 * categorías). Sin esta limpieza, la base de desarrollo se llena de
 * usuarios de prueba.
 *
 * Las pruebas de integración de la API ya tienen su propio aislamiento
 * (`TEST_DATABASE_URL` con sufijo `_test`); esto es el equivalente para el
 * e2e, que sí necesita la base de verdad para que la API funcione.
 *
 * Sólo toca filas cuyo usuario es `e2e-*`: nada más de la base se roza.
 */

const DATABASE_URL =
  process.env.DATABASE_URL ?? "postgres://crm:crm@localhost:5432/crm_home";

/**
 * El orden importa: las claves foráneas apuntan de las tablas hijas a las
 * padres, así que cada hijo se borra antes que su padre. Este orden sale de
 * `information_schema` sobre el esquema real, no de suposición.
 */
const DELETES: { table: string; where: string }[] = [
  // Hijas de `task` y `login`.
  {
    table: "email_sending",
    where: "emse_login_id IN (SELECT logi_id FROM login WHERE logi_email LIKE $1)",
  },
  {
    table: "task_attachments",
    where: "taat_task_id IN (SELECT task_id FROM task WHERE task_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1))",
  },
  // `task` referencia categorías, estados, tipos y clientes.
  {
    table: "task",
    where: "task_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  // `type_categories_client` referencia categorías, clientes y tipos.
  {
    table: "type_categories_client",
    where: "tccl_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  // `categories` referencia `types`.
  {
    table: "categories",
    where: "cate_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "types",
    where: "type_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "client",
    where: "clie_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "task_state",
    where: "tast_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  // `income`, `expense`, `transfer` y `schedule` referencian `accounts`.
  {
    table: "income",
    where: "inco_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "expense",
    where: "expe_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "transfer",
    where: "tran_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "schedule",
    where: "sche_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "accounts",
    where: "acco_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "timer_run",
    where: "timr_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "attachments",
    where: "atta_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "session",
    where: "sess_user_id IN (SELECT user_id FROM \"user\" WHERE user_email LIKE $1)",
  },
  {
    table: "login",
    where: "logi_email LIKE $1",
  },
  { table: '"user"', where: "user_email LIKE $1" },
];

/**
 * Borra los usuarios `e2e-*` y todo lo que cuelga de ellos.
 *
 * No lanza: si la base no está disponible, el test ya falló antes por otra
 * razón y un error de limpieza taparía el diagnóstico real.
 */
export async function cleanupE2eData(): Promise<void> {
  const client = new Client({ connectionString: DATABASE_URL });
  try {
    await client.connect();
    for (const { table, where } of DELETES) {
      await client.query(`DELETE FROM ${table} WHERE ${where}`, [
        `${E2E_EMAIL_PREFIX}-%`,
      ]);
    }
  } catch (error) {
    console.warn("[e2e] no se pudo limpiar la base:", error);
  } finally {
    await client.end().catch(() => undefined);
  }
}
