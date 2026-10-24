import { Button, Checkbox, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  activityFilterFields,
  activityTypes,
  clearActivityFilter,
  toggleActivityFilter,
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
  const [query, setQuery] = useState('')
  // The URL applies a change after a router transition, so the ticks are kept here: a second tick
  // builds on the first one, and the checkbox responds at once. The URL value resyncs them.
  const [ticked, setTicked] = useState(value)
  const [source, setSource] = useState(value)
  if (source !== value) {
    setSource(value)
    setTicked(value)
  }
  const label = t(`activities.filters.${field}`)
  // What differs per filter: its options, the ticked values and whether the list can be searched.
  const config: Record<ActivityFilterKey, { options: readonly FilterOption[]; hasMore: boolean }> =
    {
      type: {
        options: activityTypes.map((type) => ({ id: type, label: t(`activities.types.${type}`) })),
        hasMore: false,
      },
      vehicle: { options: vehicles, hasMore: hasMoreVehicles },
      tag: { options: tags, hasMore: hasMoreTags },
      wind: {
        options: winds.map((wind) => ({ id: wind, label: t(`activities.winds.${wind}`) })),
        hasMore: false,
      },
    }
  const { options, hasMore } = config[field]
  const selected = ticked[activityFilterFields[field]] ?? []
  const change = (next: ActivityFilters) => {
    setTicked(next)
    onChange(next)
  }
  const searchable = field === 'vehicle' || field === 'tag'
  const needle = query.trim().toLocaleLowerCase()
  const visible = searchable
    ? options.filter((option) => option.label.toLocaleLowerCase().includes(needle))
    : options

  return (
    <Stack gap="3">
      {searchable && (
        <Input
          type="search"
          size="sm"
          aria-label={t('activities.filters.searchPlaceholder')}
          placeholder={t('activities.filters.searchPlaceholder')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <Stack role="group" aria-label={label} gap="1" maxH="16rem" overflowY="auto">
        {visible.length === 0 && (
          <Text fontSize="sm" color="fg.muted" px="2" py="2">
            {t('activities.filters.noMatches')}
          </Text>
        )}
        {visible.map((option) => (
          <Checkbox.Root
            key={option.id}
            size="sm"
            colorPalette="brand"
            checked={selected.includes(option.id)}
            onCheckedChange={() => change(toggleActivityFilter(ticked, field, option.id))}
            minH="10"
            px="2"
            alignItems="center"
            borderRadius="l2"
            _hover={{ bg: 'bg.muted' }}
          >
            <Checkbox.HiddenInput />
            <Checkbox.Control
              borderColor="fg.muted"
              _checked={{ bg: 'colorPalette.solid', borderColor: 'colorPalette.solid' }}
              transition="all 0.15s"
              _motionReduce={{ transition: 'none' }}
            >
              <Checkbox.Indicator color="colorPalette.contrast" />
            </Checkbox.Control>
            <Checkbox.Label>{option.label}</Checkbox.Label>
          </Checkbox.Root>
        ))}
      </Stack>
      <Flex align="center" justify="space-between" gap="2" wrap="wrap">
        <Text fontSize="sm" color="fg.muted">
          {t('activities.filters.selectedCount', { count: selected.length })}
        </Text>
        <Button
          size="xs"
          variant="ghost"
          disabled={selected.length === 0}
          onClick={() => change(clearActivityFilter(ticked, field))}
        >
          {t('activities.filters.clear')}
        </Button>
      </Flex>
      {hasMore && (
        <Text fontSize="sm" color="fg.muted">
          {t('activities.filters.moreOptions')}
        </Text>
      )}
    </Stack>
  )
}
