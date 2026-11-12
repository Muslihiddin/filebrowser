// Navigation resolution, mirroring vue-router's `pushWithRedirect` together
// with the `beforeResolve` guard of the Vue app. Kept free of React and of
// global state so it can be unit tested.

import {
  encodeHash,
  parseURL,
  stringifyQuery,
  type LocationQuery,
} from './location'
import { matchRoute, type RouteName, type RouteRecord } from './routes'

export type RawLocation =
  | string
  | { path: string; query?: LocationQuery; hash?: string }

export interface RouteLocation {
  path: string
  fullPath: string
  query: LocationQuery
  /** Decoded hash, including the leading "#". */
  hash: string
  name?: RouteName
  record: RouteRecord
  captures: (string | undefined)[]
  params: string
}

export interface GuardContext {
  /** True during the very first navigation of the app. */
  isFirstNavigation: boolean
  initAuth: () => Promise<void>
  isLoggedIn: () => boolean
  isAdmin: () => boolean
  setTitle: (name: RouteName | undefined) => void
}

const MAX_REDIRECTS = 50

/**
 * Multiple consecutive slashes make the Vue app redirect forever (the
 * catch-all keeps prefixing "/files/"). Collapse them instead.
 */
function collapseSlashes(path: string): string {
  return path.replace(/\/{2,}/g, '/')
}

function match(path: string) {
  const matched = matchRoute(path)
  return { ...matched, name: matched.record.name }
}

/** Equivalent of vue-router's `router.resolve()`. */
export function resolve(raw: RawLocation, currentPath = '/'): RouteLocation {
  if (typeof raw === 'string') {
    const parsed = parseURL(raw, currentPath)
    const suffix = parsed.fullPath.slice(parsed.path.length)
    const path = collapseSlashes(parsed.path)
    return {
      path,
      fullPath: path + suffix,
      query: parsed.query,
      hash: parsed.hash,
      ...match(path),
    }
  }

  const path = collapseSlashes(parseURL(raw.path, currentPath).path)
  const query = raw.query ?? {}
  const hash = raw.hash ?? ''
  const search = stringifyQuery(query)
  return {
    path,
    fullPath: path + (search && '?') + search + encodeHash(hash),
    query,
    hash,
    ...match(path),
  }
}

/** Equivalent of vue-router's `handleRedirectRecord()`. */
function redirectTarget(to: RouteLocation, currentPath: string): RawLocation | null {
  const { redirect } = to.record
  if (!redirect) return null

  const target = redirect(to.captures)
  const location =
    typeof target === 'string'
      ? target.includes('?') || target.includes('#')
        ? parseURL(target, currentPath)
        : { path: target }
      : target

  return { query: to.query, hash: to.hash, ...location }
}

function isSameRouteLocation(a: RouteLocation, b: RouteLocation): boolean {
  return (
    a.record === b.record &&
    a.params === b.params &&
    stringifyQuery(a.query) === stringifyQuery(b.query) &&
    a.hash === b.hash
  )
}

/** The `router.beforeResolve` guard of the Vue app. */
export async function guard(
  to: RouteLocation,
  ctx: GuardContext,
): Promise<RawLocation | undefined> {
  ctx.setTitle(to.name)

  if (ctx.isFirstNavigation) {
    try {
      await ctx.initAuth()
    } catch (error) {
      console.error(error)
    }
  }

  if (to.path.endsWith('/login') && ctx.isLoggedIn()) {
    return { path: '/files/' }
  }

  if (to.record.requiresAuth) {
    if (!ctx.isLoggedIn()) {
      return { path: '/login', query: { redirect: to.fullPath } }
    }

    if (to.record.requiresAdmin && !ctx.isAdmin()) {
      return { path: '/403' }
    }
  }

  return undefined
}

export interface NavigationResult {
  location: RouteLocation
  /** The navigation targets the current location: nothing to do. */
  duplicated: boolean
}

/**
 * Resolves `raw` to the location the Vue app would end up on, following
 * redirect records and guard redirects.
 *
 * @param from current location, `null` for the initial navigation.
 * @param checkDuplicated `false` for history (popstate) navigations.
 */
export async function runNavigation(
  raw: RawLocation,
  from: RouteLocation | null,
  ctx: GuardContext,
  checkDuplicated = true,
): Promise<NavigationResult> {
  const currentPath = from?.path ?? '/'
  let target = resolve(raw, currentPath)

  for (let i = 0; i < MAX_REDIRECTS; i++) {
    const redirect = redirectTarget(target, currentPath)
    if (redirect) {
      target = resolve(redirect, currentPath)
      continue
    }

    if (checkDuplicated && from && isSameRouteLocation(from, target)) {
      return { location: from, duplicated: true }
    }
    checkDuplicated = true

    const guardRedirect = await guard(target, ctx)
    if (guardRedirect === undefined) {
      return { location: target, duplicated: false }
    }
    target = resolve(guardRedirect, currentPath)
  }

  throw new Error(`Infinite redirect when navigating to ${JSON.stringify(raw)}`)
}
