// Port of fetchURL/fetchJSON/createURL of frontend/src/api/utils.ts. Kept
// apart from ./utils, which the auth module itself depends on.
import { logout, renew } from '@/auth/auth'
import { useAuthStore } from '@/auth/store'
import { config } from '@/config'
import { encodePath } from '@/lib/url'
import { StatusError } from './utils'

export interface ApiOpts {
  method?: string
  headers?: Record<string, string>
  body?: BodyInit | null
  signal?: AbortSignal
}

/**
 * Authenticated request to the API: renews the token when the server asks
 * for it and logs out on 401, like the Vue app. Throws a StatusError for
 * network errors and non 2xx responses.
 */
export async function fetchURL(url: string, opts: ApiOpts = {}, auth = true): Promise<Response> {
  const { headers = {}, ...rest } = opts

  let res: Response
  try {
    res = await fetch(`${config.baseURL}${url}`, {
      headers: {
        'X-Auth': useAuthStore.getState().jwt,
        ...headers,
      },
      ...rest,
    })
  } catch (e) {
    // Check if the error is an intentional cancellation
    if (e instanceof Error && e.name === 'AbortError') {
      throw new StatusError('000 No connection', 0, true)
    }
    throw new StatusError('000 No connection', 0)
  }

  if (auth && res.headers.get('X-Renew-Token') === 'true') {
    await renew(useAuthStore.getState().jwt)
  }

  if (res.status < 200 || res.status > 299) {
    const body = await res.text()
    const error = new StatusError(body || `${res.status} ${res.statusText}`, res.status)

    if (auth && res.status === 401) {
      logout()
    }

    throw error
  }

  return res
}

export async function fetchJSON<T>(url: string, opts?: ApiOpts): Promise<T> {
  const res = await fetchURL(url, opts)

  if (res.status === 200) {
    return res.json() as Promise<T>
  }

  throw new StatusError(`${res.status} ${res.statusText}`, res.status)
}

/** Absolute URL of a page of the app, like createURL of the Vue app. */
export function createURL(endpoint: string, searchParams: Record<string, string> = {}): string {
  let prefix = config.baseURL
  if (!prefix.endsWith('/')) {
    prefix = prefix + '/'
  }
  const url = new URL(prefix + encodePath(endpoint), window.location.origin)
  url.search = new URLSearchParams(searchParams).toString()

  return url.toString()
}
