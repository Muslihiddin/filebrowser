// Logic of the settings pages (frontend/src/views/Settings.vue and
// frontend/src/views/settings/*), kept free of React so it can be unit tested.
import type { RouteName } from '@/router/routes'

export interface SettingsTab {
  to: string
  /** Translation key of the label. */
  label: string
  active: boolean
}

/** Tabs of the settings layout the user can see, like Settings.vue. */
export function settingsTabs(
  user: Pick<IUser, 'perm'> | null,
  path: string,
  name: RouteName | undefined,
): SettingsTab[] {
  const tabs: SettingsTab[] = [
    {
      to: '/settings/profile',
      label: 'settings.profileSettings',
      active: path === '/settings/profile',
    },
  ]
  if (user?.perm.share) {
    tabs.push({
      to: '/settings/shares',
      label: 'settings.shareManagement',
      active: path === '/settings/shares',
    })
  }
  if (user?.perm.admin) {
    tabs.push(
      {
        to: '/settings/global',
        label: 'settings.globalSettings',
        active: path === '/settings/global',
      },
      {
        to: '/settings/users',
        label: 'settings.userManagement',
        active: path === '/settings/users' || name === 'User',
      },
    )
  }
  return tabs
}

/** Routes rendered inside the settings layout. */
export const settingsRoutes: readonly RouteName[] = [
  'ProfileSettings',
  'Shares',
  'GlobalSettings',
  'Users',
  'User',
]

export const isSettingsRoute = (name: RouteName | undefined): name is RouteName =>
  name !== undefined && settingsRoutes.includes(name)

/**
 * Feedback of the password fields: none while both are empty, then whether
 * the new password and its confirmation match (input--green / input--red).
 */
export function passwordFeedback(password: string, passwordConf: string): 'none' | 'match' | 'mismatch' {
  if (password === '' && passwordConf === '') return 'none'
  return password === passwordConf ? 'match' : 'mismatch'
}

/**
 * Whether the password form can be submitted. Like the Vue app, the current
 * password is always required, even when its field is not shown (non JSON
 * authentication methods).
 */
export function canUpdatePassword(password: string, passwordConf: string, currentPassword: string) {
  return password === passwordConf && password !== '' && currentPassword !== ''
}

/** Fields of the profile form, sent with `which` to /api/users/:id. */
export const profileFields = [
  'locale',
  'hideDotfiles',
  'singleClick',
  'redirectAfterCopyMove',
  'dateFormat',
  'aceEditorTheme',
] as const

export type ProfileSettings = Pick<IUser, (typeof profileFields)[number]>

export function profileSettings(user: IUser): ProfileSettings {
  return {
    locale: user.locale,
    hideDotfiles: user.hideDotfiles,
    singleClick: user.singleClick,
    redirectAfterCopyMove: user.redirectAfterCopyMove,
    dateFormat: user.dateFormat,
    aceEditorTheme: user.aceEditorTheme,
  }
}

/** Adds the name of their owner to the shares, for admins. */
export function withUsernames(links: Share[], users: Pick<IUser, 'id' | 'username'>[]): Share[] {
  const userMap = new Map<number, string>()
  for (const user of users) userMap.set(user.id, user.username)
  return links.map((link) =>
    link.userID && userMap.has(link.userID)
      ? { ...link, username: userMap.get(link.userID) }
      : link,
  )
}

export interface ErrorInfo {
  icon: 'cloud_off' | 'error' | 'gps_off' | 'error_outline'
  /** Translation key of the message. */
  message: string
}

const errors: Record<number, ErrorInfo> = {
  0: { icon: 'cloud_off', message: 'errors.connection' },
  403: { icon: 'error', message: 'errors.forbidden' },
  404: { icon: 'gps_off', message: 'errors.notFound' },
  500: { icon: 'error_outline', message: 'errors.internal' },
}

/** Message shown for an error status, like frontend/src/views/Errors.vue. */
export function errorInfo(errorCode: number | undefined = 500): ErrorInfo {
  return errors[errorCode] ?? errors[500]
}
