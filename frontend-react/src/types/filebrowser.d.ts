export {}

declare global {
  /** Settings injected by the Go server into index.html. */
  interface FileBrowserConfig {
    AuthMethod: string
    BaseURL: string
    CSS: boolean
    Color: string
    DisableExternal: boolean
    DisableUsedPercentage: boolean
    EnableExec: boolean
    EnableThumbs: boolean
    HideLoginButton?: boolean
    LoginPage: boolean
    LogoutPage: string
    Name: string
    NoAuth: boolean
    ReCaptcha: boolean
    ReCaptchaHost?: string
    ReCaptchaKey?: string
    ResizePreview: boolean
    Signup: boolean
    StaticURL: string
    Theme: UserTheme
    TusSettings: { chunkSize: number; retryCount: number }
    Version: string
  }

  type UserTheme = 'light' | 'dark' | ''

  interface Window {
    FileBrowser: FileBrowserConfig
    __prependStaticUrl: (url: string) => string
  }

  interface UserPermissions {
    admin: boolean
    copy: boolean
    create: boolean
    delete: boolean
    download: boolean
    execute: boolean
    modify: boolean
    move: boolean
    rename: boolean
    share: boolean
    shell: boolean
    upload: boolean
  }

  /** User information embedded in the JWT (see http/auth.go userInfo). */
  interface IUser {
    id: number
    username: string
    locale: string
    viewMode: string
    singleClick: boolean
    redirectAfterCopyMove: boolean
    perm: UserPermissions
    commands: string[]
    lockPassword: boolean
    hideDotfiles: boolean
    dateFormat: boolean
    aceEditorTheme: string
  }
}
