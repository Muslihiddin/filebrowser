import i18next, { type Resource } from 'i18next'
import dayjs from '@/lib/dayjs'
import { initReactI18next } from 'react-i18next'

// The translations are shared with the Vue app, which remains the source of
// truth for them while the migration is in progress.
const files = import.meta.glob<Record<string, unknown>>(
  '../../../frontend/src/i18n/*.json',
  { eager: true, import: 'default' },
)

// Like @intlify/unplugin-vue-i18n, the locale is the file name.
export const resources: Resource = Object.fromEntries(
  Object.entries(files).map(([file, messages]) => [
    file.replace(/^.*\/([^/]+)\.json$/, '$1').toLowerCase(),
    { translation: messages },
  ]),
)

/** Same mapping as frontend/src/i18n/index.ts. */
export function detectLocale(): string {
  // locale is an RFC 5646 language tag
  // https://developer.mozilla.org/en-US/docs/Web/API/Navigator/language
  let locale = navigator.language.toLowerCase()
  switch (true) {
    case /^ar\b/.test(locale):
      locale = 'ar'
      break
    case /^bg\b/.test(locale):
      locale = 'bg'
      break
    case /^cs\b/.test(locale):
      locale = 'cs'
      break
    case /^lv\b/.test(locale):
      locale = 'lv'
      break
    case /^he\b/.test(locale):
      locale = 'he'
      break
    case /^hr\b/.test(locale):
      locale = 'hr'
      break
    case /^hu\b/.test(locale):
      locale = 'hu'
      break
    case /^el.*/i.test(locale):
      locale = 'el'
      break
    case /^es\b/.test(locale):
      locale = 'es'
      break
    case /^en\b/.test(locale):
      locale = 'en'
      break
    case /^is\b/.test(locale):
      locale = 'is'
      break
    case /^it\b/.test(locale):
      locale = 'it'
      break
    case /^fr\b/.test(locale):
      locale = 'fr'
      break
    case /^pt-br\b/.test(locale):
      locale = 'pt-br'
      break
    case /^pt-pt\b/.test(locale):
    case /^pt\b/.test(locale):
      locale = 'pt-pt'
      break
    case /^ja\b/.test(locale):
      locale = 'ja'
      break
    case /^zh-tw\b/.test(locale):
      locale = 'zh-tw'
      break
    case /^zh-cn\b/.test(locale):
    case /^zh\b/.test(locale):
      locale = 'zh-cn'
      break
    case /^de\b/.test(locale):
      locale = 'de'
      break
    case /^ro\b/.test(locale):
      locale = 'ro'
      break
    case /^ru\b/.test(locale):
      locale = 'ru'
      break
    case /^pl\b/.test(locale):
      locale = 'pl'
      break
    case /^ko\b/.test(locale):
      locale = 'ko'
      break
    case /^sk\b/.test(locale):
      locale = 'sk'
      break
    case /^tr\b/.test(locale):
      locale = 'tr'
      break
    case /^uk\b/.test(locale):
      locale = 'uk'
      break
    case /^vi\b/.test(locale):
      locale = 'vi'
      break
    case /^sv-se\b/.test(locale):
    case /^sv\b/.test(locale):
      locale = 'sv'
      break
    case /^nl\b/.test(locale):
      locale = 'nl'
      break
    case /^nl-be\b/.test(locale):
      locale = 'nl-be'
      break
    case /^nb\b/.test(locale):
    case /^no\b/.test(locale):
      locale = 'no'
      break

    default:
      locale = 'en'
  }

  return locale
}

export const rtlLanguages = ['he', 'ar']

// The locale exactly as requested (vue-i18n's `locale`), i18next may normalize
// or refuse some codes.
let currentLocale = detectLocale()
dayjs.locale(currentLocale)

export const i18n = i18next.createInstance()

i18n.use(initReactI18next).init({
  resources,
  lng: currentLocale,
  fallbackLng: 'en',
  lowerCaseLng: true,
  initAsync: false,
  // vue-i18n message syntax: "{name}" placeholders, dotted keys, no namespaces.
  keySeparator: '.',
  nsSeparator: false,
  interpolation: { prefix: '{', suffix: '}', escapeValue: false },
  returnNull: false,
  react: { useSuspense: false },
})

export function getLocale(): string {
  return currentLocale
}

export const isRtl = (locale?: string) =>
  rtlLanguages.includes(locale || currentLocale)

type LocaleListener = (locale: string) => void
const listeners = new Set<LocaleListener>()

/** Subscribes to locale changes, returns the unsubscribe function. */
export function onLocaleChange(listener: LocaleListener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function setLocale(locale: string) {
  dayjs.locale(locale)
  const changed = locale !== currentLocale
  currentLocale = locale
  void i18n.changeLanguage(locale)
  if (changed) listeners.forEach((listener) => listener(locale))
}

export function setHtmlLocale(locale: string) {
  const html = document.documentElement
  html.lang = locale
  html.dir = isRtl(locale) ? 'rtl' : 'ltr'
}

export default i18n
