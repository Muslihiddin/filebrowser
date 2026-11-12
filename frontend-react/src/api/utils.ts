export class StatusError extends Error {
  status?: number
  is_canceled?: boolean

  constructor(message: string, status?: number, is_canceled?: boolean) {
    super(message)
    this.name = 'StatusError'
    this.status = status
    this.is_canceled = is_canceled
  }
}

/** setTimeout supporting delays longer than the ~24.8 days browsers allow. */
export function setSafeTimeout(callback: () => void, delay: number): number {
  const MAX_DELAY = 86_400_000
  let remaining = delay
  let id = 0

  function scheduleNext(): number {
    if (remaining <= MAX_DELAY) {
      id = window.setTimeout(callback, remaining)
    } else {
      id = window.setTimeout(() => {
        remaining -= MAX_DELAY
        scheduleNext()
      }, MAX_DELAY)
    }
    return id
  }

  return scheduleNext()
}
