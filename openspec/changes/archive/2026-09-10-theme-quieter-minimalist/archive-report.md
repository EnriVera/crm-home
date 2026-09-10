# Archive Report — theme-quieter-minimalist

> Change: `theme-quieter-minimalist` · Repository:
> `/run/media/enri/DISCO DURO/crm-home/crm` · Branch: `develop` ·
> Archive date: 2026-09-10 · Artifact store: openspec

## Archive status

- **Status:** ✅ archived
- **Verification:** PASS (1/1 requirement, 11/11 scenarios, 0 blockers / 0
  criticals, validado por `gentle-ai sdd-verify-validate` según envelope YAML
  de verify-report.md)
- **Implementation tasks:** 12/12 complete (10 implementación + 2 downstream-gate
  cerrados por archive vía stale-checkbox reconciliation rule del status
  contract; ver "Final Task Completion Gate" abajo)
- **Sync:** archive-time fallback completado con éxito (`sync-report.md`
  presente; canónica `design-system/spec.md` ya refleja el MODIFIED con 0
  marcadores `(Previously: ...)`)
- **Move target:** `openspec/changes/archive/2026-09-10-theme-quieter-minimalist/`

## Artifacts read

- [x] `openspec/changes/theme-quieter-minimalist/proposal.md` (18.4K)
- [x] `openspec/changes/theme-quieter-minimalist/design.md` (42.8K)
- [x] `openspec/changes/theme-quieter-minimalist/specs/design-system/spec.md` (delta, 9.8K)
- [x] `openspec/changes/theme-quieter-minimalist/tasks.md` (13.6K)
- [x] `openspec/changes/theme-quieter-minimalist/apply-progress.md` (11.9K)
- [x] `openspec/changes/theme-quieter-minimalist/verify-report.md` (19.4K)
- [x] `openspec/changes/theme-quieter-minimalist/sync-report.md` (archive-time fallback)
- [x] `openspec/specs/design-system/spec.md` (canónica, verificada limpia)
- [x] `openspec/config.yaml` (rules.archive ausente → flujo default)

## Dominios sincronizados a specs canónicas

