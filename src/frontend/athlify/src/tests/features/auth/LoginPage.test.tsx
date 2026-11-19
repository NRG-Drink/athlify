import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, test, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../../auth/context'
import { ChakraProviderAthlify } from '../../../components/ui/ChakraProviderAthlify'
import { paths } from '../../../navigation/paths'
import { routes } from '../../../routes'
import { renderRoute } from '../../utils/renderRoute'

function renderWithStatefulAuth(login: AuthContextValue['login']) {
  const router = createMemoryRouter(routes, { initialEntries: [paths.login] })

  function StatefulAuthProvider({ children }: { children: ReactNode }) {
    const [isLoggedIn, setIsLoggedIn] = useState(false)
    const value: AuthContextValue = {
      isLoggedIn,
      login: async (username, password) => {
        await login(username, password)
        setIsLoggedIn(true)
      },
      logout: async () => {},
      isLoading: false,
      bootstrapError: null,
      hasRole: () => false,
      userName: null,
    }

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  }

  const user = userEvent.setup()
  const result = render(
    <ChakraProviderAthlify>
      <StatefulAuthProvider>
        <RouterProvider router={router} />
      </StatefulAuthProvider>
    </ChakraProviderAthlify>,
  )

  return { ...result, router, user }
}

describe('LoginPage', () => {
  test('submits the username and password and shows a localized error when sign-in fails', async () => {
    const login = vi.fn().mockRejectedValue(new Error('Invalid username or password.'))
    const { user } = renderRoute(paths.login, undefined, { isLoggedIn: false, login })

    await user.type(screen.getByRole('textbox', { name: 'Benutzername' }), ' admin ')
    await user.type(screen.getByLabelText('Passwort'), 'wrong-password')
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(login).toHaveBeenCalledWith('admin', 'wrong-password')
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Anmeldung fehlgeschlagen. Prüfe deinen Benutzernamen und dein Passwort und versuche es erneut.',
    )
  })

  test('navigates to the dashboard after a successful sign-in', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    const { router, user } = renderWithStatefulAuth(login)

    await user.type(screen.getByRole('textbox', { name: 'Benutzername' }), 'admin')
    await user.type(screen.getByLabelText('Passwort'), 'admin')
    await user.click(screen.getByRole('button', { name: 'Anmelden' }))

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(login).toHaveBeenCalledWith('admin', 'admin')
    expect(router.state.location.pathname).toBe(paths.dashboard)
  })

  test('redirects an unauthenticated visit to an app route to the login page', async () => {
    const { router } = renderRoute(paths.activities, undefined, { isLoggedIn: false })

    expect(await screen.findByRole('heading', { level: 1, name: 'Anmelden' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.login)
  })

  test('redirects an unauthenticated visit to the root to the login page', async () => {
    const { router } = renderRoute('/', undefined, { isLoggedIn: false })

    expect(await screen.findByRole('heading', { level: 1, name: 'Anmelden' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.login)
  })

  test('redirects an authenticated visit to the login page to the dashboard', async () => {
    const { router } = renderRoute(paths.login)

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(paths.dashboard)
  })
})
