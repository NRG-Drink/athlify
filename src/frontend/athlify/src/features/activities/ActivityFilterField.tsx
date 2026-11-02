import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checklist } from '../../components/Checklist'
import {
  activityFilterFields,
  activityTypes,
  setActivityFilterValues,
  winds,
  type ActivityFilterKey,
  type ActivityFilters,
  type FilterOption,
} from './activityFilters'
import { enumOptions } from './activityFormatting'

interface ActivityFilterFieldProps {
  field: ActivityFilterKey
  value: ActivityFilters
  vehicles: readonly FilterOption[]
  tags: readonly FilterOption[]
  hasMoreVehicles: boolean
  hasMoreTags: boolean
  onChange: (value: ActivityFilters) => void
}

/** The checklist of one activity filter; shown in a column header popover or bottom sheet and in the filter summary. */
export function ActivityFilterField({
  field,
  value,
  vehicles,
  tags,
  hasMoreVehicles,
  hasMoreTags,
  onChange,
}: ActivityFilterFieldProps) {
  const { t } = useTranslation()
  // The URL applies a change after a router transition, so the ticks are kept here: a second tick
  // builds on the first one, and the checkbox responds at once. The URL value resyncs them.
  const [ticked, setTicked] = useState(value)
  const [source, setSource] = useState(value)
  if (source !== value) {
    setSource(value)
    setTicked(value)
  }
  // What differs per filter: its options and whether more exist than were loaded.
  const config: Record<ActivityFilterKey, { options: readonly FilterOption[]; hasMore: boolean }> =
    {
      type: { options: enumOptions(t, 'types', activityTypes), hasMore: false },
      vehicle: { options: vehicles, hasMore: hasMoreVehicles },
      tag: { options: tags, hasMore: hasMoreTags },
      wind: { options: enumOptions(t, 'winds', winds), hasMore: false },
    }
  const { options, hasMore } = config[field]

  return (
    <Checklist
      label={t(`activities.filters.${field}`)}
      options={options}
      value={ticked[activityFilterFields[field]] ?? []}
      onChange={(ids) => {
        const next = setActivityFilterValues(ticked, field, ids)
        setTicked(next)
        onChange(next)
      }}
      searchable={field === 'vehicle' || field === 'tag'}
      hasMore={hasMore}
    />
  )
}
