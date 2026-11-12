import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, test, vi } from 'vitest'
import { useAuthStore } from '@/auth/store'
import { makeToken, mockFetch, text } from '@/test/utils'
import App from './App'

const url = () => window.location.pathname + window.location.search + window.location.hash

function start(path: string) {
  window.history.replaceState(null, '', path)
  const user = userEvent.setup()
  render(<App />)
  return user
}

async function fillLogin(user: ReturnType<typeof userEvent.setup>, name: string, pass: string) {
  await user.type(await screen.findByLabelText('Username'), name)
  await user.type(screen.getByLabelText('Password'), pass)
}

describe('login page', () => {
  test('anonymous users are sent to the login page', async () => {
    start('/')

    expect(await screen.findByRole('heading', { name: 'File Browser' })).toBeInTheDocument()
    expect(url()).toBe('/login?redirect=/files/')
    expect(document.title).toBe('Login - File Browser')
    expect(screen.getByPlaceholderText('Username')).toHaveFocus()
    expect(screen.getByPlaceholderText('Password')).toHaveAttribute('type', 'password')
    expect(screen.queryByLabelText('Password Confirmation')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toHaveAttribute('type', 'submit')
    expect(screen.queryByText('Create an account')).not.toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'File Browser' })).toHaveAttribute(
      'src',
      '/img/logo.svg',
    )
  })

  test('uses the branding name and static URL', async () => {
    window.FileBrowser.Name = 'My Files'
    window.FileBrowser.StaticURL = '/static'
    start('/login')

    expect(await screen.findByRole('heading', { name: 'My Files' })).toBeInTheDocument()
    expect(document.title).toBe('Login - My Files')
    expect(screen.getByRole('img')).toHaveAttribute('src', '/static/img/logo.svg')
  })

  test('logs in and goes to the requested page', async () => {
    const fetch = mockFetch({
      '/api/login': () => text(makeToken({ username: 'alice' })),
    })
    const user = start('/files/docs/?sort=name')
    await fillLogin(user, 'alice', 'secret')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    // like the Vue app, the query of the redirect is dropped
    await waitFor(() => expect(url()).toBe('/files/docs/'))
    expect(await screen.findByTestId('username')).toHaveTextContent('alice')
    expect(screen.getByRole('heading', { name: 'Files' })).toBeInTheDocument()
    expect(document.title).toBe('Files - File Browser')
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({
      username: 'alice',
      password: 'secret',
      recaptcha: '',
    })
  })

  test('the default redirect is /files/', async () => {
    mockFetch({ '/api/login': () => text(makeToken()) })
    const user = start('/login')
    await fillLogin(user, 'admin', 'admin')
    await user.keyboard('{Enter}')
    await waitFor(() => expect(url()).toBe('/files/'))
  })

  test('non admin users are sent to /403 after the login', async () => {
    mockFetch({
      '/api/login': () => text(makeToken({ perm: { admin: false } as UserPermissions })),
    })
    const user = start('/settings/users/3')
    await waitFor(() => expect(url()).toBe('/login?redirect=/settings/users/3'))
    await fillLogin(user, 'bob', 'pw')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(url()).toBe('/403'))
    expect(await screen.findByRole('heading', { name: 'You don\'t have permissions to access this.' }))
  })

  test('shows wrong credentials', async () => {
    mockFetch({ '/api/login': () => text('403 Forbidden\n', 403) })
    const user = start('/login')
    await fillLogin(user, 'alice', 'wrong')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Wrong credentials')
    expect(url()).toBe('/login')
    expect(useAuthStore.getState().user).toBeNull()
  })

  test('shows other errors in a toast', async () => {
    mockFetch({ '/api/login': () => text('500 Internal Server Error\n', 500) })
    const user = start('/login')
    await fillLogin(user, 'alice', 'pw')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    const message = await screen.findByText('500 Internal Server Error')
    const toast = message.closest<HTMLElement>('[data-sonner-toast]')!
    expect(within(toast).getByRole('button', { name: 'Report Issue' })).toBeInTheDocument()
  })

  // sonner keeps the toasts of earlier tests: each test uses its own message.
  test('closes the error toast on click, like the Vue app', async () => {
    mockFetch({ '/api/login': () => text('502 Bad Gateway\n', 502) })
    const user = start('/login')
    await fillLogin(user, 'alice', 'pw')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await user.click(await screen.findByText('502 Bad Gateway'))
    await waitFor(() => expect(screen.queryByText('502 Bad Gateway')).not.toBeInTheDocument())
  })

  test('closes the error toast with its close button', async () => {
    mockFetch({ '/api/login': () => text('503 Service Unavailable\n', 503) })
    const user = start('/login')
    await fillLogin(user, 'alice', 'pw')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    const message = await screen.findByText('503 Service Unavailable')
    const toast = message.closest<HTMLElement>('[data-sonner-toast]')!
    await user.click(within(toast).getByRole('button', { name: /close/i }))
    await waitFor(() =>
      expect(screen.queryByText('503 Service Unavailable')).not.toBeInTheDocument(),
    )
  })

  test('stays on the login page with a repeated redirect, like the Vue app', async () => {
    mockFetch({ '/api/login': () => text(makeToken()) })
    const user = start('/login?redirect=/files/a&redirect=/files/b')
    await fillLogin(user, 'alice', 'pw')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(useAuthStore.getState().user).not.toBeNull())
    // the user is set before a navigation would start: give it time to happen
    await act(() => new Promise((resolve) => setTimeout(resolve, 50)))
    expect(url()).toBe('/login?redirect=/files/a&redirect=/files/b')
  })

  test('shows the logout reason', async () => {
    start('/login?logout-reason=inactivity')
    expect(
      await screen.findByText('You have been logged out due to inactivity.'),
    ).toBeInTheDocument()
  })

  test('logged in users are sent to /files/', async () => {
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text(makeToken({ username: 'alice' })) })
    start('/login')

    expect(await screen.findByTestId('username')).toHaveTextContent('alice')
    expect(url()).toBe('/files/')
  })
})

