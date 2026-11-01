import { useCallback, useState } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'

/**
 * Changes the URL parameters that a list's query reads (filters, sort) and reports the refresh.
 *
 * The router applies the change in a transition, so the old rows stay until the new data is there;
 * `refreshing` is true in that gap, so the table can dim them. `pendingKey` is the location the change
 * started from: any later navigation, including one that did not come from this list, gives a new
 * location key and ends the gap.
 */
export function useParamsRefresh() {
  const [searchParams, setSearchParams] = useSearchParams()
  const location = useLocation()
  const [pendingKey, setPendingKey] = useState<string>()

  const replaceParams = useCallback(
    (next: URLSearchParams) => {
      setPendingKey(location.key)
      setSearchParams(next, { replace: true })
    },
    [location.key, setSearchParams],
  )

  return {
    searchParams,
    replaceParams,
    refreshing: pendingKey !== undefined && pendingKey === location.key,
  }
}
