import { useState } from 'react'

type LoadNext = (count: number, options: { onComplete: (error: Error | null) => void }) => unknown

/**
 * The "load more" action of a paged list. A failed page is remembered, so the table can offer a
 * retry; `setLoadMoreError` clears it, for example when the list is filtered again.
 */
export function useLoadMore(loadNext: LoadNext, isLoadingNext: boolean, pageSize: number) {
  const [loadMoreError, setLoadMoreError] = useState(false)

  const loadMore = () => {
    if (isLoadingNext) return
    setLoadMoreError(false)
    loadNext(pageSize, {
      onComplete: (error) => {
        if (error) setLoadMoreError(true)
      },
    })
  }

  return { loadMore, loadMoreError, setLoadMoreError }
}
