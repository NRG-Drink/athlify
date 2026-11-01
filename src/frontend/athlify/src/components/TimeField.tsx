import {
  Button,
  IconButton,
  Input,
  InputGroup,
  Popover,
  SimpleGrid,
  Stack,
  Text,
} from '@chakra-ui/react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { LuClock } from 'react-icons/lu'
import { formatTime, parseTime } from '../lib/dates'

interface TimeFieldProps {
  /** `HH:MM`, empty when no time is set. */
  value: string
  onChange: (value: string) => void
  /** Accessible name of the text field. */
  label: string
  invalid?: boolean
}

const HOURS = Array.from({ length: 24 }, (_, hour) => hour)
const MINUTES = Array.from({ length: 12 }, (_, step) => step * 5)
const two = (value: number) => String(value).padStart(2, '0')

/**
 * A time of day as `HH:MM` (24 h). It can be typed (`1930`, `19.30` and `7` are normalised when the
 * field is left) or picked from a popup with the hours and the minutes in steps of five. The popup is
 * not portalled, so it works inside a dialog's focus trap.
 */
export function TimeField({ value, onChange, label, invalid }: TimeFieldProps) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const time = parseTime(value)
  const pick = (next: { hours: number; minutes: number }) => onChange(formatTime(next))

  return (
    <Popover.Root
      open={open}
      onOpenChange={(details) => setOpen(details.open)}
      positioning={{ placement: 'bottom-end' }}
    >
      <InputGroup
        endElement={
          <Popover.Trigger asChild>
            <IconButton variant="ghost" size="xs" aria-label={t('form.openTimePicker')} me="-2">
              <LuClock />
            </IconButton>
          </Popover.Trigger>
        }
      >
        <Input
          aria-label={label}
          aria-invalid={invalid || undefined}
          placeholder="HH:MM"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            if (time) onChange(formatTime(time))
          }}
        />
      </InputGroup>
      <Popover.Positioner>
        <Popover.Content width="auto" bg="bg.panel">
          <Popover.Body p="3">
            <Stack gap="3">
              <TimeGrid
                legend={t('form.hours')}
                values={HOURS}
                chosen={time?.hours}
                onPick={(hours) => pick({ hours, minutes: time?.minutes ?? 0 })}
              />
              <TimeGrid
                legend={t('form.minutes')}
                values={MINUTES}
                chosen={time?.minutes}
                onPick={(minutes) => {
                  pick({ hours: time?.hours ?? 0, minutes })
                  setOpen(false)
                }}
              />
            </Stack>
          </Popover.Body>
        </Popover.Content>
      </Popover.Positioner>
    </Popover.Root>
  )
}

interface TimeGridProps {
  legend: string
  values: readonly number[]
  chosen: number | undefined
  onPick: (value: number) => void
}

function TimeGrid({ legend, values, chosen, onPick }: TimeGridProps) {
  return (
    <Stack gap="1" role="group" aria-label={legend}>
      <Text fontSize="xs" color="fg.muted">
        {legend}
      </Text>
      <SimpleGrid columns={6} gap="1">
        {values.map((value) => (
          <Button
            key={value}
            size="xs"
            variant={value === chosen ? 'solid' : 'ghost'}
            aria-pressed={value === chosen}
            fontVariantNumeric="tabular-nums"
            onClick={() => onPick(value)}
          >
            {two(value)}
          </Button>
        ))}
      </SimpleGrid>
    </Stack>
  )
}
