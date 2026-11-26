import type { BodyStatsGridPageQuery } from './__generated__/BodyStatsGridPageQuery.graphql'

type QueryBodyStats = NonNullable<
  NonNullable<BodyStatsGridPageQuery['response']['bodyStats']>['nodes']
>[number]

export type BodyStatsRow = {
  -readonly [K in keyof QueryBodyStats]: QueryBodyStats[K]
}

export function copyBodyStatsRow(row: BodyStatsRow): BodyStatsRow {
  return { ...row }
}