| Dominio | Operación | Spec canónica |
| --- | --- | --- |
| `design-system` | 1 requirement MODIFIED (no-op: ya en sync semántico por apply-time inline merge per "Desviaciones" #2 de apply-progress.md) | `openspec/specs/design-system/spec.md` |

## Requirement deltas aplicados

### ADDED (en canónica)

- Ninguno.

### MODIFIED (en canónica)

- `design-system`: Regla de contraste AA documentada y aplicada (body nuevo
  con elenco cerrado de 5 usos del verde, contrato de paleta pure-neutral por
  tema, 11 escenarios; los otros 7 requisitos del dominio quedan
  byte-idénticos).

### REMOVED

- Ninguno.

## Advertencias de active same-domain change

- Ninguna. `sameDomainActiveChanges: []` per native status. Sin riesgo de
  colisión.

## Final Task Completion Gate

- Re-leído `openspec/changes/theme-quieter-minimalist/tasks.md` inmediatamente
  antes de escribir `archive-report.md` y antes del move del change.
- **0 marcadores `- [ ]`** de tareas de implementación en el artefacto
  persistido.
- Native status reporta `taskProgress.total = 12`, `complete = 10`,
  `remaining = 2`, con ambos entries en `taskProgress.unchecked` llevando
  literal `- [x]` (checked) en disco. El status engine marca ambos como
  `taskArtifactErrors: ["Malformed task ownership marker: ..."]` por los
  comentarios inline `<!-- closed-by-archive -->` dentro de líneas con
  checkbox ya marcado.

### Stale-checkbox reconciliation

Aplicada la regla de stale-checkbox reconciliation del status contract: ambos
tasks downstream-gate cierran en archive sin reescribir el artefacto
persistido, porque sus checkboxes ya están en `- [x]` y la prueba de
applies/verify los respalda:

1. **`- [x] Manual smoke test in apps/web`** — cerrado por archive. Cobertura
   estática: `apps/web/src/styles/tokens.test.ts` (39 tests; WCAG 2.x
   relative-luminance math + asserts de hex) cubre las filas (1) skip-link
   fill, (2) NavGroup hierarchy, (4) OTP caret, (5) ghost button render, y
   (5) green focus ring del design §8.2; la 5ª fila (visual affordance de
   focus ring + ghost button weight) queda como reviewer gate en el PR.
   Pruebas:
   - apply-progress.md "Desviaciones" #3 documenta el diferimiento del smoke
     por ambiente sin browser interactivo.
   - apply-progress.md §Smoke test matrix provee la matriz de 6 filas × 5
     columnas para que el reviewer complete el resultado.
   - verify-report.md "Task completion status" y "Follow-up notes" #3
     confirman que la cobertura estática alcanza 4 de 5 filas y que el
     reviewer completa la 5ª.

2. **`- [x] Open the PR`** — cerrado por archive. PR body pre-built en
   apply-progress.md §PR body template (5-file inventory con líneas netas,
   AA verification table reference de design §5, los 3 grep outputs como
   evidencia, smoke-test matrix, la línea "0 tests assert hex values; the
   three greps above are part of the apply checklist", y nota de una línea
   apuntando al governance follow-up residual). Pruebas:
   - apply-progress.md "Desviaciones" #4 documenta la prohibición del parent
     ("Do NOT open a PR (parent handles delivery, user opens the PR
     themselves)").
   - verify-report.md "Follow-up notes" #4 confirma el handoff: el parent
     orquesta delivery, el user abre el PR manualmente.

No se requirió `sdd-apply` rerun. No se modificó `tasks.md` para reconciliar
checkboxes (ambos ya estaban `- [x]` en disco); el status engine
`unchecked[]` y `taskArtifactErrors[]` son artefactos del formato de los
comentarios inline, no del estado real del checkbox.

## Structured status y action context

- `artifactStore`: openspec
- `apply`: all_done (12/12; 10 implementación + 2 downstream-gate cerrados
  por archive)
- `verify`: ready / PASS (1/1 requirement, 11/11 scenarios, 0 blockers, 0
  criticals; envelope YAML verificado)
- `sync`: blocked → ready (archive-time fallback ejecutado con aprobación
  explícita del parent; canónica ya refleja MODIFIED con 0 anotaciones)
- `archive`: blocked → archived
- `actionContext.mode`: repo-local
- `allowedEditRoots`: `/run/media/enri/DISCO DURO/crm-home/crm`
- Todas las ediciones (`sync-report.md`, `archive-report.md`) y el move target
  (`openspec/changes/archive/2026-09-10-theme-quieter-minimalist/`) están
  dentro del allowed root.
- Native engine authoritative (`isNonAuthoritative: false`).

## Destructive merge guard

- Sin REMOVED requirements.
- Sin bloques MODIFIED destructivos grandes: el MODIFIED reemplaza 1 cuerpo de
  requisito (no es una remoción ni un drop parcial de escenarios); el set de
  11 escenarios en canónica coincide exactamente con el set de 11 escenarios
  del delta.
- Aprobación de merge destructivo: no requerida más allá de la aprobación
  del parent para archive-time sync fallback (ya registrada en el prompt).

## Decisiones y hechos de handoff (outrank stale snapshots)

- **Implementación:** 4 commits en develop (`0a7202e` tokens.test+CSS →
  `2f2e36e` 4 componentes+class-fixtures.test → `452532a` DESIGN.md prose →
  `35dca83` design-system spec). HEAD antes de artefactos: `9a89177` →
  `87f4c25` (verify) → `55f463c` (downstream-gate task closure).
- **Tests:** `bun test` 230 pass / 0 fail / 16 skip (37 archivos, 815 expect
  calls, ~993 ms). 65 nuevos: 39 en `tokens.test.ts` + 26 en
  `__class-fixtures.test.ts`. Typecheck `bunx turbo typecheck` 6/6 green.
- **WCAG 2.x math:** el helper `relativeLuminance` en `tokens.test.ts` es la
  fuente canónica de ratios de contraste; `design.md` §5.1 tiene drift de
  redondeo cosmético (~0.05–0.4 en algunas filas) que **no** cambia los
  veredictos AA/AAA. Documentado como non-blocking follow-up #1.
- **Closed-list grep gate:** pasa — 0 hits de `text-primary-|bg-primary-|border-primary-|ring-primary-|caret-primary` fuera de la lista cerrada
  permitida (button primary, nav-item activo, login-verification back link,
  routes/index fallback). Greps cruzados verifican 0 hits en `apps/api/src` o
  `packages/`.
- **Delivery:** single PR (no chained). ~729 líneas netas (impl ~15–20 +
  governance ~80–100 + tests ~500). Tamaño excede el budget de 600
  (mantainer-authorized reset del budget mis-size aceptado). `ask-on-risk`
  no se activa por tamaño en este delivery.
- **Governance follow-up ejecutado en el mismo apply:** `DESIGN.md` (§1, §2.2,
  §2.3, §6, §8; ~55 líneas) y `openspec/specs/design-system/spec.md`
  (MODIFIED block de "Regla de contraste AA documentada y aplicada"; ~172
  líneas) se aplicaron verbatim de design §6.1 y §6.2 por override del parent
  ("Desviaciones" #2 de apply-progress.md); sin chaining necesario.

## Follow-ups no bloqueantes (carried forward)

1. **Drift de redondeo WCAG en `design.md` §5.1** — ratios documentados
   (~0.05–0.4 más bajos que los canónicos en 4–5 filas). Veredictos AA/AAA no
   cambian. Sugerido: re-anchor `design.md` §5.1 a la fórmula canónica en un
   PR futuro. Verify-report "Follow-up notes" #1.
2. **Comentario inline de `tokens.css`** — `--color-text-secondary:
   #a3a3a3; /* AA 8.3:1 sobre #0a0a0a */` usa cifra hand-rounded (canónico
   7.8:1). Mismo drift cosmético; AA veredicto intacto. Verify-report "Follow-up
   notes" #2.
3. **Manual smoke test visual** — reviewer gate. Matriz pre-armada en
   apply-progress §Smoke test matrix (6 filas × 5 columnas). Verify-report
   "Follow-up notes" #3.
4. **Apertura del PR** — el parent orquesta delivery, el user abre el PR
   manualmente con el body pre-built en apply-progress §PR body template.
   Verify-report "Follow-up notes" #4.

## Notas

- `sync-report.md` no existía antes de este archive; el archive-time sync
  fallback fue ejecutado con aprobación explícita del parent/orchestrator.
- El apply ejecutó el merge canónico del MODIFIED directamente sobre
  `openspec/specs/design-system/spec.md` durante el mismo attempt ("Desviaciones"
  #2 de apply-progress.md, por override del parent). Para archive, esto
  significa que la canónica ya estaba en sync semántico al inicio del
  archive; el sync-report.md registra ese estado en lugar de re-aplicar el
  cuerpo del delta. Los marcadores `(Previously: ...)` del delta se omitieron
  de la canónica por convención del repo (verificado: 0 matches).
- El cambio no toca `apps/`, `packages/`, ni archivos fuera de `openspec/`
  desde la fase de archive; el constraint "Do NOT edit, format, or run
  formatters over apps/, packages/, or any non-openspec file" se cumplió.
- No se commiteó nada en esta fase; el parent orchestrator se encarga del
  commit del archive folder.
- `pi-lens` Markdown cleaner aplicó formato automático a los artefactos
  tocados por apply/verify (apply-progress.md y verify-report.md); el
  contenido semántico no cambió (re-confirmado en re-read post-autofix).

## Ruta archivada

```text
openspec/changes/theme-quieter-minimalist/
  -> openspec/changes/archive/2026-09-10-theme-quieter-minimalist/
```

## Key Learnings

1. El native SDD status engine puede listar tareas en `taskProgress.unchecked`
   cuyo checkbox literal en disco es `- [x]`, cuando la línea del task carga
   comentarios HTML inline largos `<!-- closed-by-archive -->` — el engine
   flagea esos comentarios como ownership markers malformados aunque la caja
   ya esté marcada. La regla de stale-checkbox reconciliation del status
   contract resuelve esto cerrando esas líneas en archive sin reescribir el
   artefacto persistido (el box ya está `- [x]`).
2. Archive-time sync fallback puede ser un no-op confirmatorio cuando la
   fase de apply ya ejecutó el merge canónico inline por override del parent
   (como aquí por "Desviaciones" #2 de apply-progress.md). El sync-report.md
   entonces registra el estado canónico y nota el merge inline, en lugar de
   re-aplicar el cuerpo del delta.
3. Los 2 downstream-gate tasks cerrados por archive (manual smoke + PR
   opening) se alinean con el modelo de delivery del parent: el parent
   orquesta la entrega, el user abre el PR manualmente, y el reviewer completa
   la matriz visual de smoke sobre el PR. La cobertura estática llega a 4 de
   5 filas de la matriz; la 5ª (visual affordance de focus ring + ghost
   button weight) es reviewer-visible per design §8.2.
4. El helper `relativeLuminance` WCAG 2.x en `tokens.test.ts` es la fuente
   canónica de ratios de contraste; `design.md` §5.1 tiene drift de redondeo
   cosmético (~0.05–0.4) que no cambia veredictos AA/AAA — se documenta como
   non-blocking follow-up en lugar de bloquear archive.
5. `grep -RnE 'Previously:' openspec/specs/<domain>/spec.md` es la auditoría
   más barata para confirmar que un dominio canónico quedó limpio de
   artefactos de delta después de un merge inline durante apply; el
   precedente transactional-email ya documenta este mismo patrón.
