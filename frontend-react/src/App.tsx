import { useEffect, useState } from 'react'
import { BrowserRouter } from 'react-router'
import { RouterBridge } from '@/components/RouterBridge'
import { Toaster } from '@/components/ui/sonner'
import { config } from '@/config'
import { getLocale, isRtl, onLocaleChange, setHtmlLocale } from '@/i18n'
import { getMediaPreference, getTheme, setTheme } from '@/lib/theme'
import { useRouteStore } from '@/router'
import Login from '@/views/Login'
import Placeholder from '@/views/Placeholder'

function removeLoadingScreen() {
  const loading = document.getElementById('loading')
  loading?.classList.add('done')
  setTimeout(() => loading?.parentNode?.removeChild(loading), 200)
}

/** Shown once the first navigation is resolved, like the Vue app mount. */
function AppView() {
  const route = useRouteStore((state) => state.current)!
  const [theme] = useState<UserTheme>(() => getTheme() || getMediaPreference())
  const [locale, setLocaleState] = useState(getLocale)

  useEffect(() => {
    setTheme(theme)
    setHtmlLocale(getLocale())
    removeLoadingScreen()
    return onLocaleChange((newLocale) => {
      setHtmlLocale(newLocale)
      setLocaleState(newLocale)
    })
  }, [theme])

  return (
    <>
      {route.name === 'Login' ? (
        <Login />
      ) : (
        <Placeholder name={route.name!} />
      )}
      <Toaster
        position="bottom-center"
        theme={theme || 'system'}
        dir={isRtl(locale) ? 'rtl' : 'ltr'}
      />
    </>
  )
}

export default function App() {
  const ready = useRouteStore((state) => state.current !== null)

  return (
    <BrowserRouter basename={config.baseURL || undefined}>
      <RouterBridge />
      {ready && <AppView />}
    </BrowserRouter>
  )
}
