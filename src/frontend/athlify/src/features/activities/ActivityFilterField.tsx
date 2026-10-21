import { Field, NativeSelect, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { periods } from '../../lib/period'
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
  const options: readonly FilterOption[] =
    field === 'period'
      ? periods.map((period) => ({ id: period, label: t(`period.long.${period}`) }))
      : field === 'type'
        ? activityTypes.map((type) => ({ id: type, label: t(`activities.types.${type}`) }))
        : field === 'wind'
          ? winds.map((wind) => ({ id: wind, label: t(`activities.winds.${wind}`) }))
          : field === 'vehicle'
            ? vehicles
            : tags
  const selected =
    field === 'period'
      ? value.period
      : field === 'type'
        ? (value.type ?? '')
        : field === 'wind'
          ? (value.wind ?? '')
          : field === 'vehicle'
            ? (value.vehicleId ?? '')
            : (value.tagId ?? '')
  const allLabel =
    field === 'type'
      ? t('activities.filters.allTypes')
      : field === 'vehicle'
        ? t('activities.filters.allVehicles')
        : field === 'tag'
          ? t('activities.filters.allTags')
          : field === 'wind'
            ? t('activities.filters.allWinds')
            : undefined
  const hasMore = field === 'vehicle' ? hasMoreVehicles : field === 'tag' ? hasMoreTags : false

  return (
    <Field.Root>
      <Field.Label>{label}</Field.Label>
      <NativeSelect.Root size="sm">
        <NativeSelect.Field
          value={selected}
          aria-label={label}
          onChange={(event) => onChange(setActivityFilter(value, field, event.target.value))}
        >
          {allLabel && <option value="">{allLabel}</option>}
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
