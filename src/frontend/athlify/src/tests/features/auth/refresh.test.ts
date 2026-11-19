import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { authUrl } from '../../../auth/api'
import {
  clearRefreshFailure,
  invalidateRefreshRequests,
  refreshAccessToken,
} from '../../../auth/refresh'
import {
  invalidateSessionRequests,
  SessionRequestInvalidatedError,
} from '../../../auth/sessionRequests'
import { tokenStore } from '../../../auth/tokenStore'

function createAccessToken() {
  const claims = {
    unique_name: 'rider',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'User',
  }
  const payload = btoa(JSON.stringify(claims))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  return `header.${payload}.signature`
}

function tokenResponse(token = createAccessToken()) {
  return new Response(
    JSON.stringify({
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('refreshAccessToken', () => {
  beforeEach(() => {
    invalidateSessionRequests()
    invalidateRefreshRequests()
    tokenStore.clear()
  })
  afterEach(() => {
    invalidateSessionRequests()
    invalidateRefreshRequests()
    clearRefreshFailure()
    tokenStore.clear()
  })

  test('posts with cookies and stores the refreshed access token', async () => {
    const token = createAccessToken()
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse(token))

    await expect(refreshAccessToken()).resolves.toBe(token)

    expect(fetch).toHaveBeenCalledWith(authUrl('refresh'), {
      method: 'POST',
      credentials: 'include',
      signal: expect.any(AbortSignal),
    })
    expect(tokenStore.get()).toBe(token)
    expect(tokenStore.getRoles()).toEqual(['User'])
    expect(tokenStore.getUserName()).toBe('rider')
  })

  test('clears a stale access token when the refresh cookie is rejected', async () => {
    tokenStore.set(createAccessToken(), new Date(Date.now() + 60_000).toISOString())
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(null, { status: 401 }))

    await expect(refreshAccessToken()).resolves.toBeNull()

    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRoles()).toEqual([])
    expect(tokenStore.getUserName()).toBeNull()
  })

  test('shares one in-flight request between concurrent refreshes', async () => {
    let resolveResponse!: (response: Response) => void
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve
      }),
    )

    const first = refreshAccessToken()
    const second = refreshAccessToken()

    expect(second).toBe(first)
    await Promise.resolve()
    expect(fetch).toHaveBeenCalledTimes(1)

    resolveResponse(tokenResponse())
    await expect(Promise.all([first, second])).resolves.toEqual([
      expect.any(String),
      expect.any(String),
    ])
  })

  test('preserves the current token and blocks retries after an indeterminate failure', async () => {
    const token = createAccessToken()
    tokenStore.set(token, new Date(Date.now() + 60_000).toISOString())
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockRejectedValue(new TypeError('Network unavailable'))

    await expect(refreshAccessToken()).rejects.toThrow('Network unavailable')
    await expect(refreshAccessToken()).rejects.toThrow('Network unavailable')

    expect(tokenStore.get()).toBe(token)
    expect(fetch).toHaveBeenCalledTimes(1)
  })

  test('does not let an invalidated refresh overwrite a newer session', async () => {
    let resolveOldResponse!: (response: Response) => void
    const newToken = createAccessToken()
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveOldResponse = resolve
        }),
      )
      .mockResolvedValueOnce(tokenResponse(newToken))

    const oldRefresh = refreshAccessToken()
    await Promise.resolve()
    invalidateSessionRequests()
    invalidateRefreshRequests(false)
    tokenStore.set(newToken, new Date(Date.now() + 60_000).toISOString())
    clearRefreshFailure()
    resolveOldResponse(tokenResponse())

    await expect(oldRefresh).rejects.toBeInstanceOf(SessionRequestInvalidatedError)
    expect(tokenStore.get()).toBe(newToken)

    await expect(refreshAccessToken()).resolves.toBe(newToken)
    expect(fetch).toHaveBeenCalledTimes(2)
    expect(tokenStore.get()).toBe(newToken)
  })

  test('does not restore a token after logout invalidates an in-flight refresh', async () => {
    let resolveResponse!: (response: Response) => void
    const fetch = vi.spyOn(globalThis, 'fetch').mockReturnValue(
      new Promise((resolve) => {
        resolveResponse = resolve
      }),
    )

    const refresh = refreshAccessToken()
    await Promise.resolve()
    expect(fetch).toHaveBeenCalledTimes(1)

    invalidateSessionRequests()
    invalidateRefreshRequests()
    tokenStore.clear()
    resolveResponse(tokenResponse())

    await expect(refresh).rejects.toBeInstanceOf(SessionRequestInvalidatedError)
    expect(tokenStore.get()).toBeNull()
  })
})
