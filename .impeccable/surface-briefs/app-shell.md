# Surface brief — app-shell

**Target:** `apps/web/src/routes/__app-shell.tsrx` + `components/organisms/sidebar-nav`
**Modo:** Operate · **Mundo:** el de `DESIGN.md` (fijado por el usuario).

- **Audiencia/escena:** freelancer en sesión larga de trabajo, desktop-first;
  entra y sale de secciones decenas de veces al día.
- **Job:** llegar a cualquier sección del árbol §7 en un click; saber siempre
  dónde está parado; recuperar ancho de trabajo cuando lo necesita.
- **Acción:** navegar (anchors MPA); colapsar el sidebar; alternar tema.
- **Contenido:** árbol canónico PRD §7 (Dashboard, Tareas, Schedule, Clients,
  Finance → Income/Expenses/Transfers, Config), labels i18n `nav.*`.
- **Constraints:** WCAG 2.2 AA (skip-link, `aria-current`, foco visible,
  teclado completo), ambos temas, MPA sin router cliente (estado vía
  `localStorage`), placeholder pages sin lógica de módulos.
- **Decisión memorable:** sidebar colapsable 260px ↔ 64px (ícono+label ↔
  ícono solo), estado persistido; nav activo derivado de `props.url`.

## Direction contract

THESIS: nav lateral estándar ejecutado con precisión — la herramienta
desaparece; se rechaza cualquier nav "creativo" o panel decorado.
OWN-WORLD: neutrales `background`/`surface`, un acento verde solo en item
activo (`primary-700` claro / `primary-400` oscuro) y acciones; íconos phosphor
de 20px, radio único, sin sombras.
STORY: el usuario ve el árbol completo de un vistazo, reconoce dónde está por
el activo + `aria-current`, y trabaja; el colapso le devuelve ancho.
FIRST VIEWPORT: sidebar 260px a la izquierda con árbol §7 (Finance como grupo
no clicable con 3 hijos), skip-link invisible hasta foco, `<main>` con
placeholder centrado y mucho aire; toggle de tema y de colapso al pie del
sidebar.
FORM: patrón estándar de app de gestión, de la lista propia (mundo fijado por
el usuario; brief-pinned, sin ronda de direcciones).
FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, DESIGN.md, and every shipping raster carrying its
provenance.
