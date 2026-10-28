import { existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { routes } from '~/router/routes'

// vitest runs from the package root (turbo runs tasks per package), which the
// structure assertions are relative to.
const appRoot = process.cwd()

describe('app structure (PRD-v4 §12.6)', () => {
  it('has no pages folder: every route lives in app/router/routes.ts', () => {
    expect(
      existsSync(resolve(appRoot, 'app/pages')),
      'app/pages must not exist: routes live in app/router/routes.ts (PRD-v4 §12.6).',
    ).toBe(false)
  })

  it('has a view for every route', () => {
    for (const route of routes) {
      if (route.redirect) {
        continue
      }
      const view = resolve(appRoot, 'app/ui/views', `${String(route.name)}.vue`)
      expect(
        existsSync(view),
        `Missing view for route "${String(route.name)}": ${view}`,
      ).toBe(true)
    }
  })
})
