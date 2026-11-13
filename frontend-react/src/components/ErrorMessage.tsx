import { CircleAlert, CloudOff, LocateOff, OctagonAlert } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errorInfo, type ErrorInfo } from '@/views/settings/logic'

const icons: Record<ErrorInfo['icon'], typeof CloudOff> = {
  cloud_off: CloudOff,
  error: OctagonAlert,
  gps_off: LocateOff,
  error_outline: CircleAlert,
}

// Port of frontend/src/views/Errors.vue (without its header bar).
export function ErrorMessage({ errorCode }: { errorCode?: number }) {
  const { t } = useTranslation()
  const info = errorInfo(errorCode)
  const Icon = icons[info.icon]

  return (
    <h2
      className="flex flex-col items-center gap-3 py-12 text-center text-xl font-medium text-muted-foreground"
      data-error-code={errorCode ?? 500}
    >
      <Icon className="size-12" aria-hidden="true" />
      <span>{t(info.message)}</span>
    </h2>
  )
}
