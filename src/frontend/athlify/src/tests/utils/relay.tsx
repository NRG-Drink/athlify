import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactElement } from 'react'
import { RelayEnvironmentProvider } from 'react-relay'
import { createMemoryRouter, RouterProvider, type RouteObject } from 'react-router-dom'
import {
  Environment,
  Network,
  RecordSource,
  Store,
  type GraphQLSingularResponse,
  type RequestParameters,
  type Variables,
} from 'relay-runtime'
import { vi } from 'vitest'
import { Provider } from '../../components/ui/provider'

// Loosely typed on purpose: tests also return error payloads and never-settling promises.
type Handler = (operation: string, variables: Variables) => unknown

/** A Relay environment whose network is a handler keyed by operation name, with call inspection. */
export function createTestEnvironment(handler: Handler) {
  const fetchFn = vi.fn(
    (request: RequestParameters, variables: Variables) =>
      handler(request.name, variables) as
        GraphQLSingularResponse | Promise<GraphQLSingularResponse>,
  )
  const environment = new Environment({
    network: Network.create(fetchFn),
    store: new Store(new RecordSource()),
  })
  /** The variables of every request of the named operation. */
  const calls = (operation: string) =>
    fetchFn.mock.calls
      .filter(([request]) => request.name === operation)
      .map(([, variables]) => variables)
  return { environment, fetchFn, calls }
}

export function renderWithRelay(
  ui: ReactElement,
  handler: Handler,
  { path = '/', routePath = '/' }: { path?: string; routePath?: string } = {},
) {
  const test = createTestEnvironment(handler)
  const routes: RouteObject[] = [{ path: routePath, element: ui }]
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const user = userEvent.setup()
  const result = render(
    <RelayEnvironmentProvider environment={test.environment}>
      <Provider>
        <RouterProvider router={router} />
      </Provider>
    </RelayEnvironmentProvider>,
  )
  return { ...result, ...test, router, user }
}
