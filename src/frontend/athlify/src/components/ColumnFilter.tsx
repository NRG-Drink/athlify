import { Box, IconButton, Popover, Portal } from '@chakra-ui/react'
import { useState, type ReactNode } from 'react'
import { LuListFilter } from 'react-icons/lu'

export interface DataTableColumnFilter {
  /** Accessible name of the trigger, for example "Filter by type". */
  label: string
  /** Whether the column is filtered; highlights the trigger. */
  active: boolean
  /** Accessible name while active, so the current value is announced. Defaults to `label`. */
  activeLabel?: string
  /** Popover body. `close` dismisses the popover, for example after picking an option. */
  content: (close: () => void) => ReactNode
}

/** Filter trigger of a column header: a funnel button that opens a popover next to the sort button. */
export function ColumnFilter({ label, active, activeLabel, content }: DataTableColumnFilter) {
  const [open, setOpen] = useState(false)

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: 'bottom-start', gutter: 8 }}
      // The body (for example a long option list) mounts only while the popover is open.
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>
        <IconButton
          size="2xs"
          variant="ghost"
          position="relative"
          aria-label={active ? (activeLabel ?? label) : label}
          // Idle triggers fade in with the header hover (see DataTable); touch has no hover.
          data-filter-idle={active ? undefined : ''}
          color={active ? 'colorPalette.fg' : 'fg.muted'}
          colorPalette="brand"
          css={{ '&[data-state=open]': { opacity: 1 } }}
        >
          <LuListFilter aria-hidden />
          {active && (
            <Box
              aria-hidden
              position="absolute"
              top="0"
              insetEnd="0"
              boxSize="2"
              borderRadius="full"
              bg="colorPalette.solid"
            />
          )}
        </IconButton>
      </Popover.Trigger>
      <Portal>
        <Popover.Positioner>
          <Popover.Content
            colorPalette="brand"
            width="min(20rem, calc(100vw - 2rem))"
            bg="bg.panel"
            borderWidth="1px"
            borderRadius="l3"
            _dark={{ shadow: 'none' }}
          >
            <Popover.Body p="3">{content(() => setOpen(false))}</Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}