describe('signup', () => {
  async function startSignup() {
    window.FileBrowser.Signup = true
    const user = start('/login')
    await user.click(await screen.findByRole('button', { name: 'Create an account' }))
    expect(screen.getByRole('button', { name: 'Signup' })).toHaveAttribute('type', 'submit')
    expect(screen.getByRole('button', { name: 'Already have an account' })).toBeInTheDocument()
    return user
  }

  async function fillSignup(
    user: ReturnType<typeof userEvent.setup>,
    pass = 'password1234',
    confirm = pass,
  ) {
    await fillLogin(user, 'carol', pass)
    await user.type(screen.getByLabelText('Password Confirmation'), confirm)
    await user.click(screen.getByRole('button', { name: 'Signup' }))
  }

  test('toggles between login and signup', async () => {
    const user = await startSignup()
    await user.click(screen.getByRole('button', { name: 'Already have an account' }))
    expect(screen.queryByLabelText('Password Confirmation')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Login' })).toBeInTheDocument()
  })

  test('signs up then logs in', async () => {
    const fetch = mockFetch({
      '/api/signup': () => text('200 OK\n'),
      '/api/login': () => text(makeToken({ username: 'carol' })),
    })
    const user = await startSignup()
    await fillSignup(user)

    await waitFor(() => expect(url()).toBe('/files/'))
    expect(fetch.mock.calls.map(([u]) => u)).toEqual(['/api/signup', '/api/login'])
    expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({
      username: 'carol',
      password: 'password1234',
    })
    expect(await screen.findByTestId('username')).toHaveTextContent('carol')
  })

  test('checks the confirmation', async () => {
    const fetch = mockFetch({})
    const user = await startSignup()
    await fillSignup(user, 'password1234', 'password12345')

    expect(await screen.findByRole('alert')).toHaveTextContent("Passwords don't match")
    expect(fetch).not.toHaveBeenCalled()
  })

  test('shows taken usernames', async () => {
    mockFetch({ '/api/signup': () => text('409 Conflict\n', 409) })
    const user = await startSignup()
    await fillSignup(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('Username already taken')
  })

  test('shows the minimum password length', async () => {
    mockFetch({
      '/api/signup': () =>
        text('400 Bad Request (password is too short, minimum length is 12)\n', 400),
    })
    const user = await startSignup()
    await fillSignup(user, 'short')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Password must be at least 12 characters',
    )
  })

  test('shows other bad requests as is', async () => {
    mockFetch({ '/api/signup': () => text('400 Bad Request\n', 400) })
    const user = await startSignup()
    await fillSignup(user)
    expect(await screen.findByRole('alert')).toHaveTextContent('400 Bad Request')
  })
})

describe('session', () => {
  test('a stored token logs in directly', async () => {
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text(makeToken({ username: 'alice' })) })
    start('/files/a/b/')

    expect(await screen.findByTestId('username')).toHaveTextContent('alice')
    expect(url()).toBe('/files/a/b/')
  })

  test('an invalid stored token leads to the login page', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text('401 Unauthorized\n', 401) })
    start('/settings')

    expect(await screen.findByLabelText('Username')).toBeInTheDocument()
    expect(url()).toBe('/login?redirect=/settings/profile')
  })

  test('applies the locale of the user', async () => {
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text(makeToken({ locale: 'ar' })) })
    start('/files/')

    expect(await screen.findByRole('button', { name: 'تسجيل خروج' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('ar')
    expect(document.documentElement.dir).toBe('rtl')
  })

  test('uses the browser locale on the login page', async () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('de-DE')
    const { setLocale, detectLocale } = await import('@/i18n')
    setLocale(detectLocale())
    start('/login')

    expect(await screen.findByLabelText('Benutzername')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anmelden' })).toBeInTheDocument()
    expect(document.documentElement.lang).toBe('de')
  })

  test('logs out', async () => {
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text(makeToken()) })
    const user = start('/files/')

    await user.click(await screen.findByRole('button', { name: 'Logout' }))

    expect(await screen.findByLabelText('Username')).toBeInTheDocument()
    expect(url()).toBe('/login')
    expect(localStorage.getItem('jwt')).toBe('')

    // going back requires to log in again
    await act(async () => window.history.back())
    await waitFor(() => expect(url()).toBe('/login?redirect=/files/'))
    expect(screen.getByLabelText('Username')).toBeInTheDocument()
  })

  test('logs out on inactivity', async () => {
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text(makeToken({}, 1)) })
    start('/files/')

    expect(
      await screen.findByText('You have been logged out due to inactivity.', {}, { timeout: 3000 }),
    ).toBeInTheDocument()
    expect(url()).toBe('/login?logout-reason=inactivity')
  })

  test('without login page, logs in without credentials', async () => {
    window.FileBrowser.LoginPage = false
    window.FileBrowser.NoAuth = true
    window.FileBrowser.AuthMethod = 'noauth'
    mockFetch({ '/api/login': () => text(makeToken({ username: 'admin' })) })
    start('/')

    expect(await screen.findByTestId('username')).toHaveTextContent('admin')
    expect(url()).toBe('/files/')
    // no logout with noauth, like the Vue sidebar
    expect(screen.queryByRole('button', { name: 'Logout' })).not.toBeInTheDocument()
  })

  test('public shares do not require a login', async () => {
    start('/share/abc')
    expect(await screen.findByRole('heading', { name: 'Share' })).toBeInTheDocument()
    expect(url()).toBe('/share/abc')
    expect(screen.queryByTestId('username')).not.toBeInTheDocument()
  })
})

describe('base URL', () => {
  test('routes are relative to the base URL', async () => {
    window.FileBrowser.BaseURL = '/fb'
    mockFetch({ '/fb/api/login': () => text(makeToken({ username: 'alice' })) })
    const user = start('/fb/foo/bar')

    await waitFor(() => expect(url()).toBe('/fb/login?redirect=/files/foo/bar'))
    await fillLogin(user, 'alice', 'pw')
    await user.click(screen.getByRole('button', { name: 'Login' }))

    await waitFor(() => expect(url()).toBe('/fb/files/foo/bar'))
    expect(await screen.findByTestId('username')).toHaveTextContent('alice')
  })
})
