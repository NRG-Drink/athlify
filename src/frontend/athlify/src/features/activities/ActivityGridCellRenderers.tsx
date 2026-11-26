import { Flex, Tag, Text } from '@chakra-ui/react'
import { useTranslation } from 'react-i18next'
import { tagColorPalette } from './activityFormatting'
import type { ActivityRow } from './ActivitiesGridTypes'

const tagNames = (row: ActivityRow) => row.tags.map((tag) => tag.name).join(', ')
const VISIBLE_TAGS = 2

export function ActivityTagChips({ row }: { row: ActivityRow }) {
  const { t } = useTranslation()
  if (row.tags.length === 0) return '—'
  return (
    <Flex gap="1" wrap="nowrap" overflow="hidden" title={tagNames(row)}>
      {row.tags.slice(0, VISIBLE_TAGS).map((tag) => (
        <Tag.Root
          key={tag.id}
          size="sm"
          variant="subtle"
          flexShrink={0}
          colorPalette={tagColorPalette(tag.id)}
        >
          <Tag.Label>{tag.name}</Tag.Label>
        </Tag.Root>
      ))}
      {row.tags.length > VISIBLE_TAGS && (
        <Tag.Root size="sm" variant="outline" flexShrink={0}>
          <Tag.Label>
            {t('activities.moreTags', { count: row.tags.length - VISIBLE_TAGS })}
          </Tag.Label>
        </Tag.Root>
      )}
    </Flex>
  )
}

/**
 * A mood or wind as its emoji; the label is its accessible name and tooltip. A value without an emoji
 * (newer than this client) shows its label, and a missing one "—".
 */
export function ActivityEmojiValue({ emoji, label }: { emoji: string | undefined; label: string }) {
  if (!emoji) return <>{label}</>
  return (
    <Text as="span" role="img" aria-label={label} title={label} fontSize="lg" lineHeight="1">
      {emoji}
    </Text>
  )
}
