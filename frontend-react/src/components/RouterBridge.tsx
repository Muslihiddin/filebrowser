import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate, type Location } from 'react-router'
import { router, setHistoryNavigate } from '@/router'
import { HistorySync } from '@/router/historySync'

/**
 * Connects the app router to React Router's history: locations reached
 * through the browser (initial load, back/forward, links) go through the
 * navigation guards, and the router commits its navigations via React Router.
 */
export function RouterBridge() {
  const location = useLocation()
  const navigate = useNavigate()
  const historySync = useRef(new HistorySync())
  // The location object, not its key: going back to an entry that was
  // already handled yields the same key, but a new location object. The
  // object only repeats when StrictMode runs the effect twice.
  const handledLocation = useRef<Location | null>(null)

  useLayoutEffect(() => {
    setHistoryNavigate((fullPath, { replace }) => {
      void navigate(fullPath, { replace, state: historySync.current.register() })
    })
    return () => setHistoryNavigate(null)
  }, [navigate])

  useEffect(() => {
    if (handledLocation.current === location) return
    handledLocation.current = location

    if (!historySync.current.needsSync(location.state)) return

    void router.sync(location.pathname + location.search + location.hash)
  }, [location])

  return null
}
