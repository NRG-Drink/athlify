import type { EventsManagementPageQuery } from './__generated__/EventsManagementPageQuery.graphql'

type QueryEvent = NonNullable<NonNullable<EventsManagementPageQuery['response']['events']>['nodes']>[number]

export type EventsRow = {
  -readonly [K in keyof QueryEvent]: QueryEvent[K]
}

export function copyEventRow(row: EventsRow): EventsRow {
  return { ...row, tags: row.tags.map((tag) => ({ ...tag })) }
}
