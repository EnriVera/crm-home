/**
 * Lógica pura del estado activo del nav (D3). Deriva de `props.url`
 * (`RenderRouteProps.url`, idéntico en SSR e hidratación) — sin
 * `window.location` (SSR-safe, sin mismatch de hidratación).
 */

/** Extrae el pathname de una url (`pathname + search`, origin-free). */
export function pathnameOf(url: string): string {
 return url.split("?")[0] ?? url;
}

/** Item activo: match EXACTO de pathname (sin prefijos). */
export function isItemActive(pathname: string, href: string): boolean {
 return pathname === href;
}

/** Grupo activo: alguno de sus hijos está activo. */
export function isGroupActive(
 pathname: string,
 children: ReadonlyArray<{ href: string }>,
): boolean {
 return children.some((child) => isItemActive(pathname, child.href));
}
