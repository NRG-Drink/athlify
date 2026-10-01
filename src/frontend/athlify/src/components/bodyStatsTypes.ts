import type { BodyStatsQuery } from '../app/__generated__/BodyStatsQuery.graphql'

export type BodyStatsEntry = BodyStatsQuery['response']['bodyStats'][number]
