import type { ActivitiesTable_entries$data } from './__generated__/ActivitiesTable_entries.graphql'

export type ActivityRow = Omit<ActivitiesTable_entries$data[number], ' $fragmentType'>
