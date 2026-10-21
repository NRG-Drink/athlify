import { Box, Button, Flex, SimpleGrid, Tag } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuRotateCcw } from 'react-icons/lu'
import { ActivityFilterField } from './ActivityFilterField'
import {
  activeActivityFilterKeys,
  activeFilterValueLabel,
  clearActivityFilter,
  filterColumnBreakpoint,
  type ActivityFilters,
  type FilterOption,
} from './activityFilters'

interface ActivitiesFilterSummaryProps {
  value: ActivityFilters
  vehicles: readonly FilterOption[]
  tags: readonly FilterOption[]
  hasMoreVehicles: boolean
  hasMoreTags: boolean
  onChange: (value: ActivityFilters) => void
  onReset: () => void
}

/**
 * Sits above the table: the filters of columns that are hidden on small screens (their header
 * trigger is not there) and one removable chip per active filter, so no filter is ever invisible.
 * Renders nothing when there is neither.
 */
export function ActivitiesFilterSummary({
  value,
  vehicles,
  tags,
  hasMoreVehicles,
  hasMoreTags,
  onChange,
  onReset,
}: ActivitiesFilterSummaryProps) {
  const { t } = useTranslation()
  const active = activeActivityFilterKeys(value)
  const fieldProps = { value, vehicles, tags, hasMoreVehicles, hasMoreTags, onChange }

  return (
    <Flex direction="column" gap="3">
      <SimpleGrid columns={2} gap="3" hideFrom={filterColumnBreakpoint.tag}>
        <Box hideFrom={filterColumnBreakpoint.vehicle}>
          <ActivityFilterField field="vehicle" {...fieldProps} />
        </Box>
        <ActivityFilterField field="tag" {...fieldProps} />
        <ActivityFilterField field="wind" {...fieldProps} />
      </SimpleGrid>
      {active.length > 0 && (
        <Flex
          align="center"
          gap="2"
          wrap="wrap"
          role="group"
          aria-label={t('activities.filters.active')}
        >
          {active.map((key) => (
            <Tag.Root key={key} size="lg" variant="subtle" colorPalette="brand">
              <Tag.Label>
                {t(`activities.filters.${key}`)}:{' '}
                {activeFilterValueLabel(key, value, vehicles, tags, t)}
              </Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger
                  aria-label={t('activities.filters.remove', {
                    filter: t(`activities.filters.${key}`),
                  })}
                  onClick={() => onChange(clearActivityFilter(value, key))}
                />
              </Tag.EndElement>
            </Tag.Root>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={onReset}>
            <LuRotateCcw aria-hidden />
            {t('activities.filters.reset')}
          </Button>
        </Flex>
      )}
    </Flex>
  )
}
