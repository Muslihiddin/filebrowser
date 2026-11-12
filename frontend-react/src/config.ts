// Accessors for the settings injected by the Go server (window.FileBrowser).
// They are read lazily, mirroring frontend/src/utils/constants.ts.

const fb = (): Partial<FileBrowserConfig> => window.FileBrowser ?? {}

export const config = {
  get name(): string {
    return fb().Name || 'File Browser'
  },
  get disableExternal(): boolean {
    return !!fb().DisableExternal
  },
  get baseURL(): string {
    return fb().BaseURL ?? ''
  },
  get staticURL(): string {
    return fb().StaticURL ?? ''
  },
  get logoURL(): string {
    return `${this.staticURL}/img/logo.svg`
  },
  get signup(): boolean {
    return !!fb().Signup
  },
  get noAuth(): boolean {
    return !!fb().NoAuth
  },
  get authMethod(): string {
    return fb().AuthMethod ?? 'json'
  },
  get logoutPage(): string {
    return fb().LogoutPage ?? '/login'
  },
  get loginPage(): boolean {
    return fb().LoginPage ?? true
  },
  get theme(): UserTheme {
    return fb().Theme ?? ''
  },
  get hideLoginButton(): boolean {
    return !!fb().HideLoginButton
  },
  /** Same rule as the logout button of the Vue sidebar. */
  get canLogout(): boolean {
    return !this.noAuth && (this.loginPage || this.logoutPage !== '/login')
  },
}
