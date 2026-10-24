import {
  Environment,
  Network,
  RecordSource,
  Store,
  type FetchFunction,
  type GraphQLResponse,
} from 'relay-runtime'

// Relative by default so requests stay same-origin and go through the dev-server
// proxy (see vite.config.ts); override with VITE_GRAPHQL_ENDPOINT for production builds.
const GRAPHQL_ENDPOINT = import.meta.env.VITE_GRAPHQL_ENDPOINT ?? '/graphql/'

// A request that never answers would keep the page skeleton forever. After this time the request
// fails, and the page shows its error state with a retry.
const REQUEST_TIMEOUT_MS = 15_000

const fetchGraphQL: FetchFunction = async (params, variables) => {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: params.text,
        variables,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`GraphQL request failed with status ${response.status}`)
    }

    return (await response.json()) as GraphQLResponse
  } finally {
    clearTimeout(timeout)
  }
}

export function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchGraphQL),
    store: new Store(new RecordSource()),
  })
}

const RelayEnvironment = createRelayEnvironment()

export default RelayEnvironment
