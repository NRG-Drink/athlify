import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { authUrl, graphqlUrl } from '../../auth/api'
import { tokenStore } from '../../auth/tokenStore'
import { fetchQuery } from '../../relay/environment'
import type { RequestParameters, Variables } from 'relay-runtime'

const request = {
  cacheID: 'relay-network-query',
  id: null,
  metadata: {},
  name: 'RelayNetworkQuery',
  operationKind: 'query',
  text: 'query RelayNetworkQuery { viewer { id } }',
} satisfies RequestParameters

const variables: Variables = {}

function createAccessToken() {
  const claims = { unique_name: 'rider' }
  const payload = btoa(JSON.stringify(claims))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '')
  return `header.${payload}.signature`
}

function tokenResponse() {
  return new Response(
    JSON.stringify({
      token: createAccessToken(),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
}

describe('Relay network authentication', () => {
  beforeEach(() => tokenStore.clear())
  afterEach(() => {
    tokenStore.clear()
    vi.restoreAllMocks()
  })

  test('does not send GraphQL when the initial session refresh is rejected', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 401 }),
    )

    await expect(fetchQuery(request, variables, {})).rejects.toThrow(
      'Your session has expired. Please sign in again.',
    )

    expect(fetch).toHaveBeenCalledTimes(1)
    expect(fetch).toHaveBeenCalledWith(authUrl('refresh'), {
      method: 'POST',
      credentials: 'include',
    })
  })

  test('refreshes and retries a GraphQL request rejected as unauthenticated', async () => {
    tokenStore.set(createAccessToken(), new Date(Date.now() + 60_000).toISOString())
    const fetch = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(tokenResponse())
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ data: { viewer: { id: 'user:1' } } }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )

    await expect(fetchQuery(request, variables, {})).resolves.toEqual({
      data: { viewer: { id: 'user:1' } },
    })

    expect(fetch).toHaveBeenNthCalledWith(1, graphqlUrl(), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }))
    expect(fetch).toHaveBeenNthCalledWith(2, authUrl('refresh'), {
      method: 'POST',
      credentials: 'include',
    })
    expect(fetch).toHaveBeenNthCalledWith(3, graphqlUrl(), expect.objectContaining({
      headers: expect.objectContaining({ Authorization: expect.stringMatching(/^Bearer /) }),
    }))
  })

  test('returns an authorization error for forbidden GraphQL responses', async () => {
    tokenStore.set(createAccessToken(), new Date(Date.now() + 60_000).toISOString())
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(null, { status: 403 }),
    )

    await expect(fetchQuery(request, variables, {})).rejects.toThrow(
      'You do not have permission to access this resource.',
    )

    expect(fetch).toHaveBeenCalledTimes(1)
  })
})
