// Fetches the SDL from a running backend instance (HotChocolate exposes it via `?sdl`)
// so relay-compiler has an up-to-date schema.graphql without needing to stop the dev server.
import { writeFile } from 'node:fs/promises'
import { parse } from 'graphql'

const apiUrl = (process.env.VITE_API_URL ?? 'http://localhost:5095').replace(/\/$/, '')
const endpoint = process.env.VITE_GRAPHQL_ENDPOINT ?? `${apiUrl}/graphql/`

const response = await fetch(`${endpoint}?sdl`, { signal: AbortSignal.timeout(10_000) })
if (!response.ok) {
  throw new Error(
    `Failed to fetch schema from ${endpoint}: ${response.status} ${response.statusText}`,
  )
}

const sdl = await response.text()
// Never overwrite the committed contract with a body that is not GraphQL (e.g. a proxy error page).
try {
  parse(sdl)
} catch (error) {
  throw new Error(`Response from ${endpoint} is not a GraphQL SDL; schema.graphql was not changed.`, {
    cause: error,
  })
}

await writeFile('schema.graphql', sdl, 'utf8')

console.log(`Wrote schema.graphql from ${endpoint}`)
