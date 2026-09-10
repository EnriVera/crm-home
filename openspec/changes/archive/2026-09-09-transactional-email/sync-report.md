# Sync Report — transactional-email

> Archive-time sync fallback ejecutado con aprobación explícita del
> parent/orchestrator (el native status indicaba `sync-report.md` ausente y
> `archive: ready`). Change: `transactional-email` · Branch: `develop` ·
> Date: 2026-09-09.

## Status

- **Sync verdict:** ✅ success
- **Archive-time fallback:** approved by parent prompt
- **Same-domain active changes:** ninguna
- **Destructive merges (REMOVED requirements):** ninguno

## Dominios sincronizados

| Dominio | Operación | Ruta canónica |
| -------- | ----------- | ---------------- |
| `email` | NEW full spec copiado | `openspec/specs/email/spec.md` |
| `api-auth` | 3 requirements MODIFIED, ya en sync semántico con la canónica | `openspec/specs/api-auth/spec.md` |
| `workspace` | 1 requirement MODIFIED (Verificación y pinning) extendido; 1 requirement MODIFIED (Tooling de entorno) ya en sync | `openspec/specs/workspace/spec.md` |

## Requirement deltas aplicados

### ADDED (en canónica)

- `email` (dominio nuevo, 4 requirements completos):
  - **Paquete @crm/email con plantillas .tsrx precompiladas a JS**
  - **Tooling de desarrollo y exportación con @octanejs/email-cli**
  - **Plantilla OTP con copy en español y fallback de texto plano**
  - **Snapshot del render de la plantilla OTP**

### MODIFIED (en canónica)

- `api-auth`: **Solicitud de OTP con rate-limit y encolado de email** — bloque
  canónico reemplazado para incluir el puerto `EmailTemplateRenderer` y la
  persistencia del HTML renderizado (delta ya estaba sincronizado por el commit
  `6af90cc` durante la fase apply; verificado semánticamente).
- `api-auth`: **Puerto EmailSender con adapters consola/SMTP y task de drenaje**
  — bloque canónico reemplazado: `send({ from, to, subject, body, html?, text? })`,
  selector `createEmailSender(env)` por `SMTP_URL`, semántica de retry, 6
  scenarios (delta ya estaba sincronizado por el commit `6af90cc`; verificado
  semánticamente).
- `api-auth`: **Puertos de dominio y casos de uso puros para auth** — bloque
  canónico reemplazado: lista de puertos extendida con `EmailTemplateRenderer`,
  prohibición ampliada a `@octanejs/email` y nodemailer (delta ya estaba
  sincronizado por el commit `6af90cc`; verificado semánticamente).
- `workspace`: **Verificación y pinning de versiones (bloqueante)** — bloque
  canónico reemplazado: cuerpo extiende la regla a cualquier dependencia nueva
  introducida por un change (no sólo el scaffold), escenarios `Dependencias de
  email verificadas antes del commit` y `Escalación si una dependencia nueva
  del change no resuelve` añadidos.
- `workspace`: **Tooling de entorno (docker-compose, .env.example,
  .gitignore, Makefile)** — bloque canónico reemplazado para añadir el servicio
  `mailpit`, targets `mail-up`/`mail-down`/`up`/`down` y `SMTP_URL`
  documentado (delta ya estaba sincronizado por el commit `530bd22`; verificado
  semánticamente).

### REMOVED

- Ninguno.

## Notas de merge

- El dominio `email` no existía en `openspec/specs/`; el full spec del change
  se copió como spec canónica del dominio. Adaptaciones aplicadas sobre el
  delta:
  - Encabezado cambiado a `# Email Specification` (sin prefijo `# Delta for
    email`).
  - Descripción del `>` de cabecera extendida con referencias a design D1, D2,
    D4 y §3.
  - Body del requerimiento "Paquete @crm/email..." añade `vite` modo
    librería con plugin `octane/compiler/vite` y `dist/index.d.ts`,
    alineado con la estrategia D1 consolidada.
  - Body del requerimiento "Tooling de desarrollo..." concreta
    `tsrx-tsc --noEmit -p tsconfig.typecheck.json`.
- En `workspace`, el requisito "Verificación y pinning de versiones
  (bloqueante)" se generalizó para cubrir **cualquier dependencia nueva**
  introducida por un change (no solo email): el escenario
  `Dependencias de email verificadas antes del commit` queda como instanciación
  concreta del patrón general; el escenario `Escalación si una dependencia
  nueva del change no resuelve` sustituye al específico del delta y mantiene el
  mismo espíritu. Los marcadores `(Previously: ...)` del delta se omitieron en
  la canónica por convención de no arrastrar metadatos de delta.
- En `api-auth`, los tres requisitos MODIFIED ya estaban sincronizados
  semánticamente en la canónica por los commits de apply (`6af90cc`,
  `ad30797`); las diferencias residuales respecto al delta son de formato y
  orden de cláusulas dentro del mismo bloque (`pi-lens` Markdown cleaner),
  sin cambio semántico. Los marcadores `(Previously: ...)` del delta tampoco
  están en la canónica por la misma convención.
- Todos los requisitos canónicos no mencionados por los deltas (en
  particular, los 6 requisitos restantes de `api-auth`, los 4 requisitos
  restantes de `workspace` además de los modificados) se preservaron sin
  cambios.
- Ningún bloque de requisito fue eliminado.
- `pi-lens` Markdown cleaner aplicó formato automático a los archivos
  tocados; el contenido semántico no cambió.

## Advertencias

- Ningún active same-domain change detectado (`openspec/changes/` solo contiene
  `transactional-email/` y `archive/`).
- Ninguna remoción destructiva de requisito canónico.
- Aprobación de merge destructivo: no requerida (no hay REMOVED ni bloques
  MODIFIED de gran tamaño en líneas).

## Siguiente paso

Escribir `archive-report.md` y mover el change a
`openspec/changes/archive/2026-09-09-transactional-email/` tras confirmar el
Final Task Completion Gate (0 unchecked en `tasks.md`).
