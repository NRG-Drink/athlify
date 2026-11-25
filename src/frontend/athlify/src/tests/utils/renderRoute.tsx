import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { RelayEnvironmentProvider } from 'react-relay'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { AuthContext, type AuthContextValue } from '../../auth/context'
import { ChakraProviderAthlify } from '../../components/ui/ChakraProviderAthlify'
import { routes as appRoutes } from '../../routes'
import { createTestEnvironment } from './relay'

const defaultAuth: AuthContextValue = {
  isLoggedIn: true,
  login: async () => {},
  logout: async () => {},
  isLoading: false,
  bootstrapError: null,
  hasRole: () => false,
  userName: 'test',
}

export function renderRoute(
  initialPath: string,
  routes: RouteObject[] = appRoutes,
  authOverrides: Partial<AuthContextValue> = {},
) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const user = userEvent.setup()
  const { environment } = createTestEnvironment(() => ({ data: {} }))
  const result = render(
    <RelayEnvironmentProvider environment={environment}>
      <ChakraProviderAthlify>
        <AuthContext.Provider value={{ ...defaultAuth, ...authOverrides }}>
          <RouterProvider router={router} />
        </AuthContext.Provider>
      </ChakraProviderAthlify>
    </RelayEnvironmentProvider>,
  )
  return { ...result, router, user }
}
