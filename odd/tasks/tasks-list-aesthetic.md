# Aesthetic polish — tasks list

## Scope

- `/tasks` (list view + drawer polish)
- Keep green emerald como único acento
- Preserve: drawer already shipped en `c28cacc`, drawer + empty state CTA

## Diagnosis (from `/tmp/survey-tasks.png`)

- Tasks list = bare text on white (`<a>{title}</a>` sin estilos)
- Sin jerarquía tipográfica
- Sin separación entre items
- Sin badges de estado / tipo
- Sin metadata (fechas)
- Sin hover state
- Header plano (h1 solo + botón verde)
- Sin empty state para la lista (solo hay para el drawer de "Nueva tarea")

## Plan

### 1. Tasks list item — molecule

`apps/web/src/components/molecules/task-list-item.tsrx` (nuevo)

- `<a>` semántico → `/tasks/:id`
- Card-like (no shadow, surface + 1px border + rounded-md)
- Hover: surface-2 + border emphasis
- Focus: outline-focus (ya en el design system)
- Layout (horizontal flex):
  - Left: title (font-medium, text-text-primary)
  - Description preview (1-2 lines truncado con line-clamp-2, text-text-secondary, text-sm)
  - Right cluster (flex-col align-end):
    - State badge (small pill, surface, text-xs, font-medium)
    - Updated date (text-xs, text-text-muted)
- Padding: `px-4 py-3` (consistente con el resto del sistema)
- Border-b 1px entre items (sin card wrapper — list-as-region per craft-floor)

### 2. Empty state — list level

Cuando `tasks.length === 0 && !loading && !error`:

- Inline message "No hay tareas todavía" + CTA secundario al drawer "Nueva tarea"
- No invadir el shell (sin modal)

### 3. Header — tasks page

- h1 + count badge ("3 tareas" — text-text-secondary, text-sm)
- Botón gear: reemplazar emoji `⚙` por `<Icon name="gear" />` con styling consistente
- Spacing: `mb-6` generoso entre header y list

### 4. Search input

- Si BaseView lo renderiza internamente, dejarlo. Si no, agregar input simple en el header.

## Constraints

- Verde esmeralda solo para "Nueva tarea" (acción primaria)
- Sin shadows decorativos
- Sin border-left / border-right coloreados
- Line-clamp utility ya disponible via `@tailwindcss/line-clamp` (verificar)
- i18n keys nuevos via `es.json`
- Tests siguen pasando (534 baseline)
- Mobile: cards se mantienen full-width, padding se reduce

## Verification

- Screenshot desktop (1280) + mobile (375)
- Dark mode screenshot
- Hover state en navegador
- Click → navigation a /tasks/:id funciona
