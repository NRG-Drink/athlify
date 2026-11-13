import { ChakraProvider } from '@chakra-ui/react'
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useState } from 'react'
import { useRelayEnvironment } from 'react-relay'
import type { Environment } from 'relay-runtime'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { authUrl } from '../../../auth/api'
import { AuthAndRelayProvider } from '../../../auth/AuthAndRelayProvider'
import { useAuth } from '../../../auth/context'
import { invalidateRefreshRequests } from '../../../auth/refresh'
import { invalidateSessionRequests } from '../../../auth/sessionRequests'
import { tokenStore } from '../../../auth/tokenStore'
import { Toaster } from '../../../components/ui/toaster'
import { system } from '../../../theme'

function createAccessToken() {
  const claims = {
    'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name': 'rider',
    'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': 'User',
  }
  const payload = btoa(JSON.stringify(claims))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  return `header.${payload}.signature`
}

function tokenResponse(
  token = createAccessToken(),
  expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(),
) {
  return new Response(
    JSON.stringify({
      token,
      expiresAt,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function AuthProbe({
  onRelayEnvironment,
}: {
  onRelayEnvironment?: (environment: Environment) => void
}) {
  const auth = useAuth()
  const relayEnvironment = useRelayEnvironment()
  const [loginError, setLoginError] = useState<string | null>(null)

  useEffect(() => {
    onRelayEnvironment?.(relayEnvironment)
  }, [onRelayEnvironment, relayEnvironment])

  return (
    <>
      <p data-testid="session">
        {auth.isLoggedIn ? `signed in: ${auth.userName}` : 'signed out'}
      </p>
      <p data-testid="role">{auth.hasRole('User') ? 'user role' : 'no user role'}</p>
      {loginError && <p role="alert">{loginError}</p>}
      <button
        onClick={() => {
          void auth.logout().catch((error: unknown) => {
            setLoginError(error instanceof Error ? error.message : 'Sign-out failed')
          })
        }}
      >
        Sign out
      </button>
      <button
        onClick={() => {
          void auth.login('rider', 'correct-password').catch((error: unknown) => {
            setLoginError(error instanceof Error ? error.message : 'Login failed')
          })
        }}
      >
        Sign in
      </button>
    </>
  )
}

describe('AuthAndRelayProvider session', () => {
  beforeEach(() => {
    invalidateSessionRequests()
    invalidateRefreshRequests()
    tokenStore.clear()
  })

  afterEach(() => {
    invalidateSessionRequests()
    invalidateRefreshRequests()
    tokenStore.clear()
  })

  test('restores a session through the refresh endpoint', async () => {
    tokenStore.clear()
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(tokenResponse())

    render(
      <AuthAndRelayProvider>
        <AuthProbe />
      </AuthAndRelayProvider>,
    )

    expect(await screen.findByTestId('session')).toHaveTextContent('signed in: rider')
    expect(screen.getByTestId('role')).toHaveTextContent('user role')
    expect(fetch).toHaveBeenCalledWith(authUrl('refresh'), {
      method: 'POST',
      credentials: 'include',
      signal: expect.any(AbortSignal),
    })
  })

  test('signs in with credentials and exposes the returned session', async () => {
    tokenStore.clear()
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(tokenResponse())
    const user = userEvent.setup()

    render(
      <AuthAndRelayProvider>
        <AuthProbe />
      </AuthAndRelayProvider>,
    )

    expect(await screen.findByTestId('session')).toHaveTextContent('signed out')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByTestId('session')).toHaveTextContent('signed in: rider')
    expect(screen.getByTestId('role')).toHaveTextContent('user role')
    expect(fetch).toHaveBeenNthCalledWith(2, authUrl('login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rider', password: 'correct-password' }),
    })
  })

  test('logs out, clears auth state and replaces the Relay cache', async () => {
    tokenStore.clear()
    const relayEnvironments: Environment[] = []
    const onRelayEnvironment = (environment: Environment) => {
      relayEnvironments.push(environment)
    }
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
    const user = userEvent.setup()

    render(
      <AuthAndRelayProvider>
        <AuthProbe onRelayEnvironment={onRelayEnvironment} />
      </AuthAndRelayProvider>,
    )

    expect(await screen.findByTestId('session')).toHaveTextContent('signed in: rider')
    const previousEnvironment = relayEnvironments[0]
    if (!previousEnvironment) throw new Error('Relay environment was not provided.')
    previousEnvironment.commitUpdate((store) => {
      store.create('client:private-stats', 'PrivateStats').setValue('distance', 42)
    })

    await user.click(screen.getByRole('button', { name: 'Sign out' }))

    expect(await screen.findByTestId('session')).toHaveTextContent('signed out')
    expect(screen.getByTestId('role')).toHaveTextContent('no user role')
    expect(tokenStore.get()).toBeNull()
    expect(tokenStore.getRoles()).toEqual([])
    expect(tokenStore.getUserName()).toBeNull()
    expect(fetch).toHaveBeenNthCalledWith(2, authUrl('logout'), {
      method: 'POST',
      credentials: 'include',
    })

    const currentEnvironment = relayEnvironments.at(-1)
    if (!currentEnvironment) throw new Error('Relay environment was not reset.')
    expect(currentEnvironment).not.toBe(previousEnvironment)
    expect(currentEnvironment.getStore().getSource().get('client:private-stats')).toBeUndefined()
  })

  test('keeps the session active when a background refresh fails transiently', async () => {
    tokenStore.clear()
    const token = createAccessToken()
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        tokenResponse(token, new Date(Date.now() + 1000).toISOString()),
      )
      .mockResolvedValueOnce(new Response(null, { status: 503 }))

    render(
      <ChakraProvider value={system}>
        <Toaster />
        <AuthAndRelayProvider>
          <AuthProbe />
        </AuthAndRelayProvider>
      </ChakraProvider>,
    )

    expect(await screen.findByTestId('session')).toHaveTextContent('signed in: rider')
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 950))
    })

    expect(screen.getByTestId('session')).toHaveTextContent('signed in: rider')
    expect(await screen.findByText(
      'Deine Sitzung konnte nicht aktualisiert werden. Melde dich erneut an, um den Zugriff wiederherzustellen.',
    )).toBeInTheDocument()
    expect(tokenStore.get()).toBe(token)
    expect(fetch).toHaveBeenCalledTimes(2)
  })

  test('serializes refresh, logout, and a new login to preserve cookie ordering', async () => {
    tokenStore.clear()
    let resolveRefresh!: (response: Response) => void
    let resolveLogout!: (response: Response) => void
    const refreshSignal: { current: AbortSignal | null } = { current: null }
    const newToken = createAccessToken()
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        tokenResponse(createAccessToken(), new Date(Date.now() + 30_000).toISOString()),
      )
      .mockImplementationOnce((_input, init) => {
        refreshSignal.current = init?.signal ?? null
        return new Promise((resolve) => {
          resolveRefresh = resolve
        })
      })
      .mockReturnValueOnce(
        new Promise((resolve) => {
          resolveLogout = resolve
        }),
      )
      .mockResolvedValueOnce(tokenResponse(newToken))
    const user = userEvent.setup()

    render(
      <AuthAndRelayProvider>
        <AuthProbe />
      </AuthAndRelayProvider>,
    )

    expect(await screen.findByTestId('session')).toHaveTextContent('signed in: rider')
    document.dispatchEvent(new Event('visibilitychange'))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))

    await user.click(screen.getByRole('button', { name: 'Sign out' }))
    expect(refreshSignal.current?.aborted).toBe(true)
    expect(tokenStore.get()).toBeNull()
    expect(fetch).toHaveBeenCalledTimes(2)

    resolveRefresh(tokenResponse())
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(3))
    expect(fetch).toHaveBeenNthCalledWith(3, authUrl('logout'), {
      method: 'POST',
      credentials: 'include',
    })

    await user.click(screen.getByRole('button', { name: 'Sign in' }))
    expect(fetch).toHaveBeenCalledTimes(3)

    resolveLogout(new Response(null, { status: 200 }))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(4))
    expect(fetch).toHaveBeenNthCalledWith(4, authUrl('login'), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'rider', password: 'correct-password' }),
    })
    expect(await screen.findByTestId('session')).toHaveTextContent('signed in: rider')
    expect(tokenStore.get()).toBe(newToken)
  })
})
