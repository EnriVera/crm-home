import type { H3Event } from "h3";
import { getHeader } from "h3";
import { Unauthorized } from "../domain/errors";

/**
 * El `userId` del request.
 *
 * El dispatcher (o el wrapper legacy) resuelve la sesión del cookie
 * `crm_session` y mete el userId en el header `x-user-id`: los handlers no
 * leen cookies, leen el header. Sin ese header el request no tiene
 * identidad y se rechaza.
 */
export function readUserId(event: H3Event): string {
  const userId = getHeader(event, "x-user-id");
  if (!userId) {
    throw new Unauthorized("Missing X-User-Id header");
  }
  return userId;
}
