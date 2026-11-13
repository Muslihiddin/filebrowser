import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/auth/store'
import { RouterLink } from '@/components/RouterLink'
import { SessionBar } from '@/components/SessionBar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouteStore } from '@/router'
import { titles, type RouteName } from '@/router/routes'
import { cn } from '@/lib/utils'
import { settingsTabs } from './settings/logic'
import Profile from './settings/Profile'
import Shares from './settings/Shares'

/** Pages of the settings that are not migrated yet. */
function NotMigrated({ name }: { name: RouteName }) {
  const { t } = useTranslation()
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t(titles[name])}</h2>
        </CardTitle>
      </CardHeader>
    </Card>
  )
}

function SettingsPage({ name }: { name: RouteName }) {
  switch (name) {
    case 'ProfileSettings':
      return <Profile />
    case 'Shares':
      return <Shares />
    default:
      return <NotMigrated name={name} />
  }
}

// Port of frontend/src/views/Settings.vue: the layout of the settings pages.
export default function Settings({ name }: { name: RouteName }) {
  const { t } = useTranslation()
  const user = useAuthStore((state) => state.user)
  const route = useRouteStore((state) => state.current)!
  const tabs = settingsTabs(user, route.path, route.name)

  return (
    <div className="min-h-svh" data-route={name}>
      <SessionBar />

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-4 p-4 md:p-6">
        <nav aria-label={t('sidebar.settings')} className="overflow-x-auto">
          <ul className="inline-flex h-9 w-fit min-w-max items-center gap-1 rounded-lg bg-muted p-[3px] text-muted-foreground">
            {tabs.map((tab) => (
              <li key={tab.to} className="h-full">
                <RouterLink
                  to={tab.to}
                  aria-current={tab.active ? 'page' : undefined}
                  data-active={tab.active || undefined}
                  className={cn(
                    'inline-flex h-full items-center justify-center rounded-md border border-transparent px-3 text-sm font-medium whitespace-nowrap transition-all outline-none hover:text-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50',
                    'data-active:bg-background data-active:text-foreground data-active:shadow-sm dark:data-active:border-input dark:data-active:bg-input/30',
                  )}
                >
                  {t(tab.label)}
                </RouterLink>
              </li>
            ))}
          </ul>
        </nav>

        {user?.perm.admin && (
          <Card>
            <CardHeader>
              <CardTitle>
                <h2>{t('settings.sunsetTitle')}</h2>
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p>{t('settings.sunsetBody')}</p>
              <p>
                <a
                  href="https://github.com/filebrowser/filebrowser#security"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline underline-offset-4"
                >
                  {t('settings.sunsetLink')}
                </a>
              </p>
            </CardContent>
          </Card>
        )}

        <SettingsPage key={name} name={name} />
      </div>
    </div>
  )
}
