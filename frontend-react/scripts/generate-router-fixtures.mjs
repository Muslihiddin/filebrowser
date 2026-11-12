// Generates src/router/__fixtures__/vue-router.json: where the Vue app lands
// for a set of URLs and auth scenarios, computed with the real vue-router and
// the route table / guard of frontend/src/router/index.ts.
//
// Requires the dependencies of the Vue app: (cd ../frontend && pnpm install)
// Usage: node scripts/generate-router-fixtures.mjs
import { writeFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import path from 'node:path'

const frontend = path.resolve(import.meta.dirname, '../../frontend')
const require = createRequire(path.join(frontend, 'package.json'))
const { createRouter, createMemoryHistory } = await import(require.resolve('vue-router'))
const { defineComponent } = await import(require.resolve('vue'))

const C = (name) => defineComponent({ name, render: () => null })
const Layout = C('Layout')

const routes = [
  { path: '/login', name: 'Login', component: C('Login') },
  {
    path: '/share',
    component: Layout,
    children: [{ path: ':path*', name: 'Share', component: C('Share') }],
  },
  {
    path: '/files',
    component: Layout,
    meta: { requiresAuth: true },
    children: [{ path: ':path*', name: 'Files', component: C('Files') }],
  },
  {
    path: '/settings',
    component: Layout,
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        name: 'Settings',
        component: C('Settings'),
        redirect: { path: '/settings/profile' },
        children: [
          { path: 'profile', name: 'ProfileSettings', component: C('ProfileSettings') },
          { path: 'shares', name: 'Shares', component: C('Shares') },
          { path: 'global', name: 'GlobalSettings', component: C('GlobalSettings'), meta: { requiresAdmin: true } },
          { path: 'users', name: 'Users', component: C('Users'), meta: { requiresAdmin: true } },
          { path: 'users/:id', name: 'User', component: C('User'), meta: { requiresAdmin: true } },
        ],
      },
    ],
  },
  { path: '/403', name: 'Forbidden', component: C('Errors') },
  { path: '/404', name: 'NotFound', component: C('Errors') },
  { path: '/500', name: 'InternalServerError', component: C('Errors') },
  {
    path: '/:catchAll(.*)*',
    redirect: (to) => {
      const catchAll = to.params.catchAll
      if (!catchAll) return '/files/'
      return `/files/${Array.isArray(catchAll) ? catchAll.join('/') : catchAll}`
    },
  },
]

// user: logged in after initAuth; loginAs: user logging in on the login page
async function land(url, { user = null, loginAs = null }) {
  const state = { user: null, initCalls: 0, titles: [] }
  const router = createRouter({ history: createMemoryHistory(), routes })
  router.beforeResolve(async (to, from) => {
    state.titles.push(to.name ?? null)
    if (from.name == null) {
      state.initCalls++
      if (user) state.user = user
    }
    if (to.path.endsWith('/login') && state.user !== null) return { path: '/files/' }
    if (to.matched.some((r) => r.meta.requiresAuth)) {
      if (state.user === null) return { path: '/login', query: { redirect: to.fullPath } }
      if (to.matched.some((r) => r.meta.requiresAdmin) && !state.user.admin) {
        return { path: '/403' }
      }
    }
  })

  await router.push(url)
  const route = router.currentRoute.value
  const first = {
    fullPath: route.fullPath,
    name: route.name ?? null,
    initCalls: state.initCalls,
    titles: state.titles,
  }

  let afterLogin = null
  if (first.name === 'Login' && loginAs) {
    const redirect = route.query.redirect || '/files/'
    if (typeof redirect !== 'string') return null // arrays are not supported
    state.user = loginAs
    state.titles = []
    await router.push({ path: redirect })
    const after = router.currentRoute.value
    afterLogin = { fullPath: after.fullPath, name: after.name ?? null, titles: state.titles }
  }
  return { first, afterLogin }
}

const urls = [
  '/', '/files', '/files/', '/files/a/b', '/files/a/b/', '/files/a%20b/?x=1#h',
  '/files/a+b?c=d+e', '/files/%E2%82%AC/', '/files/login', '/files/?redirect=1',
  '/Files/X', '/FILES/', '/files/a%2Fb',
  '/settings', '/settings/', '/SETTINGS', '/settings?tab=1#top', '/settings/profile',
  '/settings/shares', '/settings/global', '/settings/users', '/settings/users/',
  '/settings/users/3', '/settings/users/3/', '/settings/Users/3', '/settings/xyz',
  '/settings/users/3/4',
  '/share', '/share/', '/share/abc', '/share/abc/def?token=1',
  '/403', '/404', '/404/', '/500',
  '/foo', '/foo/bar/', '/a%20b', '/a%2Fb', '/a%3Fb=1', '/x%23y', '/a+b',
  '/foo?a=b%20c&d=%2B#hh', '/%E4%B8%AD/', '/%ZZ', '/files/%ZZ',
  '/login', '/login/', '/LOGIN', '/login?logout-reason=inactivity', '/login?logout-reason',
  '/login?redirect=', '/login?redirect', '/login?redirect=/settings',
  '/login?redirect=/settings/global', '/login?redirect=/login',
  '/login?redirect=../x/y', '/login?redirect=files/x', '/login?redirect=%2Ffiles%2Fa%2520b',
  '/login?redirect=/files/a?q=1%23x', '/login?redirect=/files/a%23x',
  '/login?redirect=/share/xyz', '/login?redirect=/403', '/login?redirect=/foo/bar',
  '/login?redirect=/files/x&logout-reason=inactivity',
]

const scenarios = {
  anonymousThenUser: { loginAs: { admin: false } },
  anonymousThenAdmin: { loginAs: { admin: true } },
  user: { user: { admin: false } },
  admin: { user: { admin: true } },
}

const cases = []
const origWarn = console.warn
console.warn = () => {}
for (const url of urls) {
  for (const [scenario, options] of Object.entries(scenarios)) {
    const result = await land(url, options)
    if (result) cases.push({ url, scenario, ...result })
  }
}
console.warn = origWarn

const out = path.resolve(import.meta.dirname, '../src/router/__fixtures__/vue-router.json')
writeFileSync(out, JSON.stringify({ scenarios, cases }, null, 2) + '\n')
console.log(`wrote ${cases.length} cases to ${out}`)
