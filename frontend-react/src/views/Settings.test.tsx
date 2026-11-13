import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { useAuthStore } from '@/auth/store'
import { makeToken, makeUser, mockFetch, text } from '@/test/utils'
import App from '@/App'

const url = () => window.location.pathname + window.location.search + window.location.hash

type Handlers = Parameters<typeof mockFetch>[0]

const regularPerm = { ...makeUser().perm, admin: false, share: false }

/** Opens `path` logged in as `user` (an admin by default). */
function start(path: string, user: Partial<IUser> = {}, handlers: Handlers = {}) {
  localStorage.setItem('jwt', makeToken(user))
  const fetch = mockFetch({ '/api/renew': () => text(makeToken(user)), ...handlers })
  window.history.replaceState(null, '', path)
  const events = userEvent.setup()
  render(<App />)
  return { user: events, fetch }
}

const json = (value: unknown, status = 200) => text(JSON.stringify(value), status)
const body = (init: RequestInit | undefined) => JSON.parse(init!.body as string)
const nav = () => screen.getByRole('navigation', { name: 'Settings' })
const tabNames = () => within(nav()).getAllByRole('link').map((link) => link.textContent)

describe('settings layout', () => {
  test('/settings opens the profile settings', async () => {
    start('/settings')
    expect(await screen.findByRole('heading', { name: 'Profile Settings' })).toBeInTheDocument()
    expect(url()).toBe('/settings/profile')
    expect(document.title).toBe('Profile Settings - File Browser')
  })

  test('regular users only have the profile tab', async () => {
    start('/settings/profile', { username: 'bob', perm: regularPerm })
    await screen.findByRole('heading', { name: 'Profile Settings' })

    expect(tabNames()).toEqual(['Profile Settings'])
    expect(screen.queryByText('File Browser is being archived')).not.toBeInTheDocument()
  })

  test('the share permission adds the share management tab', async () => {
    start('/settings/profile', { perm: { ...regularPerm, share: true } })
    await screen.findByRole('heading', { name: 'Profile Settings' })
    expect(tabNames()).toEqual(['Profile Settings', 'Share Management'])
  })

  test('admins have every tab and the sunset notice', async () => {
    start('/settings/profile')
    await screen.findByRole('heading', { name: 'Profile Settings' })

    expect(tabNames()).toEqual([
      'Profile Settings',
      'Share Management',
      'Global Settings',
      'User Management',
    ])
    expect(within(nav()).getByRole('link', { name: 'Profile Settings' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(screen.getByRole('heading', { name: 'File Browser is being archived' })).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Read the project status/ }),
    ).toHaveAttribute('href', 'https://github.com/filebrowser/filebrowser#security')
  })

  test('the tabs navigate between the pages', async () => {
    const { user } = start('/settings/profile', {}, { '/api/shares': () => json([]), '/api/users': () => json([]) })
    await screen.findByRole('heading', { name: 'Profile Settings' })

    const globalTab = within(nav()).getByRole('link', { name: 'Global Settings' })
    expect(globalTab).toHaveAttribute('href', '/settings/global')
    await user.click(globalTab)
    await waitFor(() => expect(url()).toBe('/settings/global'))
    expect(await screen.findByRole('heading', { name: 'Global Settings' })).toBeInTheDocument()
    expect(globalTab).toHaveAttribute('aria-current', 'page')
    expect(document.title).toBe('Global Settings - File Browser')

    await user.click(within(nav()).getByRole('link', { name: 'User Management' }))
    await waitFor(() => expect(url()).toBe('/settings/users'))
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()

    await user.click(within(nav()).getByRole('link', { name: 'Share Management' }))
    await waitFor(() => expect(url()).toBe('/settings/shares'))
    expect(await screen.findByText('It feels lonely here...')).toBeInTheDocument()

    await act(async () => window.history.back())
    await waitFor(() => expect(url()).toBe('/settings/users'))
    expect(await screen.findByRole('heading', { name: 'Users' })).toBeInTheDocument()
  })

  test('going back right after a navigation, before it is rendered', async () => {
    const { router } = await import('@/router')
    start('/settings/profile')
    await screen.findByRole('heading', { name: 'Profile Settings' })
    await act(async () => {
      await router.push('/settings/global')
    })
    expect(await screen.findByRole('heading', { name: 'Global Settings' })).toBeInTheDocument()

    // both history changes are rendered at once
    await act(async () => {
      await router.push('/settings/users')
      window.history.back()
      await new Promise((resolve) => setTimeout(resolve, 20))
    })

    await waitFor(() => expect(url()).toBe('/settings/global'))
    expect(await screen.findByRole('heading', { name: 'Global Settings' })).toBeInTheDocument()
    expect(router.currentRoute?.name).toBe('GlobalSettings')
  })

  test('the user management tab is active on a user page', async () => {
    start('/settings/users/3')
    expect(await screen.findByRole('heading', { name: 'User' })).toBeInTheDocument()
    expect(within(nav()).getByRole('link', { name: 'User Management' })).toHaveAttribute(
      'aria-current',
      'page',
    )
  })

  test('tabs are relative to the base URL', async () => {
    window.FileBrowser.BaseURL = '/fb'
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/fb/api/renew': () => text(makeToken()) })
    window.history.replaceState(null, '', '/fb/settings')
    const user = userEvent.setup()
    render(<App />)

    await screen.findByRole('heading', { name: 'Profile Settings' })
    expect(url()).toBe('/fb/settings/profile')
    const tab = within(nav()).getByRole('link', { name: 'Global Settings' })
    expect(tab).toHaveAttribute('href', '/fb/settings/global')
    await user.click(tab)
    await waitFor(() => expect(url()).toBe('/fb/settings/global'))
  })

  test('non admins can not open the admin pages', async () => {
    start('/settings/global', { perm: regularPerm })
    await waitFor(() => expect(url()).toBe('/403'))
  })

  test('shows the username and logs out', async () => {
    const { user } = start('/settings/profile', { username: 'alice' })
    expect(await screen.findByTestId('username')).toHaveTextContent('alice')

    await user.click(screen.getByRole('button', { name: 'Logout' }))
    expect(await screen.findByLabelText('Username')).toBeInTheDocument()
    expect(url()).toBe('/login')
  })

  test('no logout button without authentication', async () => {
    window.FileBrowser.NoAuth = true
    window.FileBrowser.LoginPage = false
    window.FileBrowser.AuthMethod = 'noauth'
    mockFetch({ '/api/login': () => text(makeToken({ username: 'admin' })) })
    window.history.replaceState(null, '', '/settings/profile')
    render(<App />)

    expect(await screen.findByTestId('username')).toHaveTextContent('admin')
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
    // no password change either
    expect(screen.queryByRole('heading', { name: 'Change Password' })).not.toBeInTheDocument()
  })
})

