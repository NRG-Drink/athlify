import { Field, NativeSelect, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import {
  activityTypes,
  setActivityFilter,
  winds,
  type ActivityFilterKey,
  type ActivityFilters,
  type FilterOption,
} from './activityFilters'

interface ActivityFilterFieldProps {
  field: ActivityFilterKey
  value: ActivityFilters
  vehicles: readonly FilterOption[]
  tags: readonly FilterOption[]
  hasMoreVehicles: boolean
  hasMoreTags: boolean
  onChange: (value: ActivityFilters) => void
}

/** The select of one activity filter; shown in a column header popover and in the filter summary. */
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
  const label = t(`activities.filters.${field}`)
  // What differs per filter: its options, the selected value and the "all" option.
  const config: Record<
    ActivityFilterKey,
    { options: readonly FilterOption[]; selected: string; allLabel: string; hasMore: boolean }
  > = {
    type: {
      options: activityTypes.map((type) => ({ id: type, label: t(`activities.types.${type}`) })),
      selected: value.type ?? '',
      allLabel: t('activities.filters.allTypes'),
      hasMore: false,
    },
    vehicle: {
      options: vehicles,
      selected: value.vehicleId ?? '',
      allLabel: t('activities.filters.allVehicles'),
      hasMore: hasMoreVehicles,
    },
    tag: {
      options: tags,
      selected: value.tagId ?? '',
      allLabel: t('activities.filters.allTags'),
      hasMore: hasMoreTags,
    },
    wind: {
      options: winds.map((wind) => ({ id: wind, label: t(`activities.winds.${wind}`) })),
      selected: value.wind ?? '',
      allLabel: t('activities.filters.allWinds'),
      hasMore: false,
    },
  }
  const { options, selected, allLabel, hasMore } = config[field]

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root size="sm">
        <NativeSelect.Field
          value={selected}
          aria-label={label}
          onChange={(event) => onChange(setActivityFilter(value, field, event.target.value))}
        >
          <option value="">{allLabel}</option>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </NativeSelect.Field>
        <NativeSelect.Indicator />
      </NativeSelect.Root>
      {hasMore && (
        <Text fontSize="sm" color="fg.muted">
          {t('activities.filters.moreOptions')}
        </Text>
      )}
    </Field.Root>
  )
}
