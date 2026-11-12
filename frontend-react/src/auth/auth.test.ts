import { beforeEach, describe, expect, test, vi } from 'vitest'
import { StatusError } from '@/api/utils'
import { getLocale } from '@/i18n'
import { router } from '@/router'
import { makeToken, mockFetch, text } from '@/test/utils'
import * as auth from './auth'
import { useAuthStore } from './store'

const body = (init: RequestInit | undefined) => JSON.parse(init!.body as string)

describe('parseToken', () => {
  test('stores the token and the user', () => {
    const token = makeToken({ username: 'alice' })
    auth.parseToken(token)

    const state = useAuthStore.getState()
    expect(state.jwt).toBe(token)
    expect(state.user?.username).toBe('alice')
    expect(localStorage.getItem('jwt')).toBe(token)
    expect(document.cookie).toContain(`auth=${token}`)
  })

  test('applies the locale of the user', () => {
    auth.parseToken(makeToken({ locale: 'de' }))
    expect(getLocale()).toBe('de')
  })

  test('falls back to the browser locale', () => {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue('fr-FR')
    auth.parseToken(makeToken({ locale: '' }))
    expect(getLocale()).toBe('fr')
  })

  test('throws on malformed tokens', () => {
    expect(() => auth.parseToken('not a token')).toThrow()
    expect(useAuthStore.getState().user).toBeNull()
  })

  test('logs out on expiration', async () => {
    vi.useFakeTimers()
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    auth.parseToken(makeToken({}, 60))
    expect(useAuthStore.getState().logoutTimer).not.toBeNull()

    vi.advanceTimersByTime(59_000)
    expect(useAuthStore.getState().user).not.toBeNull()

    vi.advanceTimersByTime(1_000)
    expect(useAuthStore.getState().user).toBeNull()
    expect(localStorage.getItem('jwt')).toBe('')
    expect(push).toHaveBeenCalledWith({
      path: '/login',
      query: { 'logout-reason': 'inactivity' },
    })
  })

  test('a new token replaces the logout timer', () => {
    vi.useFakeTimers()
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    auth.parseToken(makeToken({}, 60))
    auth.parseToken(makeToken({}, 7200))
    vi.advanceTimersByTime(120_000)

    expect(useAuthStore.getState().user).not.toBeNull()
    expect(push).not.toHaveBeenCalled()
  })

  test('no idle timeout with proxy auth and a custom logout page', () => {
    window.FileBrowser.AuthMethod = 'proxy'
    window.FileBrowser.LogoutPage = 'https://sso.example.com/logout'
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    auth.parseToken(makeToken())
    expect(useAuthStore.getState().user).not.toBeNull()
    expect(useAuthStore.getState().logoutTimer).toBeNull()
  })
})

describe('login', () => {
  test('posts the credentials and parses the token', async () => {
    const token = makeToken({ username: 'bob' })
    const fetch = mockFetch({ '/api/login': () => text(token) })

    await auth.login('bob', 'secret', '')

    expect(fetch).toHaveBeenCalledTimes(1)
    const [, init] = fetch.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'Content-Type': 'application/json' })
    expect(body(init)).toEqual({ username: 'bob', password: 'secret', recaptcha: '' })
    expect(useAuthStore.getState().user?.username).toBe('bob')
  })

  test('uses the base URL', async () => {
    window.FileBrowser.BaseURL = '/fb'
    const fetch = mockFetch({ '/fb/api/login': () => text(makeToken()) })
    await auth.login('a', 'b')
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('throws a StatusError with the response body', async () => {
    mockFetch({ '/api/login': () => text('403 Forbidden\n', 403, 'Forbidden') })

    const error = await auth.login('bob', 'wrong', '').catch((e) => e)
    expect(error).toBeInstanceOf(StatusError)
    expect(error.status).toBe(403)
    expect(error.message).toBe('403 Forbidden\n')
    expect(useAuthStore.getState().user).toBeNull()
  })

  test('uses the status when the body is empty', async () => {
    mockFetch({ '/api/login': () => text('', 500, 'Internal Server Error') })

    const error = await auth.login('bob', 'x', '').catch((e) => e)
    expect(error.message).toBe('500 Internal Server Error')
  })
})

