import { create } from 'zustand'
import { detectLocale, setLocale } from '@/i18n'

interface AuthState {
  user: IUser | null
  jwt: string
  logoutTimer: number | null
  setUser: (user: IUser | null) => void
  clearUser: () => void
  setLogoutTimer: (logoutTimer: number | null) => void
}

const initialState = { user: null, jwt: '', logoutTimer: null }

// Port of frontend/src/stores/auth.ts
export const useAuthStore = create<AuthState>()((set) => ({
  ...initialState,
  setUser: (user) => {
    if (user === null) {
      set({ user: null })
      return
    }
    setLocale(user.locale || detectLocale())
    set({ user })
  },
  // Like pinia's $reset: the locale is left untouched.
  clearUser: () => set(initialState),
  setLogoutTimer: (logoutTimer) => set({ logoutTimer }),
}))

export const isLoggedIn = () => useAuthStore.getState().user !== null
