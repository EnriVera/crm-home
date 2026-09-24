# Tasks flow UX polish (impeccable)

Fecha: 2026-09-23
Owner: el Gentleman

## Objetivo

1. Convertir el create-task panel en un **drawer lateral derecho real** (slide-in) con backdrop y Esc/click-outside para cerrar.
2. Mejorar el empty state "No hay estados configurados" con CTA a `/tasks-config` (botón verde + link) — el Operate/Refine mindset de la skill impeccable dice "empty states should teach the interface, not say 'nothing here'".
3. Aplicar el design system del repo (Poppins, verde primary, minimalismo, dark mode).

PRD §9 — Vinculante: "una acción primaria por pantalla, sin ornamento". El estado vacío debe enseñar la próxima acción, no un mensaje plano.

## Fases

### Fase 1 — Empty state con CTA

- [ ] Reemplazar el `<p data-slot="no-states">` por un empty state rico:
  - icono (octane / lucide — sin paquete extra si uso un SVG inline)
  - headline "No hay estados configurados"
  - description "Las tareas se organizan en columnas (Pendiente, En progreso…). Configurá al menos uno para empezar."
  - primary button "Configurar estados" → `/tasks-config` (verde, primary)
  - secondary link "Cancelar" (vuelve a la lista de tasks)
- [ ] Mantener accesibilidad: focus visible, `aria-live` o `role="status"` para que el screen reader lo anuncie.

### Fase 2 — Right-side drawer real

- [ ] Convertir el `<aside>` actual en un drawer con:
  - `fixed top-0 right-0 h-screen w-[min(480px,90vw)] bg-surface border-l border-border shadow-2xl z-40`
  - slide-in: `transform translate-x-0 transition-transform duration-200 ease-out` cuando `creatingOpen=true`, `-translate-x-full` cuando false
  - backdrop: `<div class="fixed inset-0 bg-black/40 z-30">` con click → close
  - backdrop debe renderizarse solo cuando `creatingOpen=true`
  - Escape key → close (useEffect con keydown listener)
  - `aria-modal="true"`, `role="dialog"`, `aria-labelledby` apuntando al header
  - focus management: focus el primer input (title) al abrir; trap focus dentro del panel (Octane provee? — si no, lo dejo como follow-up)
- [ ] Reemplazar el "×" plain text por un `Button` atom con icono X
- [ ] Header sticky: title a la izquierda, close button a la derecha
- [ ] Body scrollable: `overflow-y-auto` con padding generoso
- [ ] Footer con acciones "Cancelar" y "Crear tarea" (primary verde)

### Fase 3 — Compatibilidad con form existente

- [ ] El form sigue siendo el mismo `<TaskForm>` actual (no reescribirlo)
- [ ] `onCancel` se conecta a close del drawer
- [ ] Después de submit exitoso: cerrar drawer + refrescar lista
- [ ] Validación: required fields, isFormReadyToSubmit ya chequea — verificar que el botón esté disabled cuando no aplica

### Fase 4 — Verificar dark mode + responsive

- [ ] Colores funcionan con dark mode (tokens ya cubren esto vía surface/border)
- [ ] En mobile (<640px), drawer ocupa `w-[90vw]`
- [ ] Backdrop click cierra drawer
- [ ] Escape cierra drawer

## Decisiones de scope

- **Focus trap**: dejo para una iteración futura. Requeriría librería (focus-trap) o un custom hook. Para MVP el focus se escapa con Tab, pero el backdrop oscuro lo hace visualmente obvio.
- **Animación de entrada**: `transition-transform` con `duration-200 ease-out` es suficiente. Sin spring (evita librería de motion).
- **Mobile**: drawer ocupa `w-[90vw]`, backdrop full-width. Sin bottom-sheet en mobile — el drawer es consistente cross-device.

## Cierre

- 531+ tests verdes
- E2E: click "Nueva tarea" → drawer slide-in desde derecha, fondo oscuro, form funcional. Sin estados → empty state con CTA a /tasks-config. Submit → cierra + refresh lista.
- Working tree limpio

## Memoria

Observación engram al final con:

- Antes/después del drawer (selector patterns)
- Antes/después del empty state (jerarquía visual)
- Lecciones de accessible (focus, ARIA roles, escape)
