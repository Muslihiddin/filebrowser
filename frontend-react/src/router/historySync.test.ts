import { expect, test } from 'vitest'
import { HistorySync } from './historySync'

test('locations committed by the router are not synced again', () => {
  const sync = new HistorySync()
  const state = sync.register()
  expect(sync.needsSync(state)).toBe(false)
})

test('locations reached through the browser are synced', () => {
  const sync = new HistorySync()
  expect(sync.needsSync(null)).toBe(true)
  expect(sync.needsSync(undefined)).toBe(true)
  expect(sync.needsSync({ other: 1 })).toBe(true)
})

test('going back to an entry of the router is synced', () => {
  const sync = new HistorySync()
  const first = sync.register()
  expect(sync.needsSync(first)).toBe(false)
  const second = sync.register()
  expect(sync.needsSync(second)).toBe(false)

  // back, then forward
  expect(sync.needsSync(first)).toBe(true)
  expect(sync.needsSync(second)).toBe(true)
})

test('a navigation superseded by the back button before being rendered', () => {
  const sync = new HistorySync()
  const global = sync.register()
  expect(sync.needsSync(global)).toBe(false)

  // click on a tab, then back before React renders the new location: only
  // the entry reached by the back button is seen
  const users = sync.register()
  expect(sync.needsSync(global)).toBe(true)
  // forward again
  expect(sync.needsSync(users)).toBe(true)
})

test('several navigations rendered at once', () => {
  const sync = new HistorySync()
  const a = sync.register()
  const b = sync.register()
  expect(sync.needsSync(b)).toBe(false)
  // back to the entry that was never rendered
  expect(sync.needsSync(a)).toBe(true)
})

test('instances do not recognize each other (page reloads)', () => {
  const before = new HistorySync().register()
  const sync = new HistorySync()
  sync.register()
  expect(sync.needsSync(before)).toBe(true)
})
