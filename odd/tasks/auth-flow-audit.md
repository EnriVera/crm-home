# Auth flow audit + improvements

Auditoría completa del flujo de autenticación con playwright-cli.
Happy path ya verificado end-to-end:

```
✅ Anonymous /login → renderiza form (1 campo email + botón Continuar)
✅ Submit email → POST /rpc/auth/requestOtp → navega a /login-verification?email=...
✅ OTP email llega a mailpit (codificado quoted-printable — normal SMTP, NO bug)
✅ Tipear 120075 en los 6 boxes → POST /rpc/auth/verifyOtp → cookie crm_session seteado
✅ Redirige a /dashboard, 0 console errors
```

## Gaps identificados

1. **NO HAY UI para logout** 🔴
   - Endpoint `/api/auth/logout` existe (auth-routes.ts:91-103)
   - El use case `Logout` está completo con test
   - El shell (`__app-shell.tsrx`) NO tiene botón "Salir"
   - El sidebar (`sidebar-nav.tsrx`) NO tiene botón logout
   - **Impacto**: usuario no puede terminar sesión sin borrar cookies del browser
   - **Fix**: botón "Salir" en el header del shell (a la derecha, junto al toggle de tema)

2. **Session expiry UX** 🟡
   - 401 interceptor redirige a `/login?reauth=1` (verificado en rpc.ts)
   - El user NO sabe POR QUÉ se le pidió re-login (cookie expired? sesión borrada del server? sesión revocada?)
   - **Fix opcional**: cuando `?reauth=1`, mostrar mensaje i18n "Tu sesión expiró, ingresá de nuevo" en lugar del form normal

3. **Logout button en sidebar vs header** 🟢 (decisión de design)
   - Sidebar es el lugar canónico (sidebar-nav.tsrx ya tiene el toggle de colapso)
   - Header del shell es más visible
   - **Decisión**: sidebar (consistencia con el patrón de items colapsables)

4. **Logout flow: redirect + cookie cleanup** 🟢
   - Endpoint hace deleteCookie + soft-delete session
   - Frontend debe navegar a /login después de logout
   - **Edge case**: si el server está caído, el logout local debe limpiar el cookie y navegar igual

## Tasks (un commit por task)

1. **Logout UI**: agregar botón "Salir" en sidebar-nav.tsrx
   - Icono (logout icon del set)
   - Click → llama `rpc.auth.logout()` → redirige a /login
   - Solo visible cuando hay sesión (sidebar de auth NO)
   - Test: el i18n key existe, el componente compila

2. **Session expiry message**: mostrar mensaje cuando `?reauth=1`
   - LoginPage detecta query param `?reauth`
   - Si true: muestra banner arriba del form "Tu sesión expiró"
   - i18n key nueva: `auth.login.sessionExpired`
   - Test: el render condicional funciona

3. **Logout edge case**: logout aunque el server falle
   - El handler del botón debe hacer logout local (clear cookie via document.cookie o via el endpoint)
   - Try/catch para errores de red
   - Navigate a /login siempre

4. **Verificación final con playwright**:
   - Login → /dashboard
   - Click logout → /login
   - Intentar /dashboard otra vez → redirige a /login (cookie ya no está)
   - Logout + cookie manual → intentar /dashboard → 401 → /login?reauth=1
   - /login?reauth=1 → muestra mensaje de sesión expirada

## Verificación

- `bun test` verde (api + web)
- playwright-cli:
  - login → /dashboard: ✅ (ya hecho)
  - logout → /login: NUEVO
  - /dashboard sin cookie → redirige: NUEVO
  - session expiry message: NUEVO
