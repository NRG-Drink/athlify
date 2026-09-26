import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import { Provider } from '../components/ui/provider'
import { routes as appRoutes } from '../routes'

export function renderRoute(initialPath: string, routes: RouteObject[] = appRoutes) {
  const router = createMemoryRouter(routes, { initialEntries: [initialPath] })
  const user = userEvent.setup()
  const result = render(
    <Provider>
      <RouterProvider router={router} />
    </Provider>,
  )
  return { ...result, router, user }
}