describe('profile settings', () => {
  const profileForm = () => screen.getByRole('form', { name: 'Profile Settings' })
  const passwordForm = () => screen.getByRole('form', { name: 'Change Password' })

  test('shows the settings of the user', async () => {
    start('/settings/profile', {
      hideDotfiles: true,
      singleClick: false,
      redirectAfterCopyMove: true,
      dateFormat: false,
      locale: 'en',
      aceEditorTheme: 'ace/theme/monokai',
    })
    await screen.findByRole('heading', { name: 'Profile Settings' })

    const form = within(profileForm())
    expect(form.getByRole('checkbox', { name: 'Hide dotfiles' })).toBeChecked()
    expect(
      form.getByRole('checkbox', { name: 'Use single clicks to open files and directories' }),
    ).not.toBeChecked()
    expect(
      form.getByRole('checkbox', { name: 'Redirect to destination after copy/move' }),
    ).toBeChecked()
    expect(form.getByRole('checkbox', { name: 'Set exact date format' })).not.toBeChecked()
    expect(form.getByRole('combobox', { name: 'Language' })).toHaveValue('en')
    expect(form.getByRole('combobox', { name: 'Ace editor theme' })).toHaveValue(
      'ace/theme/monokai',
    )
    expect(
      within(form.getByRole('combobox', { name: 'Language' })).getByRole('option', {
        name: 'Deutsch',
      }),
    ).toHaveValue('de')
  })

  test('an unknown value selects nothing, like the Vue app', async () => {
    start('/settings/profile', { aceEditorTheme: '' })
    await screen.findByRole('heading', { name: 'Profile Settings' })
    const select = within(profileForm()).getByRole<HTMLSelectElement>('combobox', {
      name: 'Ace editor theme',
    })
    expect(select).toHaveValue('')
    expect(select.selectedOptions[0]).toHaveAttribute('hidden')
  })

  test('updates the settings and applies the new locale', async () => {
    const update = vi.fn(() => text(''))
    const { user } = start('/settings/profile', { id: 7, username: 'alice' }, {
      '/api/users/7': update,
    })
    await screen.findByRole('heading', { name: 'Profile Settings' })

    const form = within(profileForm())
    await user.click(form.getByRole('checkbox', { name: 'Hide dotfiles' }))
    await user.click(form.getByText('Set exact date format'))
    await user.selectOptions(form.getByRole('combobox', { name: 'Ace editor theme' }), 'ace/theme/dracula')
    await user.selectOptions(form.getByRole('combobox', { name: 'Language' }), 'de')
    // nothing changes before the form is submitted
    expect(screen.getByRole('heading', { name: 'Profile Settings' })).toBeInTheDocument()
    expect(update).not.toHaveBeenCalled()

    await user.click(form.getByRole('button', { name: 'Update' }))

    expect(await screen.findByRole('heading', { name: 'Profileinstellungen' })).toBeInTheDocument()
    expect((await screen.findAllByText('Einstellungen aktualisiert!')).length).toBeGreaterThan(0)
    expect(document.documentElement.lang).toBe('de')

    expect(update).toHaveBeenCalledTimes(1)
    const [init] = update.mock.calls[0] as unknown as [RequestInit]
    expect(init.method).toBe('PUT')
    expect(body(init)).toEqual({
      what: 'user',
      which: ['locale', 'hideDotfiles', 'singleClick', 'redirectAfterCopyMove', 'dateFormat', 'aceEditorTheme'],
      data: {
        ...makeUser({ id: 7, username: 'alice' }),
        locale: 'de',
        hideDotfiles: true,
        dateFormat: true,
        aceEditorTheme: 'ace/theme/dracula',
      },
    })
    expect(useAuthStore.getState().user).toMatchObject({
      locale: 'de',
      hideDotfiles: true,
      dateFormat: true,
      aceEditorTheme: 'ace/theme/dracula',
    })
  })

  test('shows the errors of the update', async () => {
    const { user } = start('/settings/profile', { id: 2 }, {
      '/api/users/2': () => text('500 Profile Update Failed\n', 500),
    })
    await screen.findByRole('heading', { name: 'Profile Settings' })
    await user.click(within(profileForm()).getByRole('button', { name: 'Update' }))

    expect(await screen.findByText('500 Profile Update Failed')).toBeInTheDocument()
    expect(useAuthStore.getState().user?.locale).toBe('en')
  })

  test('changes the password', async () => {
    const update = vi.fn(() => text(''))
    const { user } = start('/settings/profile', { id: 4 }, { '/api/users/4': update })
    await screen.findByRole('heading', { name: 'Change Password' })

    const form = within(passwordForm())
    const password = form.getByPlaceholderText('Your new password')
    const confirm = form.getByPlaceholderText('Confirm your new password')
    const current = form.getByPlaceholderText('Your Current Password')
    expect(password).not.toHaveAttribute('aria-invalid')

    await user.type(password, 'new-secret')
    await user.type(confirm, 'new-secre')
    expect(password).toHaveAttribute('aria-invalid', 'true')
    expect(current).toHaveAttribute('aria-invalid', 'true')

    // mismatch: nothing is sent
    await user.type(current, 'old-secret')
    await user.click(form.getByRole('button', { name: 'Update' }))
    expect(update).not.toHaveBeenCalled()

    await user.type(confirm, 't')
    expect(password).not.toHaveAttribute('aria-invalid')
    await user.keyboard('{Enter}')

    expect((await screen.findAllByText('Password updated!')).length).toBeGreaterThan(0)
    expect(update).toHaveBeenCalledTimes(1)
    const [init] = update.mock.calls[0] as unknown as [RequestInit]
    expect(body(init)).toEqual({
      what: 'user',
      which: ['password'],
      current_password: 'old-secret',
      data: { ...makeUser({ id: 4 }), password: 'new-secret' },
    })
    // like the Vue app, the current password is kept
    expect(password).toHaveValue('')
    expect(confirm).toHaveValue('')
    expect(current).toHaveValue('old-secret')
    expect(useAuthStore.getState().user).not.toHaveProperty('password')
  })

  test('the password is not sent without the current password', async () => {
    const update = vi.fn(() => text(''))
    const { user } = start('/settings/profile', { id: 4 }, { '/api/users/4': update })
    await screen.findByRole('heading', { name: 'Change Password' })
    const form = within(passwordForm())

    await user.click(form.getByRole('button', { name: 'Update' }))
    await user.type(form.getByPlaceholderText('Your new password'), 'a')
    await user.type(form.getByPlaceholderText('Confirm your new password'), 'a')
    await user.click(form.getByRole('button', { name: 'Update' }))
    expect(update).not.toHaveBeenCalled()
  })

  test('shows the errors of the password change and clears the fields', async () => {
    const { user } = start('/settings/profile', { id: 4 }, {
      '/api/users/4': () => text('400 Bad Request (password is too short, minimum length is 12)\n', 400),
    })
    await screen.findByRole('heading', { name: 'Change Password' })
    const form = within(passwordForm())
    await user.type(form.getByPlaceholderText('Your new password'), 'short')
    await user.type(form.getByPlaceholderText('Confirm your new password'), 'short')
    await user.type(form.getByPlaceholderText('Your Current Password'), 'old')
    await user.click(form.getByRole('button', { name: 'Update' }))

    expect(await screen.findByText(/minimum length is 12/)).toBeInTheDocument()
    expect(form.getByPlaceholderText('Your new password')).toHaveValue('')
  })

  test('the current password is only asked with the JSON authentication', async () => {
    window.FileBrowser.AuthMethod = 'proxy'
    start('/settings/profile')
    await screen.findByRole('heading', { name: 'Change Password' })
    expect(screen.getByPlaceholderText('Your new password')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Your Current Password')).not.toBeInTheDocument()
  })

  test('no password change for users with a locked password', async () => {
    start('/settings/profile', { lockPassword: true })
    await screen.findByRole('heading', { name: 'Profile Settings' })
    expect(screen.queryByRole('heading', { name: 'Change Password' })).not.toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Your new password')).not.toBeInTheDocument()
  })
})

describe('share management', () => {
  const now = () => Math.floor(Date.now() / 1000)
  const shares = (): Share[] => [
    { hash: 'aaa', path: '/docs/report.pdf', userID: 1, expire: 0, hasPassword: false },
    { hash: 'bbb', path: '/photos', userID: 2, expire: now() + 2 * 3600 + 60, hasPassword: true },
  ]
  const users = [makeUser({ id: 1, username: 'admin' }), makeUser({ id: 2, username: 'bob' })]
  const sharePerm = { ...regularPerm, share: true }

  test('lists the shares of the user', async () => {
    const { fetch } = start('/settings/shares', { perm: sharePerm }, {
      '/api/shares': () => json(shares()),
    })

    expect(await screen.findByRole('heading', { name: 'Share Management' })).toBeInTheDocument()
    const table = screen.getByRole('table')
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Path',
      'Share Duration',
      '',
      '',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    const link = within(rows[0]).getByRole('link', { name: '/docs/report.pdf' })
    expect(link).toHaveAttribute('href', 'http://localhost:3000/share/aaa')
    expect(link).toHaveAttribute('target', '_blank')
    expect(rows[0]).toHaveTextContent('Permanent')
    expect(rows[1]).toHaveTextContent('in 2 hours')
    expect(within(rows[1]).getByRole('button', { name: 'Delete' })).toBeInTheDocument()
    expect(within(rows[1]).getByRole('button', { name: 'Copy to clipboard' })).toBeInTheDocument()
    // the users are only listed for admins
    expect(fetch.mock.calls.map(([input]) => input)).not.toContain('/api/users')
    expect(fetch.mock.calls.find(([input]) => input === '/api/shares')![1]!.headers).toMatchObject({
      'X-Auth': expect.any(String),
    })
  })

  test('admins see the owner of the shares', async () => {
    start('/settings/shares', {}, {
      '/api/shares': () => json(shares()),
      '/api/users': () => json(users),
    })

    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('columnheader').map((th) => th.textContent)).toEqual([
      'Path',
      'Share Duration',
      'Username',
      '',
      '',
    ])
    const rows = within(table).getAllByRole('row').slice(1)
    expect(within(rows[0]).getAllByRole('cell')[2]).toHaveTextContent('admin')
    expect(within(rows[1]).getAllByRole('cell')[2]).toHaveTextContent('bob')
  })

  test('the duration follows the locale of the user', async () => {
    start('/settings/shares', { locale: 'de', perm: sharePerm }, {
      '/api/shares': () => json(shares()),
    })
    const table = await screen.findByRole('table')
    expect(within(table).getAllByRole('row')[2]).toHaveTextContent('in 2 Stunden')
  })

  test('shows a spinner while loading', async () => {
    let resolve!: (response: Response) => void
    start('/settings/shares', { perm: sharePerm }, {
      '/api/shares': () => new Promise<Response>((r) => (resolve = r)),
    })
    expect(await screen.findByRole('status')).toHaveTextContent('Loading...')
    expect(screen.queryByRole('heading', { name: 'Share Management' })).not.toBeInTheDocument()

    await act(async () => resolve(json([])))
    expect(await screen.findByText('It feels lonely here...')).toBeInTheDocument()
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  test('without shares', async () => {
    start('/settings/shares', { perm: sharePerm }, { '/api/shares': () => json([]) })
    expect(await screen.findByText('It feels lonely here...')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Share Management' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  test.each([
    [403, "You don't have permissions to access this."],
    [404, "This location can't be reached."],
    [500, 'Something really went wrong.'],
    [502, 'Something really went wrong.'],
  ])('shows the error %s', async (status, message) => {
    start('/settings/shares', { perm: regularPerm }, {
      '/api/shares': () => text(`${status} Error\n`, status),
    })
    expect(await screen.findByRole('heading', { name: message })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Share Management' })).not.toBeInTheDocument()
    // the layout stays
    expect(tabNames()).toEqual(['Profile Settings'])
  })

  test('shows connection errors', async () => {
    localStorage.setItem('jwt', makeToken())
    vi.stubGlobal('fetch', async (input: string) => {
      if (input === '/api/renew') return text(makeToken())
      throw new TypeError('Failed to fetch')
    })
    window.history.replaceState(null, '', '/settings/shares')
    render(<App />)
    expect(
      await screen.findByRole('heading', { name: "The server can't be reached." }),
    ).toBeInTheDocument()
  })

  test('deletes a share after confirmation', async () => {
    const remove = vi.fn(() => text(''))
    const { user } = start('/settings/shares', { perm: sharePerm }, {
      '/api/shares': () => json(shares()),
      '/api/share/bbb': remove,
    })
    const table = await screen.findByRole('table')
    const row = () => within(table).getByRole('link', { name: '/photos' }).closest('tr')!

    // cancel
    await user.click(within(row()).getByRole('button', { name: 'Delete' }))
    let dialog = await screen.findByRole('alertdialog')
    expect(dialog).toHaveTextContent('Are you sure you wish to delete this share()?')
    await waitFor(() => expect(within(dialog).getByRole('button', { name: 'Delete' })).toHaveFocus())
    await user.click(within(dialog).getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
    expect(remove).not.toHaveBeenCalled()

    // confirm
    await user.click(within(row()).getByRole('button', { name: 'Delete' }))
    dialog = await screen.findByRole('alertdialog')
    await user.click(within(dialog).getByRole('button', { name: 'Delete' }))

    await waitFor(() =>
      expect(within(table).queryByRole('link', { name: '/photos' })).not.toBeInTheDocument(),
    )
    expect(within(table).getByRole('link', { name: '/docs/report.pdf' })).toBeInTheDocument()
    expect((await screen.findAllByText('Share deleted!')).length).toBeGreaterThan(0)
    expect(remove).toHaveBeenCalledTimes(1)
    expect((remove.mock.calls[0] as unknown as [RequestInit])[0].method).toBe('DELETE')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())
  })

  test('the delete dialog is named and closes on the backdrop or Escape', async () => {
    const remove = vi.fn(() => text(''))
    const { user, fetch } = start('/settings/shares', { perm: sharePerm }, {
      '/api/shares': () => json(shares()),
      '/api/share/bbb': remove,
    })
    const table = await screen.findByRole('table')
    const row = () => within(table).getByRole('link', { name: '/photos' }).closest('tr')!

    // backdrop click, like the Vue prompts
    await user.click(within(row()).getByRole('button', { name: 'Delete' }))
    expect(await screen.findByRole('alertdialog', { name: 'Delete' })).toBeInTheDocument()
    const backdrop = document.querySelector<HTMLElement>('[data-slot="alert-dialog-overlay"]')!
    await user.click(backdrop)
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    // Escape
    await user.click(within(row()).getByRole('button', { name: 'Delete' }))
    await screen.findByRole('alertdialog', { name: 'Delete' })
    await user.keyboard('{Escape}')
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument())

    expect(remove).not.toHaveBeenCalled()
    expect(fetch.mock.calls.filter(([, init]) => init?.method === 'DELETE')).toEqual([])
    expect(within(table).getByRole('link', { name: '/photos' })).toBeInTheDocument()
  })

  test('keeps the share when the deletion fails', async () => {
    const { user } = start('/settings/shares', { perm: sharePerm }, {
      '/api/shares': () => json(shares()),
      '/api/share/aaa': () => text('500 Share Deletion Failed\n', 500),
    })
    const table = await screen.findByRole('table')
    const row = within(table).getByRole('link', { name: '/docs/report.pdf' }).closest('tr')!
    await user.click(within(row).getByRole('button', { name: 'Delete' }))
    await user.click(within(await screen.findByRole('alertdialog')).getByRole('button', { name: 'Delete' }))

    expect(await screen.findByText('500 Share Deletion Failed')).toBeInTheDocument()
    expect(within(table).getByRole('link', { name: '/docs/report.pdf' })).toBeInTheDocument()
  })

  test('copies the link of a share', async () => {
    // user-event replaces navigator.clipboard with a stub
    Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
    try {
      window.FileBrowser.BaseURL = '/fb'
      localStorage.setItem('jwt', makeToken({ perm: sharePerm }))
      mockFetch({
        '/fb/api/renew': () => text(makeToken({ perm: sharePerm })),
        '/fb/api/shares': () => json(shares()),
      })
      window.history.replaceState(null, '', '/fb/settings/shares')
      const user = userEvent.setup()
      render(<App />)

      const table = await screen.findByRole('table')
      const row = within(table).getByRole('link', { name: '/photos' }).closest('tr')!
      expect(within(row).getByRole('link')).toHaveAttribute('href', 'http://localhost:3000/fb/share/bbb')
      await user.click(within(row).getByRole('button', { name: 'Copy to clipboard' }))

      expect((await screen.findAllByText('Link copied!')).length).toBeGreaterThan(0)
      expect(await navigator.clipboard.readText()).toBe('http://localhost:3000/fb/share/bbb')
    } finally {
      Reflect.deleteProperty(window, 'isSecureContext')
    }
  })
})
