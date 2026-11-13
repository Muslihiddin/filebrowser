import type { ComponentProps, MouseEvent } from 'react'
import { config } from '@/config'
import { router } from '@/router'

type Props = Omit<ComponentProps<'a'>, 'href'> & { to: string }

/**
 * Link navigating through the app router, like vue-router's <router-link>:
 * a real link (middle click, "open in a new tab") whose plain clicks call
 * `router.push()`.
 */
export function RouterLink({ to, onClick, target, ...props }: Props) {
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event)
    // same checks as vue-router's guardEvent
    if (
      event.defaultPrevented ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.button !== 0 ||
      (target && /\b_blank\b/i.test(target))
    ) {
      return
    }
    event.preventDefault()
    void router.push(to)
  }

  return <a href={config.baseURL + to} target={target} onClick={handleClick} {...props} />
}
