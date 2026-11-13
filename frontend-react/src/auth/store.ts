import { create } from 'zustand'
import { detectLocale, setLocale } from '@/i18n'

interface AuthState {
  user: IUser | null
  jwt: string
  logoutTimer: number | null
  setUser: (user: IUser | null) => void
  /** Merges changes into the user, applying a new locale. */
  updateUser: (user: Partial<IUser>) => void
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
  updateUser: (user) => {
    if (user.locale) {
      setLocale(user.locale)
    }
    // Nobody is logged in (e.g. a save that finished after logout): stay logged out.
    set((state) =>
      state.user === null ? {} : { user: { ...state.user, ...structuredClone(user) } },
    )
  },
  // Like pinia's $reset: the locale is left untouched.
  clearUser: () => set(initialState),
  setLogoutTimer: (logoutTimer) => set({ logoutTimer }),
}))

export const isLoggedIn = () => useAuthStore.getState().user !== null
