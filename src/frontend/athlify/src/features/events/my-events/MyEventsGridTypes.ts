import type { MyEventsPageQuery } from './__generated__/MyEventsPageQuery.graphql'

type QueryEvent = NonNullable<NonNullable<MyEventsPageQuery['response']['events']>['nodes']>[number]

export type EventsRow = {
  -readonly [K in keyof QueryEvent]: QueryEvent[K]
}

export function copyEventRow(row: EventsRow): EventsRow {
  return { ...row, tags: row.tags.map((tag) => ({ ...tag })) }
}
