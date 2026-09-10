# Spike Verification — transactional-email

> Work Unit 1 blocking spike. Verifies npm packages, `.tsrx` precompilation to a
> Bun-importable artifact, and nodemailer×Bun×Mailpit smoke test.

## Environment

- Bun: `1.4.0`
- Workspace package manager: `bun@1.4.0`
- Existing React runtime installed via `@crm/web` (peer of `octane@0.2.3`).

## npm verification

Commands executed and results:

```bash
npm view @octanejs/email@0.0.3
npm view @octanejs/email-cli@latest
npm view octane@0.2.3 peerDependencies
npm view nodemailer versions --json
```

| Package | Pinned version | Notes |
| --- | --- | --- |
| `@octanejs/email` | `0.0.3` | MIT, deps include `marked`, `prismjs`, `css-tree`, `tailwindcss@4.3.3` |
| `@octanejs/email-cli` | `0.0.3` | CLI `octane-email`, deps `vite@^8.1.5`, `@octanejs/email@0.0.3` |
| `octane` peer deps | `0.2.3` | `react@^19.0.0`, `react-dom@^19.0.0`, `vite@^8.0.16`, `typescript@^5.9.3` |
| `nodemailer` | `6.10.1` | Latest 6.x stable; pure JS, no node-gyp |
| `@types/nodemailer` | `6.4.17` | Types for nodemailer 6.x |

Peer deps of `@octanejs/email` are compatible with the workspace: it peer-depends
on `octane@^0.1.51 || ^0.2.0`, which the workspace already satisfies via
`apps/web`.

## Build strategy for `packages/email`

The primary design assumption was to compile `.tsrx` with `tsrx-tsc` to plain ESM.
Spike showed two blockers:

1. `tsrx-tsc` preserves `.tsrx` extensions in emitted imports (e.g.
   `dist/index.js` imports `./templates/foo.tsrx`), which Bun cannot resolve at
   runtime.
2. The emitted component imports `octane/jsx-runtime`, but `octane` does not
   export a runtime entry for that subpath in its published `package.json`
   (types-only export), so Node/Bun ESM resolution fails.

These issues do **not** mean the stack is unsuitable; they mean the package needs
a bundling step that resolves Octane's JSX and runtime correctly.

Chosen approach (validated by this spike):

- Use `vite` in library mode with the `octane/compiler/vite` plugin
  (`ssr: true`).
- Inline `@octanejs/email` and `octane` into the bundle (`ssr.noExternal`).
- Keep other dependencies (`prismjs`, `marked`, `css-tree`, etc.) external so
  their dynamic `require` paths keep working against the hoisted
  `node_modules`.
- Output a single ESM file `dist/index.js` declared as `main`/`exports` in
  `package.json`.
- Type-check the package with a local declaration file for `@octanejs/email`
  because the package ships TypeScript source and would otherwise pull
  `.tsrx`/`.ts` sources into `tsc`.

This is still precompilation of `.tsrx` to JS; consumers (`apps/api`, nitro
bundle) import the compiled artifact only.

## Build result

```bash
cd packages/email
bunx vite build
# dist/index.js  110.61 kB │ gzip: 29.56 kB
```

Import from `apps/api` works without Vite at runtime:

```bash
cd apps/api
bun -e "import { renderSpike } from '@crm/email'; console.log(await renderSpike('World'))"
# → <!DOCTYPE html ...><div>Hello World</div>
```

## nodemailer × Bun × Mailpit smoke test

A temporary Mailpit container was started for the spike:

```bash
docker run -d --name crm-home-mailpit-spike -p 1025:1025 -p 8025:8025 \
  -e MP_SMTP_AUTH_ACCEPT_ANY=1 -e MP_SMTP_AUTH_ALLOW_INSECURE=1 \
  axllent/mailpit:v1.24
```

A standalone Bun script using `nodemailer@6.10.1` sent a multipart message via
`smtp://localhost:1025`. The message appeared immediately in
`http://localhost:8025`.

Mailpit image to pin in `docker-compose.yml`: `axllent/mailpit:v1.24`.

## Nitro task bundle check

A temporary import of `@crm/email` was added to `apps/api/tasks/email-sending.ts`
and `bun run build` in `apps/api` completed successfully. The import was reverted
after the check.

## Pinned versions to use in production `package.json` files

- `packages/email` dependencies: `@octanejs/email@0.0.3`
- `packages/email` devDependencies: `@octanejs/email-cli@0.0.3`, `vite@8.2.2`
  (same major as workspace), `typescript@5.9.3`
- `apps/api` dependencies: `nodemailer@6.10.1`
- `apps/api` devDependencies: `@types/nodemailer@6.4.17`

## Conclusion

Spike passed. No stack substitution is required. Continue with Work Unit 2.
