// Port of frontend/src/utils/auth.ts
import { jwtDecode, type JwtPayload } from 'jwt-decode'
import { setSafeTimeout, StatusError } from '@/api/utils'
import { config } from '@/config'
import { router } from '@/router'
import { useAuthStore } from './store'

export function parseToken(token: string) {
  // falsy or malformed jwt will throw InvalidTokenError
  const data = jwtDecode<JwtPayload & { user: IUser }>(token)

  document.cookie = `auth=${token}; Path=/; SameSite=Strict;`

  localStorage.setItem('jwt', token)

  const authStore = useAuthStore.getState()
  useAuthStore.setState({ jwt: token })
  authStore.setUser(data.user)

  // proxy auth with custom logout subject to unknown external timeout
  if (config.logoutPage !== '/login' && config.authMethod === 'proxy') {
    console.warn('idle timeout disabled with proxy auth and custom logout')
    return
  }

  const { logoutTimer } = useAuthStore.getState()
  if (logoutTimer) {
    clearTimeout(logoutTimer)
  }

  const expiresAt = new Date(data.exp! * 1000)
  const timeout = expiresAt.getTime() - Date.now()
  authStore.setLogoutTimer(
    setSafeTimeout(() => {
      logout('inactivity')
    }, timeout),
  )
}

export async function validateLogin() {
  try {
    const jwt = localStorage.getItem('jwt')
    if (jwt) {
      await renew(jwt)
    }
  } catch (error) {
    console.warn('Invalid JWT token in storage')
    throw error
  }
}

async function throwStatusError(res: Response, body?: string): Promise<never> {
  body = body ?? (await res.text())
  throw new StatusError(body || `${res.status} ${res.statusText}`, res.status)
}

export async function login(username: string, password: string, recaptcha = '') {
  const data = { username, password, recaptcha }

  const res = await fetch(`${config.baseURL}/api/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  const body = await res.text()

  if (res.status === 200) {
    parseToken(body)
  } else {
    await throwStatusError(res, body)
  }
}

export async function renew(jwt: string) {
  const res = await fetch(`${config.baseURL}/api/renew`, {
    method: 'POST',
    headers: {
      'X-Auth': jwt,
    },
  })

  const body = await res.text()

  if (res.status === 200) {
    parseToken(body)
  } else {
    await throwStatusError(res, body)
  }
}

export async function signup(username: string, password: string) {
  const data = { username, password }

  const res = await fetch(`${config.baseURL}/api/signup`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (res.status !== 200) {
    await throwStatusError(res)
  }
}

export function logout(reason?: string) {
  document.cookie = 'auth=; Max-Age=0; Path=/; SameSite=Strict;'

  const { logoutTimer, clearUser } = useAuthStore.getState()
  // Vue resets the store without clearing the timer: a stale timer would log
  // out a user who logged in again in the meantime, so clear it.
  if (logoutTimer) clearTimeout(logoutTimer)
  clearUser()

  localStorage.setItem('jwt', '')
  if (config.noAuth) {
    window.location.reload()
  } else if (config.logoutPage !== '/login') {
    window.location.href = `${config.logoutPage}`
  } else if (typeof reason === 'string' && reason.trim() !== '') {
    void router.push({ path: '/login', query: { 'logout-reason': reason } })
  } else {
    void router.push({ path: '/login' })
  }
}

/** Authentication done on the first navigation (see the Vue router). */
export async function initAuth() {
  if (config.loginPage) {
    await validateLogin()
  } else {
    await login('', '', '')
  }
}
