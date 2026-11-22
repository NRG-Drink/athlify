import { Box, Button, Popover, Portal, Stack } from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { eventsColumnIds } from './EventsGridState'

type EventsColumnPickerProps = {
  visibleColumns: string[]
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

export function EventsColumnPicker({
  visibleColumns,
  onColumnVisibleChange,
}: EventsColumnPickerProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: 'bottom-end', gutter: 8 }}
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>
        <Button size="sm" variant="outline">
          {t('events.columnPicker.open')}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            aria-label={t('events.columnPicker.label')}
            colorPalette="brand"
            width="min(20rem, calc(100vw - 2rem))"
            bg="bg.panel"
            borderWidth="1px"
            borderRadius="l3"
            _dark={{ shadow: 'none' }}
          >
            <Popover.Header fontWeight="semibold">{t('events.columnPicker.label')}</Popover.Header>
            <Popover.Body>
              <Stack gap="2" role="group" aria-label={t('events.columnPicker.label')}>
                {eventsColumnIds
                  .filter((column) => column !== 'delete')
                  .map((column) => (
                    <Box
                      as="label"
                      key={column}
                      display="grid"
                      gridTemplateColumns="auto 1fr"
                      alignItems="center"
                      gap="2"
                      cursor="pointer"
                    >
                      <input
                        type="checkbox"
                        checked={visibleColumns.includes(column)}
                        onChange={(event) => onColumnVisibleChange(column, event.target.checked)}
                      />
                      {t(`events.columns.${column}`)}
                    </Box>
                  ))}
              </Stack>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
