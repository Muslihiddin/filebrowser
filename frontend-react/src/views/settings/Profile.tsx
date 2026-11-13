import { useId, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import * as api from '@/api/users'
import { useAuthStore } from '@/auth/store'
import { AceEditorTheme } from '@/components/settings/AceEditorTheme'
import { Languages } from '@/components/settings/Languages'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { config } from '@/config'
import i18n from '@/i18n'
import { showError, showSuccess } from '@/lib/toast'
import { cn } from '@/lib/utils'
import {
  canUpdatePassword,
  passwordFeedback,
  profileFields,
  profileSettings,
  type ProfileSettings,
} from './logic'

type BooleanSetting = 'hideDotfiles' | 'singleClick' | 'redirectAfterCopyMove' | 'dateFormat'

const checkboxes: { name: BooleanSetting; label: string }[] = [
  { name: 'hideDotfiles', label: 'settings.hideDotfiles' },
  { name: 'singleClick', label: 'settings.singleClick' },
  { name: 'redirectAfterCopyMove', label: 'settings.redirectAfterCopyMove' },
  { name: 'dateFormat', label: 'settings.setDateFormat' },
]

// Port of frontend/src/views/settings/Profile.vue
export default function Profile() {
  const { t } = useTranslation()
  const id = useId()
  const user = useAuthStore((state) => state.user)

  // like the Vue page, the form is initialized once, when the page opens
  const [settings, setSettings] = useState<ProfileSettings | null>(() =>
    user ? profileSettings(user) : null,
  )
  const [password, setPassword] = useState('')
  const [passwordConf, setPasswordConf] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [isCurrentPasswordRequired] = useState(() => config.authMethod === 'json')

  if (settings === null) return null

  const feedback = passwordFeedback(password, passwordConf)
  const passwordClass = cn(feedback === 'match' && 'border-green-600 dark:border-green-500')

  const set = <K extends keyof ProfileSettings>(key: K, value: ProfileSettings[K]) =>
    setSettings((current) => current && { ...current, [key]: value })

  const updateSettings = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    try {
      const current = useAuthStore.getState().user
      if (current === null) throw new Error('User is not set!')

      const data = { ...current, id: current.id, ...settings }
      await api.update(data, [...profileFields])
      useAuthStore.getState().updateUser(data)
      showSuccess(i18n.t('settings.settingsUpdated'))
    } catch (err) {
      if (err instanceof Error) {
        showError(err)
      }
    }
  }

  const updatePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const current = useAuthStore.getState().user
    if (!canUpdatePassword(password, passwordConf, currentPassword) || current === null) {
      return
    }

    try {
      const data = { ...current, id: current.id, password }
      await api.update(data, ['password'], currentPassword)
      showSuccess(i18n.t('settings.passwordUpdated'))
    } catch (e) {
      showError(e as Error)
    } finally {
      setPassword('')
      setPasswordConf('')
    }
  }

  return (
    <div className="grid items-start gap-4 md:grid-cols-2">
      <form onSubmit={updateSettings} aria-labelledby={`${id}-profile`}>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2 id={`${id}-profile`}>{t('settings.profileSettings')}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {checkboxes.map((checkbox) => (
              <Label key={checkbox.name} className="leading-snug font-normal">
                <Checkbox
                  name={checkbox.name}
                  checked={settings[checkbox.name]}
                  onCheckedChange={(checked) => set(checkbox.name, checked)}
                />
                {t(checkbox.label)}
              </Label>
            ))}

            <div className="grid gap-2">
              <Label htmlFor={`${id}-locale`} className="font-heading text-sm font-medium">
                {t('settings.language')}
              </Label>
              <Languages
                id={`${id}-locale`}
                locale={settings.locale}
                onChange={(locale) => set('locale', locale)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor={`${id}-ace`} className="font-heading text-sm font-medium">
                {t('settings.aceEditorTheme')}
              </Label>
              <AceEditorTheme
                id={`${id}-ace`}
                aceEditorTheme={settings.aceEditorTheme}
                onChange={(theme) => set('aceEditorTheme', theme)}
              />
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" name="submitProfile">
              {t('buttons.update')}
            </Button>
          </CardFooter>
        </Card>
      </form>

      {!config.noAuth && (
        <div>
          {!user?.lockPassword && (
            <form onSubmit={updatePassword} aria-labelledby={`${id}-password`}>
              <Card>
                <CardHeader>
                  <CardTitle>
                    <h2 id={`${id}-password`}>{t('settings.changePassword')}</h2>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-3">
                  <Input
                    className={passwordClass}
                    aria-invalid={feedback === 'mismatch' || undefined}
                    type="password"
                    placeholder={t('settings.newPassword')}
                    aria-label={t('settings.newPassword')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    name="password"
                    autoComplete="new-password"
                  />
                  <Input
                    className={passwordClass}
                    aria-invalid={feedback === 'mismatch' || undefined}
                    type="password"
                    placeholder={t('settings.newPasswordConfirm')}
                    aria-label={t('settings.newPasswordConfirm')}
                    value={passwordConf}
                    onChange={(e) => setPasswordConf(e.target.value)}
                    name="passwordConf"
                    autoComplete="new-password"
                  />
                  {isCurrentPasswordRequired && (
                    <Input
                      className={passwordClass}
                      aria-invalid={feedback === 'mismatch' || undefined}
                      type="password"
                      placeholder={t('settings.currentPassword')}
                      aria-label={t('settings.currentPassword')}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      name="current_password"
                      autoComplete="current-password"
                    />
                  )}
                </CardContent>
                <CardFooter className="justify-end">
                  <Button type="submit" name="submitPassword">
                    {t('buttons.update')}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
