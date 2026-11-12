import { useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { StatusError } from '@/api/utils'
import * as auth from '@/auth/auth'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { config } from '@/config'
import { showError } from '@/lib/toast'
import { router, useRouteStore } from '@/router'
import { firstQueryValue } from '@/router/location'

// Port of frontend/src/views/Login.vue (without reCAPTCHA).
export default function Login() {
  const { t } = useTranslation()
  const route = useRouteStore((state) => state.current)

  const [createMode, setCreateMode] = useState(false)
  const [error, setError] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')

  const reason = firstQueryValue(route?.query['logout-reason']) ?? null
  const signup = config.signup

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    event.stopPropagation()

    const redirect = route?.query.redirect

    if (createMode && password !== passwordConfirm) {
      setError(t('login.passwordsDontMatch'))
      return
    }

    try {
      if (createMode) {
        await auth.signup(username, password)
      }

      await auth.login(username, password, '')
      // Like Vue, where router.push can't resolve an array path (?redirect=/a&redirect=/b).
      if (Array.isArray(redirect)) return
      await router.push({ path: redirect || '/files/' })
    } catch (e) {
      if (e instanceof StatusError) {
        if (e.status === 409) {
          setError(t('login.usernameTaken'))
        } else if (e.status === 403) {
          setError(t('login.wrongCredentials'))
        } else if (e.status === 400) {
          const match = e.message.match(/minimum length is (\d+)/)
          if (match) {
            setError(t('login.passwordTooShort', { min: match[1] }))
          } else {
            setError(e.message)
          }
        } else {
          showError(e)
        }
      } else {
        console.error(e)
      }
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center p-6 md:p-10">
      <Card className="w-full max-w-sm">
        <CardHeader className="justify-items-center text-center">
          <img src={config.logoURL} alt="File Browser" className="size-16" />
          <CardTitle>
            <h1>{config.name}</h1>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="flex flex-col gap-4">
            {reason != null && (
              <Alert role="status">
                <AlertDescription>
                  {t(`login.logout_reasons.${reason}`)}
                </AlertDescription>
              </Alert>
            )}
            {error !== '' && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="grid gap-2">
              <Label htmlFor="login-username">{t('login.username')}</Label>
              <Input
                id="login-username"
                name="username"
                type="text"
                autoFocus
                autoCapitalize="off"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={t('login.username')}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="login-password">{t('login.password')}</Label>
              <Input
                id="login-password"
                name="password"
                type="password"
                autoComplete={createMode ? 'new-password' : 'current-password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('login.password')}
              />
            </div>
            {createMode && (
              <div className="grid gap-2">
                <Label htmlFor="login-password-confirm">
                  {t('login.passwordConfirm')}
                </Label>
                <Input
                  id="login-password-confirm"
                  name="passwordConfirm"
                  type="password"
                  autoComplete="new-password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  placeholder={t('login.passwordConfirm')}
                />
              </div>
            )}

            <Button type="submit" className="w-full">
              {createMode ? t('login.signup') : t('login.submit')}
            </Button>

            {signup && (
              <Button
                type="button"
                variant="link"
                onClick={() => setCreateMode((mode) => !mode)}
              >
                {createMode ? t('login.loginInstead') : t('login.createAnAccount')}
              </Button>
            )}
          </form>
        </CardContent>
      </Card>
    </main>
  )
}
