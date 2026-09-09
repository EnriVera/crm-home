import type { H3Event } from "h3";
import { deleteCookie, getCookie, setCookie } from "h3";

export const SESSION_COOKIE_NAME = "crm_session";
export const SESSION_COOKIE_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;

export function getSessionToken(event: H3Event): string | undefined {
  return getCookie(event, SESSION_COOKIE_NAME);
}

export function setSessionCookie(event: H3Event, token: string): void {
  const secure = process.env.SESSION_COOKIE_SECURE !== "false";
  setCookie(event, SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_COOKIE_MAX_AGE_SECONDS,
    secure,
  });
}

export function deleteSessionCookie(event: H3Event): void {
  deleteCookie(event, SESSION_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.SESSION_COOKIE_SECURE !== "false",
  });
}