describe('signup', () => {
  test('posts the new user', async () => {
    const fetch = mockFetch({ '/api/signup': () => text('200 OK\n') })
    await auth.signup('carol', 'password123')
    expect(body(fetch.mock.calls[0][1])).toEqual({ username: 'carol', password: 'password123' })
    // signup does not log in by itself
    expect(useAuthStore.getState().user).toBeNull()
  })

  test.each([
    [409, '409 Conflict\n'],
    [400, '400 Bad Request (password is too short, minimum length is 12)\n'],
    [405, '405 Method Not Allowed\n'],
  ])('throws a StatusError on %i', async (status, message) => {
    mockFetch({ '/api/signup': () => text(message, status) })
    const error = await auth.signup('carol', 'x').catch((e) => e)
    expect(error).toBeInstanceOf(StatusError)
    expect(error.status).toBe(status)
    expect(error.message).toBe(message)
  })
})

describe('renew and validateLogin', () => {
  test('renews the stored token', async () => {
    const stored = makeToken({ username: 'old' })
    const renewed = makeToken({ username: 'new' })
    localStorage.setItem('jwt', stored)
    const fetch = mockFetch({ '/api/renew': () => text(renewed) })

    await auth.validateLogin()

    const [, init] = fetch.mock.calls[0]
    expect(init?.method).toBe('POST')
    expect(init?.headers).toEqual({ 'X-Auth': stored })
    expect(useAuthStore.getState().jwt).toBe(renewed)
    expect(localStorage.getItem('jwt')).toBe(renewed)
  })

  test('does nothing without a stored token', async () => {
    const fetch = mockFetch({})
    localStorage.setItem('jwt', '')
    await auth.validateLogin()
    expect(fetch).not.toHaveBeenCalled()
    expect(useAuthStore.getState().user).toBeNull()
  })

  test('throws when the stored token is rejected', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    localStorage.setItem('jwt', makeToken())
    mockFetch({ '/api/renew': () => text('401 Unauthorized\n', 401) })

    await expect(auth.validateLogin()).rejects.toMatchObject({ status: 401 })
    expect(useAuthStore.getState().user).toBeNull()
  })
})

describe('initAuth', () => {
  test('validates the stored token when there is a login page', async () => {
    localStorage.setItem('jwt', makeToken())
    const fetch = mockFetch({ '/api/renew': () => text(makeToken()) })
    await auth.initAuth()
    expect(fetch.mock.calls[0][0]).toBe('/api/renew')
  })

  test('logs in without credentials otherwise (proxy, noauth)', async () => {
    window.FileBrowser.LoginPage = false
    const fetch = mockFetch({ '/api/login': () => text(makeToken({ username: 'proxy' })) })
    await auth.initAuth()
    expect(body(fetch.mock.calls[0][1])).toEqual({ username: '', password: '', recaptcha: '' })
    expect(useAuthStore.getState().user?.username).toBe('proxy')
  })
})

describe('logout', () => {
  beforeEach(() => {
    auth.parseToken(makeToken({ locale: 'de' }))
  })

  test('clears the session and goes to the login page', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    auth.logout()

    const state = useAuthStore.getState()
    expect(state.user).toBeNull()
    expect(state.jwt).toBe('')
    expect(state.logoutTimer).toBeNull()
    expect(localStorage.getItem('jwt')).toBe('')
    expect(document.cookie).not.toContain('auth=')
    expect(push).toHaveBeenCalledWith({ path: '/login' })
    // like the Vue app, the locale is kept
    expect(getLocale()).toBe('de')
  })

  test('passes the reason to the login page', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    auth.logout('inactivity')
    expect(push).toHaveBeenCalledWith({
      path: '/login',
      query: { 'logout-reason': 'inactivity' },
    })
  })

  test('ignores blank reasons', () => {
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    auth.logout('  ')
    expect(push).toHaveBeenCalledWith({ path: '/login' })
  })

  test('goes to the custom logout page', () => {
    window.FileBrowser.LogoutPage = 'https://sso.example.com/logout'
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)
    const location = { href: '' }
    vi.spyOn(window, 'location', 'get').mockReturnValue(location as Location)

    auth.logout()

    expect(location.href).toBe('https://sso.example.com/logout')
    expect(push).not.toHaveBeenCalled()
  })

  test('reloads the page without authentication', () => {
    window.FileBrowser.NoAuth = true
    const reload = vi.fn()
    vi.spyOn(window, 'location', 'get').mockReturnValue({ reload } as unknown as Location)
    const push = vi.spyOn(router, 'push').mockResolvedValue(undefined)

    auth.logout()

    expect(reload).toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled()
  })
})
