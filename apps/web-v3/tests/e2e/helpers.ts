/**
 * Helpers del smoke e2e.
 *
 * El código de acceso no se inventa: se pide a la API y se lee del email
 * que la app manda, igual que lo haría la persona usuaria. Por eso el
 * e2e necesita Mailpit (el job `e2e` del workflow lo levanta).
 */
import { expect, type Page } from "@playwright/test";
import { E2E_EMAIL_PREFIX } from "./constants";

const MAILPIT_URL = process.env.MAILPIT_URL ?? "http://localhost:8025";

/** Un email que no existe en la base: la API crea el usuario al verificar. */
export function uniqueEmail(prefix: string = E2E_EMAIL_PREFIX): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.com`;
}

interface MailpitMessage {
  ID: string;
  To?: { Address: string }[];
  Subject?: string;
}

async function mailpitMessages(): Promise<MailpitMessage[]> {
  const response = await fetch(`${MAILPIT_URL}/api/v1/messages?limit=200`);
  if (!response.ok) {
    throw new Error(`Mailpit respondió ${response.status}`);
  }
  const body = (await response.json()) as { messages?: MailpitMessage[] };
  return body.messages ?? [];
}

/**
 * Espera el email con el código y devuelve el código de 6 dígitos.
 *
 * La cola de `email_sending` la drena la API, así que el correo tarda
 * en llegar: se reintenta hasta `timeoutMs`.
 */
export async function waitForOtpCode(
  email: string,
  timeoutMs = 30_000,
): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const messages = await mailpitMessages();
    const mine = messages.find((message) =>
      message.To?.some((recipient) => recipient.Address === email),
    );
    if (mine) {
      const response = await fetch(
        `${MAILPIT_URL}/api/v1/message/${mine.ID}`,
      );
      const body = (await response.json()) as { Text?: string };
      const code = body.Text?.match(/(?<!\d)(\d{6})(?!\d)/)?.[1];
      if (code) return code;
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`El código de acceso para ${email} no llegó a tiempo`);
}

/**
 * El camino completo de login: pide el código, lo tipea y entra.
 *
 * Devuelve el código usado, por si el test quiere assertar sobre él.
 */
export async function login(page: Page, email: string): Promise<string> {
  await page.goto("/login");
  await page.getByRole("textbox", { name: /email/i }).fill(email);
  await page.getByRole("button", { name: /enviar código/i }).click();

  // `click()` no espera el POST: la vista cambia a la de verificación recién
  // cuando llega la respuesta. Sin esta espera, la aserción siguiente
  // compite contra la navegación.
  await page.waitForURL(/\/login-verification/);

  await expect(page.getByTestId("otp-cell-0")).toBeVisible();
  const code = await waitForOtpCode(email);

  // `fill()` no sirve: cada celda tiene `maxlength="1"` y el navegador
  // trunca el valor a un dígito. Se tipea, que además es lo que hace la
  // persona (el input auto-avanza de celda en celda).
  await page.getByTestId("otp-cell-0").click();
  await page.keyboard.type(code);
  await page.getByRole("button", { name: /^verificar$/i }).click();

  await expect(page).toHaveURL(/\/dashboard/);
  return code;
}
