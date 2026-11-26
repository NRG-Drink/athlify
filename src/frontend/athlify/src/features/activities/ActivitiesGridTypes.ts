import type { ActivitiesTablePageQuery } from './__generated__/ActivitiesTablePageQuery.graphql'

export type ActivityRow = NonNullable<
  NonNullable<ActivitiesTablePageQuery['response']['activities']>['nodes']
>[number]
