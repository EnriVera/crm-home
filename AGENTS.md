<!-- antislop:start -->
## antislop

For UI, copy, people, mobile layout, or code comments work, read these installed skill files directly (use these paths even if a same-named global skill exists):

- Core filter, always on: `antislop`: `.pi/skills/antislop/SKILL.md`
- UI / visual: `antislop-ui`: `.pi/skills/antislop-ui/SKILL.md`
- Copy & text: `antislop-copywriting`: `.pi/skills/antislop-copywriting/SKILL.md`
- People: `antislop-human`: `.pi/skills/antislop-human/SKILL.md`
- Mobile / responsive: `antislop-layoutmobile`: `.pi/skills/antislop-layoutmobile/SKILL.md`
- Code comments: `antislop-code`: `.pi/skills/antislop-code/SKILL.md`
Before starting, follow the core's "Two Usage Modes" section in strict order: explicit session instruction first, then global preference, then ask. A session instruction always wins. For a resolved mode, say `antislop active: <mode> (session override).` or `antislop active: <mode> (global preference).` once before presenting findings or making edits, using the actual mode and source. Acknowledging the user's request without naming the source does not replace this notice.
Only an explicit choice of antislop during or after selects a session mode. A request to review, audit, or avoid file edits does not select a mode; read the global preference in that case. Another skill's mode does not select antislop's mode.
If the mode is unresolved, ask during/after and end the response; wait for the answer before any UI review, planning, or concept. For read-only tasks, put the active-mode notice only at the start of the final answer, never in progress messages. For editing tasks, announce before the first edit and omit it from the final answer.
To update antislop later: `npx antislop-ai --update`, or run `npx antislop-ai` and pick Overwrite them.
<!-- antislop:end -->

<!-- OPENWIKI:START -->

## OpenWiki

This repository has a generated `openwiki/` evidence index. It is optional just-in-time context, not required startup reading.

- Do not enumerate, preload, or search wikis at task start. Use retrieval when the user asks for it, when unfamiliar architecture or dependency behavior materially affects the task, or when source inspection leaves an important uncertainty. Stop once the question is grounded.
- When those conditions apply and OpenWiki retrieval tools are available, use `openwiki_search` for just-in-time context and `openwiki_read` for the relevant complete sections. If search returns `workspace_required`, ask which listed workspace to use and retry with its ID.
- Use `openwiki_list_workspaces` or `openwiki_list_wikis` when workspace membership itself needs to be discovered.
- If the retrieval tools are unavailable, read `openwiki/quickstart.md` and follow its links to the relevant pages.
- Treat source code and tests as authoritative. A brief's unknowns and review items are verification gaps, not automatic requirements.
- Prefer the narrowest quiet validation that proves the changed behavior. Preserve complete failure output.

The scheduled OpenWiki GitHub Actions workflow refreshes the repository wiki. Do not hand-edit generated OpenWiki pages unless explicitly asked; prefer updating source code/docs and letting OpenWiki regenerate.

<!-- OPENWIKI:END -->

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:

- When graphify-out/graph.json exists, run `graphify query "<question>"` before your first grep, search or source-file read for a codebase question, and put this rule in every subagent prompt that explores code. Read raw files only for lines the graph or an earlier read already located. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
- A committed graphify-out/graph.json is rewritten whole on every build, so a large diff to it in a pull request is expected. Do not flag it as churn or suggest skipping the graph rebuild or its hooks.

## Design & agent skills (web-v3)

Read these installed skill files directly when the task matches (repo paths take precedence over same-named global skills):

- **oil-ui** — design direction: `.agents/skills/oil-ui/SKILL.md`. Invoke when designing, redesigning, or visually reviewing any screen of `apps/web-v3`. It is direction-setting only (design judgment, comparisons, visual hierarchy); it does not implement business logic. The frozen visual contract is PRD-v4 §7–§9 (23-image catalogue + tokens in §11.3); oil-ui arbitrates whatever the catalogue does not cover.
- **emil-design-eng** — Emil Kowalski's design engineering: `.agents/skills/emil-design-eng/SKILL.md`. UI polish, component design, animation decisions, the invisible details that make software feel great. Use when implementing or reviewing UI feel: micro-interactions, springs, drawer slide timing, kanban drag feel, press/hover states. Complements the animation contract inherited from PRD-DESIGN §8.
- **layers-*** — Layers of Product Design: load `.agents/skills/layers-intro/SKILL.md` **first** (framework orientation all others depend on), then pull as needed: `layers-orient`, `layers-user-needs`, `layers-product-strategy`, `layers-conceptual-model`, `layers-domain`, `layers-interaction-flow`, `layers-surface`, `layers-observed-behaviour`. Use at design/exploration time (new feature framing, UX flows, design decisions) — not for mechanical edits with a fully specified change.
- **layerfs** — agent workspace filesystem (<https://layerfs.ai>, github.com/Ephemeral-AI-Lab/layerfs): the filesystem substrate for AI coding agents — each agent mounts a complete writable workspace over shared committed history (ephemeral workspaces, durable shared history). Keep it in mind for parallel agent work: when several writers/subagents operate over the same repo, prefer LayerFS workspaces over bare worktrees, and record sessions so shared history stays durable.

  **Installed y operativo** en este repo (`tools/layerfs/`, wrapper `./lf`, docs completas en `tools/layerfs/README.md`). Protocolo de desarrollo con LayerFS:

  1. **Trabajo sustancial** (feature multi-archivo, experimentos, agentes en paralelo): `./lf fork odd-<feature>` → implementar contra el Store (`fs.write`/`fs.apply`, o `./lf run <branch> "<cmd>"` para ejecutar verificaciones dentro del sandbox con node_modules incluido) → `./lf land <branch>` (merge → exporta el delta de texto al repo, gitignore-aware, anti-clobber → publish; los binarios se reportan para land manual) → revisar `git diff` y commitear normal.
  2. **Edición mecánica chica** (1-2 archivos, typo, copy, config): directo al repo, sin LayerFS — el overhead no se justifica.
  3. **Store-main ≠ git**: el Store se congela en el init y avanza solo por `land`/`publish`; el git history sigue siendo la fuente de verdad. Todo comando `lf` corre como root vía re-exec del wrapper (`sudo -E`, password la primera vez); nunca `sudo ./lf` directo.
