import { useEffect, useState } from 'react'
import { fetchQuery, graphql, useRelayEnvironment } from 'react-relay'
import type { ChecklistOption } from '../../components/Checklist'
import type { useDashboardTagsQuery } from './__generated__/useDashboardTagsQuery.graphql'

const tagsQuery = graphql`
  query useDashboardTagsQuery {
    tags(first: 200) {
      nodes {
        id
        name
      }
      pageInfo {
        hasNextPage
      }
    }
  }
`

/** The user's tags as filter options; a failed load leaves the list empty. */
export function useDashboardTags(): { options: ChecklistOption[]; hasMore: boolean } {
  const environment = useRelayEnvironment()
  const [result, setResult] = useState<{ options: ChecklistOption[]; hasMore: boolean }>({
    options: [],
    hasMore: false,
  })

  useEffect(() => {
    let cancelled = false
    fetchQuery<useDashboardTagsQuery>(environment, tagsQuery, {}, { fetchPolicy: 'network-only' })
      .toPromise()
      .then(
        (response) => {
          if (cancelled) return
          setResult({
            options: (response?.tags?.nodes ?? []).map(({ id, name }) => ({ id, label: name })),
            hasMore: response?.tags?.pageInfo.hasNextPage ?? false,
          })
        },
        (error) => console.error('Could not load the tags of the dashboard.', error),
      )
    return () => {
      cancelled = true
    }
  }, [environment])

  return result
}
