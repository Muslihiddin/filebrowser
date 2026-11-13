import { describe, expect, test, vi } from 'vitest'
import { useAuthStore } from '@/auth/store'
import { makeToken, mockFetch, text } from '@/test/utils'
import * as share from './share'
import * as users from './users'
import { createURL, fetchJSON, fetchURL } from './fetch'
import { StatusError } from './utils'

describe('fetchURL', () => {
  test('sends the token and prefixes the base URL', async () => {
    window.FileBrowser.BaseURL = '/fb'
    useAuthStore.setState({ jwt: 'token' })
    const fetch = mockFetch({ '/fb/api/shares': () => text('[]') })

    await fetchURL('/api/shares', { headers: { 'X-Other': '1' } })

    expect(fetch.mock.calls[0][1]!.headers).toEqual({ 'X-Auth': 'token', 'X-Other': '1' })
  })

  test('throws the body of failed responses', async () => {
    mockFetch({ '/api/x': () => text('403 Forbidden\n', 403) })
    const error = await fetchURL('/api/x').catch((e) => e)
    expect(error).toBeInstanceOf(StatusError)
    expect(error.message).toBe('403 Forbidden\n')
    expect(error.status).toBe(403)
  })

  test('uses the status when the body is empty', async () => {
    mockFetch({ '/api/x': () => text('', 500, 'Internal Server Error') })
    const error = await fetchURL('/api/x').catch((e) => e)
    expect(error.message).toBe('500 Internal Server Error')
  })

  test('network errors have the status 0', async () => {
    vi.stubGlobal('fetch', () => Promise.reject(new TypeError('Failed to fetch')))
    const error = await fetchURL('/api/x').catch((e) => e)
    expect(error).toMatchObject({ message: '000 No connection', status: 0, is_canceled: undefined })

    const abort = Object.assign(new Error('aborted'), { name: 'AbortError' })
    vi.stubGlobal('fetch', () => Promise.reject(abort))
    const aborted = await fetchURL('/api/x').catch((e) => e)
    expect(aborted).toMatchObject({ status: 0, is_canceled: true })
  })

  test('renews the token when asked to', async () => {
    useAuthStore.setState({ jwt: 'old' })
    const fetch = mockFetch({
      '/api/x': () => new Response('ok', { headers: { 'X-Renew-Token': 'true' } }),
      '/api/renew': () => text(makeToken({ username: 'renewed' })),
    })

    await fetchURL('/api/x')

    expect(fetch.mock.calls[1][1]!.headers).toEqual({ 'X-Auth': 'old' })
    expect(useAuthStore.getState().user?.username).toBe('renewed')
  })

  test('logs out on 401', async () => {
    useAuthStore.getState().setUser(JSON.parse(atob(makeToken().split('.')[1])).user)
    mockFetch({ '/api/x': () => text('401 Unauthorized\n', 401) })

    await expect(fetchURL('/api/x')).rejects.toMatchObject({ status: 401 })
    expect(useAuthStore.getState().user).toBeNull()
  })
})

test('fetchJSON', async () => {
  mockFetch({
    '/api/json': () => text('{"a":1}'),
    '/api/created': () => text('', 201, 'Created'),
  })
  expect(await fetchJSON('/api/json')).toEqual({ a: 1 })
  await expect(fetchJSON('/api/created')).rejects.toMatchObject({
    message: '201 Created',
    status: 201,
  })
})

test('createURL', () => {
  expect(createURL('share/abc')).toBe('http://localhost:3000/share/abc')
  window.FileBrowser.BaseURL = '/fb'
  expect(createURL('share/a b', { x: '1' })).toBe('http://localhost:3000/fb/share/a%20b?x=1')
})

test('share API', async () => {
  const fetch = mockFetch({
    '/api/shares': () => text('[{"hash":"h","path":"/p","expire":0}]'),
    '/api/share/h': () => text(''),
  })
  expect(await share.list()).toEqual([{ hash: 'h', path: '/p', expire: 0 }])
  await share.remove('h')
  expect(fetch.mock.calls[1][1]!.method).toBe('DELETE')
  expect(share.getShareURL({ hash: 'h', path: '/p', expire: 0 })).toBe(
    'http://localhost:3000/share/h',
  )
})

test('users API', async () => {
  const fetch = mockFetch({ '/api/users/3': () => text('') })

  await users.update({ id: 3, locale: 'de' }, ['locale'])
  expect(fetch.mock.calls[0][1]!.method).toBe('PUT')
  expect(JSON.parse(fetch.mock.calls[0][1]!.body as string)).toEqual({
    what: 'user',
    which: ['locale'],
    data: { id: 3, locale: 'de' },
  })

  await users.update({ id: 3, password: 'new' }, ['password'], 'old')
  expect(JSON.parse(fetch.mock.calls[1][1]!.body as string)).toEqual({
    what: 'user',
    which: ['password'],
    current_password: 'old',
    data: { id: 3, password: 'new' },
  })
})
