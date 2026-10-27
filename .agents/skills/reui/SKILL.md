---
name: reui
description: Builds UI with the ReUI registry (24 primitives, 1,175 free examples, 629 Pro blocks, 638 Ultimate icons) through the ReUI MCP server. Teaches the ReUI workflow — search → install → read API → adapt by reuse — and is required when installing any `@reui/*` item, composing a page from blocks, or reading a ReUI component's props from the live registry. Triggers on ReUI, @reui, "use ReUI to build…", "ReUI block", "ReUI component", "data-grid", "event-calendar", "kanban", "cascader", "filters", "gantt", "compose_page", shadcn add @reui, and any request to scaffold a dashboard, settings page, billing page, auth flow, or admin shell with ReUI. Pairs with the ReUI MCP server (https://mcp.reui.io) — without it, prefer the MCP tools over memory; with it, never hand-roll what ReUI already ships.
user-invocable: false
allowed-tools: Bash(npx shadcn@latest *), Bash(pnpm dlx shadcn@latest *), Bash(bunx --bun shadcn@latest *), Bash(curl -fsSL https://mcp.reui.io/install *), Bash(ls components.json), Bash(cat components.json)
---

# ReUI

ReUI is a first-class shadcn registry — 24 custom primitives, 1,175 free examples, 629 Pro blocks, and 638 Ultimate icons — installed as source via the shadcn CLI. Built for React + Tailwind v4, ships in both Base UI and Radix UI flavors.

> **Pair this skill with the ReUI MCP server.** The MCP is the live data; this skill is the workflow brain. Together they turn "build me a dashboard" into real ReUI blocks wired to your data, instead of invented props.

## MCP endpoint

- URL: `https://mcp.reui.io` (Streamable HTTP, already configured in `.mcp.json`)
- Auth: browser sign-in on first connect, or `Authorization: Bearer reui_pat_…` for headless/CI
- Plan follows the credential — free account covers components and examples; Pro unlocks premium blocks; Ultimate adds Motion Icons

## Install rule

- ReUI items: `npx shadcn@latest add @reui/<name>` (or the project's runner)
- Stock shadcn/ui items: `npx shadcn@latest add <name>` (no `@reui/` prefix)
- Templates: download from their page, not a `shadcn add` item

If the project does not yet have a `components.json` with the `@reui` registry, follow the **Registry setup** section below before installing anything.

## The workflow (always follow in order)

1. **Find** — call the MCP `search` tool with the user's intent. Read the ranked matches: each has an install command, preview, thumbnail (on blocks/examples), docs link, and the components it uses. A `weakMatch` means the registry does not carry what was asked — compose the screen from components instead of forcing the top hit.
2. **Install** — run the returned shadcn command. The CLI resolves dependencies and your base style from `components.json`. Pass `--yes` to keep it non-interactive.
3. **Read the API** — call `get_component` for each component the item uses. Do not guess props from memory. For working compositions, call `get_examples` and copy the real pattern.
4. **Adapt by reuse** — swap demo data for real data, fix icon imports, align to your theme tokens. Keep the block's structure and styling — never redesign what ReUI already provides. Call `validate_usage` before shipping if you changed props or composed items.

Optional: `compose_page` plans a whole page into sections, each matched to the best block. `get_audit_checklist` returns the ReUI-specific checks to run after install.

## When to reach for ReUI vs plain shadcn

| Need | Reach for |
| ----------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| A full page or section (dashboard, billing, auth, pricing, settings) | `compose_page` first, then fill each section with the best Pro block (or free example on a free account) |
| A data table with sorting / filtering / pagination / virtualization | the **data-grid** component — never hand-roll a `<table>` |
| A drag-and-drop board | the **kanban** component |
| Advanced column filtering, date range, tree, stepper, time picker, signature pad, sortable, etc. | the matching ReUI **component** |
| A single generic control already in shadcn (Button, Dialog, Select) | plain **shadcn** |

When in doubt, call `list_components` — those 24 primitives are the ReUI building blocks worth reaching for beyond plain shadcn.

## Registry setup (one-time, per project)

Required to install `@reui/*` items. Skip if the project already has the `@reui` entry in `components.json`.

1. Add the license key (skip for free-only usage):

   ```bash
   # .env.local  (already in .gitignore)
   REUI_LICENSE_KEY=your-license-key-here
   ```

2. Add the `@reui` registry to `components.json`:

   ```json
   {
     "registries": {
       "@reui": {
         "url": "https://reui.io/r/{style}/{name}.json",
         "headers": {
           "Authorization": "Bearer ${REUI_LICENSE_KEY}"
         }
       }
     }
   }
   ```

   The `${REUI_LICENSE_KEY}` placeholder is expanded by the shadcn CLI. Leave the `headers` block out entirely if you are on the free plan and not using a license key.

3. From headless / CI environments, use a personal token from ReUI → Account → MCP and pass it as `Bearer reui_pat_…` instead of the OAuth sign-in.

## CLI runner

Use the project's package manager. The project uses `bun` (see `bun.lock` + `bunfig.toml`), so prefer:

```bash
bunx --bun shadcn@latest add @reui/data-grid
```

Substitute `npx` or `pnpm dlx` for the runner the project actually declares. All `shadcn` commands in this skill follow that substitution rule.

## Base UI vs Radix UI

Every ReUI primitive ships twice. Base UI builds are the default at `reui.io/docs/components/base/<name>`; the Radix UI twin lives at the same path with `/radix/` in place of `/base/`. The `search` MCP tool returns the variant that matches the project's `components.json`; do not mix base and radix imports for the same component in one file.

## Catalog reference

The full ReUI catalog — every primitive, every example, every Pro block, every icon — lives in `llms.txt` in this same directory. Read it with `read` when you need the exact name of a block, the URL of a docs page, or the list of components an item uses. Treat that file as the index, not as documentation to dump into a response.

## Common mistakes to avoid

- Do not hand-roll a sortable table when the **data-grid** component is one install away.
- Do not invent props — call `get_component` and read the inline API.
- Do not redesign the block after install — adapt it by reuse, keep its structure.
- Do not paste a personal token into a committed config — use the `REUI_LICENSE_KEY` env var and let the shadcn CLI / your MCP client expand it.
- Do not chain a `bearer_token_env_var` (or `Authorization` header) and a browser sign-in for the same MCP server — they are alternatives, the header overrides the OAuth credential and `mcp login` looks broken while every call 401s.
- A `weakMatch` from `search` is the signal to compose from components, not to force the top hit.
