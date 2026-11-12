import { useEffect, useLayoutEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { router, setHistoryNavigate } from '@/router'

/**
 * Connects the app router to React Router's history: locations reached
 * through the browser (initial load, back/forward, links) go through the
 * navigation guards, and the router commits its navigations via React Router.
 */
export function RouterBridge() {
  const location = useLocation()
  const navigate = useNavigate()
  const selfNavigation = useRef(false)
  const handledKey = useRef<string | null>(null)

  useLayoutEffect(() => {
    setHistoryNavigate((fullPath, { replace }) => {
      selfNavigation.current = true
      void navigate(fullPath, { replace })
    })
    return () => setHistoryNavigate(null)
  }, [navigate])

  useEffect(() => {
    if (handledKey.current === location.key) return
    handledKey.current = location.key

    if (selfNavigation.current) {
      selfNavigation.current = false
      return
    }

    void router.sync(location.pathname + location.search + location.hash)
  }, [location])

  return null
}
