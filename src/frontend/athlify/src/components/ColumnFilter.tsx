import {
  Box,
  Button,
  Dialog,
  IconButton,
  Popover,
  Portal,
  useBreakpointValue,
} from '@chakra-ui/react'
import { useState, type ReactElement, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { LuListFilter } from 'react-icons/lu'

export interface DataTableColumnFilter {
  /** Accessible name of the trigger, for example "Filter by type". */
  label: string
  /** Heading of the bottom sheet on phones, for example "Activity type". Defaults to `label`. */
  title?: string
  /** Whether the column is filtered; highlights the trigger. */
  active: boolean
  /** Number of ticked values, shown on the trigger while the column is filtered. */
  count?: number
  /** Accessible name while active, so the current value is announced. Defaults to `label`. */
  activeLabel?: string
  /** Panel body. `close` dismisses the panel, for example after a value is ticked. */
  content: (close: () => void) => ReactNode
}

interface FilterPopoverProps {
  /** Heading of the bottom sheet. */
  title: string
  /** The element that opens the panel; Chakra wires its open state and focus return. */
  trigger: ReactElement
  content: (close: () => void) => ReactNode
}

/**
 * A filter panel: a popover from `sm`, a bottom sheet on phones. Both keep the panel open while
 * values are ticked and close with "Fertig".
 */
export function FilterPopover({ title, trigger, content }: FilterPopoverProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const sheet = useBreakpointValue({ base: true, sm: false }) ?? true
  const close = () => setOpen(false)

  if (sheet) {
    return (
      <Dialog.Root
        open={open}
        onOpenChange={(details) => setOpen(details.open)}
        placement="bottom"
        motionPreset="slide-in-bottom"
        scrollBehavior="inside"
        lazyMount
        unmountOnExit
      >
        <Dialog.Trigger asChild>{trigger}</Dialog.Trigger>
        <Portal>
          <Dialog.Backdrop />
          <Dialog.Positioner>
            {/* Portals leave the app's brand palette, so the sheet sets it again. */}
            <Dialog.Content colorPalette="brand" maxH="80vh">
              <Dialog.Header>
                <Dialog.Title>{title}</Dialog.Title>
              </Dialog.Header>
              <Dialog.Body>{content(close)}</Dialog.Body>
              <Dialog.Footer>
                <Button onClick={close}>{t('activities.filters.done')}</Button>
              </Dialog.Footer>
            </Dialog.Content>
          </Dialog.Positioner>
        </Portal>
      </Dialog.Root>
    )
  }

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: 'bottom-start', gutter: 8 }}
      // The body (for example a long option list) mounts only while the popover is open.
      lazyMount
      unmountOnExit
    >
      <Popover.Trigger asChild>{trigger}</Popover.Trigger>
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
            <Popover.Body p="3">
              {content(close)}
              <Button size="sm" width="full" mt="3" onClick={close}>
                {t('activities.filters.done')}
              </Button>
            </Popover.Body>
          </Popover.Content>
        </Popover.Positioner>
      </Portal>
    </Popover.Root>
  )
}

/** Filter trigger of a column header: a funnel button that opens the panel next to the sort button. */
export function ColumnFilter({
  label,
  title,
  active,
  count,
  activeLabel,
  content,
}: DataTableColumnFilter) {
  return (
    <FilterPopover
      title={title ?? label}
      content={content}
      trigger={
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
              top="-1"
              insetEnd="-1"
              minW="4"
              h="4"
              px="1"
              borderRadius="full"
              bg="colorPalette.subtle"
              color="colorPalette.fg"
              fontSize="2xs"
              fontWeight="semibold"
              lineHeight="4"
              textAlign="center"
            >
              {count}
            </Box>
          )}
        </IconButton>
      }
    />
  )
}
