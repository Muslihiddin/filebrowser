// Router of the app: resolves navigations like the Vue router does and
// commits them to the browser history (through React Router, see
// RouterBridge). The current route is exposed as a zustand store.
import { create } from 'zustand'
import { initAuth } from '@/auth/auth'
import { useAuthStore } from '@/auth/store'
import { config } from '@/config'
import i18n from '@/i18n'
import {
  runNavigation,
  type GuardContext,
  type RawLocation,
  type RouteLocation,
} from './navigation'
import { titles, type RouteName } from './routes'

export type { RawLocation, RouteLocation } from './navigation'

/** Commits a location to the history, `fullPath` is relative to the base URL. */
export type HistoryNavigate = (fullPath: string, options: { replace: boolean }) => void

interface RouteState {
  current: RouteLocation | null
}

export const useRouteStore = create<RouteState>()(() => ({ current: null }))

let historyNavigate: HistoryNavigate | null = null
let navigationId = 0

export function setHistoryNavigate(navigate: HistoryNavigate | null) {
  historyNavigate = navigate
}

function setTitle(name: RouteName | undefined) {
  const key = name ? titles[name] : ''
  document.title = (key ? i18n.t(key) : '') + ' - ' + config.name
}

function guardContext(isFirstNavigation: boolean): GuardContext {
  return {
    isFirstNavigation,
    initAuth,
    isLoggedIn: () => useAuthStore.getState().user !== null,
    isAdmin: () => !!useAuthStore.getState().user?.perm.admin,
    setTitle,
  }
}

/** Normalizes a path the way the browser does when it is pushed. */
export function normalizeFullPath(fullPath: string): string {
  const url = new URL(fullPath, 'http://localhost')
  return url.pathname + url.search + url.hash
}

async function navigate(
  raw: RawLocation,
  options: { replace?: boolean; currentURL?: string },
): Promise<RouteLocation | undefined> {
  const id = ++navigationId
  const from = useRouteStore.getState().current
  const isFirstNavigation = from === null
  const fromHistory = options.currentURL !== undefined

  let result
  try {
    result = await runNavigation(raw, from, guardContext(isFirstNavigation), !fromHistory)
  } catch (error) {
    console.error(error)
    return undefined
  }

  // a newer navigation started in the meantime
  if (id !== navigationId) return undefined
  if (result.duplicated) return from ?? undefined

  const { location } = result
  if (fromHistory) {
    // the browser already shows options.currentURL
    if (normalizeFullPath(location.fullPath) !== normalizeFullPath(options.currentURL!)) {
      historyNavigate?.(location.fullPath, { replace: true })
    }
  } else {
    historyNavigate?.(location.fullPath, {
      replace: !!options.replace || isFirstNavigation,
    })
  }

  useRouteStore.setState({ current: location })
  return location
}

export const router = {
  /** Like vue-router's `router.push()`. */
  push: (to: RawLocation) => navigate(to, {}),
  /** Like vue-router's `router.replace()`. */
  replace: (to: RawLocation) => navigate(to, { replace: true }),
  /**
   * Handles a location the browser already navigated to: initial load,
   * back/forward buttons or React Router links.
   */
  sync: (currentURL: string) => navigate(currentURL, { currentURL }),
  get currentRoute() {
    return useRouteStore.getState().current
  },
}

/** Resets the router state, for tests. */
export function resetRouter() {
  navigationId++
  useRouteStore.setState({ current: null })
}

export default router
