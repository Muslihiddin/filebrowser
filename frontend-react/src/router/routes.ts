// Route table of the Vue app (frontend/src/router/index.ts), expressed with the
// regular expressions vue-router generates for it (non-strict, case
// insensitive). Order matters: the first match wins, the catch-all is last.

export type RouteName =
  | 'Login'
  | 'Share'
  | 'Files'
  | 'ProfileSettings'
  | 'Shares'
  | 'GlobalSettings'
  | 'Users'
  | 'User'
  | 'Forbidden'
  | 'NotFound'
  | 'InternalServerError'

export interface RouteRecord {
  /** Undefined for redirect-only records. */
  name?: RouteName
  re: RegExp
  requiresAuth?: boolean
  requiresAdmin?: boolean
  /** Returns the redirect target, given the capture groups of `re`. */
  redirect?: (captures: (string | undefined)[]) => string | { path: string }
}

// `:param*` (optional, repeatable) after a slash.
const REPEATABLE = '(?:/((?:[^/]+?)(?:/(?:[^/]+?))*))?'
const route = (pattern: string) => new RegExp(`^${pattern}/?$`, 'i')

function decode(text: string): string {
  try {
    return decodeURIComponent(text)
  } catch {
    return text
  }
}

export const routes: RouteRecord[] = [
  { name: 'Login', re: route('/login') },
  { name: 'Share', re: route(`/share${REPEATABLE}`) },
  { name: 'Files', re: route(`/files${REPEATABLE}`), requiresAuth: true },
  {
    re: route('/settings'),
    requiresAuth: true,
    redirect: () => ({ path: '/settings/profile' }),
  },
  { name: 'ProfileSettings', re: route('/settings/profile'), requiresAuth: true },
  { name: 'Shares', re: route('/settings/shares'), requiresAuth: true },
  {
    name: 'GlobalSettings',
    re: route('/settings/global'),
    requiresAuth: true,
    requiresAdmin: true,
  },
  { name: 'Users', re: route('/settings/users'), requiresAuth: true, requiresAdmin: true },
  {
    name: 'User',
    re: route('/settings/users/([^/]+?)'),
    requiresAuth: true,
    requiresAdmin: true,
  },
  { name: 'Forbidden', re: route('/403') },
  { name: 'NotFound', re: route('/404') },
  { name: 'InternalServerError', re: route('/500') },
  {
    // "/:catchAll(.*)*"
    re: /^(?:\/((?:.*)(?:\/(?:.*))*))?\/?$/i,
    redirect: ([catchAll]) => {
      if (!catchAll) return '/files/'
      return `/files/${catchAll.split('/').map(decode).join('/')}`
    },
  },
]

export interface MatchedRoute {
  record: RouteRecord
  captures: (string | undefined)[]
  /** Decoded params, used to detect duplicated navigations. */
  params: string
}

export function matchRoute(path: string): MatchedRoute {
  for (const record of routes) {
    const match = record.re.exec(path)
    if (match) {
      const captures = match.slice(1)
      const params = JSON.stringify(
        captures.map((c) => (c ? c.split('/').map(decode) : [])),
      )
      return { record, captures, params }
    }
  }
  // unreachable: the catch-all matches everything
  throw new Error(`No match for ${path}`)
}

/** Translation keys of the document title, per route. */
export const titles: Record<RouteName, string> = {
  Login: 'sidebar.login',
  Share: 'buttons.share',
  Files: 'files.files',
  ProfileSettings: 'settings.profileSettings',
  Shares: 'settings.shareManagement',
  GlobalSettings: 'settings.globalSettings',
  Users: 'settings.users',
  User: 'settings.user',
  Forbidden: 'errors.forbidden',
  NotFound: 'errors.notFound',
  InternalServerError: 'errors.internal',
}
