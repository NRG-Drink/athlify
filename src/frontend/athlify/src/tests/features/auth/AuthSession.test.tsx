import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, test, vi } from 'vitest'
import { authUrl } from '../../../auth/api'
import { AuthAndRelayProvider } from '../../../auth/AuthAndRelayProvider'
import { useAuth } from '../../../auth/context'
import { tokenStore } from '../../../auth/tokenStore'

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

function tokenResponse(token = createAccessToken()) {
  return new Response(
    JSON.stringify({
      token,
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

function AuthProbe() {
  const auth = useAuth()
  const [loginError, setLoginError] = useState<string | null>(null)

  return (
    <>
      <p data-testid="session">
        {auth.isLoggedIn ? `signed in: ${auth.userName}` : 'signed out'}
      </p>
      <p data-testid="role">{auth.hasRole('User') ? 'user role' : 'no user role'}</p>
      {loginError && <p role="alert">{loginError}</p>}
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
})
