# Upgrade de paquetes + fix de bugs residuales

Fecha: 2026-09-23
Owner: el Gentleman

## Objetivo

1. Actualizar los paquetes del workspace a su última versión (octane, @orpc/*, @octanejs/*, etc.)
2. Resolver los problemas identificados en la sesión previa:
   - octane crash con `<select disabled={dynamic}>` + `.map()` de options
   - Create task button click no dispara handler (mismo bug probable)
   - Form options dinámicas (type, category, client) — actualmente vacías

## Fases

### Fase 1 — Audit de versiones

- [ ] Listar versiones actuales de octane, @orpc/*, @octanejs/*
- [ ] Listar últimas versiones disponibles (npm registry)
- [ ] Identificar majors con breaking changes

### Fase 2 — Update de paquetes

- [ ] Bajar versiones target
- [ ] Correr `bun install`
- [ ] Iterar hasta que `bun install` quede limpio

### Fase 3 — Adaptar código a las nuevas versiones

- [ ] Run tests: ver qué se rompe
- [ ] Fix de tipos y signatures que cambiaron
- [ ] Fix del form (octane select disabled) usando el patrón recomendado
- [ ] Fix del click handler (create task button) — si es el mismo bug

### Fase 4 — Re-test del flow completo

- [ ] Login + /tasks + /tasks/:id + delete + move + /tasks-config + create + edit
- [ ] Verify que los tests siguen verdes
- [ ] Commit

## Decisiones de scope

- Si una major de @orpc/server o @orpc/client tiene cambios incompatibles grandes, evaluo
  si vale la pena el esfuerzo vs. revertir y probar otra cosa. La sesión previa ya
  estabilizó el wire format envelope `{json: ...}` y eso es el contrato real.
- Si octane tiene fix conocido para el bug del `<select disabled>`, lo aplico.
- Si no, dejo el workaround actual (no `disabled`, validar en submit).

## Riesgos

- @orpc/* majors pueden traer cambios de API o de envelope format
- octane majors pueden traer nuevos hooks / cambiar comportamiento de hidratación
- Otros paquetes transitivos pueden entrar en conflicto

## Cierre

- 531+ tests verdes
- E2E completo: login → /tasks → detail → delete → move → /tasks-config → state CRUD → create → edit
- Working tree limpio

## Memoria

Observación engram al final con:

- Lista de paquetes actualizados (de → a)
- Issues encontrados en la actualización
- Soluciones aplicadas
- Lecciones para futuras upgrades
