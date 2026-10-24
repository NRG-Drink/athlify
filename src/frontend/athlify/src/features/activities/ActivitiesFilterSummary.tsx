import { Box, Button, Flex, Tag } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { LuRotateCcw } from 'react-icons/lu'
import { FilterPopover } from '../../components/ColumnFilter'
import { ActivityFilterField } from './ActivityFilterField'
import {
  activeActivityFilterKeys,
  activeFilterSummary,
  clearActivityFilter,
  filterColumnBreakpoint,
  filterValueCount,
  type ActivityFilterKey,
  type ActivityFilters,
  type FilterOption,
} from './activityFilters'

/** The filters of the columns that are hidden on small screens; their buttons show from the breakpoint where the header trigger is gone. */
const hiddenFilterKeys = ['vehicle', 'tag', 'wind'] as const satisfies readonly ActivityFilterKey[]

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
 * Sits above the table: a button per filter of a column that is hidden on the current screen (its
 * header trigger is not there), and one removable chip per active filter, so no filter is ever
 * invisible. Renders nothing when there is neither.
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
  const labelOf = (key: ActivityFilterKey) => t(`activities.filters.${key}`)

  return (
    <Flex direction="column" gap="3">
      {/* All three columns are visible from 2xl, so the row is gone there, and no gap is left. */}
      <Flex gap="2" wrap="wrap" hideFrom={filterColumnBreakpoint.tag}>
        {hiddenFilterKeys.map((key) => {
          const count = filterValueCount(key, value)
          return (
            <Box key={key} hideFrom={filterColumnBreakpoint[key]}>
              <FilterPopover
                title={labelOf(key)}
                content={() => <ActivityFilterField field={key} {...fieldProps} />}
                trigger={
                  <Button size="sm" variant="outline">
                    {labelOf(key)}
                    {count > 0 && (
                      <Box as="span" color="brand.fg" fontWeight="semibold">
                        {count}
                      </Box>
                    )}
                  </Button>
                }
              />
            </Box>
          )
        })}
      </Flex>
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
                {labelOf(key)}: {activeFilterSummary(key, value, vehicles, tags, t)}
              </Tag.Label>
              <Tag.EndElement>
                <Tag.CloseTrigger
                  aria-label={t('activities.filters.remove', { filter: labelOf(key) })}
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
