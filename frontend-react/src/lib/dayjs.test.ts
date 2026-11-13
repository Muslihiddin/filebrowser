import { expect, test } from 'vitest'
import { setLocale } from '@/i18n'
import dayjs, { humanTime } from './dayjs'

const inTwoHours = () => Math.floor(Date.now() / 1000) + 2 * 3600 + 60

test('humanTime is relative to now', () => {
  setLocale('en')
  expect(humanTime(inTwoHours())).toBe('in 2 hours')
  expect(humanTime(Math.floor(Date.now() / 1000) - 3 * 86400)).toBe('3 days ago')
})

test('follows the locale of the app, like the Vue app', () => {
  setLocale('de')
  expect(dayjs.locale()).toBe('de')
  expect(humanTime(inTwoHours())).toBe('in 2 Stunden')

  // the regional variants fall back to the language
  setLocale('pt-pt')
  expect(dayjs.locale()).toBe('pt')
  setLocale('sv-se')
  expect(dayjs.locale()).toBe('sv')
  setLocale('zh-cn')
  expect(dayjs.locale()).toBe('zh-cn')

  // locales dayjs does not know keep the previous one
  setLocale('no')
  expect(dayjs.locale()).toBe('zh-cn')
  setLocale('en')
  expect(dayjs.locale()).toBe('en')
})
