import { startTransition, useCallback, useState } from 'react'

// Relay keeps the result of a query, errors included, for as long as the same query, variables and
// fetch key are asked for. A page that remounts after a failed load would show the old error
// before it fetches again, so every mount (and every retry) gets a key nobody used before.
let lastKey = 0

/** A fresh `fetchKey` for `useLazyLoadQuery` per mount, and a `retry` that refetches. */
export function useFetchKey(): [fetchKey: number, retry: () => void] {
  const [fetchKey, setFetchKey] = useState(() => ++lastKey)
  const retry = useCallback(() => startTransition(() => setFetchKey(() => ++lastKey)), [])
  return [fetchKey, retry]
}
