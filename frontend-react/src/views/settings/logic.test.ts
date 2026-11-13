import { describe, expect, test } from 'vitest'
import { makeUser } from '@/test/utils'
import {
  canUpdatePassword,
  errorInfo,
  isSettingsRoute,
  passwordFeedback,
  profileSettings,
  settingsTabs,
  withUsernames,
} from './logic'

const perm = (perm: Partial<UserPermissions>) => ({
  perm: { ...makeUser().perm, admin: false, share: false, ...perm },
})

describe('settingsTabs', () => {
  const labels = (tabs: ReturnType<typeof settingsTabs>) => tabs.map((tab) => tab.to)

  test('everybody has the profile tab', () => {
    expect(labels(settingsTabs(perm({}), '/settings/profile', 'ProfileSettings'))).toEqual([
      '/settings/profile',
    ])
    expect(labels(settingsTabs(null, '/settings/profile', 'ProfileSettings'))).toEqual([
      '/settings/profile',
    ])
  })

  test('the share permission adds the share management', () => {
    expect(labels(settingsTabs(perm({ share: true }), '/settings/profile', 'ProfileSettings'))).toEqual(
      ['/settings/profile', '/settings/shares'],
    )
  })

  test('admins have the global settings and the user management', () => {
    expect(labels(settingsTabs(perm({ admin: true }), '/settings/profile', 'ProfileSettings'))).toEqual(
      ['/settings/profile', '/settings/global', '/settings/users'],
    )
    expect(
      labels(settingsTabs(perm({ admin: true, share: true }), '/settings/profile', 'ProfileSettings')),
    ).toEqual(['/settings/profile', '/settings/shares', '/settings/global', '/settings/users'])
  })

  test.each([
    ['/settings/profile', 'ProfileSettings', '/settings/profile'],
    ['/settings/shares', 'Shares', '/settings/shares'],
    ['/settings/global', 'GlobalSettings', '/settings/global'],
    ['/settings/users', 'Users', '/settings/users'],
    ['/settings/users/3', 'User', '/settings/users'],
    // like Settings.vue, the active tab is decided on the exact path
    ['/settings/profile/', 'ProfileSettings', null],
    ['/settings/Shares', 'Shares', null],
  ] as const)('active tab of %s', (path, name, active) => {
    const tabs = settingsTabs(perm({ admin: true, share: true }), path, name)
    expect(tabs.filter((tab) => tab.active).map((tab) => tab.to)).toEqual(active ? [active] : [])
  })
})

test('isSettingsRoute', () => {
  expect(isSettingsRoute('ProfileSettings')).toBe(true)
  expect(isSettingsRoute('Shares')).toBe(true)
  expect(isSettingsRoute('GlobalSettings')).toBe(true)
  expect(isSettingsRoute('Users')).toBe(true)
  expect(isSettingsRoute('User')).toBe(true)
  expect(isSettingsRoute('Files')).toBe(false)
  expect(isSettingsRoute('Share')).toBe(false)
  expect(isSettingsRoute(undefined)).toBe(false)
})

test('passwordFeedback', () => {
  expect(passwordFeedback('', '')).toBe('none')
  expect(passwordFeedback('a', '')).toBe('mismatch')
  expect(passwordFeedback('', 'a')).toBe('mismatch')
  expect(passwordFeedback('abc', 'abd')).toBe('mismatch')
  expect(passwordFeedback('abc', 'abc')).toBe('match')
})

test('canUpdatePassword', () => {
  expect(canUpdatePassword('new', 'new', 'old')).toBe(true)
  expect(canUpdatePassword('new', 'other', 'old')).toBe(false)
  expect(canUpdatePassword('', '', 'old')).toBe(false)
  // the current password is required, like in the Vue app
  expect(canUpdatePassword('new', 'new', '')).toBe(false)
})

test('profileSettings', () => {
  const user = makeUser({
    locale: 'de',
    hideDotfiles: true,
    singleClick: true,
    redirectAfterCopyMove: false,
    dateFormat: true,
    aceEditorTheme: 'ace/theme/monokai',
  })
  expect(profileSettings(user)).toEqual({
    locale: 'de',
    hideDotfiles: true,
    singleClick: true,
    redirectAfterCopyMove: false,
    dateFormat: true,
    aceEditorTheme: 'ace/theme/monokai',
  })
})

test('withUsernames', () => {
  const links: Share[] = [
    { hash: 'a', path: '/a', expire: 0, userID: 1 },
    { hash: 'b', path: '/b', expire: 0, userID: 2 },
    { hash: 'c', path: '/c', expire: 0, userID: 9 },
    { hash: 'd', path: '/d', expire: 0, userID: 0 },
  ]
  const result = withUsernames(links, [
    { id: 1, username: 'admin' },
    { id: 2, username: 'bob' },
    { id: 0, username: 'nobody' },
  ])
  expect(result.map((link) => link.username)).toEqual(['admin', 'bob', undefined, undefined])
  // the input is left untouched
  expect(links[0].username).toBeUndefined()
})

test('errorInfo', () => {
  expect(errorInfo(0).message).toBe('errors.connection')
  expect(errorInfo(403).message).toBe('errors.forbidden')
  expect(errorInfo(404).message).toBe('errors.notFound')
  expect(errorInfo(500).message).toBe('errors.internal')
  expect(errorInfo(502).message).toBe('errors.internal')
  expect(errorInfo(undefined).message).toBe('errors.internal')
})
