// Tells apart the history entries committed by the app router from the ones
// reached through the browser (initial load, back/forward, links), which must
// go through the navigation guards.
//
// React Router commits location changes in transitions: when several of them
// happen before React renders (e.g. a click on a link quickly followed by the
// back button), only the last location is seen. Each navigation of the router
// therefore carries an id in the history state, so that the location that is
// finally seen can be recognized whatever happened in between.

const STATE_KEY = 'fbNavigation'

export class HistorySync {
  // History states survive page reloads: the ids must not collide with the
  // ones of an earlier instance (crypto.randomUUID needs a secure context).
  private readonly session = Math.random().toString(36).slice(2)
  private lastId = 0
  private pending = new Set<string>()

  /** Registers a navigation of the router, returns the history state to commit with it. */
  register(): Record<string, string> {
    const id = `${this.session}:${++this.lastId}`
    this.pending.add(id)
    return { [STATE_KEY]: id }
  }

  /**
   * Called with the history state of every location that is rendered.
   * Returns true when the router must handle the location.
   */
  needsSync(state: unknown): boolean {
    const id = (state as Record<string, unknown> | null)?.[STATE_KEY]
    const own = typeof id === 'string' && this.pending.has(id)
    // the navigations not seen so far have been superseded by this location
    this.pending.clear()
    return !own
  }
}
