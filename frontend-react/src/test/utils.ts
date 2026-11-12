import { vi } from 'vitest'

const base64url = (value: object) =>
  btoa(JSON.stringify(value)).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_')

export function makeUser(overrides: Partial<IUser> = {}): IUser {
  return {
    id: 1,
    username: 'admin',
    locale: 'en',
    viewMode: 'list',
    singleClick: false,
    redirectAfterCopyMove: false,
    perm: {
      admin: true,
      copy: true,
      create: true,
      delete: true,
      download: true,
      execute: true,
      modify: true,
      move: true,
      rename: true,
      share: true,
      shell: true,
      upload: true,
    },
    commands: [],
    lockPassword: false,
    hideDotfiles: false,
    dateFormat: false,
    aceEditorTheme: '',
    ...overrides,
  }
}

/** An (unsigned) token shaped like the ones of http/auth.go. */
export function makeToken(user: Partial<IUser> = {}, expiresInSeconds = 7200): string {
  const now = Math.floor(Date.now() / 1000)
  return [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({
      user: makeUser(user),
      iss: 'File Browser',
      iat: now,
      exp: now + expiresInSeconds,
    }),
    'signature',
  ].join('.')
}

type Handler = (init: RequestInit | undefined) => Response | Promise<Response>

/** Mocks fetch with one handler per URL, records the calls. */
export function mockFetch(handlers: Record<string, Handler>) {
  const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === 'string' ? input : input.toString()
    const handler = handlers[url]
    if (!handler) throw new TypeError(`unexpected fetch ${url}`)
    return handler(init)
  })
  vi.stubGlobal('fetch', fetchMock)
  return fetchMock
}

export const text = (body: string, status = 200, statusText = '') =>
  new Response(body, { status, statusText })
