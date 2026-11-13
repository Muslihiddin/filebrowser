// dayjs configured like frontend/src/main.ts and frontend/src/i18n/index.ts:
// relativeTime plugin and the same locales. The Vue app loads the locales
// asynchronously; here they are bundled so that dates are localized as soon as
// the locale is applied.
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import 'dayjs/locale/ar'
import 'dayjs/locale/bg'
import 'dayjs/locale/ca'
import 'dayjs/locale/cs'
import 'dayjs/locale/de'
import 'dayjs/locale/el'
import 'dayjs/locale/en'
import 'dayjs/locale/es'
import 'dayjs/locale/fr'
import 'dayjs/locale/he'
import 'dayjs/locale/hr'
import 'dayjs/locale/hu'
import 'dayjs/locale/is'
import 'dayjs/locale/it'
import 'dayjs/locale/ja'
import 'dayjs/locale/ko'
import 'dayjs/locale/lv'
import 'dayjs/locale/nb'
import 'dayjs/locale/nl'
import 'dayjs/locale/nl-be'
import 'dayjs/locale/pl'
import 'dayjs/locale/pt-br'
import 'dayjs/locale/pt'
import 'dayjs/locale/ro'
import 'dayjs/locale/ru'
import 'dayjs/locale/sk'
import 'dayjs/locale/sv'
import 'dayjs/locale/tr'
import 'dayjs/locale/uk'
import 'dayjs/locale/vi'
import 'dayjs/locale/zh-cn'
import 'dayjs/locale/zh-tw'

dayjs.extend(relativeTime)

/** Relative time of a unix timestamp (in seconds), like "in 2 hours". */
export function humanTime(time: number): string {
  return dayjs(time * 1000).fromNow()
}

export default dayjs
