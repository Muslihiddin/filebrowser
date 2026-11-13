import { useTranslation } from 'react-i18next'
import { logout } from '@/auth/auth'
import { useAuthStore } from '@/auth/store'
import { Button } from '@/components/ui/button'
import { config } from '@/config'

/**
 * Temporary header of the migrated pages: the username and the logout button
 * of the placeholders, until the header bar and the sidebar are migrated.
 */
export function SessionBar() {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)

  return (
    <header className="flex h-14 items-center gap-3 border-b px-4">
      <div className="ms-auto flex items-center gap-3">
        {user && (
          <span className="text-sm text-muted-foreground" data-testid="username">
            {user.username}
          </span>
        )}
        {user && config.canLogout && (
          <Button variant="outline" onClick={() => logout()}>
            {t('sidebar.logout')}
          </Button>
        )}
      </div>
    </header>
  )
}
