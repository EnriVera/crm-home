# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Definido en `docs/PRD-v2.md` §10 (decisión ya tomada, no delegada): monolito-monorepo con turborepo; backend nitro + h3 + orpc + kysely + PostgreSQL sobre bun; frontend octanejs (tsrx) + vite + tailwindcss + zagjs + suite tanstack. Reglas arquitectónicas vinculantes: ports & adapters en backend y wrappers de librerías en frontend — ninguna herramienta de terceros se importa desde la lógica de negocio.

## Users

- **Primario:** freelancer / consultor independiente que trabaja con varios clientes y hoy gestiona tareas (Trello), tiempo (Toggl/Clockify) y finanzas (Excel/Notion) en herramientas fragmentadas. Su trabajo: ejecutar tareas, trackear su tiempo y entender su rentabilidad sin duplicar carga de datos.
- **Secundario:** profesional que quiere CRM + time-tracking + finanzas personales unificado, aunque no facture por hora.

## Product Purpose

Una sola aplicación web donde tareas, tiempo trackeado y movimientos de dinero comparten los mismos tipos, categorías y clientes. Responde dos preguntas sin exportar nada: "¿en qué se me fue el día?" y "¿qué cliente me deja más plata?".

Éxito medible (PRD §4): primer timer trackeado dentro de las 24 hs de registrado; retención ≥ 4 días/semana con actividad; ≥ 60% de tareas completadas con tiempo asociado; ≥ 5 movimientos financieros/semana por usuario activo (Fase 2).

## Positioning

A diferencia de las herramientas puntuales que el usuario combina hoy, CRM-HOME conecta nativamente qué hace, cuánto tiempo le lleva y cuánto dinero genera, sobre el mismo modelo de datos — la rentabilidad por cliente es una consulta, no una exportación.

## Operating Context

- Uso web desktop-first, responsive (sin app mobile nativa — no-goal explícito).
- El timer es un ritual central del día: arranca/para muchas veces, debe sobrevivir cierres de browser y cruce de medianoche (heartbeat por websocket cada 30 s).
- Producto multi-user con aislamiento total por usuario; sin colaboración ni workspaces (no-goal).
- Registro implícito passwordless: el primer OTP validado crea la cuenta y siembra datos por defecto.
- Páginas legales públicas (términos, privacidad, cookies) con aceptación registrada al registrarse.

## Capabilities and Constraints

- **Fase 1 (MVP):** login OTP, config (usuario, apariencia, tipos, categorías, cuentas, apps, monedas, adjuntos), clients, tasks (grilla/kanban/lista con drag & drop), schedule (timer + historial + gráfico), dashboard mínimo, modo oscuro persistido en cuenta, páginas legales, telemetría backend OpenTelemetry (OTLP vendor-neutral).
- **Fase 2:** finance completo (income, expenses, transfers), dashboard financiero, adjuntos en todos los módulos, re-aceptación de términos versionados.
- **Fase 3:** reportes avanzados, más módulos vía tabla `apps`, telemetría frontend.
- **No-goals:** app mobile nativa, conversión de monedas, facturación electrónica/invoices, colaboración entre usuarios, notificaciones push.
- **Idioma de UI:** español por defecto, con todas las cadenas en i18next desde el día uno (listo para sumar inglés sin refactor).
- **Moneda default del seed:** ARS para la cuenta "Efectivo" inicial (el usuario puede crear cuentas en otras monedas).
- **Decisiones abiertas:** redacción final de textos legales (pendiente revisión profesional), backend de observabilidad en producción.

## Brand Commitments

Vinculantes por decisión del usuario (PRD §9):

- Diseño **minimalista**: mucho aire, una acción primaria por pantalla, sin ornamento.
- **Color primario verde**, definido como token semántico con valores por tema (referencia `#16a34a` claro / `#22c55e` oscuro).
- **Tipografía Poppins** (`@fontsource/poppins`, pesos 400/500/600/700).
- **Modo oscuro** soportado en toda la app, configurable en Config → apariencia.

## Evidence on Hand

- `docs/PRD-v2.md` — PRD corregido por revisión dual (schema SQL, auth, reglas de negocio, marco de producto). Fuente única de verdad del producto.
- `docs/PRD.md` — versión original (histórico).
- No hay código, diseños, testimonios ni contenido legal final: el trabajo futuro no debe fabricarlos.

## Product Principles

1. **Un solo modelo de datos para trabajo, tiempo y dinero** — toda feature que rompa esa conexión va contra el producto.
2. **El timer nunca pierde tiempo** — la confianza en el tracking es la activación.
3. **Aislamiento de herramientas** — cambiar una librería o proveedor es cambiar un adapter, nunca el negocio.
4. **Multi-user con aislamiento total** — ninguna query cruza usuarios, jamás.
5. **Saldos y estado calculados, no mutados** — editar o borrar nunca requiere "revertir" nada.

## Accessibility & Inclusion

Compromiso **WCAG 2.2 AA**: contraste suficiente (incluye ambos temas), foco visible, navegación completa por teclado (crítico en kanban drag & drop), labels y roles correctos. La base de zagjs ayuda pero no exime de auditar.
