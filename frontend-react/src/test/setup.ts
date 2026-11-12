import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, beforeEach, vi } from 'vitest'

// jsdom does not implement matchMedia (used by sonner and theme detection).
if (!window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })
}

// jsdom does not implement pointer capture (sonner calls it on pointerdown).
if (!Element.prototype.setPointerCapture) {
  Element.prototype.setPointerCapture = () => {}
  Element.prototype.releasePointerCapture = () => {}
  Element.prototype.hasPointerCapture = () => false
}

/** Same values as the development index.html of the Vue app. */
export function defaultFileBrowserConfig(): FileBrowserConfig {
  return {
    AuthMethod: 'json',
    BaseURL: '',
    CSS: false,
    Color: '',
    DisableExternal: false,
    DisableUsedPercentage: false,
    EnableExec: true,
    EnableThumbs: true,
    LogoutPage: '/login',
    LoginPage: true,
    Name: '',
    NoAuth: false,
    ReCaptcha: false,
    ResizePreview: true,
    Signup: false,
    StaticURL: '',
    Theme: '',
    TusSettings: { chunkSize: 10485760, retryCount: 5 },
    Version: '(untracked)',
  }
}

window.FileBrowser = defaultFileBrowserConfig()

beforeEach(async () => {
  window.FileBrowser = defaultFileBrowserConfig()
  localStorage.clear()
  document.cookie = 'auth=; Max-Age=0; Path=/; SameSite=Strict;'
  document.title = ''
  document.documentElement.className = ''
  document.documentElement.lang = 'en'
  document.documentElement.dir = ''
  window.history.replaceState(null, '', '/')

  const { useAuthStore } = await import('@/auth/store')
  const { resetRouter } = await import('@/router')
  const { setLocale, detectLocale } = await import('@/i18n')
  const { logoutTimer } = useAuthStore.getState()
  if (logoutTimer) clearTimeout(logoutTimer)
  useAuthStore.getState().clearUser()
  resetRouter()
  setLocale(detectLocale())
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})
