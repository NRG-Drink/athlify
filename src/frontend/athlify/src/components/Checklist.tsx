import { Button, Checkbox, Flex, Input, Stack, Text } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toggleId } from '../lib/ids'

export interface ChecklistOption {
  id: string
  label: string
}

interface ChecklistProps {
  /** Accessible name of the group of checkboxes. */
  label: string
  options: readonly ChecklistOption[]
  /** The ticked ids. */
  value: readonly string[]
  onChange: (value: string[]) => void
  /** Shows a search field above the list, for lists that can grow long. */
  searchable?: boolean
  /** The options are cut off; a note says that only the first ones are shown. */
  hasMore?: boolean
}

/** A multi-select as a list of checkboxes, with the selected count and "clear selection" below it. */
export function Checklist({
  label,
  options,
  value,
  onChange,
  searchable = false,
  hasMore = false,
}: ChecklistProps) {
  const { t } = useTranslation()
  const [query, setQuery] = useState('')
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
          aria-label={t('checklist.search')}
          placeholder={t('checklist.search')}
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      )}
      <Stack role="group" aria-label={label} gap="1" maxH="16rem" overflowY="auto">
        {visible.length === 0 && (
          <Text fontSize="sm" color="fg.muted" px="2" py="2">
            {t('checklist.noMatches')}
          </Text>
        )}
        {visible.map((option) => (
          <Checkbox.Root
            key={option.id}
            size="sm"
            colorPalette="brand"
            checked={value.includes(option.id)}
            onCheckedChange={() => onChange(toggleId(value, option.id))}
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
          {t('checklist.selectedCount', { count: value.length })}
        </Text>
        <Button
          size="xs"
          variant="ghost"
          disabled={value.length === 0}
          onClick={() => onChange([])}
        >
          {t('checklist.clear')}
        </Button>
      </Flex>
      {hasMore && (
        <Text fontSize="sm" color="fg.muted">
          {t('checklist.moreOptions')}
        </Text>
      )}
    </Stack>
  )
}
