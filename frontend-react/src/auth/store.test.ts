import { expect, test } from 'vitest'
import { getLocale } from '@/i18n'
import { makeUser } from '@/test/utils'
import { useAuthStore } from './store'

test('updateUser merges the changes and applies the locale', () => {
  useAuthStore.getState().setUser(makeUser({ username: 'alice', locale: 'en' }))
  const changes = { locale: 'fr', commands: ['ls'] }

  useAuthStore.getState().updateUser(changes)

  const user = useAuthStore.getState().user!
  expect(user.username).toBe('alice')
  expect(user.locale).toBe('fr')
  expect(getLocale()).toBe('fr')
  // the changes are copied
  changes.commands.push('rm')
  expect(user.commands).toEqual(['ls'])
})

test('updateUser keeps the locale when none is given', () => {
  useAuthStore.getState().setUser(makeUser({ locale: 'de' }))
  useAuthStore.getState().updateUser({ hideDotfiles: true })
  expect(getLocale()).toBe('de')
  expect(useAuthStore.getState().user?.hideDotfiles).toBe(true)
})

test('updateUser does not create a user when nobody is logged in', () => {
  useAuthStore.getState().setUser(makeUser())
  useAuthStore.getState().clearUser()

  useAuthStore.getState().updateUser({ locale: 'de' })

  expect(useAuthStore.getState().user).toBeNull()
  expect(getLocale()).toBe('de')
})
