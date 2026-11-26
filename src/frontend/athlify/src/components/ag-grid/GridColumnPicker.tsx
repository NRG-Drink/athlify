import { Box, Button, Popover, Portal, Stack } from '@chakra-ui/react'
import { useState } from 'react'

export type GridColumnPickerColumn = { id: string; label: string }

type GridColumnPickerProps = {
  visibleColumns: readonly string[]
  columns: readonly GridColumnPickerColumn[]
  openLabel: string
  dialogLabel: string
  onColumnVisibleChange: (column: string, visible: boolean) => void
}

export function GridColumnPicker({
  visibleColumns,
  columns,
  openLabel,
  dialogLabel,
  onColumnVisibleChange,
}: GridColumnPickerProps) {
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
          {openLabel}
        </Button>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            aria-label={dialogLabel}
            colorPalette="brand"
            width="min(20rem, calc(100vw - 2rem))"
            bg="bg.panel"
            borderWidth="1px"
            borderRadius="l3"
            _dark={{ shadow: 'none' }}
          >
            <Popover.Header fontWeight="semibold">{dialogLabel}</Popover.Header>
            <Popover.Body>
              <Stack gap="2" role="group" aria-label={dialogLabel}>
                {columns.map(({ id, label }) => (
                  <Box
                    as="label"
                    key={id}
                    display="grid"
                    gridTemplateColumns="auto 1fr"
                    alignItems="center"
                    gap="2"
                    cursor="pointer"
                  >
                    <input
                      type="checkbox"
                      checked={visibleColumns.includes(id)}
                      onChange={(event) => onColumnVisibleChange(id, event.target.checked)}
                    />
                    {label}
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
