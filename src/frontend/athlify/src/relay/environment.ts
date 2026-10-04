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

const fetchGraphQL: FetchFunction = async (params, variables) => {
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
  })

  if (!response.ok) {
    throw new Error(`GraphQL request failed with status ${response.status}`)
  }

  return (await response.json()) as GraphQLResponse
}

export function createRelayEnvironment() {
  return new Environment({
    network: Network.create(fetchGraphQL),
    store: new Store(new RecordSource()),
  })
}

const RelayEnvironment = createRelayEnvironment()

export default RelayEnvironment
