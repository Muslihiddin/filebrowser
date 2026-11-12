import { describe, expect, test, vi } from 'vitest'
import fixtures from './__fixtures__/vue-router.json'
import { resolve, runNavigation, type GuardContext, type RouteLocation } from './navigation'
import type { RouteName } from './routes'

type User = { admin: boolean }
type Scenario = { user?: User; loginAs?: User }

function createContext(scenario: Scenario) {
  const state: { user: User | null; titles: (RouteName | null)[]; initCalls: number } = {
    user: null,
    titles: [],
    initCalls: 0,
  }
  const ctx = (isFirstNavigation: boolean): GuardContext => ({
    isFirstNavigation,
    initAuth: async () => {
      state.initCalls++
      if (scenario.user) state.user = scenario.user
    },
    isLoggedIn: () => state.user !== null,
    isAdmin: () => !!state.user?.admin,
    setTitle: (name) => state.titles.push(name ?? null),
  })
  return { state, ctx }
}

describe('navigation matches the Vue router', () => {
  const scenarios = fixtures.scenarios as Record<string, Scenario>

  test.each(fixtures.cases.map((c) => [c.url, c.scenario, c] as const))(
    '%s (%s)',
    async (url, scenarioName, expected) => {
      const scenario = scenarios[scenarioName]
      const { state, ctx } = createContext(scenario)

      const { location } = await runNavigation(url, null, ctx(true))
      expect({
        fullPath: location.fullPath,
        name: location.name ?? null,
        initCalls: state.initCalls,
        titles: state.titles,
      }).toEqual(expected.first)

      if (expected.afterLogin) {
        // Login.vue: router.push({ path: route.query.redirect || "/files/" })
        state.user = scenario.loginAs!
        state.titles = []
        const redirect = (location.query.redirect as string | null) || '/files/'
        const after = await runNavigation({ path: redirect }, location, ctx(false))
        expect({
          fullPath: after.location.fullPath,
          name: after.location.name ?? null,
          titles: state.titles,
        }).toEqual(expected.afterLogin)
      }
    },
  )
})

describe('navigation', () => {
  test('initAuth errors are logged and do not break the navigation', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { ctx } = createContext({})
    const context = { ...ctx(true), initAuth: () => Promise.reject(new Error('boom')) }

    const { location } = await runNavigation('/files/', null, context)

    expect(location.fullPath).toBe('/login?redirect=/files/')
    expect(error).toHaveBeenCalled()
    error.mockRestore()
  })

  test('initAuth only runs during the first navigation', async () => {
    const { state, ctx } = createContext({ user: { admin: false } })
    const { location } = await runNavigation('/files/', null, ctx(true))
    expect(state.initCalls).toBe(1)

    await runNavigation('/settings', location, ctx(false))
    expect(state.initCalls).toBe(1)
  })

  test('navigating to the current location is a duplicated navigation', async () => {
    const { ctx } = createContext({ user: { admin: false } })
    const { location } = await runNavigation('/403', null, ctx(true))

    // non admin users are sent back to /403
    const result = await runNavigation('/settings/users', location, ctx(false))
    expect(result.duplicated).toBe(true)
    expect(result.location).toBe(location)
  })

  test('relative locations are resolved against the current one', async () => {
    const { state, ctx } = createContext({})
    state.user = { admin: false }
    const from: RouteLocation = resolve('/files/a/b')
    const { location } = await runNavigation({ path: 'c' }, from, ctx(false))
    expect(location.fullPath).toBe('/files/a/c')
  })

  test('the logout reason is kept in the query', async () => {
    const { ctx } = createContext({})
    const from = resolve('/files/')
    const { location } = await runNavigation(
      { path: '/login', query: { 'logout-reason': 'inactivity' } },
      from,
      ctx(false),
    )
    expect(location.fullPath).toBe('/login?logout-reason=inactivity')
    expect(location.name).toBe('Login')
  })

  // The Vue app recurses forever on these (the catch-all keeps prefixing
  // "/files/"), repeated slashes are collapsed instead.
  test.each([
    ['//evil.com', '/files/evil.com'],
    ['/files//x', '/files/x'],
    ['/share//x', '/share/x'],
  ])('repeated slashes in %s', async (url, expected) => {
    const { ctx } = createContext({ user: { admin: false } })
    const { location } = await runNavigation(url, null, ctx(true))
    expect(location.fullPath).toBe(expected)
  })

  test('a login redirect to another origin stays in the app', async () => {
    const { ctx } = createContext({})
    const from = resolve('/login?redirect=//evil.com/x')
    for (const redirect of ['//evil.com/x', 'http://evil.com', 'https://evil.com/files']) {
      const { location } = await runNavigation({ path: redirect }, from, ctx(false))
      expect(location.fullPath.startsWith('/login?redirect=/files/')).toBe(true)
      expect(location.fullPath.startsWith('//')).toBe(false)
    }
  })
})
