import { describe, expect, it } from 'vitest'
import { routes } from '~/router/routes'

// PRD-v4 §7.2 is the canonical route table. Changing a path means changing the
// PRD and this file in the same commit.
const CANONICAL_PATHS = [
  '/',
  '/login',
  '/login-verification',
  '/dashboard',
  '/tasks',
  '/tasks-config',
  '/schedules',
  '/clients',
  '/incomes',
  '/expenses',
  '/transfers',
  '/config',
  '/terms',
  '/privacy',
  '/cookies',
  '/:pathMatch(.*)*',
]

const AUTHENTICATED_PATHS = [
  '/dashboard',
  '/tasks',
  '/tasks-config',
  '/schedules',
  '/clients',
  '/incomes',
  '/expenses',
  '/transfers',
  '/config',
]

const GUEST_PATHS = [
  '/login',
  '/login-verification',
  '/terms',
  '/privacy',
  '/cookies',
  '/:pathMatch(.*)*',
]

const driftMessage =
  'The route table drifted from PRD-v4 §7.2: update §7.2 and app/router/routes.ts together.'

describe('route table (PRD-v4 §7.2, §12.6)', () => {
  it('has exactly the canonical routes', () => {
    expect(routes.length, driftMessage).toBe(CANONICAL_PATHS.length)
    expect(
      routes.map((route) => route.path).sort(),
      driftMessage,
    ).toEqual([...CANONICAL_PATHS].sort())
  })

  it('marks every authenticated route', () => {
    for (const path of AUTHENTICATED_PATHS) {
      const route = routes.find((candidate) => candidate.path === path)
      expect(route?.meta?.auth, driftMessage).toBe(true)
    }
  })

  it('marks every public route with a layout', () => {
    for (const path of GUEST_PATHS) {
      const route = routes.find((candidate) => candidate.path === path)
      expect(route?.meta?.guest, driftMessage).toBe(true)
      expect(route?.meta?.layout, driftMessage).toBeTypeOf('string')
    }
  })

  it('keeps the catch-all last', () => {
    expect(routes.at(-1)?.path, driftMessage).toBe('/:pathMatch(.*)*')
  })
})
