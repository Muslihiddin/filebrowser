import { afterEach, describe, expect, test, vi } from 'vitest'
import { copy, copyWithPermissionRetry } from './clipboard'

function secureClipboard(writeText: (text: string) => Promise<void>) {
  Object.defineProperty(window, 'isSecureContext', { value: true, configurable: true })
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })
}

function permissions(state: PermissionState | null) {
  Object.defineProperty(navigator, 'permissions', {
    value: state ? { query: vi.fn(async () => ({ state })) } : undefined,
    configurable: true,
  })
}

afterEach(() => {
  Reflect.deleteProperty(window, 'isSecureContext')
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(navigator, 'permissions')
})

describe('copy', () => {
  test('uses the clipboard API in secure contexts', async () => {
    const writeText = vi.fn(async () => {})
    secureClipboard(writeText)
    await copy('hello')
    expect(writeText).toHaveBeenCalledWith('hello')
  })

  test('falls back to execCommand', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    document.queryCommandSupported = vi.fn(() => true)
    let copied = ''
    document.execCommand = vi.fn(() => {
      copied = (document.activeElement as HTMLTextAreaElement).value
      return true
    })

    await copy('fallback')

    expect(document.execCommand).toHaveBeenCalledWith('copy')
    expect(copied).toBe('fallback')
    expect(document.querySelector('textarea')).toBeNull()
  })

  test('fails without any copy method', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    document.queryCommandSupported = vi.fn(() => false)
    await expect(copy('x')).rejects.toThrow('None of copying methods are supported')
  })
})

describe('copyWithPermissionRetry', () => {
  test('retries after asking for the permission', async () => {
    const writeText = vi
      .fn<(text: string) => Promise<void>>()
      .mockRejectedValueOnce(new Error('denied'))
      .mockResolvedValueOnce()
    secureClipboard(writeText)
    permissions('prompt')

    await copyWithPermissionRetry('retry')
    expect(writeText).toHaveBeenCalledTimes(2)
  })

  test('fails when the permission is denied', async () => {
    secureClipboard(vi.fn(async () => Promise.reject(new Error('denied'))))
    permissions('denied')
    await expect(copyWithPermissionRetry('x')).rejects.toThrow('Permission denied!')
  })

  test('fails without the permissions API', async () => {
    secureClipboard(vi.fn(async () => Promise.reject(new Error('denied'))))
    permissions(null)
    await expect(copyWithPermissionRetry('x')).rejects.toThrow('Permission denied!')
  })
})
