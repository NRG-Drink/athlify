import { Box, Button, Text } from '@chakra-ui/react'
import { LuPlus } from 'react-icons/lu'
import { useTranslation } from 'react-i18next'
import { EventsColumnPicker } from './EventsColumnPicker'

type EventsGridToolbarProps = {
  resultCount: number | null
  isCreating: boolean
  visibleColumns: string[]
  onCreateEvent: () => void
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

export function EventsGridToolbar({
  resultCount,
  isCreating,
  visibleColumns,
  onCreateEvent,
  onColumnVisibleChange,
}: EventsGridToolbarProps) {
  const { t } = useTranslation()

  return (
    <Box
      display="grid"
      gridTemplateColumns={{ base: '1fr', sm: '1fr auto' }}
      alignItems="center"
      gap="3"
    >
      <Text fontSize="sm" color="fg.muted" aria-live="polite">
        {resultCount === null ? '' : t('events.resultCount', { count: resultCount })}
      </Text>
      <Box
        display="grid"
        gridTemplateColumns="max-content max-content"
        justifyContent={{ base: 'start', sm: 'end' }}
        gap="2"
      >
        <Button size="sm" onClick={onCreateEvent} loading={isCreating}>
          <LuPlus aria-hidden />
          {t('events.add.open')}
        </Button>
        <EventsColumnPicker
          visibleColumns={visibleColumns}
          onColumnVisibleChange={onColumnVisibleChange}
        />
      </Box>
    </Box>
  )
}
