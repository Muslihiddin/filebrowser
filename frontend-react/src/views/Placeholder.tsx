import { useTranslation } from 'react-i18next'
import { logout } from '@/auth/auth'
import { useAuthStore } from '@/auth/store'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { config } from '@/config'
import { router } from '@/router'
import { titles, type RouteName } from '@/router/routes'

// Temporary page for the routes that have not been migrated yet.
export default function Placeholder({ name }: { name: RouteName }) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)

  return (
    <main
      className="flex min-h-svh items-center justify-center p-6 md:p-10"
      data-route={name}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>
            <h1>{t(titles[name])}</h1>
          </CardTitle>
          {user && (
            <CardDescription data-testid="username">{user.username}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {user
            ? config.canLogout && (
                <Button className="w-full" onClick={() => logout()}>
                  {t('sidebar.logout')}
                </Button>
              )
            : !config.hideLoginButton && (
                <Button
                  className="w-full"
                  onClick={() => void router.push('/login')}
                >
                  {t('sidebar.login')}
                </Button>
              )}
        </CardContent>
      </Card>
    </main>
  )
}
