import { toast } from 'sonner'
import { config } from '@/config'
import i18n from '@/i18n'

const REPORT_URL = 'https://github.com/filebrowser/filebrowser/issues/new/choose'
const TOAST_CLASS_PREFIX = 'fb-toast-'

let nextId = 0
let closeOnClickRegistered = false

/**
 * Closes an error toast when it is clicked, like `closeOnClick: true` of the
 * Vue app (sonner has no such option). Buttons keep their own behavior.
 */
function registerCloseOnClick() {
  if (closeOnClickRegistered) return
  closeOnClickRegistered = true

  document.addEventListener('click', (event) => {
    const target = event.target
    if (!(target instanceof Element) || target.closest('button')) return

    const element = target.closest('[data-sonner-toast]')
    if (!element) return

    const className = Array.from(element.classList).find((name) =>
      name.startsWith(TOAST_CLASS_PREFIX),
    )
    if (className) toast.dismiss(className.slice(TOAST_CLASS_PREFIX.length))
  })
}

/** Persistent error toast, like `$showError` of the Vue app. */
export function showError(error: Error | string, displayReport = true) {
  const message = (error as Error).message || String(error)
  const isReport = !config.disableExternal && displayReport

  registerCloseOnClick()

  const id = `error-${++nextId}`
  toast.error(message, {
    id,
    className: `${TOAST_CLASS_PREFIX}${id}`,
    duration: Infinity,
    closeButton: true,
    action: isReport
      ? {
          label: i18n.t('buttons.reportIssue'),
          onClick: () => window.open(REPORT_URL),
        }
      : undefined,
  })
}

/** Success toast, like `$showSuccess` of the Vue app (4s, closes on click). */
export function showSuccess(message: string) {
  registerCloseOnClick()

  const id = `success-${++nextId}`
  toast.success(message, {
    id,
    className: `${TOAST_CLASS_PREFIX}${id}`,
    duration: 4000,
    closeButton: true,
  })
}
