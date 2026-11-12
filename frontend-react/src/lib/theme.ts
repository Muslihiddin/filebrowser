import { config } from '@/config'

// Same logic as frontend/src/utils/theme.ts: the theme is a class on <html>,
// which is also what shadcn/ui's dark mode relies on.

export const getMediaPreference = (): UserTheme =>
  window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

export const getTheme = (): UserTheme =>
  (document.documentElement.className as UserTheme) || config.theme

export const setTheme = (theme: UserTheme) => {
  document.documentElement.className = theme || getMediaPreference()
}
