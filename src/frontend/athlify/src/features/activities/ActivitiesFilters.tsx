import { Button, Field, NativeSelect, SimpleGrid, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { periods, type Period } from '../../lib/period'
import { activityTypes, type ActivityFilters, type ActivityType } from './activityFilters'

interface Option {
  id: string
  label: string
}

interface ActivitiesFiltersProps {
  value: ActivityFilters
  vehicles: readonly Option[]
  tags: readonly Option[]
  hasMoreVehicles: boolean
  hasMoreTags: boolean
  onChange: (value: ActivityFilters) => void
  onReset: () => void
}

export function ActivitiesFilters({
  value,
  vehicles,
  tags,
  hasMoreVehicles,
  hasMoreTags,
  onChange,
  onReset,
}: ActivitiesFiltersProps) {
  const { t } = useTranslation()

  return (
    <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} gap="3">
      <Field.Root>
        <Field.Label>{t('activities.filters.period')}</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={value.period}
            aria-label={t('activities.filters.period')}
            onChange={(event) => onChange({ ...value, period: event.target.value as Period })}
          >
            {periods.map((period) => (
              <option key={period} value={period}>
                {t(`period.long.${period}`)}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
      <Field.Root>
        <Field.Label>{t('activities.filters.type')}</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={value.type ?? ''}
            aria-label={t('activities.filters.type')}
            onChange={(event) =>
              onChange({ ...value, type: (event.target.value || undefined) as ActivityType | undefined })
            }
          >
            <option value="">{t('activities.filters.allTypes')}</option>
            {activityTypes.map((type) => (
              <option key={type} value={type}>
                {t(`activities.types.${type}`)}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
      </Field.Root>
      <Field.Root>
        <Field.Label>{t('activities.filters.vehicle')}</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={value.vehicleId ?? ''}
            aria-label={t('activities.filters.vehicle')}
            onChange={(event) => onChange({ ...value, vehicleId: event.target.value || undefined })}
          >
            <option value="">{t('activities.filters.allVehicles')}</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        {hasMoreVehicles && (
          <Text fontSize="sm" color="fg.muted">
            {t('activities.filters.moreOptions')}
          </Text>
        )}
      </Field.Root>
      <Field.Root>
        <Field.Label>{t('activities.filters.tag')}</Field.Label>
        <NativeSelect.Root>
          <NativeSelect.Field
            value={value.tagId ?? ''}
            aria-label={t('activities.filters.tag')}
            onChange={(event) => onChange({ ...value, tagId: event.target.value || undefined })}
          >
            <option value="">{t('activities.filters.allTags')}</option>
            {tags.map((tag) => (
              <option key={tag.id} value={tag.id}>
                {tag.label}
              </option>
            ))}
          </NativeSelect.Field>
          <NativeSelect.Indicator />
        </NativeSelect.Root>
        {hasMoreTags && (
          <Text fontSize="sm" color="fg.muted">
            {t('activities.filters.moreOptions')}
          </Text>
        )}
      </Field.Root>
      {(value.period !== '90d' || value.type || value.vehicleId || value.tagId) && (
        <Button type="button" variant="outline" alignSelf="end" onClick={onReset}>
          {t('activities.filters.reset')}
        </Button>
      )}
    </SimpleGrid>
  )
}
